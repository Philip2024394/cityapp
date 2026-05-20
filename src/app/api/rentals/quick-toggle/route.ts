import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { suggestedDailyRate, deriveWeeklyMonthly } from '@/data/bikeRentalDefaults'

// ============================================================================
// POST /api/rentals/quick-toggle
// ----------------------------------------------------------------------------
// One-tap rental activation for drivers. Body:
//   { mode: 'self_ride' | 'with_driver' | 'both' | 'off' }
//
// Behavior:
//   - 'off'  → if a rental exists for this driver, flip available_now=false
//   - any other mode → upsert a bike_rentals row pre-filled from the
//     driver's profile (bike make/model/year, city, location, WhatsApp)
//     + city-tier daily defaults + auto-derived weekly/monthly + tour
//     defaults (175k/325k/425k all-in for with_driver modes).
//
// The driver doesn't fill 20 fields — they tap a toggle. They can edit
// later via /dashboard/rentals/[id]/edit.
// ============================================================================

type Body = { mode: 'self_ride' | 'with_driver' | 'both' | 'off' }

const ALLOWED_MODES = ['self_ride', 'with_driver', 'both', 'off'] as const

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 7)
}

export async function POST(req: Request) {
  const userClient = await getServerSupabase()
  if (!userClient) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  let body: Body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!body.mode || !ALLOWED_MODES.includes(body.mode)) {
    return NextResponse.json({ error: 'mode must be self_ride | with_driver | both | off' }, { status: 400 })
  }

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Service role not configured' }, { status: 500 })

  // Load the driver profile — we use it to populate the rental row so the
  // driver doesn't have to re-enter bike + location + contact details.
  type DriverShape = {
    user_id: string
    slug: string
    business_name: string
    whatsapp_e164: string
    city: string | null
    area: string | null
    bike_make: string | null
    bike_model: string | null
    bike_year: number | null
    bike_cc: number | null
    bike_type: string | null
    bike_color: string | null
    has_box: boolean | null
    service_zone_center_lat: number | null
    service_zone_center_lng: number | null
  }
  const { data: driverData, error: dErr } = await admin
    .from('drivers')
    .select('user_id, slug, business_name, whatsapp_e164, city, area, ' +
            'bike_make, bike_model, bike_year, bike_cc, bike_type, bike_color, has_box, ' +
            'service_zone_center_lat, service_zone_center_lng')
    .eq('user_id', user.id)
    .maybeSingle()
  const driver = driverData as DriverShape | null
  if (dErr || !driver) {
    return NextResponse.json({
      error: 'Driver profile not found',
      hint: 'Complete onboarding first — we use your bike + city from there.',
    }, { status: 400 })
  }

  // Find an existing rental owned by this driver (any status).
  const { data: existing } = await admin
    .from('bike_rentals')
    .select('id, status, available_now, rental_mode, daily_price_idr')
    .eq('owner_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // ─── OFF: pause an existing rental, don't delete ────────────────────
  if (body.mode === 'off') {
    if (!existing) return NextResponse.json({ ok: true, paused: false, note: 'No rental to pause' })
    const { error } = await admin
      .from('bike_rentals')
      .update({ available_now: false })
      .eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, paused: true, id: existing.id })
  }

  // ─── ON: upsert with the new mode + auto-populated defaults ─────────
  const bikeBrand = driver.bike_make || 'Honda'
  const bikeModel = driver.bike_model || 'BeAT'
  const bikeYear = driver.bike_year || new Date().getFullYear()
  const bikeCc = driver.bike_cc || 110
  const bikeColor = driver.bike_color || null
  const bikeType = driver.bike_type || 'matic'
  const transmission = bikeType === 'matic' ? 'automatic' : bikeType === 'manual' ? 'manual' : 'automatic'

  const dailyDefault = suggestedDailyRate(bikeBrand, bikeModel, driver.city)
  const { weekly, monthly } = deriveWeeklyMonthly(dailyDefault)

  // City must match a city_zones row (FK constraint from migration 0008).
  // Fall back to 'yogyakarta' if the driver's city isn't one of the seeded
  // rental zones — the existing /rent marketplace only supports SUPPORTED_CITY_SLUGS.
  const supportedRentalCities = ['yogyakarta','denpasar','jakarta','bandung','surabaya','medan','semarang','makassar','malang','solo']
  const cityNorm = (driver.city ?? '').toLowerCase()
  const rentalCity = supportedRentalCities.includes(cityNorm) ? cityNorm : 'yogyakarta'

  if (existing) {
    // Update mode + availability; don't clobber custom pricing the
    // driver may have already set.
    const update: Record<string, unknown> = {
      rental_mode: body.mode,
      available_now: true,
    }
    // If the rental was just being toggled to ADD with_driver, ensure
    // tour rates exist (they may be null from a previous self_ride-only
    // listing). Seed them at the platform defaults.
    if (body.mode === 'with_driver' || body.mode === 'both') {
      update.tour_3h_idr = 175_000
      update.tour_6h_idr = 325_000
      update.tour_8h_idr = 425_000
      update.fuel_included = true
    }
    const { error } = await admin
      .from('bike_rentals')
      .update(update)
      .eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, id: existing.id, updated: true })
  }

  // Fresh rental row — pre-fill everything from the driver profile + defaults.
  const baseSlug = slugify(`${bikeBrand}-${bikeModel}-${rentalCity}`) || 'bike-rental'
  const newSlug = `${baseSlug}-${randomSuffix()}`

  const lat = driver.service_zone_center_lat ?? -7.7928  // Yogya fallback
  const lng = driver.service_zone_center_lng ?? 110.3657

  const insertRow = {
    slug: newSlug,
    owner_user_id: user.id,
    owner_name: driver.business_name || 'Driver',
    owner_company: null,
    owner_whatsapp_e164: driver.whatsapp_e164.startsWith('+') ? driver.whatsapp_e164 : `+${driver.whatsapp_e164}`,
    owner_languages: ['id'] as string[],
    owner_response_time_min: 10,
    brand: bikeBrand,
    model: bikeModel,
    year: bikeYear,
    cc: bikeCc,
    transmission,
    bike_type: bikeType,
    color: bikeColor,
    daily_price_idr: dailyDefault,
    weekly_price_idr: weekly,
    monthly_price_idr: monthly,
    security_deposit_idr: Math.max(300_000, Math.round(dailyDefault * 5)),
    driver_rate_per_day_idr: body.mode === 'self_ride' ? null : Math.round(dailyDefault * 2),
    tour_3h_idr: body.mode === 'self_ride' ? null : 175_000,
    tour_6h_idr: body.mode === 'self_ride' ? null : 325_000,
    tour_8h_idr: body.mode === 'self_ride' ? null : 425_000,
    fuel_included: body.mode !== 'self_ride',
    helmet_count: 2,
    raincoat_count: 1,
    has_phone_holder: false,
    has_phone_charger: false,
    has_delivery_box: driver.has_box ?? false,
    ready_to_work: driver.has_box ?? false,
    delivers_to_hotel: false,
    delivers_to_villa: false,
    pickup_dropoff: false,
    rental_mode: body.mode,
    city: rentalCity,
    address: driver.area || null,
    location: `SRID=4326;POINT(${lng} ${lat})`,
    lat,
    lng,
    image_urls: [] as string[],
    description: `${bikeBrand} ${bikeModel} ${bikeYear}${bikeColor ? ' ' + bikeColor : ''} — operated by ${driver.business_name}.`,
    tags: [] as string[],
    status: 'pending' as const,
    verified: false,
    available_now: true,
    listing_tier: 'free' as const,
  }

  const { data: created, error: insErr } = await admin
    .from('bike_rentals')
    .insert(insertRow)
    .select('id, slug')
    .single()
  if (insErr) {
    return NextResponse.json({ error: insErr.message, hint: 'Bike rental creation failed' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    id: created.id,
    slug: created.slug,
    created: true,
    note: 'Status pending — admin approves new listings before they go live on /rent.',
  })
}
