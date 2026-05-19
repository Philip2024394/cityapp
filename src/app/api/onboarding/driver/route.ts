import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { isValidSlug } from '@/lib/slug'
import type { ServiceType, BikeType } from '@/types/database'

// ============================================================================
// POST /api/onboarding/driver
// ----------------------------------------------------------------------------
// Creates the drivers row + 14-day trial subscriptions row for the
// authenticated user. Sets profile.role = 'driver' (in case the user signed
// up as customer and converted later).
//
// Uses service-role to write both rows atomically so the new rider always
// has a matching subscription state.
// ============================================================================

const ALLOWED_SERVICES: ServiceType[] = ['person', 'parcel', 'food']
const ALLOWED_BIKE_TYPES: BikeType[] = ['matic', 'sport', 'manual']

type OnboardingPayload = {
  slug: string
  business_name: string
  bio?: string
  whatsapp_e164: string
  city?: string
  area?: string
  service_zone_center_lat?: number
  service_zone_center_lng?: number
  service_zone_radius_km?: number
  bike_make?: string
  bike_model?: string
  bike_year?: number
  bike_color?: string
  bike_plate?: string
  bike_type?: BikeType
  bike_cc?: number
  has_box?: boolean
  services: ServiceType[]
  price_per_km: number
  min_fee: number
  pitstop_fee?: number
  accepts_cash?: boolean
  accepts_qr?: boolean
  accepts_transfer?: boolean
  qr_payment_url?: string
  transfer_details?: string
  /** Optional affiliate attribution — agent_code from streetlocal landing
   *  ?ref= URL. Persisted onto drivers row; a trigger then creates the
   *  matching affiliate_referrals entry. Invalid / unknown codes are
   *  silently ignored at the DB layer. */
  referrer_agent_code?: string
}

export async function POST(req: Request) {
  const supabase = await getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500 })
  }
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  let body: OnboardingPayload
  try {
    body = (await req.json()) as OnboardingPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Server-side validation
  // ──────────────────────────────────────────────────────────────────────────
  if (!isValidSlug(body.slug)) {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })
  }
  if (!body.business_name || body.business_name.trim().length < 2) {
    return NextResponse.json({ error: 'Business name is required' }, { status: 400 })
  }
  // Normalize defensively — supabase auth may return phone with or without
  // the leading "+", and we always want the canonical "62XXXXXXXXX" shape
  // before validating + persisting.
  const normalizedPhone = (body.whatsapp_e164 || '').replace(/\D/g, '')
  if (!/^62\d{8,14}$/.test(normalizedPhone)) {
    return NextResponse.json({ error: 'Invalid WhatsApp number' }, { status: 400 })
  }
  body.whatsapp_e164 = normalizedPhone
  if (
    !Array.isArray(body.services) ||
    body.services.length === 0 ||
    !body.services.every((s) => ALLOWED_SERVICES.includes(s))
  ) {
    return NextResponse.json({ error: 'Pick at least one service' }, { status: 400 })
  }
  if (!Number.isFinite(body.price_per_km) || body.price_per_km < 1000 || body.price_per_km > 50000) {
    return NextResponse.json({ error: 'Price per km out of range' }, { status: 400 })
  }
  if (!Number.isFinite(body.min_fee) || body.min_fee < 0 || body.min_fee > 500000) {
    return NextResponse.json({ error: 'Minimum fee out of range' }, { status: 400 })
  }
  if (body.bike_type && !ALLOWED_BIKE_TYPES.includes(body.bike_type)) {
    return NextResponse.json({ error: 'Invalid bike type' }, { status: 400 })
  }
  if (
    !body.accepts_cash &&
    !body.accepts_qr &&
    !body.accepts_transfer
  ) {
    return NextResponse.json({ error: 'Accept at least one payment method' }, { status: 400 })
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Use service-role to make atomic writes — profile.role + drivers + subscription
  // ──────────────────────────────────────────────────────────────────────────
  const admin = getAdminSupabase()
  if (!admin) {
    return NextResponse.json({ error: 'Service role not configured' }, { status: 500 })
  }

  // Reject if this slug is taken by a different user
  const { data: existing } = await admin
    .from('drivers')
    .select('user_id')
    .eq('slug', body.slug)
    .maybeSingle()
  if (existing && existing.user_id !== user.id) {
    return NextResponse.json({ error: 'That short link is already taken' }, { status: 409 })
  }

  // 1. Ensure profile.role = driver
  const profileUpdate = await admin
    .from('profiles')
    .update({ role: 'driver' })
    .eq('id', user.id)
  if (profileUpdate.error) {
    return NextResponse.json({ error: profileUpdate.error.message }, { status: 500 })
  }

  // 2. Upsert drivers row
  const driverUpsert = await admin.from('drivers').upsert({
    user_id: user.id,
    slug: body.slug,
    business_name: body.business_name.trim(),
    bio: body.bio?.trim() || null,
    whatsapp_e164: body.whatsapp_e164,
    city: body.city?.trim() || null,
    area: body.area?.trim() || null,
    service_zone_center_lat: body.service_zone_center_lat ?? null,
    service_zone_center_lng: body.service_zone_center_lng ?? null,
    service_zone_radius_km: body.service_zone_radius_km ?? 15,
    bike_make: body.bike_make?.trim() || null,
    bike_model: body.bike_model?.trim() || null,
    bike_year: body.bike_year ?? null,
    bike_color: body.bike_color?.trim() || null,
    bike_plate: body.bike_plate?.trim() || null,
    bike_type: body.bike_type ?? null,
    bike_cc: body.bike_cc ?? null,
    has_box: body.has_box ?? false,
    services: body.services,
    price_per_km: Math.round(body.price_per_km),
    min_fee: Math.round(body.min_fee),
    pitstop_fee: Math.round(body.pitstop_fee ?? 0),
    accepts_cash: body.accepts_cash ?? true,
    accepts_qr: body.accepts_qr ?? false,
    accepts_transfer: body.accepts_transfer ?? false,
    qr_payment_url: body.qr_payment_url?.trim() || null,
    transfer_details: body.transfer_details?.trim() || null,
    referrer_agent_code: body.referrer_agent_code?.trim().toUpperCase() || null,
    status: 'active',
    availability: 'offline',
  })
  if (driverUpsert.error) {
    return NextResponse.json({ error: driverUpsert.error.message }, { status: 500 })
  }

  // 3. Seed 14-day trial subscription if not already present
  const trialEnd = new Date()
  trialEnd.setDate(trialEnd.getDate() + 14)
  const subUpsert = await admin.from('subscriptions').upsert({
    driver_id: user.id,
    status: 'trial',
    trial_ends_at: trialEnd.toISOString(),
    amount_idr: 30000,
  })
  if (subUpsert.error) {
    return NextResponse.json({ error: subUpsert.error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, slug: body.slug })
}
