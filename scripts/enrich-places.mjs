// enrich-places.mjs
// Free-and-legal enrichment of the approved Indonesian `places` rows.
//
//   Sources
//     • Wikimedia Commons (https://commons.wikimedia.org/w/api.php) for photos
//     • Nominatim (https://nominatim.openstreetmap.org) for address + coords
//     • Overpass (https://overpass-api.de) for nearby phone/hours/website
//
//   Safety rails
//     • Only fills NULL fields — never overwrites an existing description,
//       address, lat, lng, hours_json, phone, website
//     • PREPENDS new Wikimedia URLs to image_urls so curated photos win
//     • Skips rows that already have ≥2 image_urls (treated as enriched)
//     • Resumable: appends each completed slug to processed-slugs.txt
//     • Respects Nominatim's 1 req/sec policy + sends a real User-Agent
//
//   Run (from repo root):
//     node scripts/enrich-places.mjs
//
//   Notes on writes
//     • SELECTs go through the Supabase Management API SQL endpoint so we
//       can rely on the existing SUPABASE_ACCESS_TOKEN
//     • UPDATEs go through the service-role REST endpoint — many small
//       row-level writes are cheaper there than re-opening a SQL session

import { readFileSync, existsSync, appendFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// ─── env ─────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env.local')
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

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY
const MGMT_TOKEN   = env.SUPABASE_ACCESS_TOKEN
const PROJECT_REF  = env.SUPABASE_PROJECT_REF

for (const [k, v] of Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
  SUPABASE_ACCESS_TOKEN: MGMT_TOKEN,
  SUPABASE_PROJECT_REF: PROJECT_REF,
})) {
  if (!v) {
    console.error(`Missing ${k} in .env.local`)
    process.exit(1)
  }
}

const UA = 'IndoCity-Enrichment/1.0 (+https://indocity.id)'

// ─── tiny utilities ──────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Global 5 req/sec rate limiter so the combined script never exceeds the
// shared cap even when individual per-API gaps would allow more.
let lastTick = 0
async function rateLimit() {
  const minGap = 1000 / 5
  const now = Date.now()
  const wait = lastTick + minGap - now
  if (wait > 0) await sleep(wait)
  lastTick = Date.now()
}

// fetch wrapper that always sends the policy-required UA and pauses for
// the global rate limit before each call.
async function http(url, init = {}) {
  await rateLimit()
  const headers = { 'User-Agent': UA, ...(init.headers ?? {}) }
  return fetch(url, { ...init, headers })
}

// ─── Supabase Management SQL (SELECTs only) ──────────────────────────
async function sql(query) {
  const r = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MGMT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    },
  )
  if (!r.ok) {
    throw new Error(`sql ${r.status}: ${await r.text()}`)
  }
  return r.json()
}

// ─── Supabase REST UPDATE (service role) ─────────────────────────────
async function updatePlace(id, patch) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/places?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(patch),
  })
  if (!r.ok) {
    throw new Error(`update ${id} → ${r.status}: ${await r.text()}`)
  }
}

// ─── Wikimedia Commons ───────────────────────────────────────────────
// Heuristic: strip Indonesian category prefixes so the search index can
// find e.g. "Borobudur" not "Candi Borobudur" — same trick as the older
// seed-place-images script.
function candidateQueries(name, city) {
  const cleaned = name
    .replace(/^Candi\s+/i, '')
    .replace(/^Pantai\s+/i, '')
    .replace(/^Pasar\s+/i, '')
    .replace(/^Stasiun\s+/i, '')
    .replace(/^Bandara\s+/i, '')
    .replace(/^Klenteng\s+/i, '')
    .replace(/^Goa\s+|^Gua\s+/i, '')
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
    .replace(/^RS\s+|^RSUP\s+Dr\.\s+|^RSUD\s+/i, '')
    .replace(/^Terminal\s+(Sub-)?/i, '')
    .replace(/^Sub-Terminal\s+/i, '')
    .replace(/^Bengkel\s+(Motor\s+)?(Variasi\s+)?/i, '')
    .replace(/\(.+\)$/, '')
    .trim()

  const cityLabel = city ? city.charAt(0).toUpperCase() + city.slice(1) : ''
  const queries = new Set([
    `${cleaned} ${cityLabel}`.trim(),
    `${name} ${cityLabel}`.trim(),
    `${cleaned} Indonesia`,
    name,
    cleaned,
  ])
  return [...queries].filter(Boolean)
}

