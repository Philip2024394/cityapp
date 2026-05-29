#!/usr/bin/env node
// Audit mock_drivers photo coverage for the parcel hub.
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
  console.log('--', query.replace(/\s+/g, ' ').slice(0, 100))
  console.log('status', r.status)
  console.log((await r.text()).slice(0, 4000))
  console.log('')
}

await run(`
SELECT vehicle_type, slug,
       COALESCE(vehicle_make, '') as make,
       COALESCE(vehicle_model, '') as model,
       COALESCE(bike_make, '') as bmake,
       COALESCE(bike_model, '') as bmodel,
       profile_image_url
FROM mock_drivers
WHERE mock_hidden_at IS NULL
  AND vehicle_type IN ('bike','car','truck')
ORDER BY vehicle_type, slug;
`)
