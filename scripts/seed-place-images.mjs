// seed-place-images.mjs
// One-shot backfill of place card photos into Supabase Storage. For each
// approved place we:
//   1. try Wikipedia's REST summary for a real landmark photo
//      (Borobudur, Prambanan, Kraton, etc.)
//   2. fall back to a deterministic Picsum image seeded by category
//   3. download the bytes, upload to the `place-images` bucket
//   4. UPDATE places.image_urls = [public_url]
//
// Idempotent: re-running overwrites the same path (upsert) and writes
// the same URL back, so it's safe to retry on partial failures.
//
// Run from repo root:
//   node scripts/seed-place-images.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env.local')

// Manual .env.local parser — avoids pulling in dotenv as a dep just for
// a one-shot script. Handles KEY=value, ignores comments and blanks.
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]
    }),
)

const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const BUCKET = 'place-images'

// Deterministic Picsum seeds per category. Same seed → same image
// forever, so a place keeps the same fallback photo across re-runs.
const CATEGORY_SEEDS = {
  temple:        'cityrider-temple',
  beach:         'cityrider-beach',
  attraction:    'cityrider-attraction',
  restaurant:    'cityrider-restaurant',
  cafe:          'cityrider-cafe',
  bar:           'cityrider-bar',
  club:          'cityrider-club',
  hospital:      'cityrider-hospital',
  doctor:        'cityrider-doctor',
  dentist:       'cityrider-dentist',
  pharmacy:      'cityrider-pharmacy',
  mall:          'cityrider-mall',
  hotel:         'cityrider-hotel',
  bus_station:   'cityrider-bus',
  train_station: 'cityrider-train',
  airport:       'cityrider-airport',
  government:    'cityrider-government',
  bike_repair:   'cityrider-bikerepair',
}

// ─── Bucket setup ────────────────────────────────────────────────────
async function ensureBucket() {
  const { data: list, error } = await supabase.storage.listBuckets()
  if (error) throw error
  const existing = list?.find((b) => b.name === BUCKET)
  if (existing) {
    if (!existing.public) {
      const { error: upErr } = await supabase.storage.updateBucket(BUCKET, { public: true })
      if (upErr) throw upErr
    }
    return
  }
  const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  })
  if (createErr) throw createErr
}

// ─── Wikipedia lookup ────────────────────────────────────────────────
// Strips common Indonesian category prefixes so e.g. "Candi Borobudur"
// also tries "Borobudur" — Wikipedia indexes by the bare landmark name.
function candidateTitles(name) {
  const cleaned = name
    .replace(/^Candi\s+/i, '')
    .replace(/^Pantai\s+/i, '')
    .replace(/^Pasar\s+/i, '')
    .replace(/^Stasiun\s+(Yogyakarta\s*\()?/i, '')
    .replace(/\)$/, '')
    .replace(/^Bandara\s+/i, '')
    .replace(/^Klenteng\s+/i, '')
    .replace(/^Goa\s+/i, '')
    .replace(/^Gua\s+/i, '')
    .replace(/^Air\s+Terjun\s+/i, '')
    .replace(/^Gunung(\s+Api(\s+Purba)?)?\s+/i, '')
    .replace(/^Hutan\s+Pinus\s+/i, '')
    .replace(/^Bukit\s+/i, '')
    .replace(/^Embung\s+/i, '')
    .replace(/^Punthuk\s+/i, '')
    .replace(/^Tebing\s+/i, '')
    .replace(/^Gumuk\s+Pasir\s+/i, '')
    .replace(/^Museum\s+/i, '')
    .replace(/^Benteng\s+/i, '')
    .replace(/^Plaza\s+/i, '')
    .replace(/^Hotel\s+/i, '')
    .replace(/^Apotek\s+/i, '')
    .replace(/^Klinik\s+(Gigi\s+)?(Pratama\s+)?/i, '')
    .replace(/^Kantor\s+/i, '')
    .replace(/^RS\s+/i, '')
    .replace(/^RSUP\s+Dr\.\s+/i, '')
    .replace(/^RSUD\s+/i, '')
    .replace(/^Terminal\s+(Sub-)?/i, '')
    .replace(/^Sub-Terminal\s+/i, '')
    .replace(/^Bengkel\s+(Motor\s+)?(Variasi\s+)?/i, '')
    .trim()

  const list = new Set([name, cleaned])
  // Common Yogya-friendly title variant
  list.add(`${cleaned}, Yogyakarta`)
  list.add(`${cleaned} Yogyakarta`)
  return [...list].filter(Boolean)
}