const PHOTO_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])

// Returns up to `max` full image URLs from Commons matching `query`.
// We use action=query&list=search to find File pages, then a single
// imageinfo batch call (titles=...) to validate MIME + grab the real URL.
async function wikimediaImages(query, max = 3) {
  const searchUrl =
    `https://commons.wikimedia.org/w/api.php?` +
    new URLSearchParams({
      action: 'query',
      list: 'search',
      srnamespace: '6', // File:
      srsearch: query,
      srlimit: '10',
      format: 'json',
      origin: '*',
    })

  let res
  try {
    res = await http(searchUrl)
  } catch {
    return []
  }
  if (!res.ok) return []
  const data = await res.json().catch(() => null)
  const hits = data?.query?.search ?? []
  if (hits.length === 0) return []

  const titles = hits.slice(0, 10).map((h) => h.title).join('|')
  const infoUrl =
    `https://commons.wikimedia.org/w/api.php?` +
    new URLSearchParams({
      action: 'query',
      prop: 'imageinfo',
      iiprop: 'url|mime|size',
      titles,
      format: 'json',
      origin: '*',
    })

  let res2
  try {
    res2 = await http(infoUrl)
  } catch {
    return []
  }
  if (!res2.ok) return []
  const info = await res2.json().catch(() => null)
  const pages = info?.query?.pages ?? {}

  const urls = []
  for (const p of Object.values(pages)) {
    const ii = p?.imageinfo?.[0]
    if (!ii) continue
    if (!PHOTO_MIME.has(ii.mime)) continue   // skip svg/maps/icons
    if (!ii.url) continue
    // Reject tiny thumbnails / icons (<400 px on longest side).
    if ((ii.width ?? 0) < 400 && (ii.height ?? 0) < 400) continue
    // Filter obviously-not-a-photo keywords in the title.
    const t = (p.title ?? '').toLowerCase()
    if (/\b(map|location|locator|svg|logo|coat[_ ]of[_ ]arms|flag|seal|diagram|chart)\b/.test(t)) continue
    urls.push(ii.url)
    if (urls.length >= max) break
  }
  return urls
}

// ─── Nominatim (geocoding) ───────────────────────────────────────────
// Returns { lat, lng, displayName } or null. Caller is responsible for
// the 1 req/sec policy — we add the gap before the next caller resumes.
async function nominatim(name, city) {
  const q = `${name}, ${city}, Indonesia`
  const url =
    `https://nominatim.openstreetmap.org/search?` +
    new URLSearchParams({
      q,
      format: 'json',
      limit: '1',
      countrycodes: 'id',
      addressdetails: '1',
    })

  let res
  try {
    res = await http(url)
  } catch {
    return null
  }
  // Mandatory 1.1s gap regardless of outcome — Nominatim measures bursts.
  await sleep(1100)
  if (!res.ok) return null
  const arr = await res.json().catch(() => null)
  if (!Array.isArray(arr) || arr.length === 0) return null
  const hit = arr[0]
  const lat = parseFloat(hit.lat)
  const lng = parseFloat(hit.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng, displayName: hit.display_name ?? null }
}

