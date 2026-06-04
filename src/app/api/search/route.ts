// ============================================================================
// GET /api/search?q=<free-text>
// ----------------------------------------------------------------------------
// Cross-vertical search across every provider/place table. Returns mixed
// results so a query for "potong rambut" can surface a beautician AND a
// salon-tagged /places row in the same list.
//
// Match strategy per row:
//   1. ILIKE on the row's name / display_name / business_name
//   2. ILIKE on the row's bio / description
//   3. Array overlap on the row's `tags` against an expanded keyword list
//      (the free-text query PLUS the keywords from the intent table for
//      whatever category looks like a fit — see lib/search/intentMap.ts)
//
// All three checks run as ORs inside each table's query; results are
// merged client-side. We normalise to a single shape so the /search
// page can render mixed providers without per-vertical branching.
//
// Compliance posture: software directory (PM 12/2019). We surface rows
// owners published; we don't synthesise content. No payment, no booking,
// no held order records.
// ============================================================================

import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { INTENTS, normalize, rankIntents } from '@/lib/search/intentMap'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const MAX_PER_TABLE = 8
const MAX_TOTAL     = 40

export type SearchHit = {
  /** Stable opaque id within the response. */
  id:           string
  /** Which vertical the row lives in. Drives the profile URL prefix. */
  kind:         'food' | 'place' | 'beautician' | 'handyman' | 'laundry' | 'massage' | 'home-clean' | 'facial'
  slug:         string
  name:         string
  city:         string | null
  imageUrl:     string | null
  summary:      string | null
  /** Pre-built link the UI can drop into <Link href={...}>. */
  profileUrl:   string
  /** 0..1 — name/desc hits scored higher than tag overlaps. */
  relevance:    number
}

// Per-vertical config: which table + which columns to project.
type VerticalCfg = {
  kind:         SearchHit['kind']
  table:        string
  nameCol:      string                // primary display name column
  descCol:      string                // bio / description column
  imageCol:     string                // image_urls (array) or image_url (single)
  imageArray:   boolean
  profileBase:  string                // /food, /beautician, etc.
  /** Value the row's `status` column should equal to be considered live.
   *  `places` uses 'approved'; the per-vertical provider tables use
   *  'active'. Without this distinction the search returned 0 providers. */
  liveStatus:   string
  /** Optional extra category filter — only used for `places` so we can
   *  split food places ↔ tourism/utility places into kinds 'food' vs 'place'. */
  categoryIn?:  string[]
}

const FOOD_PLACE_CATEGORIES = ['restaurant', 'cafe', 'bar', 'club']

const VERTICALS: ReadonlyArray<VerticalCfg> = [
  // Two passes over the same `places` table so we can label food rows
  // as kind='food' (profileBase /food) and tourism rows as kind='place'
  // (profileBase /places).
  { kind: 'food',       table: 'places',               nameCol: 'name',         descCol: 'description', imageCol: 'image_urls', imageArray: true,  profileBase: '/food',       liveStatus: 'approved', categoryIn: FOOD_PLACE_CATEGORIES },
  { kind: 'place',      table: 'places',               nameCol: 'name',         descCol: 'description', imageCol: 'image_urls', imageArray: true,  profileBase: '/places',     liveStatus: 'approved' },
  { kind: 'beautician', table: 'beautician_providers', nameCol: 'display_name', descCol: 'bio',         imageCol: 'gallery_image_urls', imageArray: true, profileBase: '/beautician', liveStatus: 'active' },
  { kind: 'handyman',   table: 'handyman_providers',   nameCol: 'display_name', descCol: 'bio',         imageCol: 'gallery_image_urls', imageArray: true, profileBase: '/handyman',   liveStatus: 'active' },
  { kind: 'laundry',    table: 'laundry_providers',    nameCol: 'display_name', descCol: 'bio',         imageCol: 'gallery_image_urls', imageArray: true, profileBase: '/laundry',    liveStatus: 'active' },
  { kind: 'massage',    table: 'massage_providers',    nameCol: 'display_name', descCol: 'bio',         imageCol: 'gallery_image_urls', imageArray: true, profileBase: '/massage',    liveStatus: 'active' },
  { kind: 'home-clean', table: 'home_clean_providers', nameCol: 'display_name', descCol: 'bio',         imageCol: 'gallery_image_urls', imageArray: true, profileBase: '/home-clean', liveStatus: 'active' },
  { kind: 'facial',     table: 'facial_providers',     nameCol: 'display_name', descCol: 'bio',         imageCol: 'gallery_image_urls', imageArray: true, profileBase: '/facial',     liveStatus: 'active' },
]

