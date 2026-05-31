import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { isValidSlug, slugify } from '@/lib/slug'
import type { TableUpdate } from '@/lib/supabase/typed-helpers'

// ============================================================================
// POST /api/signup/truck
// ----------------------------------------------------------------------------
// Creates the profile (role=driver) + drivers row for a new TRUCK / PICKUP
// driver that has already passed the phone-OTP step on /signup/truck. Mirrors
// /api/signup/car and /api/signup/bus, but is scoped to truck-specific fields:
//
//   • vehicle_type='truck'
//   • services=['parcel'] (trucks haul cargo, not passengers — different from
//     car/bus which use 'person')
//   • vehicle_make / vehicle_model / vehicle_year / vehicle_color /
//     vehicle_plate / vehicle_seats (2 or 3, cab capacity) / vehicle_photos
//   • bike_* fields stay NULL (nullable on the drivers table)
//   • Optional rental block (migration 0097): rental_type +
//     rental_daily_rate_idr + rental_weekly_rate_idr + rental_min_days.
//     When provided, the listing surfaces in /rentals/truck as a daily-rate
//     option. Per-km truck booking is niche in this market, so trucks live
//     on /rentals/truck only (no live /truck marketplace exists).
//   • paid_until=NULL initially — the driver must pay the 38k/month QRIS
//     subscription via /dashboard/truck before their listing goes live in
//     the /rentals/truck marketplace.
//
// CityDrivers is a SOFTWARE DIRECTORY under PM 12/2019. The driver publishes
// their OWN price_per_km, min_fee, pitstop_fee, and rental rates — this
// route persists those numbers as-is. We never compute, modify, or appoint
// fares.
// ============================================================================

type SignupTruckPayload = {
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
  truck_class?: string
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
  // Rental (DRIVER-PUBLISHED, optional)
  offers_rental?: boolean
  rental_type?: 'self_drive' | 'with_driver' | 'both' | null
  rental_daily_rate_idr?: number | null
  rental_weekly_rate_idr?: number | null
  rental_min_days?: number | null
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

  let body: SignupTruckPayload
  try {
    body = (await req.json()) as SignupTruckPayload
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
  // Truck cab seat options — 2 or 3 covers Pickup Bak / Pickup Box / Blind Van
  // / Engkel Bak / Engkel Box.
  const ALLOWED_SEATS = new Set([2, 3])
  if (!Number.isFinite(body.vehicle_seats) || !ALLOWED_SEATS.has(body.vehicle_seats)) {
    return NextResponse.json({ error: 'Cab seats must be 2 or 3' }, { status: 400 })
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

  // Rental block — only validated when the driver opted in. NULL = no rental.
  const offersRental = !!body.offers_rental
  let rentalType: 'self_drive' | 'with_driver' | 'both' | null = null
  let rentalDaily: number | null = null
  let rentalWeekly: number | null = null
  let rentalMinDays = 1
  if (offersRental) {
    const t = body.rental_type
    if (t !== 'self_drive' && t !== 'with_driver' && t !== 'both') {
      return NextResponse.json({ error: 'Invalid rental type' }, { status: 400 })
    }
    rentalType = t
    if (!Number.isFinite(body.rental_daily_rate_idr) || (body.rental_daily_rate_idr as number) <= 0 || (body.rental_daily_rate_idr as number) > 50000000) {
      return NextResponse.json({ error: 'Daily rental rate must be greater than 0' }, { status: 400 })
    }
    rentalDaily = Math.round(body.rental_daily_rate_idr as number)
    if (body.rental_weekly_rate_idr != null && body.rental_weekly_rate_idr !== 0) {
      if (!Number.isFinite(body.rental_weekly_rate_idr) || (body.rental_weekly_rate_idr as number) <= 0 || (body.rental_weekly_rate_idr as number) > 200000000) {
        return NextResponse.json({ error: 'Weekly rental rate out of range' }, { status: 400 })
      }
      rentalWeekly = Math.round(body.rental_weekly_rate_idr as number)
    }
    if (body.rental_min_days != null) {
      if (!Number.isFinite(body.rental_min_days) || (body.rental_min_days as number) < 1 || (body.rental_min_days as number) > 365) {
        return NextResponse.json({ error: 'Minimum rental days must be between 1 and 365' }, { status: 400 })
      }
      rentalMinDays = Math.round(body.rental_min_days as number)
    }
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
  const profileUpdate: TableUpdate<'profiles'> = { role: 'driver' }
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

  // 4. Upsert drivers row. vehicle_type='truck' is the discriminator that
  //    keys the marketplace + dashboard routing. paid_until stays NULL —
  //    the driver lands on /dashboard/truck next and pays via the QRIS
  //    modal to flip their listing into the public /rentals/truck
  //    marketplace.
  const driverRes = await admin.from('drivers').upsert({
    user_id: user.id,
    slug,
    vehicle_type: 'truck',
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
    // Truck-specific vehicle columns (same shape as car/bus).
    vehicle_make:  body.vehicle_make.trim(),
    vehicle_model: body.vehicle_model.trim(),
    vehicle_year:  Math.round(body.vehicle_year),
    vehicle_color: body.vehicle_color.trim(),
    vehicle_plate: body.vehicle_plate.trim().toUpperCase(),
    vehicle_seats: Math.round(body.vehicle_seats),
    vehicle_photos: cleanedPhotos,
    // Service — trucks haul cargo, not passengers.
    services: ['parcel'],
    // Driver-published rates — persisted as-is.
    price_per_km: Math.round(body.price_per_km),
    min_fee: Math.round(body.min_fee),
    pitstop_fee: Math.round(body.pitstop_fee ?? 0),
    // Rental block (migration 0097). NULL columns = no rental offered.
    rental_type:            rentalType,
    rental_daily_rate_idr:  rentalDaily,
    rental_weekly_rate_idr: rentalWeekly,
    rental_min_days:        rentalMinDays,
    // Payment methods accepted
    accepts_cash:     body.accepts_cash     ?? false,
    accepts_qr:       body.accepts_qr       ?? false,
    accepts_transfer: body.accepts_transfer ?? false,
    qr_payment_url:   body.qr_payment_url?.trim()   || null,
    transfer_details: body.transfer_details?.trim() || null,
    // Listing state — listing is hidden until paid_until is set by the
    // QRIS payment flow on /dashboard/truck.
    paid_until: null,
    status: 'active',
    availability: 'offline',
  })
  if (driverRes.error) {
    return NextResponse.json({ error: driverRes.error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, redirectTo: '/dashboard/truck', slug })
}
