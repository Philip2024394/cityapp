#!/usr/bin/env node
// Applies supabase/migrations/0144_drivers_legal_faq.sql via the
// Supabase Management API. Idempotent (add if not exists everywhere).

import { readFileSync } from 'node:fs'

const env = {}
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue
  const idx = line.indexOf('=')
  if (idx === -1) continue
  env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
}

const token = env.SUPABASE_ACCESS_TOKEN
const ref   = env.SUPABASE_PROJECT_REF
if (!token || !ref) {
  console.error('Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF in .env.local')
  process.exit(2)
}

const sql = readFileSync('supabase/migrations/0144_drivers_legal_faq.sql', 'utf8')

const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
})
const text = await r.text()
console.log('status', r.status)
console.log(text.slice(0, 3000))
process.exit(r.ok ? 0 : 1)
