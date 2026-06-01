// ============================================================================
// Independent-rider data fetchers — BROWSER-SAFE
// ============================================================================
// Wraps Supabase queries and exposes them in the legacy `Rider` shape used
// by the UI so existing pages don't need to be restructured.
//
// When Supabase isn't configured, falls back to MOCK_RIDERS so the dev
// server still works in demo mode.
//
// IMPORTANT: this module must stay browser-safe. Server-only helpers live
// in queries.server.ts.
// ============================================================================

import { getBrowserSupabase, isSupabaseConfigured } from '@/lib/supabase/client'
import { MOCK_RIDERS } from '@/data/mockRiders'
import type { DriverRow, AvailabilityState, SubscriptionStatus } from '@/types/database'
import type { Rider, ServiceType } from '@/types/rider'
import { isLocationFresh } from '@/lib/drivers/presence'
import { MOCK_LANGUAGES } from '@/lib/tours/templates'

// Minimal subscription shape used to derive what customers see on the
// public driver pages. Trial / period dates are factored in here so a
// row stuck on status='trial' with an expired trial_ends_at still maps
// to past_due (drivers stop appearing as bookable).
type SubInfo = {
  status: SubscriptionStatus | null
  trial_ends_at: string | null
  current_period_end: string | null
} | null

function effectiveSubStatus(sub: SubInfo): SubscriptionStatus {
  if (!sub || !sub.status) return 'past_due'
  const now = Date.now()
  if (sub.status === 'trial') {
    const t = sub.trial_ends_at ? Date.parse(sub.trial_ends_at) : NaN
    return Number.isFinite(t) && t < now ? 'past_due' : 'trial'
  }
  if (sub.status === 'active') {
    const e = sub.current_period_end ? Date.parse(sub.current_period_end) : NaN
    return Number.isFinite(e) && e < now ? 'past_due' : 'active'
  }
  return sub.status
}

// Row shape with embedded subscription via PostgREST. Supabase's join
// helper can return either a single row or an array depending on the
// detected cardinality; handle both.
type DriverRowWithSub = DriverRow & {
  subscriptions?: SubInfo | SubInfo[] | null
}

function pickSub(row: DriverRowWithSub): SubInfo {
  const s = row.subscriptions
  if (!s) return null
  if (Array.isArray(s)) return s[0] ?? null
  return s
}

// Map a Supabase drivers.row → legacy Rider shape used across the app.
export function driverRowToRider(row: DriverRow, sub: SubInfo = null): Rider {
  const services = (row.services || []) as ServiceType[]
  // Location freshness — if the driver hasn't pinged GPS in the last
  // 15 min we fall back to their service-zone center for distance calc.
  // The UI checks `locationFresh` to decide whether to render exact
  // distance/ETA or the honest "Based in {area}" fallback.
  const locationFresh = isLocationFresh(row.current_location_updated_at)
  const lat = locationFresh
    ? (row.current_lat ?? row.service_zone_center_lat ?? 0)
    : (row.service_zone_center_lat ?? row.current_lat ?? 0)
  const lng = locationFresh
    ? (row.current_lng ?? row.service_zone_center_lng ?? 0)
    : (row.service_zone_center_lng ?? row.current_lng ?? 0)
  return {
    id: row.user_id,
    slug: row.slug,
    name: row.business_name,
    photoUrl: row.brand_logo_url || `https://i.pravatar.cc/300?u=${row.slug}`,
    whatsappE164: row.whatsapp_e164,
    bio: row.bio || '',
    area: row.area || '',
    city: row.city || '',
    services,
    bike: {
      make: row.bike_make || '',
      model: row.bike_model || '',
      year: row.bike_year || 0,
      color: row.bike_color || '',
      type: (row.bike_type || 'matic') as 'matic' | 'sport' | 'manual',
      cc: row.bike_cc ?? undefined,
      plate: row.bike_plate ?? undefined,
      hasBox: row.has_box,
    },
    pricePerKm: row.price_per_km,
    minFee: row.min_fee,
    pitstopFee: row.pitstop_fee,
    isOnline: row.availability === 'online',
    availability: row.availability,
    lastSeenAt: row.last_active_at || row.updated_at,
    sessionStartedAt: row.session_started_at,
    currentLocationUpdatedAt: row.current_location_updated_at,
    locationFresh,
    onlineUntil: row.online_until,
    referralCode: row.referral_code,
    referrerDriverId: row.referrer_driver_id,
    businessContractEnabled: row.business_contract_enabled,
    businessMaxParcelsPerDay: row.business_max_parcels_per_day,
    businessServices: row.business_services ?? [],
    businessNotes: row.business_notes,
    businessEnabledAt: row.business_enabled_at,
    b2bScore: row.b2b_score,
    b2bTier: row.b2b_tier,
    b2bScoreUpdatedAt: row.b2b_score_updated_at,
    tourGuideEnabled: row.tour_guide_enabled,
    tourGuideDayRateIdr: row.tour_guide_day_rate_idr,
    tourGuideLanguages: row.tour_guide_languages ?? [],
    tourGuideNotes: row.tour_guide_notes,
    tourGuideEnabledAt: row.tour_guide_enabled_at,
    lat,
    lng,
    serviceZoneRadiusKm: row.service_zone_radius_km,
    subscriptionStatus: effectiveSubStatus(sub),
    rating: row.rating ?? undefined,
    trips: row.trips_count,
    hourlyEnabled:     (row as DriverRow & { hourly_enabled?: boolean | null }).hourly_enabled ?? null,
    hourly3hRateIdr:   (row as DriverRow & { hourly_3h_rate_idr?: number | null }).hourly_3h_rate_idr ?? null,
    hourly6hRateIdr:   (row as DriverRow & { hourly_6h_rate_idr?: number | null }).hourly_6h_rate_idr ?? null,
    hourly8hRateIdr:   (row as DriverRow & { hourly_8h_rate_idr?: number | null }).hourly_8h_rate_idr ?? null,
    workingHoursStart: (row as DriverRow & { working_hours_start?: string | null }).working_hours_start ?? null,
    workingHoursEnd:   (row as DriverRow & { working_hours_end?:   string | null }).working_hours_end   ?? null,
    languages:         (row as DriverRow & { languages?: string[] | null }).languages ?? null,
  } as Rider & { availability: AvailabilityState }
}