// ─── Overpass (phone / opening_hours / website near a coord) ─────────
// We grab the closest node/way/relation within 80m that has one of the
// fields we care about. Free Overpass servers are slow + bursty, so we
// keep the query tight and always honour the 1.5s post-call gap.
async function overpassNearby(lat, lng) {
  const radius = 80
  const ql = `
[out:json][timeout:15];
(
  node(around:${radius},${lat},${lng})[~"phone|contact:phone|opening_hours|website|contact:website"~"."];
  way(around:${radius},${lat},${lng})[~"phone|contact:phone|opening_hours|website|contact:website"~"."];
);
out tags 5;
  `.trim()

  let res
  try {
    res = await http('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: ql,
    })
  } catch {
    await sleep(1500)
    return null
  }
  await sleep(1500)
  if (!res.ok) return null
  const data = await res.json().catch(() => null)
  const els = data?.elements ?? []
  if (els.length === 0) return null

  let phone, opening_hours, website
  for (const el of els) {
    const t = el.tags ?? {}
    phone ??= t.phone ?? t['contact:phone']
    opening_hours ??= t.opening_hours
    website ??= t.website ?? t['contact:website']
    if (phone && opening_hours && website) break
  }
  if (!phone && !opening_hours && !website) return null
  return { phone, opening_hours, website }
}

// ─── per-place pipeline ──────────────────────────────────────────────
async function enrichOne(place, log) {
  const patch = {}
  const touched = []
  let newImageCount = 0

  // 1. Photos — only if we currently have <2 image_urls.
  const existing = Array.isArray(place.image_urls) ? place.image_urls : []
  if (existing.length < 2) {
    const seen = new Set(existing)
    const found = []
    for (const q of candidateQueries(place.name, place.city)) {
      const urls = await wikimediaImages(q, 3 - found.length)
      for (const u of urls) {
        if (seen.has(u)) continue
        seen.add(u)
        found.push(u)
      }
      if (found.length >= 3) break
    }
    if (found.length > 0) {
      // PREPEND new ones so curated photos (if any) stay first-class.
      patch.image_urls = [...found, ...existing]
      newImageCount = found.length
      touched.push(`+${found.length} images`)
    }
  }

  // 2. Geocoding — only if we have NULL lat OR NULL address.
  let nomi = null
  const needsCoords  = place.lat == null || place.lng == null
  const needsAddress = !place.address
  if (needsCoords || needsAddress) {
    nomi = await nominatim(place.name, place.city)
    if (nomi) {
      if (needsCoords) {
        patch.lat = nomi.lat
        patch.lng = nomi.lng
        // Keep PostGIS column in sync via raw SQL fallback later; the
        // REST path can't set a geography column, so we trigger that via
        // sql() after the row update succeeds. Track for the SQL step.
        touched.push('lat,lng')
      }
      if (needsAddress && nomi.displayName) {
        patch.address = nomi.displayName
        touched.push('address')
      }
    }
  }

  // 3. Overpass bonus — needs a real coord (either ours or fresh from Nominatim).
  const haveCoord =
    Number.isFinite(place.lat) && Number.isFinite(place.lng)
      ? { lat: place.lat, lng: place.lng }
      : nomi
  // Only call Overpass if we still need at least one of the bonus fields.
  const needsPhone   = !place.phone
  const needsHours   = place.hours_json == null
  const needsWebsite = !place.website
  if (haveCoord && (needsPhone || needsHours || needsWebsite)) {
    const op = await overpassNearby(haveCoord.lat, haveCoord.lng)
    if (op) {
      if (needsPhone && op.phone) {
        patch.phone = String(op.phone).slice(0, 64)
        touched.push('phone')
      }
      if (needsHours && op.opening_hours) {
        patch.hours_json = { source: 'osm', raw: String(op.opening_hours).slice(0, 500) }
        touched.push('hours_json')
      }
      if (needsWebsite && op.website) {
        patch.website = String(op.website).slice(0, 500)
        touched.push('website')
      }
    }
  }

  if (Object.keys(patch).length === 0) {
    log(`SKIP — nothing to add`)
    return { newImageCount, gotLatLng: false, gotAddress: false }
  }

  await updatePlace(place.id, patch)

  // If we set lat/lng via REST, the PostGIS `location` column won't have
  // been updated (REST can't write geography). Re-sync via the Mgmt SQL
  // endpoint so spatial queries don't go stale.
  if (patch.lat != null && patch.lng != null) {
    try {
      await sql(
        `update places set location = ST_GeogFromText('SRID=4326;POINT(${patch.lng} ${patch.lat})') where id = '${place.id}'`,
      )
    } catch (e) {
      log(`WARN location sync failed: ${e.message}`)
    }
  }

  log(`OK ${touched.join(', ')}`)
  return {
    newImageCount,
    gotLatLng: patch.lat != null,
    gotAddress: patch.address != null,
  }
}

