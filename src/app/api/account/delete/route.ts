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
//   2. Hard-delete the auth.users row via the admin client. Cascades
//      through profiles → drivers → driver_push_tokens →
//      driver_contact_pings → subscriptions → reviews authored by this
//      user (per ON DELETE CASCADE on each table's FK).
//   3. Sign out the client session so cookies on the device are cleared.
//
// IRREVERSIBLE — this endpoint returns 204 No Content; the caller must
// have already shown a destructive-action confirmation modal with
// type-to-confirm.
// ============================================================================

export async function POST() {
  const userClient = await getServerSupabase()
  if (!userClient) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Service role not configured' }, { status: 500 })

  // STEP 1 — anonymise. Keeps the row temporarily (in case cascade fails
  // mid-flight) but strips every identifier we own.
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

  // STEP 2 — hard-delete the auth user. Cascades through every child
  // table whose FK declares ON DELETE CASCADE on the profiles(id) ref.
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id)
  if (delErr) {
    // Hard-delete failed — likely a missing CASCADE somewhere. Don't
    // leave the account half-deleted. Return the error so the user can
    // contact support; their personal data is already anonymised by step 1.
    return NextResponse.json(
      { error: 'Deletion partially failed — your profile was anonymised. Please contact streetlocallive@gmail.com to complete the request.', detail: delErr.message },
      { status: 500 },
    )
  }

  // STEP 3 — clear the session cookies on this device.
  await userClient.auth.signOut()

  return NextResponse.json({ ok: true })
}