/** Build the array of tag keywords we want to match this query against.
 *  Start with whatever the user typed (single token). Add the synonyms
 *  from any intent that ranked > 0.4 — so "computer service" expands to
 *  include all the handyman tag keywords too. */
function buildTagSet(q: string): string[] {
  const set = new Set<string>()
  const norm = normalize(q)
  if (norm) set.add(norm)
  for (const t of norm.split(' ').filter(Boolean)) set.add(t)
  const matches = rankIntents(q).filter((m) => m.score >= 0.4)
  for (const m of matches) for (const k of m.intent.keywords) set.add(normalize(k))
  return Array.from(set)
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim()
  if (q.length < 2) {
    return NextResponse.json({ q, hits: [] })
  }

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ q, hits: [], error: 'supabase_unavailable' }, { status: 503 })

  const ilike = `%${q}%`
  const tagSet = buildTagSet(q)

  // Run all 8 queries in parallel. Each one returns up to MAX_PER_TABLE
  // hits. If a table query errors, we just skip it (zero-results-for-
  // that-vertical), never propagating a 500.
  const tasks = VERTICALS.map(async (v): Promise<SearchHit[]> => {
    try {
      // Project the real column names (no SQL `AS` — supabase-js select
      // doesn't support it). We dereference by the real column names
      // below.
      const cols = new Set<string>(['slug', v.nameCol, v.descCol, v.imageCol, 'city', 'tags'])
      if (v.categoryIn || v.table === 'places') cols.add('category')
      const select = Array.from(cols).join(', ')

      const orParts: string[] = [
        `${v.nameCol}.ilike.${ilike}`,
        `${v.descCol}.ilike.${ilike}`,
      ]
      if (tagSet.length > 0) {
        // PostgREST array overlap operator. Each value double-quoted in
        // case it contains commas or special chars.
        orParts.push(`tags.ov.{${tagSet.map(x => `"${x.replace(/"/g, '\\"')}"`).join(',')}}`)
      }

      let q1 = admin
        .from(v.table)
        .select(select)
        .eq('status', v.liveStatus)
        .or(orParts.join(','))
        .limit(MAX_PER_TABLE)

      if (v.categoryIn) {
        q1 = q1.in('category', v.categoryIn)
      } else if (v.table === 'places') {
        // For the kind='place' pass exclude food categories.
        q1 = q1.not('category', 'in', `(${FOOD_PLACE_CATEGORIES.map(c => `"${c}"`).join(',')})`)
      }

      const { data, error } = await q1
      if (error || !data) return []

      return (data as unknown as Array<Record<string, unknown>>).map((row) => {
        const name    = String(row[v.nameCol] ?? '')
        const desc    = (row[v.descCol] as string | null) ?? null
        const imgRaw  = row[v.imageCol]
        let imageUrl: string | null = null
        if (Array.isArray(imgRaw) && imgRaw.length > 0) imageUrl = String(imgRaw[0])
        else if (typeof imgRaw === 'string')             imageUrl = imgRaw
        const slug    = String(row.slug ?? '')
        const tagsArr = Array.isArray(row.tags) ? (row.tags as string[]) : []

        // Cheap relevance heuristic: name hit beats desc hit beats tag-only hit.
        const lname = name.toLowerCase()
        const lq    = q.toLowerCase()
        let relevance = 0.4 // base tag-hit floor
        if (lname.includes(lq))                                  relevance = Math.max(relevance, 0.95)
        else if (desc && desc.toLowerCase().includes(lq))         relevance = Math.max(relevance, 0.7)
        else if (tagsArr.some((t) => normalize(t).includes(normalize(q)))) relevance = Math.max(relevance, 0.55)

        return {
          id:         `${v.kind}:${slug}`,
          kind:       v.kind,
          slug,
          name,
          city:       (row.city as string | null) ?? null,
          imageUrl,
          summary:    desc ? desc.slice(0, 140) : null,
          profileUrl: `${v.profileBase}/${slug}`,
          relevance,
        } satisfies SearchHit
      })
    } catch {
      return []
    }
  })

  const groups = await Promise.all(tasks)
  const hits: SearchHit[] = ([] as SearchHit[])
    .concat(...groups)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, MAX_TOTAL)

  return NextResponse.json({ q, hits, count: hits.length })
}
