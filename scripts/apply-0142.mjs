#!/usr/bin/env node
// One-off — applies supabase/migrations/0142_payments_legal_faq.sql
// against the linked Supabase project via the Management API. Reads
// SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF from .env.local.
//
// Idempotent: every statement in 0142 is `if not exists` / `drop+create`.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvLocal() {
  const raw = readFileSync('.env.local', 'utf8')
  const env = {}
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const val = line.slice(idx + 1).trim().replace(/^"|"$/g, '')
    env[key] = val
  }
  return env
}

const env = loadEnvLocal()
const token = env.SUPABASE_ACCESS_TOKEN
const ref   = env.SUPABASE_PROJECT_REF
if (!token || !ref) {
  console.error('Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF in .env.local')
  process.exit(2)
}

const sql = readFileSync(resolve('supabase/migrations/0142_payments_legal_faq.sql'), 'utf8')

const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: {
    Authorization:  `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
})
const text = await r.text()
console.log('status', r.status)
console.log(text.slice(0, 3000))
process.exit(r.ok ? 0 : 1)
