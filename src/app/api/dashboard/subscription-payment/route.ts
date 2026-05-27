import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// POST /api/dashboard/subscription-payment
// ----------------------------------------------------------------------------
// Driver submits a QRIS payment screenshot. We:
//   1. Authenticate the caller (must be a signed-in driver).
//   2. Verify they own a drivers row with a paid vehicle_type
//      (car / truck / premium_car / minibus — bike is free).
//   3. Accept the uploaded image (multipart/form-data, field 'screenshot').
//   4. Upload to the 'subscription-screenshots' bucket under
//      {user_id}/{vehicle_type}/{timestamp}.{ext}.
//   5. Insert a subscription_payments row with status='pending'.
//   6. Optimistically bump drivers.paid_until = greatest(paid_until,
//      today) + 30 days so the listing goes live IMMEDIATELY. Admin
//      verifies later; on reject, admin will revert paid_until via the
//      /admin/subscriptions tool.
//
// COMPLIANCE: IndoCity does not process or custody funds. The driver
// pays externally via QRIS in their banking app; we simply record the
// proof of payment + extend their listing window.
// ============================================================================

const PAID_VEHICLE_TYPES = new Set(['car', 'truck', 'premium_car', 'minibus'])
const PAID_LISTING_TYPES = new Set([...PAID_VEHICLE_TYPES, 'place'])
const MAX_BYTES = 5 * 1024 * 1024 // 5MB cap — payment screenshots are tiny
const PERIOD_DAYS = 30

