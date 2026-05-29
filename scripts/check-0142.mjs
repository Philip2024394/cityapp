#!/usr/bin/env node
// Verifies migration 0142 actually landed by listing the new columns +
// table from information_schema.

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

async function run(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  return { status: r.status, json: await r.json().catch(() => null) }
}

console.log('payment_provider on beautician_providers:')
console.log(JSON.stringify(await run(
  "select column_name, data_type, column_default from information_schema.columns where table_name='beautician_providers' and column_name in ('payment_provider','stripe_secret_key_enc','midtrans_server_key_enc','legal_terms','legal_privacy','faq_items','faq_enabled') order by column_name;"
), null, 2))

console.log('\nvendor_orders table exists:')
console.log(JSON.stringify(await run(
  "select table_name from information_schema.tables where table_schema='public' and table_name='vendor_orders';"
), null, 2))

console.log('\nsender_phone on contact_messages:')
console.log(JSON.stringify(await run(
  "select column_name from information_schema.columns where table_name='contact_messages' and column_name='sender_phone';"
), null, 2))
