import Link from 'next/link'
import { Bus as BusIcon } from 'lucide-react'
import UniversalProviderCard, {
  type UniversalProviderCardBottomItem,
} from '@/components/marketplace/UniversalProviderCard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { haversineKm } from '@/lib/geo/haversine'

// ============================================================================
// /bus — Bus / Minibus driver marketplace (Phase 1)
// ----------------------------------------------------------------------------
// IndoCity is an Indonesian SOFTWARE DIRECTORY (PM 12/2019), NOT a transport
// operator. Customers select drivers themselves and WhatsApp them directly.
// We never set fares, never appoint orders, never match drivers.
//
// This page surfaces drivers whose `vehicle_type = 'minibus'` from BOTH the
// real `drivers` table and the seeded `mock_drivers` pool, rendered through
// the shared UniversalProviderCard (light variant — matches the rest of
// the white-background marketplaces).
//
// Naming note: the schema enum (migration 0092) uses 'minibus' as the
// discriminator. The customer-facing surface at /bus is friendlier — most
// users searching for "group transport" type "bus" first. The category
// targets 7–16 seat charters (Hiace, Innova, Avanza); tour coaches > 30
// seats are a different vertical (future scope).
//
// Phase 1: no real minibus drivers exist yet (the /dashboard/bus onboarding
// dashboard ships in a follow-up). The Yogya demo mocks seeded in
// migration 0093 carry the page until real signups land.
//
// Compliance copy guard-rails:
//   • "Published by driver" not "our price"
//   • "From Rp X" not "trip price" / "total fare"
//   • Footer disclaimer reminds users IndoCity surfaces — never sets — fares
// ============================================================================

export const metadata = {
  title: 'Bus / Minibus Drivers · IndoCity',
  description:
    'Browse independent minibus drivers in Indonesia for group transport, ' +
    'charter, tourism, and airport pickups. Self-published rates — WhatsApp ' +
    'the driver directly to agree the fare. IndoCity is a directory; we ' +
    'never set fares or appoint orders.',
}

// Force server-side rendering on each request so newly-paid drivers show up
// immediately without a redeploy. Aligns with /tour, /rent, and /car.
export const dynamic = 'force-dynamic'

// Yogyakarta city center — falls back to this when no ?lat=&lng= is passed.
// Same value used across /cari and the rest of the marketplace; matches the
// founder's primary launch market (also Yogya's the Hiace charter heartland).
const YOGYA_CENTER = { lat: -7.7928, lng: 110.3657 }
const DEFAULT_RADIUS_KM = 50

// Column lists kept compact and adjacent so reviewers can verify the read
// surface against the migrations 0001 + 0092 + 0093 schema without grep.
const REAL_COLS = [
  'user_id', 'slug', 'business_name', 'bio', 'whatsapp_e164',
  'brand_logo_url', 'city', 'area', 'availability',
  'service_zone_center_lat', 'service_zone_center_lng',
  'current_lat', 'current_lng',
  'price_per_km', 'min_fee',
  'rating', 'trips_count',
  'vehicle_type', 'vehicle_make', 'vehicle_model', 'vehicle_year',
  'vehicle_color', 'vehicle_seats', 'vehicle_photos',
  'paid_until',
].join(', ')

const MOCK_COLS = [
  'id', 'slug', 'business_name', 'bio', 'whatsapp_e164',
  'profile_image_url', 'city', 'area', 'availability',
  'price_per_km', 'min_fee',
  'rating',
  'vehicle_type', 'vehicle_make', 'vehicle_model', 'vehicle_year',
  'vehicle_color', 'vehicle_seats', 'vehicle_photos',
].join(', ')

// Unified shape consumed by the card adapter below. Both real + mock rows
// fold into this so the JSX stays a single map().
type BusDriver = {
  id: string
  slug: string
  business_name: string
  bio: string | null
  whatsapp_e164: string
  profile_image_url: string | null
  city: string | null
  area: string | null
  availability: 'online' | 'busy' | 'offline'
  price_per_km: number | null
  min_fee: number | null
  rating: number | null
  trips_count: number
  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_year: number | null
  vehicle_color: string | null
  vehicle_seats: number | null
  vehicle_photos: string[]
  lat: number | null
  lng: number | null
  is_mock: boolean
}

// vehicle_photos lives in jsonb — Supabase returns it as `unknown` to TS.
// Normalise to a string[] of public URLs, dropping anything malformed.
function normalisePhotos(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((u): u is string => typeof u === 'string' && u.length > 0)
}

