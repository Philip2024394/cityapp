#!/usr/bin/env node
import { readFileSync } from 'node:fs'
const env = {}
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue
  const i = line.indexOf('=')
  if (i === -1) continue
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim()
}
async function run(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  console.log('status', r.status)
  console.log((await r.text()).slice(0, 4000))
}
await run(`SELECT slug, business_name, bike_make, bike_model, vehicle_photos, brand_logo_url FROM drivers WHERE status='active' AND vehicle_type='bike' AND parcel_b2b_enabled=true ORDER BY business_name LIMIT 15;`)
