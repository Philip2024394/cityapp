#!/usr/bin/env node
// Enable parcel_b2b_enabled + suggested defaults on existing active bike
// drivers so the /cityriders/parcel hub renders with real-driver cards.
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
  console.log('status', r.status, (await r.text()).slice(0, 800))
}

await run(`
  UPDATE public.drivers
  SET parcel_b2b_enabled        = true,
      parcel_rate_tiers         = '{"tier_1_5":9000,"tier_6_20":7000,"tier_21_50":5500,"tier_51_100":4500,"tier_100_plus_negotiate":true}'::jsonb,
      parcel_daily_capacity     = 40,
      parcel_service_zone       = 'Sleman + Bantul + Kota Yogyakarta',
      parcel_outer_zone_surcharge = 3000
  WHERE status = 'active'
    AND vehicle_type = 'bike'
    AND parcel_b2b_enabled = false;
`)

await run(`SELECT slug, business_name, parcel_b2b_enabled FROM public.drivers WHERE vehicle_type='bike' AND status='active' ORDER BY business_name;`)
