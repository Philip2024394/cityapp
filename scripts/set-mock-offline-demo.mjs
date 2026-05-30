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

// Flip TWO car mocks to non-online states so the user can preview the
// banner copy variants. Restore via `npm run mock:restore-online` or by
// running the inverse manually.
//   • dwi-toyota-innova-jogja  → 'offline' (red banner)
//   • siti-honda-mobilio-sleman → 'busy'   (amber banner)
const r = await q(`
  update public.mock_drivers
     set availability = 'offline'
   where slug = 'dwi-toyota-innova-jogja';
  update public.mock_drivers
     set availability = 'busy'
   where slug = 'siti-honda-mobilio-sleman';
`)
console.log('status', r.status)
console.log(r.body)
