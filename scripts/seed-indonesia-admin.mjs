// ============================================================================
// seed-indonesia-admin.mjs
// ----------------------------------------------------------------------------
// Seeds the Indonesia administrative hierarchy from emsifa/api-wilayah-
// indonesia into Supabase. 4 levels:
//   provinces  (38)
//   regencies  (514)
//   districts  (7,277)
//   villages   (83,344)
//
// Usage:
//   node scripts/seed-indonesia-admin.mjs                # all 4 levels
//   node scripts/seed-indonesia-admin.mjs --level=provinces
//   node scripts/seed-indonesia-admin.mjs --level=regencies
//   node scripts/seed-indonesia-admin.mjs --level=districts
//   node scripts/seed-indonesia-admin.mjs --level=villages
//   node scripts/seed-indonesia-admin.mjs --level=all --from=<id>
//
// Idempotent: upserts by id, so re-running picks up where you left off.
// Resumable: --from=<regency_id> resumes a districts batch mid-way.
// Throttled: 5 concurrent fetches by default — emsifa is a static-file
// API on Vercel/Cloudflare so this is comfortably within rate limits.
// ============================================================================

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

// ─── env loader (no dotenv dep) ───────────────────────────────────────
function loadEnv() {
  try {
    const raw = readFileSync('.env.local', 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!m) continue
      const [, k, vRaw] = m
      const v = vRaw.replace(/^["']|["']$/g, '')
      if (!(k in process.env)) process.env[k] = v
    }
  } catch { /* no .env.local */ }
}
loadEnv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/)
    return m ? [m[1], m[2] ?? true] : [a, true]
  }),
)

const LEVEL = args.level ?? 'all'
const RESUME_FROM = args.from ?? null
const CONCURRENCY = parseInt(args.concurrency ?? '5', 10)
const UPSERT_BATCH = 500

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

// ─── HTTP fetch with retry ────────────────────────────────────────────
const BASE = 'https://www.emsifa.com/api-wilayah-indonesia/api'

async function fetchJson(path, attempt = 1) {
  try {
    const res = await fetch(`${BASE}/${path}`)
    if (!res.ok) {
      if (res.status === 404) return null
      throw new Error(`HTTP ${res.status}`)
    }
    return res.json()
  } catch (err) {
    if (attempt >= 4) throw err
    const wait = 500 * 2 ** (attempt - 1)
    await new Promise((r) => setTimeout(r, wait))
    return fetchJson(path, attempt + 1)
  }
}

// ─── concurrency-limited parallel runner ──────────────────────────────
async function runParallel(items, limit, worker) {
  const queue = [...items]
  let done = 0
  const total = items.length
  let lastLogTime = Date.now()
  async function next() {
    while (queue.length > 0) {
      const item = queue.shift()
      await worker(item)
      done++
      const now = Date.now()
      if (now - lastLogTime > 5_000 || done === total) {
        const pct = ((done / total) * 100).toFixed(1)
        console.log(`   …${done} / ${total} (${pct}%)`)
        lastLogTime = now
      }
    }
  }
  await Promise.all(Array.from({ length: limit }, next))
}

// ─── upsert in batches ────────────────────────────────────────────────
async function upsertBatched(table, rows) {
  // Dedupe by id WITHIN each batch — Postgres rejects upsert batches
  // where the same id appears twice ("ON CONFLICT DO UPDATE command
  // cannot affect row a second time"). emsifa's village data has a few
  // duplicate IDs across districts (data-quality issue upstream); the
  // dedupe keeps the LAST occurrence, which is good enough since they
  // share the same name.
  const seen = new Map()
  for (const row of rows) seen.set(row.id, row)
  const deduped = [...seen.values()]
  for (let i = 0; i < deduped.length; i += UPSERT_BATCH) {
    const batch = deduped.slice(i, i + UPSERT_BATCH)
    const { error } = await admin.from(table).upsert(batch, { onConflict: 'id' })
    if (error) {
      console.error(`upsert ${table} failed at offset ${i}:`, error.message)
      throw error
    }
  }
}

// ─── seed provinces (38) ──────────────────────────────────────────────
async function seedProvinces() {
  console.log('\n[provinces] fetching…')
  const raw = await fetchJson('provinces.json')
  if (!raw) throw new Error('provinces.json returned 404')
  const rows = raw.map((p) => ({ id: p.id, name: p.name }))
  console.log(`[provinces] upserting ${rows.length} rows…`)
  await upsertBatched('provinces', rows)
  console.log(`[provinces] ✓ ${rows.length} done`)
  return rows
}

