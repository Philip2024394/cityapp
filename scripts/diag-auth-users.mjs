import { readFileSync } from 'node:fs'
const env = {}
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue
  const i = line.indexOf('=')
  if (i === -1) continue
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim()
}
async function q(sql) {
  const r = await fetch('https://api.supabase.com/v1/projects/' + env.SUPABASE_PROJECT_REF + '/database/query', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + env.SUPABASE_ACCESS_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  console.log('--', sql.replace(/\s+/g, ' ').slice(0, 80))
  console.log(await r.text())
}
await q(`SELECT id, email, phone, aud, role, instance_id, email_confirmed_at IS NOT NULL as confirmed, encrypted_password IS NOT NULL as has_pw FROM auth.users WHERE id='d3000001-0000-0000-0000-000000000006';`)
await q(`SELECT DISTINCT instance_id FROM auth.users WHERE instance_id IS NOT NULL LIMIT 1;`)
