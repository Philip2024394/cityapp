#!/usr/bin/env node
import { readFileSync } from 'node:fs'

const env = {}
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue
  const i = line.indexOf('=')
  if (i === -1) continue
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim()
}

async function q(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  return { status: r.status, body: await r.text() }
}

const r1 = await q("select user_id, slug, business_name, vehicle_type, status from drivers where slug = 'made-yk' limit 1")
console.log('--- drivers.slug=made-yk:', r1.status)
console.log(r1.body)

const r2 = await q("select id, slug, business_name, vehicle_type from mock_drivers where slug = 'made-yk' limit 1")
console.log('--- mock_drivers.slug=made-yk:', r2.status)
console.log(r2.body)
