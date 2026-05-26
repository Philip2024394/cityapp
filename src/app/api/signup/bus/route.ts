import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { isValidSlug, slugify } from '@/lib/slug'

// ============================================================================
// POST /api/signup/bus
// ----------------------------------------------------------------------------
// Creates the profile (role=driver) + drivers row for a new MINIBUS / BUS
// driver that has already passed the phone-OTP step on /signup/bus. Mirrors
// the car flow's `/api/signup/car` but is scoped to minibus-specific fields:
//
//   • vehicle_type='minibus'
//   • services=['person'] (minibus drivers do passenger rides — tour groups,
//     airport charters, weddings)
//   • vehicle_make / vehicle_model / vehicle_year / vehicle_color /
//     vehicle_plate / vehicle_seats / vehicle_photos
//   • bike_* fields stay NULL (nullable on the drivers table)
//   • paid_until=NULL initially — the driver must pay the 38k/month QRIS
//     subscription via /dashboard/bus before their listing goes live in
//     the public /bus marketplace.
//
// IndoCity is a SOFTWARE DIRECTORY under PM 12/2019. The driver publishes
// their OWN price_per_km, min_fee, pitstop_fee — this route persists those
// numbers as-is. We never compute, modify, or appoint fares.
// ============================================================================

type SignupBusPayload = {
  business_name: string
  full_name?: string
  bio?: string
  whatsapp_e164: string
  city: string
  area?: string
  service_zone_radius_km?: number
  // Slug auto-derived from business_name on the server when not provided.
  slug?: string
  // Vehicle
  vehicle_make: string
  vehicle_model: string
  vehicle_year: number
  vehicle_color: string
  vehicle_plate: string
  vehicle_seats: number
  vehicle_photos?: string[]
  // Pricing (DRIVER-PUBLISHED)
  price_per_km: number
  min_fee: number
  pitstop_fee?: number
  // Payment methods
  accepts_cash?: boolean
  accepts_qr?: boolean
  accepts_transfer?: boolean
  qr_payment_url?: string
  transfer_details?: string
}

// Derive a unique-ish slug from a business name. The user can land on the
// dashboard and edit it later if collisions force a suffix.
async function deriveUniqueSlug(admin: ReturnType<typeof getAdminSupabase>, businessName: string): Promise<string> {
  if (!admin) return slugify(businessName) || 'driver'
  const base = (slugify(businessName) || 'driver').slice(0, 32)
  let candidate = base
  for (let i = 0; i < 25; i++) {
    if (!isValidSlug(candidate)) { candidate = `${base}-${i + 2}`; continue }
    const { data } = await admin.from('drivers').select('user_id').eq('slug', candidate).maybeSingle()
    if (!data) return candidate
    candidate = `${base}-${i + 2}`
  }
  // Fallback: timestamp suffix — guaranteed unique enough for signup
  return `${base}-${Date.now().toString(36).slice(-5)}`
}

