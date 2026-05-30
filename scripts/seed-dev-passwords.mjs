#!/usr/bin/env node
// Set a known password on all seeded driver auth.users rows so the dev
// impersonation route can use signInWithPassword (since the Supabase
// admin generateLink API returns "Database error" on this project).
import { readFileSync } from 'node:fs'

const env = {}
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue
  const i = line.indexOf('=')
  if (i === -1) continue
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim()
}

const DEV_PASSWORD = 'devpass-cityriders-2026'

const sql = `
UPDATE auth.users
SET encrypted_password = crypt($pw$${DEV_PASSWORD}$pw$, gen_salt('bf'))
WHERE id IN (
  SELECT user_id FROM public.drivers WHERE status='active'
);
SELECT count(*) as updated FROM auth.users WHERE id IN (
  SELECT user_id FROM public.drivers WHERE status='active'
);
`

const r = await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
})
console.log('status', r.status)
console.log((await r.text()).slice(0, 1500))
