// ============================================================================
// dev-create-driver.mjs
// ----------------------------------------------------------------------------
// One-shot dev script to create a confirmed driver account + generate a
// magic-link the user can paste into their browser to sign in. Bypasses
// SMS OTP entirely — useful when the Supabase project doesn't have a
// phone provider configured.
//
// Usage:
//   node scripts/dev-create-driver.mjs <e164-phone> [email]
//
// Example:
//   node scripts/dev-create-driver.mjs 6281392000050 phil+test@gmail.com
//
// Reads env from .env.local (SUPABASE_URL + SERVICE_ROLE_KEY).
// Idempotent: if the user / driver already exists, prints the magic link
// without re-creating.
// ============================================================================

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

// Quick + dirty .env.local loader (no dotenv dep)
function loadEnv() {
  try {
    const raw = readFileSync('.env.local', 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!m) continue
      const [, k, vRaw] = m
      const v = vRaw.replace(/^["']|["']$/g, '')
      if (!(k in process.env)) process.env[k] = v
    }
  } catch { /* no .env.local — rely on shell env */ }
}
loadEnv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}

const rawPhone = process.argv[2]
const rawEmail = process.argv[3] ?? 'phillipofarrell+cityrider@gmail.com'
if (!rawPhone) {
  console.error('Usage: node scripts/dev-create-driver.mjs <e164-phone> [email]')
  process.exit(1)
}

// Normalise phone — accept "6281...", "081...", "+6281..." → "+6281..."
function normalisePhone(raw) {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('62')) return '+' + digits
  if (digits.startsWith('0'))  return '+62' + digits.slice(1)
  if (digits.startsWith('8'))  return '+62' + digits
  return '+' + digits
}
const phone = normalisePhone(rawPhone)
if (!phone) { console.error('Invalid phone'); process.exit(1) }

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

// ─── Step 1: ensure auth user exists (confirmed) ───────────────────────
console.log(`\n[1/4] Ensuring auth user for ${phone} / ${rawEmail}…`)

// listUsers is the cheapest path to find by phone (admin.getUserByEmail
// exists but not getUserByPhone in v2). Page 1 of 50 will cover early dev.
const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 })
let existing = list?.users?.find((u) => u.phone === phone.replace(/^\+/, '') || u.phone === phone || u.email === rawEmail)

let userId
if (existing) {
  userId = existing.id
  console.log(`    ✓ Found existing user ${userId}`)
  // Ensure both phone + email are confirmed + present (idempotent).
  await admin.auth.admin.updateUserById(userId, {
    email: rawEmail,
    phone: phone.replace(/^\+/, ''),
    email_confirm: true,
    phone_confirm: true,
    user_metadata: { full_name: existing.user_metadata?.full_name || 'Test Driver', role: 'driver' },
  })
} else {
  const created = await admin.auth.admin.createUser({
    phone: phone.replace(/^\+/, ''),
    email: rawEmail,
    phone_confirm: true,
    email_confirm: true,
    user_metadata: { full_name: 'Test Driver', role: 'driver' },
  })
  if (created.error) { console.error('createUser failed:', created.error); process.exit(1) }
  userId = created.data.user.id
  console.log(`    ✓ Created auth user ${userId}`)
}

// ─── Step 2: ensure profile row exists with role=driver ────────────────
console.log('[2/4] Ensuring profiles row…')
await admin.from('profiles').upsert({
  id: userId,
  phone: phone.replace(/^\+/, ''),
  full_name: 'Test Driver',
  role: 'driver',
})

// ─── Step 3: ensure drivers row + trial subscription ──────────────────
console.log('[3/4] Ensuring drivers row + trial subscription…')

const slug = 'test-driver-' + phone.slice(-4)
const { error: driverErr } = await admin.from('drivers').upsert({
  user_id: userId,
  slug,
  business_name: 'Test Driver',
  bio: 'Dev account — feel free to edit your profile.',
  whatsapp_e164: phone.replace(/^\+/, ''),
  city: 'Yogyakarta',
  area: 'Tugu',
  service_zone_center_lat: -7.7928,
  service_zone_center_lng: 110.3657,
  service_zone_radius_km: 15,
  bike_make: 'Honda',
  bike_model: 'BeAT',
  bike_year: 2022,
  bike_color: 'Hitam',
  bike_type: 'matic',
  bike_cc: 110,
  has_box: true,
  services: ['person', 'parcel', 'food'],
  price_per_km: 4000,
  min_fee: 10000,
  pitstop_fee: 5000,
  accepts_cash: true,
  accepts_qr: true,
  accepts_transfer: false,
  status: 'active',
  availability: 'offline',
}, { onConflict: 'user_id' })
if (driverErr) { console.error('drivers upsert failed:', driverErr); process.exit(1) }

const trialEnd = new Date()
trialEnd.setDate(trialEnd.getDate() + 14)
await admin.from('subscriptions').upsert({
  driver_id: userId,
  status: 'trial',
  trial_ends_at: trialEnd.toISOString(),
  amount_idr: 38000,
}, { onConflict: 'driver_id' })

// ─── Step 4: generate magic link via email (no SMS needed) ─────────────
console.log('[4/4] Generating magic link…')
const linkRes = await admin.auth.admin.generateLink({
  type: 'magiclink',
  email: rawEmail,
  options: { redirectTo: 'http://localhost:5186/dashboard' },
})
if (linkRes.error || !linkRes.data?.properties?.action_link) {
  console.error('generateLink failed:', linkRes.error)
  process.exit(1)
}

const link = linkRes.data.properties.action_link
console.log('\n' + '='.repeat(70))
console.log('✓ DONE — paste this link into your browser to sign in as the driver:\n')
console.log(link)
console.log('\n' + '='.repeat(70))
console.log(`\nDriver: ${slug}`)
console.log(`Phone:  ${phone}`)
console.log(`Email:  ${rawEmail}`)
console.log(`Trial:  ends ${trialEnd.toISOString().slice(0, 10)}`)
console.log('\nAfter clicking the link, you land on /dashboard with full session.')