export async function POST(req: Request) {
  const supabase = await getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500 })
  }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  let body: SignupBusPayload
  try {
    body = (await req.json()) as SignupBusPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Server-side validation. Mirror /api/signup/car shape.
  // ──────────────────────────────────────────────────────────────────────────
  if (!body.business_name || body.business_name.trim().length < 2) {
    return NextResponse.json({ error: 'Business name is required' }, { status: 400 })
  }
  const normalizedPhone = (body.whatsapp_e164 || '').replace(/\D/g, '')
  if (!/^62\d{8,14}$/.test(normalizedPhone)) {
    return NextResponse.json({ error: 'Invalid WhatsApp number' }, { status: 400 })
  }
  if (!body.city || !body.city.trim()) {
    return NextResponse.json({ error: 'City is required' }, { status: 400 })
  }
  if (!body.vehicle_make || !body.vehicle_make.trim()) {
    return NextResponse.json({ error: 'Vehicle make is required' }, { status: 400 })
  }
  if (!body.vehicle_model || !body.vehicle_model.trim()) {
    return NextResponse.json({ error: 'Vehicle model is required' }, { status: 400 })
  }
  const currentYear = new Date().getFullYear()
  if (!Number.isFinite(body.vehicle_year) || body.vehicle_year < 1990 || body.vehicle_year > currentYear + 1) {
    return NextResponse.json({ error: 'Vehicle year out of range (1990–current)' }, { status: 400 })
  }
  if (!body.vehicle_color || !body.vehicle_color.trim()) {
    return NextResponse.json({ error: 'Vehicle color is required' }, { status: 400 })
  }
  if (!body.vehicle_plate || !body.vehicle_plate.trim()) {
    return NextResponse.json({ error: 'Vehicle plate is required' }, { status: 400 })
  }
  // Minibus seat options — 4/7/8/14/16 covers Avanza/APV through Hiace fleet.
  const ALLOWED_SEATS = new Set([4, 7, 8, 14, 16])
  if (!Number.isFinite(body.vehicle_seats) || !ALLOWED_SEATS.has(body.vehicle_seats)) {
    return NextResponse.json({ error: 'Seats must be one of 4/7/8/14/16' }, { status: 400 })
  }
  if (!Number.isFinite(body.price_per_km) || body.price_per_km < 1000 || body.price_per_km > 50000) {
    return NextResponse.json({ error: 'Price per km out of range' }, { status: 400 })
  }
  if (!Number.isFinite(body.min_fee) || body.min_fee <= 0 || body.min_fee > 500000) {
    return NextResponse.json({ error: 'Minimum fee must be greater than 0' }, { status: 400 })
  }
  if (body.pitstop_fee != null && (!Number.isFinite(body.pitstop_fee) || body.pitstop_fee < 0 || body.pitstop_fee > 100000)) {
    return NextResponse.json({ error: 'Pit-stop fee out of range' }, { status: 400 })
  }
  if (
    !(body.accepts_cash ?? false) &&
    !(body.accepts_qr ?? false) &&
    !(body.accepts_transfer ?? false)
  ) {
    return NextResponse.json({ error: 'Accept at least one payment method' }, { status: 400 })
  }
  if ((body.accepts_qr ?? false) && !(body.qr_payment_url || '').trim()) {
    return NextResponse.json({ error: 'QR payment URL required when QR is accepted' }, { status: 400 })
  }
  if ((body.accepts_transfer ?? false) && !(body.transfer_details || '').trim()) {
    return NextResponse.json({ error: 'Bank transfer details required when transfer is accepted' }, { status: 400 })
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Service-role for atomic writes (profile.role + drivers)
  // ──────────────────────────────────────────────────────────────────────────
  const admin = getAdminSupabase()
  if (!admin) {
    return NextResponse.json({ error: 'Service role not configured' }, { status: 500 })
  }

  // 1. Ensure profile.role = driver. Also stash the full_name when the
  //    signer didn't already set it via auth metadata.
  const profileUpdate: Record<string, unknown> = { role: 'driver' }
  if (body.full_name && body.full_name.trim()) {
    profileUpdate.full_name = body.full_name.trim()
  }
  const profRes = await admin.from('profiles').update(profileUpdate).eq('id', user.id)
  if (profRes.error) {
    return NextResponse.json({ error: profRes.error.message }, { status: 500 })
  }

  // 2. Resolve a slug — caller can pass one; otherwise auto-derive a unique
  //    value from business_name. Driver can rename later via dashboard.
  let slug = (body.slug || '').trim().toLowerCase()
  if (slug && !isValidSlug(slug)) {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })
  }
  if (slug) {
    const { data: existing } = await admin
      .from('drivers')
      .select('user_id')
      .eq('slug', slug)
      .maybeSingle()
    if (existing && existing.user_id !== user.id) {
      return NextResponse.json({ error: 'That short link is already taken' }, { status: 409 })
    }
  } else {
    slug = await deriveUniqueSlug(admin, body.business_name)
  }

  // 3. Clean vehicle photos — accept only http(s) URLs, dedupe, cap at 8.
  const cleanedPhotos: string[] = Array.isArray(body.vehicle_photos)
    ? Array.from(new Set(
        body.vehicle_photos
          .map((u) => (u ?? '').trim())
          .filter((u) => /^https?:\/\//i.test(u)),
      )).slice(0, 8)
    : []

  // 4. Upsert drivers row. vehicle_type='minibus' is the discriminator that
  //    keys the marketplace + dashboard routing. paid_until stays NULL —
  //    the driver lands on /dashboard/bus next and pays via the QRIS modal
  //    to flip their listing into the public /bus marketplace.
  const driverRes = await admin.from('drivers').upsert({
    user_id: user.id,
    slug,
    vehicle_type: 'minibus',
    business_name: body.business_name.trim(),
    bio: body.bio?.trim() || null,
    whatsapp_e164: normalizedPhone,
    city: body.city.trim(),
    area: body.area?.trim() || null,
    service_zone_radius_km: body.service_zone_radius_km ?? 20,
    // Bike-specific columns stay NULL — drivers table allows it.
    bike_make: null,
    bike_model: null,
    bike_year: null,
    bike_color: null,
    bike_plate: null,
    bike_type: null,
    bike_cc: null,
    has_box: false,
    // Minibus-specific vehicle columns (same shape as car).
    vehicle_make:  body.vehicle_make.trim(),
    vehicle_model: body.vehicle_model.trim(),
    vehicle_year:  Math.round(body.vehicle_year),
    vehicle_color: body.vehicle_color.trim(),
    vehicle_plate: body.vehicle_plate.trim().toUpperCase(),
    vehicle_seats: Math.round(body.vehicle_seats),
    vehicle_photos: cleanedPhotos,
    // Service — minibus drivers only do passenger rides in Phase 1.
    services: ['person'],
    // Driver-published rates — persisted as-is.
    price_per_km: Math.round(body.price_per_km),
    min_fee: Math.round(body.min_fee),
    pitstop_fee: Math.round(body.pitstop_fee ?? 0),
    // Payment methods accepted
    accepts_cash:     body.accepts_cash     ?? false,
    accepts_qr:       body.accepts_qr       ?? false,
    accepts_transfer: body.accepts_transfer ?? false,
    qr_payment_url:   body.qr_payment_url?.trim()   || null,
    transfer_details: body.transfer_details?.trim() || null,
    // Listing state — listing is hidden until paid_until is set by the
    // QRIS payment flow on /dashboard/bus.
    paid_until: null,
    status: 'active',
    availability: 'offline',
  })
  if (driverRes.error) {
    return NextResponse.json({ error: driverRes.error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, redirectTo: '/dashboard/bus', slug })
}