// ============================================================================
// List of active independent riders (discovery page)
// ============================================================================
export async function fetchActiveDriversBrowser(
  /** When supplied, restricts the result set to that vehicle_type. Used
   *  by /cari/rider to keep the Bike rider list separate from Car/Minibus
   *  results when the customer has picked a vehicle category. Default
   *  'bike' preserves the legacy behaviour (all callers that don't pass
   *  this parameter continue to see motorbike drivers only). */
  vehicleType: 'bike' | 'car' | 'truck' | 'premium_car' | 'minibus' | 'jeep' = 'bike',
): Promise<Rider[]> {
  if (!isSupabaseConfigured()) return MOCK_RIDERS
  const supabase = getBrowserSupabase()
  if (!supabase) return MOCK_RIDERS
  // Ordering: availability bucket first (online → busy → offline),
  // then freshness (most recently pinged float up — a driver who went
  // online 3h ago and stopped pinging will fall below one who's been
  // pinging in the last minute), then rating as the tie-breaker.
  // This is the directory-safe "deprioritize non-responsive drivers"
  // signal — derived from driver-self telemetry only.
  // Filter expired online_until shifts — a driver who toggled "Online
  // until 17:00" is no longer in the marketplace once 17:00 passes,
  // even if they forgot to flip offline. NULL online_until means
  // "until I toggle off" — also accepted.
  const nowIso = new Date().toISOString()
  // Public marketplace read → drivers_public view (omits payment cols
  // per mig 0067). Subscription relationship still navigates via the FK
  // on the underlying drivers table — PostgREST follows it through the
  // security_invoker view.
  const { data, error } = await supabase
    .from('drivers_public')
    .select('*, subscriptions(status, trial_ends_at, current_period_end)')
    .eq('status', 'active')
    .eq('vehicle_type', vehicleType)
    // Subscription gate — exclude drivers whose paid_until has lapsed.
    // paid_until NULL = legacy / never paid → keep showing for now.
    // paid_until in future = active subscription.
    // paid_until in past = expired, hide from marketplace.
    .or(`paid_until.is.null,paid_until.gte.${new Date().toISOString().slice(0, 10)}`)
    .or(`online_until.is.null,online_until.gt.${nowIso}`)
    .order('availability', { ascending: true })
    .order('last_active_at', { ascending: false, nullsFirst: false })
    .order('rating', { ascending: false, nullsFirst: false })
    .limit(50)
  // ALWAYS attempt the mock fetch in parallel — even on drivers_public
  // RLS errors, the public mock pool is the marketplace's fallback so
  // /cari never renders an empty grid for unauthenticated visitors.
  const mocks = await fetchMockDriversBrowser(vehicleType)

  if (error || !data) {
    if (error) console.warn('[drivers] fetchActiveDrivers failed:', error.message)
    // MOCK_RIDERS is a hardcoded BIKE-only array used as a last-resort
    // dev fallback for the bike vertical when EVERYTHING fails (no
    // mocks either). For car/truck/minibus, return whatever mocks
    // loaded; if those are empty too the empty-state copy renders.
    if (mocks.length > 0) return mocks
    return vehicleType === 'bike' ? MOCK_RIDERS : []
  }
  // Filter out past_due / canceled subs before returning — the
  // marketplace must not show riders whose billing has lapsed, even
  // if drivers.status is still 'active'. Suspension is rare; the
  // billing wall is the load-bearing gate.
  const reals = (data as DriverRowWithSub[])
    .map((row) => driverRowToRider(row, pickSub(row)))
    .filter((r) => r.subscriptionStatus !== 'past_due' && r.subscriptionStatus !== 'canceled')

  // Reals first, then mocks (seeded marketplace pool from migration
  // 0050). One mock is hidden automatically each time a real driver
  // is inserted (DB AFTER-INSERT trigger), so the mock pool naturally
  // shrinks as supply grows.
  return [...reals, ...mocks]
}