export async function POST(req: Request) {
  // 1. Auth
  const supabase = await getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  // 2. Multipart form parse
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }
  const file = form.get('screenshot')
  // The form field is still called `vehicleType` for backwards compat
  // with the car/bus/truck dashboards already in production. The value
  // can now also be 'place' (per migration 0099) — treated as a generic
  // listing_type discriminator under the same column name.
  const listingType = String(form.get('vehicleType') ?? '').trim()
  // Optional `placeId` — only required when listingType === 'place'.
  // Lets owners with multiple places target a specific listing.
  const placeIdParam = String(form.get('placeId') ?? '').trim()
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing screenshot file' }, { status: 400 })
  }
  if (!PAID_LISTING_TYPES.has(listingType)) {
    return NextResponse.json(
      { error: `listingType must be one of: ${[...PAID_LISTING_TYPES].join(', ')}` },
      { status: 400 },
    )
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Screenshot must be 1 byte–${Math.floor(MAX_BYTES / 1024 / 1024)}MB` },
      { status: 400 },
    )
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Screenshot must be an image' }, { status: 400 })
  }

  // 3. Admin client for storage + DB writes (RLS bypass — we've already
  //    authenticated above).
  const admin = getAdminSupabase()
  if (!admin) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  // 4. Verify the caller owns the listing they're paying for. Branch on
  //    listing kind: vehicle types live in `drivers`, place lives in
  //    `places` keyed on owner_user_id (+ optional ?placeId= when an
  //    owner runs multiple venues).
  let baselinePaidUntil: string | null = null
  let placeRow: { id: string; paid_until: string | null } | null = null
  if (listingType === 'place') {
    let q = admin
      .from('places')
      .select('id, paid_until, owner_user_id')
      .eq('owner_user_id', user.id)
    if (placeIdParam) q = q.eq('id', placeIdParam)
    const { data, error } = await q.order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json(
        { error: 'No place listing found for this account — submit one at /list-place/new first' },
        { status: 404 },
      )
    }
    placeRow = { id: data.id, paid_until: data.paid_until }
    baselinePaidUntil = data.paid_until
  } else {
    const { data: driverRow, error: driverErr } = await admin
      .from('drivers')
      .select('user_id, vehicle_type, paid_until')
      .eq('user_id', user.id)
      .maybeSingle()
    if (driverErr) {
      return NextResponse.json({ error: driverErr.message }, { status: 500 })
    }
    if (!driverRow) {
      return NextResponse.json(
        { error: 'No driver listing found — sign up as a driver first' },
        { status: 404 },
      )
    }
    if (driverRow.vehicle_type !== listingType) {
      return NextResponse.json(
        {
          error: `Your account is registered as ${driverRow.vehicle_type}, not ${listingType}`,
        },
        { status: 403 },
      )
    }
    baselinePaidUntil = driverRow.paid_until
  }

  // 5. Upload to storage under {user_id}/{listing_type}/{timestamp}.{ext}
  const ext = pickExtension(file.name, file.type)
  const objectPath = `${user.id}/${listingType}/${Date.now()}.${ext}`
  const bytes = new Uint8Array(await file.arrayBuffer())

  const { error: uploadErr } = await admin.storage
    .from('subscription-screenshots')
    .upload(objectPath, bytes, {
      contentType: file.type,
      upsert: false,
    })
  if (uploadErr) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadErr.message}` },
      { status: 500 },
    )
  }

  // 6. Compute new paid_until = greatest(current, today) + 30 days.
  //    Same window for both vehicle + place listings — keeps the admin
  //    queue uniform and avoids surprises when an owner switches kinds.
  const today = new Date()
  const baselineMs = Math.max(
    today.getTime(),
    baselinePaidUntil ? new Date(baselinePaidUntil).getTime() : 0,
  )
  const newPaidUntil = new Date(baselineMs + PERIOD_DAYS * 24 * 60 * 60 * 1000)
  const newPaidUntilStr = newPaidUntil.toISOString().slice(0, 10) // YYYY-MM-DD
  const periodStartStr = today.toISOString().slice(0, 10)

  // 7. Insert the payment row
  const { data: paymentRow, error: insertErr } = await admin
    .from('subscription_payments')
    .insert({
      user_id: user.id,
      vehicle_type: listingType,
      amount_idr: 38000,
      screenshot_url: objectPath, // stored as object path; signed URL on read
      period_start: periodStartStr,
      period_end: newPaidUntilStr,
      status: 'pending',
    })
    .select('id, period_end, status')
    .single()
  if (insertErr) {
    // Roll back the upload so we don't leave orphaned screenshots
    await admin.storage.from('subscription-screenshots').remove([objectPath])
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  // 8. Optimistic activation — bump the listing's paid_until.
  //    Vehicle: drivers.paid_until (matched by owner user_id).
  //    Place:   places.paid_until (matched by the place_id resolved above).
  let updateErr: { message: string } | null = null
  if (listingType === 'place' && placeRow) {
    const { error } = await admin
      .from('places')
      .update({ paid_until: newPaidUntilStr })
      .eq('id', placeRow.id)
    updateErr = error
  } else {
    const { error } = await admin
      .from('drivers')
      .update({ paid_until: newPaidUntilStr })
      .eq('user_id', user.id)
    updateErr = error
  }
  if (updateErr) {
    // Payment row is recorded; admin can re-fire activation manually
    return NextResponse.json(
      {
        warning:
          'Payment recorded but listing activation failed — contact support',
        paymentId: paymentRow.id,
        error: updateErr.message,
      },
      { status: 207 },
    )
  }

  return NextResponse.json({
    ok: true,
    paymentId: paymentRow.id,
    activeUntil: newPaidUntilStr,
    status: 'pending',
    message:
      'Payment submitted. Your listing is now active. Admin will verify your payment shortly.',
  })
}

// Pick a sensible file extension from the upload's filename or MIME.
// Defaults to 'jpg' so we never end up with a missing extension which
// breaks some browsers' downloads.
function pickExtension(filename: string, mime: string): string {
  const fromName = filename.toLowerCase().match(/\.([a-z0-9]{1,5})$/)?.[1]
  if (fromName && ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'].includes(fromName)) {
    return fromName === 'jpeg' ? 'jpg' : fromName
  }
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/gif') return 'gif'
  if (mime === 'image/heic' || mime === 'image/heif') return 'heic'
  return 'jpg'
}
