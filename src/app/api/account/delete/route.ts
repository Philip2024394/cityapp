import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// POST /api/account/delete
// ----------------------------------------------------------------------------
// User-initiated account deletion. Required by Google Play Store policy
// (since 2024) for any app that creates user accounts, AND by UU 27/2022
// (Indonesia PDP, right to be forgotten).
//
// FLOW:
//   1. Anonymise the drivers row FIRST (clears personal fields). This
//      hardens against any race where a request reads the row between
//      the anonymise step and the cascade.
//   2. Delete every KTP image owned by the user from the private
//      `ktp-images` bucket. We do this BEFORE the auth.users delete so
//      the storage RLS policy `ktp_owner_delete` (mig 0065) still grants
//      access via the service role (service role bypasses anyway, but
//      keeps the ownership ordering clean for audit).
//   3. Anonymise the 5 provider rows that have ktp_image_url columns,
//      then null the column so the path doesn't linger after the cascade
//      drops the row entirely. (CASCADE on user_id will hard-delete
//      them in step 4, but defensive in case the FK action ever changes.)
//   4. Hard-delete the auth.users row via the admin client. Cascades
//      through profiles → drivers → driver_push_tokens → subscriptions
//      → reviews → and the 5 provider tables (massage / beautician /
//      laundry / handyman / home_clean — all `on delete cascade` on
//      auth.users(id), verified in audit).
//   5. Sign out the client session so cookies on the device are cleared.
//
// IRREVERSIBLE.
// ============================================================================

// Provider tables that link directly to auth.users via user_id and own a
// ktp_image_url storage path that must be wiped from the bucket.
const PROVIDER_TABLES = [
  'massage_providers',
  'beautician_providers',
  'laundry_providers',
  'handyman_providers',
  'home_clean_providers',
] as const

export async function POST() {
  const userClient = await getServerSupabase()
  if (!userClient) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Service role not configured' }, { status: 500 })

  // STEP 1 — anonymise drivers (defensive)
  await admin
    .from('drivers')
    .update({
      business_name: '[deleted account]',
      slug: `deleted-${crypto.randomUUID()}`,
      whatsapp_e164: '',
      brand_logo_url: null,
      bio: null,
      area: null,
      current_lat: null,
      current_lng: null,
      business_notes: null,
      tour_guide_notes: null,
      booking_alerts_enabled: false,
      tour_guide_enabled: false,
      business_contract_enabled: false,
      qr_payment_url: null,
      transfer_details: null,
      status: 'deleted',
    })
    .eq('user_id', user.id)

  // STEP 2 — wipe KTP files from the private bucket. We collect every
  // ktp_image_url stored in any provider table for this user, then call
  // storage.remove() with the full list. Legacy paste-URL rows (full
  // https://… URLs from before mig 0065) are skipped because they live
  // on third-party CDNs we can't delete — best-effort only.
  const ktpPaths: string[] = []
  for (const table of PROVIDER_TABLES) {
    const { data: rows } = await admin
      .from(table)
      .select('ktp_image_url')
      .eq('user_id', user.id)
    if (!rows) continue
    for (const row of rows as { ktp_image_url: string | null }[]) {
      const v = row.ktp_image_url
      // Storage paths look like "<uid>/<uuid>.jpg" — no scheme, no slash prefix.
      // Legacy URLs start with http(s)://; skip those.
      if (v && !/^https?:\/\//i.test(v) && v.startsWith(`${user.id}/`)) {
        ktpPaths.push(v)
      }
    }
  }
  if (ktpPaths.length > 0) {
    // Best-effort. Failures are logged but don't block the auth delete —
    // orphaned bucket objects can be swept by a periodic admin job.
    const { error: rmErr } = await admin.storage.from('ktp-images').remove(ktpPaths)
    if (rmErr) console.error('[account/delete] ktp wipe failed', { code: rmErr.message, paths: ktpPaths.length })
  }

  // STEP 3 — null ktp_image_url across provider tables (so the cascade
  // doesn't leave a dangling path reference if the row is read mid-flight).
  for (const table of PROVIDER_TABLES) {
    await admin
      .from(table)
      .update({ ktp_image_url: null, status: 'removed' })
      .eq('user_id', user.id)
  }

  // STEP 4 — hard-delete the auth user. Cascades through profiles → drivers,
  // and through user_id ON DELETE CASCADE on each provider table.
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id)
  if (delErr) {
    return NextResponse.json(
      { error: 'Deletion partially failed — your personal data was anonymised and KTP files removed. Please contact streetlocallive@gmail.com to complete the request.', detail: delErr.message },
      { status: 500 },
    )
  }

  // STEP 5 — clear the session cookies on this device.
  await userClient.auth.signOut()

  return NextResponse.json({ ok: true })
}