// ─── driver ──────────────────────────────────────────────────────────
async function main() {
  const processedPath = join(__dirname, 'processed-slugs.txt')
  const done = new Set(
    existsSync(processedPath)
      ? readFileSync(processedPath, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
      : [],
  )
  console.log(`Resume cache: ${done.size} slug(s) already processed.`)

  console.log('Loading approved places...')
  const rows = await sql(
    `select id, slug, name, category, city, description, image_urls,
            lat, lng, address, phone, website, hours_json
       from places
      where status = 'approved'
      order by slug`,
  )
  console.log(`Loaded ${rows.length} places.\n`)

  const stats = {
    total: 0,
    skippedResume: 0,
    updated: 0,
    skippedNoop: 0,
    failed: 0,
    newImages: 0,
    newLatLng: 0,
    newAddress: 0,
    perCategoryHits: {}, // category -> { rows, imageHits }
  }

  let i = 0
  for (const p of rows) {
    i++
    stats.total = i

    if (done.has(p.slug)) {
      stats.skippedResume++
      continue
    }

    const log = (msg) => console.log(`[${p.slug}] ${msg}`)
    stats.perCategoryHits[p.category] ??= { rows: 0, imageHits: 0 }
    stats.perCategoryHits[p.category].rows++

    try {
      const r = await enrichOne(p, log)
      if (r.newImageCount > 0) {
        stats.newImages += r.newImageCount
        stats.perCategoryHits[p.category].imageHits++
        stats.updated++
      } else if (r.gotLatLng || r.gotAddress) {
        stats.updated++
      } else {
        stats.skippedNoop++
      }
      if (r.gotLatLng) stats.newLatLng++
      if (r.gotAddress) stats.newAddress++
      // Mark done only on success — failed rows can retry next run.
      appendFileSync(processedPath, p.slug + '\n')
    } catch (e) {
      stats.failed++
      console.error(`[${p.slug}] FAILED: ${e.message}`)
    }

    if (i % 10 === 0) {
      console.log(
        `[${i}/${rows.length}] processed, +${stats.newImages} images so far, +${stats.newLatLng} lat/lng filled`,
      )
    }
  }

  console.log('\n— Done —')
  console.log(`Total rows seen:           ${stats.total}`)
  console.log(`Skipped (already in cache): ${stats.skippedResume}`)
  console.log(`Updated this run:          ${stats.updated}`)
  console.log(`No-op (nothing new):       ${stats.skippedNoop}`)
  console.log(`Failed:                    ${stats.failed}`)
  console.log(`New Wikimedia images:      ${stats.newImages}`)
  console.log(`New lat/lng:               ${stats.newLatLng}`)
  console.log(`New addresses:             ${stats.newAddress}`)
  console.log(`\nCategory image-hit rate:`)
  const cats = Object.entries(stats.perCategoryHits).sort((a, b) => a[0].localeCompare(b[0]))
  for (const [c, v] of cats) {
    const pct = v.rows === 0 ? '0%' : `${Math.round((v.imageHits / v.rows) * 100)}%`
    console.log(`  ${c.padEnd(14)} ${v.imageHits}/${v.rows}  (${pct})`)
  }
  console.log(
    `\nZero-hit categories: ${cats.filter(([, v]) => v.imageHits === 0).map(([c]) => c).join(', ') || '(none)'}`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
