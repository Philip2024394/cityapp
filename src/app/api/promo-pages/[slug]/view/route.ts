import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// POST /api/promo-pages/[slug]/view
// Body: { kind: 'view' | 'click' }
// Public — no auth. Atomically increments view_count or click_count on
// the matching promo_pages row. Quietly succeeds if the slug doesn't
// exist (avoids leaking valid-vs-invalid slugs to scrapers).

export const runtime = 'nodejs'

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params
  if (!slug || !/^[a-z0-9_-]{1,40}$/.test(slug)) {
    return NextResponse.json({ ok: true }, { status: 200 })
  }
  let body: { kind?: 'view' | 'click' }
  try { body = await req.json() } catch { body = {} }
  const kind = body.kind === 'click' ? 'click' : 'view'

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ ok: true })

  // Fetch + increment + write — postgres RPC would be cleaner but a
  // single round-trip pattern is fine at this volume.
  const { data: row } = await admin
    .from('promo_pages')
    .select('id, view_count, click_count, archived_at, expires_at')
    .eq('slug', slug)
    .maybeSingle()
  if (!row || row.archived_at) return NextResponse.json({ ok: true })
  if (row.expires_at && new Date(row.expires_at) <= new Date()) {
    return NextResponse.json({ ok: true })
  }

  const patch = kind === 'click'
    ? { click_count: row.click_count + 1 }
    : { view_count:  row.view_count  + 1 }
  await admin.from('promo_pages').update(patch).eq('id', row.id)

  return NextResponse.json({ ok: true })
}