// Real-row shape — narrowed from `drivers` cols we select above. Kept as a
// local interface so a column rename in 0094+ surfaces here as a type error
// rather than a silent null on the card.
type RealRow = {
  user_id: string
  slug: string
  business_name: string
  bio: string | null
  whatsapp_e164: string
  brand_logo_url: string | null
  city: string | null
  area: string | null
  availability: 'online' | 'busy' | 'offline'
  service_zone_center_lat: number | null
  service_zone_center_lng: number | null
  current_lat: number | null
  current_lng: number | null
  price_per_km: number | null
  min_fee: number | null
  rating: number | null
  trips_count: number | null
  vehicle_type: string
  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_year: number | null
  vehicle_color: string | null
  vehicle_seats: number | null
  vehicle_photos: unknown
  paid_until: string | null
}

type MockRow = {
  id: string
  slug: string
  business_name: string
  bio: string | null
  whatsapp_e164: string
  profile_image_url: string | null
  city: string | null
  area: string | null
  availability: 'online' | 'busy' | 'offline'
  price_per_km: number | null
  min_fee: number | null
  rating: number | null
  vehicle_type: string
  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_year: number | null
  vehicle_color: string | null
  vehicle_seats: number | null
  vehicle_photos: unknown
}

function realToDriver(r: RealRow): BusDriver {
  return {
    id: r.user_id,
    slug: r.slug,
    business_name: r.business_name,
    bio: r.bio,
    whatsapp_e164: r.whatsapp_e164,
    profile_image_url: r.brand_logo_url,
    city: r.city,
    area: r.area,
    availability: r.availability,
    price_per_km: r.price_per_km,
    min_fee: r.min_fee,
    rating: r.rating,
    trips_count: r.trips_count ?? 0,
    vehicle_make: r.vehicle_make,
    vehicle_model: r.vehicle_model,
    vehicle_year: r.vehicle_year,
    vehicle_color: r.vehicle_color,
    vehicle_seats: r.vehicle_seats,
    vehicle_photos: normalisePhotos(r.vehicle_photos),
    lat: r.current_lat ?? r.service_zone_center_lat,
    lng: r.current_lng ?? r.service_zone_center_lng,
    is_mock: false,
  }
}

function mockToDriver(r: MockRow): BusDriver {
  return {
    id: r.id,
    slug: r.slug,
    business_name: r.business_name,
    bio: r.bio,
    whatsapp_e164: r.whatsapp_e164,
    profile_image_url: r.profile_image_url,
    city: r.city,
    area: r.area,
    availability: r.availability,
    price_per_km: r.price_per_km,
    min_fee: r.min_fee,
    rating: r.rating,
    trips_count: 0,
    vehicle_make: r.vehicle_make,
    vehicle_model: r.vehicle_model,
    vehicle_year: r.vehicle_year,
    vehicle_color: r.vehicle_color,
    vehicle_seats: r.vehicle_seats,
    vehicle_photos: normalisePhotos(r.vehicle_photos),
    lat: null,
    lng: null,
    is_mock: true,
  }
}