async function tryWikipedia(name) {
  for (const title of candidateTitles(name)) {
    const encoded = encodeURIComponent(title.replace(/\s+/g, '_'))
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`
    let res
    try {
      res = await fetch(url, { headers: { 'User-Agent': 'cityriders-seed-script/1.0' } })
    } catch {
      continue
    }
    if (!res.ok) continue
    const data = await res.json().catch(() => null)
    if (!data) continue
    const img =
      data.originalimage?.source ??
      data.thumbnail?.source ??
      null
    if (img) return { url: img, title }
  }
  return null
}

// ─── Per-place pipeline ──────────────────────────────────────────────
async function fetchBytes(srcUrl) {
  const res = await fetch(srcUrl, {
    redirect: 'follow',
    headers: { 'User-Agent': 'cityriders-seed-script/1.0' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${srcUrl}`)
  const contentType = res.headers.get('content-type') ?? 'image/jpeg'
  const buffer = Buffer.from(await res.arrayBuffer())
  // Pick file extension from content-type. Default to jpg for anything
  // we can't read so the bucket's allowed_mime_types accepts it.
  let ext = 'jpg'
  if (contentType.includes('png')) ext = 'png'
  else if (contentType.includes('webp')) ext = 'webp'
  else if (contentType.includes('svg')) {
    // Wikipedia occasionally returns SVG (logos, coats of arms). Bucket
    // doesn't allow svg, so we skip these and let category fallback win.
    throw new Error('svg result skipped')
  }
  return { buffer, ext, contentType: ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg' }
}

async function processPlace(p) {
  const log = (msg) => console.log(`[${p.slug.padEnd(34)}] ${msg}`)
  let source = 'wikipedia'
  let imageBytes

  // Try Wikipedia first.
  const wiki = await tryWikipedia(p.name)
  if (wiki) {
    try {
      imageBytes = await fetchBytes(wiki.url)
      log(`wiki "${wiki.title}" → ${imageBytes.buffer.length}B ${imageBytes.contentType}`)
    } catch (e) {
      log(`wiki failed (${e.message}), falling back`)
      imageBytes = null
    }
  }

  // Fall back to Picsum seeded by category.
  if (!imageBytes) {
    source = 'picsum'
    const seed = CATEGORY_SEEDS[p.category] ?? `cityrider-${p.category}`
    const picsumUrl = `https://picsum.photos/seed/${encodeURIComponent(seed)}/800/600`
    imageBytes = await fetchBytes(picsumUrl)
    log(`picsum (${p.category}) → ${imageBytes.buffer.length}B`)
  }

  const path = `${p.slug}.${imageBytes.ext}`
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, imageBytes.buffer, {
      contentType: imageBytes.contentType,
      upsert: true,
    })
  if (upErr) throw new Error(`upload: ${upErr.message}`)

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const publicUrl = pub.publicUrl

  const { error: dbErr } = await supabase
    .from('places')
    .update({ image_urls: [publicUrl] })
    .eq('id', p.id)
  if (dbErr) throw new Error(`update: ${dbErr.message}`)

  return { slug: p.slug, source, publicUrl }
}

// ─── Driver ──────────────────────────────────────────────────────────
async function main() {
  console.log('Ensuring bucket...')
  await ensureBucket()

  console.log('Loading approved places...')
  const { data: places, error } = await supabase
    .from('places')
    .select('id, slug, name, category')
    .eq('status', 'approved')
    .order('slug')
  if (error) throw error
  console.log(`Loaded ${places.length} places.\n`)

  const stats = { wikipedia: 0, picsum: 0, failed: 0 }
  for (const p of places) {
    try {
      const res = await processPlace(p)
      stats[res.source]++
    } catch (e) {
      stats.failed++
      console.error(`[${p.slug}] FAILED: ${e.message}`)
    }
  }

  console.log('\n— Done —')
  console.log(`Wikipedia photos: ${stats.wikipedia}`)
  console.log(`Picsum fallback:  ${stats.picsum}`)
  console.log(`Failed:           ${stats.failed}`)
  console.log(`Total:            ${places.length}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
