import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env = {}
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue
  const i = line.indexOf('=')
  if (i === -1) continue
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim()
}
const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// 1. listUsers — does the admin SDK see the seeded ghosts?
const { data: list, error: listErr } = await s.auth.admin.listUsers({ page: 1, perPage: 50 })
console.log('listUsers error:', listErr?.message)
console.log('user count:', list?.users?.length)
const andi = list?.users?.find(u => u.email === 'demo-driver-andi@cityriders.local')
console.log('andi found?', !!andi, 'id:', andi?.id, 'aud:', andi?.aud, 'role:', andi?.role)

if (andi?.email) {
  const { data: link, error: linkErr } = await s.auth.admin.generateLink({
    type: 'magiclink',
    email: andi.email,
  })
  console.log('magiclink error:', linkErr?.message)
  console.log('magiclink ok?', !!link?.properties?.action_link)
  if (link?.properties?.action_link) console.log('link prefix:', link.properties.action_link.slice(0, 80))
}