export default async function BusMarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; radius?: string; lat?: string; lng?: string }>
}) {
  const params = await searchParams
  const cityLabel = (params.city?.trim() || 'Yogyakarta')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

  // Radius filter — only applied when a numeric ?radius= or ?lat&lng= is set.
  // Empty / absent params skip the geo check entirely (Phase 1 has only the
  // Yogya mocks; no point pruning them by distance when they're our only
  // stock).
  const parsedRadius = parseFloat(params.radius ?? '')
  const radiusKm = Number.isFinite(parsedRadius) && parsedRadius > 0
    ? parsedRadius
    : null
  const parsedLat = parseFloat(params.lat ?? '')
  const parsedLng = parseFloat(params.lng ?? '')
  const center = Number.isFinite(parsedLat) && Number.isFinite(parsedLng)
    ? { lat: parsedLat, lng: parsedLng }
    : YOGYA_CENTER
  // Geo prune only kicks in when caller passed ?radius=. The center is
  // either explicit GPS or Yogya fallback. Mocks lack lat/lng so they
  // are exempt from the radius prune (otherwise the page would render
  // empty on first load before real minibus drivers exist).
  const applyRadius = radiusKm !== null

  const admin = getAdminSupabase()
  if (!admin) {
    return (
      <Shell>
        <div className="px-4 pt-6 text-black/70 text-[13px]">
          Server not configured.
        </div>
      </Shell>
    )
  }

  // Today's date as YYYY-MM-DD for the paid_until window check. Phase 1
  // is a no-op (no real minibus drivers yet), but wiring it now means the
  // gate is live the moment the /dashboard/bus onboarding ships.
  const today = new Date().toISOString().slice(0, 10)

  // Real minibus drivers — active status, vehicle_type=minibus, subscription
  // window (paid_until NULL = grace period / never gated, paid_until >= today
  // = active subscription). Note the schema discriminator is 'minibus' even
  // though the customer-facing route is /bus.
  const { data: realRowsRaw } = await admin
    .from('drivers')
    .select(REAL_COLS)
    .eq('status', 'active')
    .eq('vehicle_type', 'minibus')
    .or(`paid_until.is.null,paid_until.gte.${today}`)
    .order('availability', { ascending: true })
    .order('rating', { ascending: false, nullsFirst: false })
    .order('trips_count', { ascending: false })
    .limit(200)

  // Mock minibus drivers — seeded by migration 0093 (rahmat-hiace-jogja-
  // charter, sutarto-innova-tour-yogya, wahyu-avanza-rombongan-bantul). The
  // auto-hide trigger on drivers insert keeps the mix honest as real drivers
  // join.
  const { data: mockRowsRaw } = await admin
    .from('mock_drivers')
    .select(MOCK_COLS)
    .eq('vehicle_type', 'minibus')
    .is('mock_hidden_at', null)
    .order('availability', { ascending: true })
    .order('rating', { ascending: false, nullsFirst: false })
    .limit(200)

  const reals = ((realRowsRaw ?? []) as unknown as RealRow[]).map(realToDriver)
  const mocks = ((mockRowsRaw ?? []) as unknown as MockRow[]).map(mockToDriver)

  // Reals first, then mocks. Within each: online > busy > offline (the
  // queries above already pulled in that bucket order; JS sort below is
  // stable so prior orders survive the merge sort).
  const availabilityRank: Record<string, number> = { online: 0, busy: 1, offline: 2 }
  const merged: BusDriver[] = [...reals, ...mocks].sort((a, b) => {
    const am = a.is_mock ? 1 : 0
    const bm = b.is_mock ? 1 : 0
    if (am !== bm) return am - bm
    return (availabilityRank[a.availability] ?? 9) - (availabilityRank[b.availability] ?? 9)
  })

  // Radius prune — only real drivers with known coords. Mocks pass through
  // (no lat/lng on the seed rows; this is intentional per the brief — keep
  // them visible while the marketplace warms up).
  const list = applyRadius
    ? merged.filter((d) => {
        if (d.is_mock) return true
        if (d.lat == null || d.lng == null) return false
        return haversineKm(center, { lat: d.lat, lng: d.lng }) <= radiusKm
      })
    : merged

  return (
    <Shell>
      <div className="max-w-3xl mx-auto px-4 pt-3 pb-24">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[24px] sm:text-[28px] font-extrabold tracking-tight leading-tight text-black">
              {cityLabel} <span className="gradient-text">Bus / Minibus Drivers</span>
            </h1>
            <p className="mt-1 text-[13px] text-black/60 leading-snug">
              Group transport, charter & tourism — Hiace, Innova, Avanza for airport pickups, weddings, school trips. Published rates, agree fare via WhatsApp.
            </p>
          </div>
          <div className="shrink-0 mt-1 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider text-black bg-brand/20 border border-brand/50">
            <BusIcon className="w-3.5 h-3.5" strokeWidth={3} />
            <span>{list.length}</span>
          </div>
        </header>

        {list.length === 0 ? (
          <div className="rounded-2xl p-8 text-center border border-black/10 bg-white shadow-sm space-y-3">
            <div
              className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #FACC15, #EAB308)',
                border: '1px solid rgba(0,0,0,0.85)',
              }}
            >
              <BusIcon className="w-6 h-6 text-bg" strokeWidth={2.5} />
            </div>
            <div className="text-[14px] font-extrabold text-black">
              No bus / minibus drivers listed yet
            </div>
            <p className="text-[13px] text-black/60">
              Real minibus driver dashboards are launching soon. Check back shortly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {list.map((d) => (
              <BusDriverCard key={d.slug} driver={d} />
            ))}
          </div>
        )}

        {/* Compliance footer — surfaces the IndoCity directory model so
            users understand the platform doesn't compute, set, or appoint
            fares. Matches the safe-harbour copy used on /cari and the
            lowest-fare banner. */}
        <p className="mt-8 text-center text-[11px] uppercase tracking-wider text-black/45">
          Self-published rates · agree fare with driver
        </p>
      </div>
    </Shell>
  )
}

