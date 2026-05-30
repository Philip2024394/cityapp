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
  console.log('--', sql.replace(/\s+/g, ' ').slice(0, 90))
  console.log((await r.text()).slice(0, 800))
}
await q(`SELECT relname, relrowsecurity FROM pg_class WHERE relname='mock_drivers';`)
await q(`SELECT polname, polcmd, polroles::text, polqual FROM pg_policy WHERE polrelid='public.mock_drivers'::regclass;`)
// Try anon-role SELECT against mock_drivers — simulate the browser client
const anonR = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/mock_drivers?vehicle_type=eq.car&mock_hidden_at=is.null&limit=3&select=slug,business_name`, {
  headers: {
    apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
  },
})
console.log('-- anon GET /mock_drivers status', anonR.status)
console.log((await anonR.text()).slice(0, 600))
