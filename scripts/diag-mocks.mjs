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
  console.log((await r.text()).slice(0, 500))
}
await q(`SELECT vehicle_type, COUNT(*) as visible FROM mock_drivers WHERE mock_hidden_at IS NULL GROUP BY vehicle_type ORDER BY vehicle_type;`)
await q(`SELECT vehicle_type, COUNT(*) as hidden FROM mock_drivers WHERE mock_hidden_at IS NOT NULL GROUP BY vehicle_type ORDER BY vehicle_type;`)
await q(`SELECT vehicle_type, COUNT(*) FROM drivers WHERE status='active' GROUP BY vehicle_type;`)