// Adapter from BusDriver → UniversalProviderCard props. Kept inline (not
// extracted into a shared lib) because the field mapping is specific to
// the /bus vertical and changing one card shouldn't ripple to handyman /
// laundry / etc.
function BusDriverCard({ driver: d }: { driver: BusDriver }) {
  // Vehicle line — e.g. "Toyota Hiace 2022 · White". Collapses to the
  // make+model when year / colour are missing.
  const vehicleParts: string[] = []
  const makeModel = [d.vehicle_make, d.vehicle_model].filter(Boolean).join(' ')
  if (makeModel) vehicleParts.push(makeModel)
  if (d.vehicle_year) vehicleParts.push(String(d.vehicle_year))
  const vehicleLine = vehicleParts.join(' ')
  const colorBit = d.vehicle_color ? ` · ${d.vehicle_color}` : ''
  const vehicleFull = vehicleLine ? `${vehicleLine}${colorBit}` : null

  // City + area combined — e.g. "Yogyakarta · Sleman". Used as the city
  // line under the driver name.
  const cityArea = [d.city, d.area]
    .filter((v) => v && v.trim().length > 0)
    .join(' · ') || null

  // Specialty pill = seat count — most decision-critical signal for group
  // transport (a Hiace 16-seater is the difference between booking and
  // not). Falls back to "Bus" when seats aren't set so the pill never
  // disappears entirely.
  const specialtyLabel = d.vehicle_seats
    ? `${d.vehicle_seats} seats`
    : 'Bus'

  // Bottom row — published min fee + per-km hint. Compliance copy:
  // "From Rp X" and "Rp Y/km published" — never "trip price" or
  // "total fare".
  const bottomItems: UniversalProviderCardBottomItem[] = []
  if (d.min_fee != null && d.min_fee > 0) {
    bottomItems.push({
      key: 'fee',
      icon: 'dollar',
      label: `From Rp ${d.min_fee.toLocaleString('id-ID')}`,
    })
  }
  if (d.price_per_km != null && d.price_per_km > 0) {
    bottomItems.push({
      key: 'kmrate',
      label: `Rp ${d.price_per_km.toLocaleString('id-ID')}/km published`,
    })
  }

  // Trip count — only shown when > 0 and the row isn't a mock (mocks have
  // trips_count = 0 by definition).
  const sublineBits: string[] = []
  if (vehicleFull) sublineBits.push(vehicleFull)
  if (!d.is_mock && d.trips_count > 0) {
    sublineBits.push(`${d.trips_count.toLocaleString('id-ID')} trips`)
  }

  // Portfolio thumbs come from vehicle_photos (jsonb). Capped at 3 inside
  // the universal card; we pass the full array.
  const thumbs = d.vehicle_photos

  // Cover image — first vehicle photo when available, otherwise the
  // universal card paints a themed gradient.
  const cover = d.vehicle_photos[0] ?? null

  return (
    <UniversalProviderCard
      href={`/bus/${d.slug}`}
      displayName={d.business_name}
      city={cityArea}
      subline={sublineBits.length ? sublineBits.join(' · ') : null}
      bio={d.bio?.replace(/\s*\n\s*/g, ' ') ?? null}
      coverImageUrl={cover}
      profileImageUrl={d.profile_image_url}
      availabilityDot={d.availability}
      // Rating chip only shows when we actually have one — keeps mocks
      // honest if the seed rating drops in a future migration.
      rating={d.rating ?? null}
      specialtyLabel={specialtyLabel}
      portfolioThumbs={thumbs}
      bottomItems={bottomItems}
      ctaLabel="View profile"
      variant="light"
    />
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  // White-background marketplace shell — matches /tour, /handyman, /laundry,
  // /car, and the rest of the app-wide white redesign. IndoCity wordmark
  // links home; no AppNav by design (these vertical marketplaces present
  // as a standalone surface, not part of the authenticated dashboard
  // chrome).
  return (
    <main className="relative min-h-[100dvh] bg-white text-black">
      <header className="px-4 pt-safe pt-[35px] pb-2 max-w-4xl mx-auto">
        <Link href="/" aria-label="Home" className="inline-block">
          <img
            src="https://ik.imagekit.io/nepgaxllc/Untitleddfsdfsdfs-removebg-preview.png"
            alt="IndoCity"
            className="h-8 sm:h-10 w-auto"
          />
        </Link>
      </header>
      {children}
    </main>
  )
}