// ─── seed regencies (514) ─────────────────────────────────────────────
async function seedRegencies(provinces) {
  console.log(`\n[regencies] fetching across ${provinces.length} provinces…`)
  const allRows = []
  await runParallel(provinces, CONCURRENCY, async (p) => {
    const list = await fetchJson(`regencies/${p.id}.json`)
    if (!list) return
    for (const r of list) {
      const isCity = /^KOTA\s/i.test(r.name)
      allRows.push({
        id: r.id,
        province_id: r.province_id,
        name: r.name,
        type: isCity ? 'kota' : 'kabupaten',
      })
    }
  })
  console.log(`[regencies] upserting ${allRows.length} rows…`)
  await upsertBatched('regencies', allRows)
  console.log(`[regencies] ✓ ${allRows.length} done`)
  return allRows
}

// ─── seed districts (7,277) ───────────────────────────────────────────
async function seedDistricts(regencies, resumeFromId = null) {
  let queue = regencies
  if (resumeFromId) {
    const i = regencies.findIndex((r) => r.id === resumeFromId)
    if (i >= 0) {
      queue = regencies.slice(i)
      console.log(`[districts] resuming from regency ${resumeFromId} (${queue.length} of ${regencies.length})`)
    }
  }
  console.log(`\n[districts] fetching across ${queue.length} regencies…`)
  const buffer = []
  let flushed = 0
  await runParallel(queue, CONCURRENCY, async (r) => {
    const list = await fetchJson(`districts/${r.id}.json`)
    if (!list) return
    for (const d of list) {
      buffer.push({
        id: d.id,
        regency_id: d.regency_id,
        name: d.name,
      })
    }
    if (buffer.length >= UPSERT_BATCH) {
      const slice = buffer.splice(0, buffer.length)
      await upsertBatched('districts', slice)
      flushed += slice.length
    }
  })
  if (buffer.length > 0) {
    await upsertBatched('districts', buffer)
    flushed += buffer.length
  }
  console.log(`[districts] ✓ ${flushed} done`)
  return flushed
}

// ─── seed villages (83,344) ───────────────────────────────────────────
async function seedVillages(resumeFromId = null) {
  // Pull districts from DB rather than memory — supports resuming across
  // a fresh process invocation.
  console.log('\n[villages] loading district list from DB…')
  const districts = []
  let offset = 0
  while (true) {
    const { data, error } = await admin
      .from('districts')
      .select('id')
      .order('id')
      .range(offset, offset + 999)
    if (error) throw error
    if (!data || data.length === 0) break
    districts.push(...data)
    if (data.length < 1000) break
    offset += 1000
  }
  let queue = districts
  if (resumeFromId) {
    const i = districts.findIndex((d) => d.id === resumeFromId)
    if (i >= 0) {
      queue = districts.slice(i)
      console.log(`[villages] resuming from district ${resumeFromId} (${queue.length} of ${districts.length})`)
    }
  }
  console.log(`[villages] fetching across ${queue.length} districts (~83k rows, ~30 min)…`)
  const buffer = []
  let flushed = 0
  await runParallel(queue, CONCURRENCY, async (d) => {
    const list = await fetchJson(`villages/${d.id}.json`)
    if (!list) return
    for (const v of list) {
      buffer.push({
        id: v.id,
        district_id: v.district_id,
        name: v.name,
      })
    }
    if (buffer.length >= UPSERT_BATCH) {
      const slice = buffer.splice(0, buffer.length)
      await upsertBatched('villages', slice)
      flushed += slice.length
    }
  })
  if (buffer.length > 0) {
    await upsertBatched('villages', buffer)
    flushed += buffer.length
  }
  console.log(`[villages] ✓ ${flushed} done`)
  return flushed
}

// ─── main ─────────────────────────────────────────────────────────────
;(async () => {
  const t0 = Date.now()
  try {
    if (LEVEL === 'provinces' || LEVEL === 'all') {
      const provinces = await seedProvinces()
      if (LEVEL === 'all') {
        const regencies = await seedRegencies(provinces)
        if (LEVEL === 'all') {
          await seedDistricts(regencies, RESUME_FROM)
          await seedVillages(RESUME_FROM)
        }
      }
    } else if (LEVEL === 'regencies') {
      const { data: provinces } = await admin.from('provinces').select('id').order('id')
      if (!provinces) throw new Error('No provinces in DB — run --level=provinces first')
      await seedRegencies(provinces)
    } else if (LEVEL === 'districts') {
      const { data: regencies } = await admin.from('regencies').select('id').order('id')
      if (!regencies) throw new Error('No regencies in DB — run --level=regencies first')
      await seedDistricts(regencies, RESUME_FROM)
    } else if (LEVEL === 'villages') {
      await seedVillages(RESUME_FROM)
    } else {
      console.error(`Unknown level: ${LEVEL}`)
      process.exit(1)
    }
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
    console.log(`\n✓ DONE in ${elapsed}s`)
  } catch (err) {
    console.error('\n✗ SEED FAILED:', err)
    process.exit(1)
  }
})()