// Pull the visible-mock pool, scoped to the requested vehicle_type. Failures
// fall back to empty so an outage of mock_drivers never breaks the real
// marketplace. The vehicleType filter avoids cross-mixing (e.g., returning
// bike mocks when the customer is on the Car toggle).
async function fetchMockDriversBrowser(
  vehicleType: 'bike' | 'car' | 'truck' | 'premium_car' | 'minibus' | 'jeep' = 'bike',
): Promise<Rider[]> {
  const supabase = getBrowserSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('mock_drivers')
    .select('*')
    .eq('vehicle_type', vehicleType)
    .is('mock_hidden_at', null)
    .order('availability', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(50)
  if (error || !data) return []
  return (data as MockDriverRow[]).map(mockDriverRowToRider)
}

type MockDriverRow = {
  id: string
  slug: string
  business_name: string
  bio: string | null
  whatsapp_e164: string
  profile_image_url: string | null
  city: string | null
  area: string | null
  services: string[]
  price_per_km: number
  min_fee: number
  bike_make: string | null
  bike_model: string | null
  bike_year: number | null
  bike_color: string | null
  bike_type: 'matic' | 'sport' | 'manual' | null
  // mig 0093 added these columns specifically for the car/truck mocks.
  // The seed data populates vehicle_* and leaves bike_* null when the
  // vehicle_type is 'car'. Mapper below coalesces — bike_* wins when
  // present (legacy bike mocks), vehicle_* fills in for cars/trucks so
  // the Rider object always carries a usable make/model for the catalog
  // lookup in /cari (and any other consumer of `rider.bike`).
  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_year: number | null
  vehicle_color: string | null
  vehicle_type: 'car' | 'bike' | 'minibus' | 'truck' | 'premium_car' | 'jeep' | null
  rating: number | null
  availability: 'online' | 'busy' | 'offline'
  created_at: string
}

type MockDriverRowWithGeo = MockDriverRow & {
  lat?:         number | null
  lng?:         number | null
  trips_count?: number | null
}

function mockDriverRowToRider(row: MockDriverRow): Rider {
  // Make/model coalescing — see comment on MockDriverRow.vehicle_make.
  // Car mocks have vehicle_make set and bike_make null; bike mocks the
  // other way round. We want a single non-empty (make, model) on the
  // Rider object so the /cari catalog lookup always has something to
  // match against. Empty-string fallback preserves the existing legacy
  // shape.
  const make  = row.bike_make  || row.vehicle_make  || ''
  const model = row.bike_model || row.vehicle_model || ''
  const year  = row.bike_year  || row.vehicle_year  || 0
  // Colour coalescing — jeep mocks store body colour in vehicle_color
  // (per /dashboard/jeep/vehicle picker). /cari uses this to swap the
  // jeep silhouette image via getJeepImageUrl() so each jeep card in the
  // result list shows the driver's actual body colour, not all yellow.
  const color = row.bike_color || row.vehicle_color || ''
  // mig 0155 added lat/lng/trips_count — read defensively so older
  // mock rows without those columns still produce a usable Rider.
  const geoRow = row as MockDriverRowWithGeo
  const latVal   = typeof geoRow.lat === 'number' && Number.isFinite(geoRow.lat) ? geoRow.lat : 0
  const lngVal   = typeof geoRow.lng === 'number' && Number.isFinite(geoRow.lng) ? geoRow.lng : 0
  const tripsVal = typeof geoRow.trips_count === 'number' ? geoRow.trips_count : undefined
  return {
    id: row.id,
    slug: row.slug,
    name: row.business_name,
    photoUrl: row.profile_image_url || `https://i.pravatar.cc/300?u=${row.slug}`,
    whatsappE164: row.whatsapp_e164,
    bio: row.bio || '',
    area: row.area || '',
    city: row.city || '',
    services: (row.services || []) as ServiceType[],
    bike: {
      make,
      model,
      year,
      color,
      type: (row.bike_type || 'matic') as 'matic' | 'sport' | 'manual',
      hasBox: false,
    },
    pricePerKm: row.price_per_km,
    minFee: row.min_fee,
    isOnline: row.availability === 'online',
    availability: row.availability,
    lastSeenAt: row.created_at,
    lat: latVal,
    lng: lngVal,
    subscriptionStatus: 'active',
    rating: row.rating ?? undefined,
    trips: tripsVal,
    isMock: true,
    languages: MOCK_LANGUAGES[row.slug] ?? ['id'],
  }
}

// ============================================================================
// Single rider by slug (public profile page)
// ============================================================================
export async function fetchDriverBySlugBrowser(slug: string): Promise<Rider | null> {
  if (!isSupabaseConfigured()) {
    return MOCK_RIDERS.find((r) => r.slug === slug) ?? null
  }
  const supabase = getBrowserSupabase()
  if (!supabase) return MOCK_RIDERS.find((r) => r.slug === slug) ?? null
  const { data, error } = await supabase
    .from('drivers_public')
    .select('*, subscriptions(status, trial_ends_at, current_period_end)')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()
  if (error) {
    console.warn('[drivers] fetchDriverBySlug failed:', error.message)
    return MOCK_RIDERS.find((r) => r.slug === slug) ?? null
  }
  if (!data) return null
  const row = data as DriverRowWithSub
  return driverRowToRider(row, pickSub(row))
}

// ============================================================================
// Current authenticated independent rider (dashboard, profile editor)
// ============================================================================
export async function fetchMyDriverBrowser(): Promise<Rider | null> {
  const supabase = getBrowserSupabase()
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('drivers')
    .select('*, subscriptions(status, trial_ends_at, current_period_end)')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error || !data) return null
  const row = data as DriverRowWithSub
  return driverRowToRider(row, pickSub(row))
}

// ============================================================================
// Tour-guide directory (/places → Tour Guide tab)
// ============================================================================
// Drivers who have opted in to day-tour service. Filtered by city when
// provided, ordered by rating then trips_count so reviewed drivers float
// up. Subscription gating is the same as the main marketplace — past_due
// drivers are hidden.
export async function fetchTourGuideDriversBrowser(city?: string): Promise<Rider[]> {
  if (!isSupabaseConfigured()) {
    return MOCK_RIDERS.filter((r) => r.tourGuideEnabled && (!city || r.city.toLowerCase() === city.toLowerCase()))
  }
  const supabase = getBrowserSupabase()
  if (!supabase) {
    return MOCK_RIDERS.filter((r) => r.tourGuideEnabled && (!city || r.city.toLowerCase() === city.toLowerCase()))
  }
  let q = supabase
    .from('drivers_public')
    .select('*, subscriptions(status, trial_ends_at, current_period_end)')
    .eq('status', 'active')
    .eq('tour_guide_enabled', true)
    .order('rating', { ascending: false, nullsFirst: false })
    .order('trips_count', { ascending: false, nullsFirst: false })
    .limit(40)
  if (city) q = q.ilike('city', city)
  const { data, error } = await q
  if (error || !data) return []
  return (data as DriverRowWithSub[])
    .map((row) => driverRowToRider(row, pickSub(row)))
    .filter((r) => r.subscriptionStatus !== 'past_due' && r.subscriptionStatus !== 'canceled')
}

// Raw DriverRow for the authenticated rider — used where the UI needs
// fields outside the legacy Rider shape (payment methods, QR URL, etc.).
export async function fetchMyDriverRowBrowser(): Promise<DriverRow | null> {
  const supabase = getBrowserSupabase()
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase.from('drivers').select('*').eq('user_id', user.id).maybeSingle()
  if (error || !data) return null
  return data as DriverRow
}
