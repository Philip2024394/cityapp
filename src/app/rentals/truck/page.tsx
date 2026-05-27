import Link from 'next/link'
import { Truck as TruckIcon } from 'lucide-react'
import RentalDriverCard from '@/components/marketplace/RentalDriverCard'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// /rentals/truck — Truck rental marketplace (Phase 1)
// ----------------------------------------------------------------------------
// IndoCity is an Indonesian SOFTWARE DIRECTORY (PM 12/2019), NOT a transport
// or rental operator. Drivers self-publish daily rates; customers WhatsApp
// them directly to agree the rental terms.
//
// This page surfaces drivers whose `vehicle_type = 'truck'` AND who have a
// non-null `rental_daily_rate_idr` (= they offer rental). Sources merge both
// the real `drivers` table and the seeded `mock_drivers` pool. Schema added
// in migration 0097; demo rows seeded in migration 0098.
//
// Trucks in Indonesia are typically rented WITH driver+helper (pindahan
// rumah, distribusi barang, jasa angkut). Self-drive truck rentals exist
// (rare) — the `rental_type` filter chip handles both cases.
//
// Phase 1: no real truck-rental drivers exist yet (the /signup/truck +
// /dashboard/truck onboarding ships in a follow-up). The 3 demo mocks
// seeded in migration 0098 carry the page until real signups land.
//
// Compliance copy guard-rails:
//   • "Published by driver" not "our price"
//   • "From Rp X/day" not "rental price" / "total cost"
//   • Footer disclaimer reminds users IndoCity surfaces — never sets — rates
// ============================================================================

export const metadata = {
  title: 'Truck Rentals · IndoCity',
  description:
    'Browse pickup, box-van, and engkel truck rentals across Indonesia — ' +
    'sopir + helper available. Self-published daily rates, WhatsApp the ' +
    'driver directly. IndoCity is a directory; we never set rental fees.',
}

// Force server-side rendering on each request so newly-paid drivers show up
// immediately without a redeploy. Aligns with /tour, /rent, /car.
export const dynamic = 'force-dynamic'

// Column lists kept compact and adjacent so reviewers can verify the read
// surface against the migrations 0001 + 0092 + 0097 schema without grep.
const REAL_COLS = [
  'user_id', 'slug', 'business_name', 'bio', 'whatsapp_e164',
  'brand_logo_url', 'city', 'area', 'availability',
  'rating', 'trips_count',
  'vehicle_type', 'vehicle_make', 'vehicle_model', 'vehicle_year',
  'vehicle_color', 'vehicle_seats', 'vehicle_photos',
  'rental_type', 'rental_daily_rate_idr',
  'rental_weekly_rate_idr', 'rental_monthly_rate_idr', 'rental_min_days',
  'paid_until',
].join(', ')

const MOCK_COLS = [
  'id', 'slug', 'business_name', 'bio', 'whatsapp_e164',
  'profile_image_url', 'city', 'area', 'availability',
  'rating',
  'vehicle_type', 'vehicle_make', 'vehicle_model', 'vehicle_year',
  'vehicle_color', 'vehicle_seats', 'vehicle_photos',
  'rental_type', 'rental_daily_rate_idr',
  'rental_weekly_rate_idr', 'rental_monthly_rate_idr', 'rental_min_days',
].join(', ')

type RentalType = 'self_drive' | 'with_driver' | 'both'

// Unified shape consumed by the card adapter below. Both real + mock rows
// fold into this so the JSX stays a single map().
type TruckRental = {
  id: string
  slug: string
  business_name: string
  bio: string | null
  whatsapp_e164: string
  profile_image_url: string | null
  city: string | null
  area: string | null
  availability: 'online' | 'busy' | 'offline'
  rating: number | null
  trips_count: number
  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_year: number | null
  vehicle_color: string | null
  vehicle_seats: number | null
  vehicle_photos: string[]
  rental_type: RentalType | null
  rental_daily_rate_idr: number | null
  rental_weekly_rate_idr: number | null
  rental_monthly_rate_idr: number | null
  rental_min_days: number
  is_mock: boolean
}

// vehicle_photos lives in jsonb — Supabase returns it as `unknown` to TS.
// Normalise to a string[] of public URLs, dropping anything malformed.
function normalisePhotos(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((u): u is string => typeof u === 'string' && u.length > 0)
}

// Real-row shape — narrowed from `drivers` cols we select above.
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
  rating: number | null
  trips_count: number | null
  vehicle_type: string
  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_year: number | null
  vehicle_color: string | null
  vehicle_seats: number | null
  vehicle_photos: unknown
  rental_type: RentalType | null
  rental_daily_rate_idr: number | null
  rental_weekly_rate_idr: number | null
  rental_monthly_rate_idr: number | null
  rental_min_days: number | null
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
  rating: number | null
  vehicle_type: string
  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_year: number | null
  vehicle_color: string | null
  vehicle_seats: number | null
  vehicle_photos: unknown
  rental_type: RentalType | null
  rental_daily_rate_idr: number | null
  rental_weekly_rate_idr: number | null
  rental_monthly_rate_idr: number | null
  rental_min_days: number | null
}

function realToRental(r: RealRow): TruckRental {
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
    rating: r.rating,
    trips_count: r.trips_count ?? 0,
    vehicle_make: r.vehicle_make,
    vehicle_model: r.vehicle_model,
    vehicle_year: r.vehicle_year,
    vehicle_color: r.vehicle_color,
    vehicle_seats: r.vehicle_seats,
    vehicle_photos: normalisePhotos(r.vehicle_photos),
    rental_type: r.rental_type,
    rental_daily_rate_idr: r.rental_daily_rate_idr,
    rental_weekly_rate_idr: r.rental_weekly_rate_idr,
    rental_monthly_rate_idr: r.rental_monthly_rate_idr,
    rental_min_days: r.rental_min_days ?? 1,
    is_mock: false,
  }
}

function mockToRental(r: MockRow): TruckRental {
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
    rating: r.rating,
    trips_count: 0,
    vehicle_make: r.vehicle_make,
    vehicle_model: r.vehicle_model,
    vehicle_year: r.vehicle_year,
    vehicle_color: r.vehicle_color,
    vehicle_seats: r.vehicle_seats,
    vehicle_photos: normalisePhotos(r.vehicle_photos),
    rental_type: r.rental_type,
    rental_daily_rate_idr: r.rental_daily_rate_idr,
    rental_weekly_rate_idr: r.rental_weekly_rate_idr,
    rental_monthly_rate_idr: r.rental_monthly_rate_idr,
    rental_min_days: r.rental_min_days ?? 1,
    is_mock: true,
  }
}

// Parse the ?type= filter chip param. 'all' (or any unknown value) keeps the
// listing unfiltered; the discriminator only narrows when the param matches
// one of the canonical rental_type values.
type FilterType = 'all' | 'self_drive' | 'with_driver'
function parseFilter(raw: string | undefined): FilterType {
  if (raw === 'self_drive' || raw === 'with_driver') return raw
  return 'all'
}

// 'both' rows match BOTH the self_drive and with_driver chips — they offer
// either model. The 'all' chip skips the predicate entirely.
function matchesFilter(row: TruckRental, f: FilterType): boolean {
  if (f === 'all') return true
  if (row.rental_type === 'both') return true
  return row.rental_type === f
}

// Friendly summary line for the truck size, pulled from vehicle_model.
// Detects the common Indonesian truck classes (pickup, box-van, engkel,
// CDD, fuso) and surfaces a short label for the specialty pill. Falls
// back to "Truck" when the model name doesn't tip off a class.
function truckClassLabel(model: string | null): string {
  if (!model) return 'Truck'
  const m = model.toLowerCase()
  if (m.includes('engkel') || m.includes('dutro')) return 'Engkel box'
  if (m.includes('box')) return 'Box van'
  if (m.includes('cdd')) return 'CDD'
  if (m.includes('fuso')) return 'Fuso'
  if (m.includes('pickup') || m.includes('l300') || m.includes('carry')) return 'Pickup'
  return 'Truck'
}

export default async function TruckRentalsPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; type?: string }>
}) {
  const params = await searchParams
  const cityLabel = (params.city?.trim() || 'Indonesia')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
  const filter = parseFilter(params.type)

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
  // is a no-op (no real truck-rental drivers yet), but wiring it now
  // means the gate is live the moment /dashboard/truck onboarding ships.
  const today = new Date().toISOString().slice(0, 10)

  // Real truck-rental drivers — active status, vehicle_type=truck,
  // rental_daily_rate_idr non-null (= they offer rental), subscription
  // window (paid_until NULL = grace, or >= today = active).
  const { data: realRowsRaw } = await admin
    .from('drivers')
    .select(REAL_COLS)
    .eq('status', 'active')
    .eq('vehicle_type', 'truck')
    .not('rental_daily_rate_idr', 'is', null)
    .or(`paid_until.is.null,paid_until.gte.${today}`)
    .order('availability', { ascending: true })
    .order('rating', { ascending: false, nullsFirst: false })
    .order('trips_count', { ascending: false })
    .limit(200)

  // Mock truck-rental drivers — seeded by migration 0098. Auto-hide
  // trigger on drivers insert keeps the mix honest as real drivers join.
  const { data: mockRowsRaw } = await admin
    .from('mock_drivers')
    .select(MOCK_COLS)
    .eq('vehicle_type', 'truck')
    .not('rental_daily_rate_idr', 'is', null)
    .is('mock_hidden_at', null)
    .order('availability', { ascending: true })
    .order('rating', { ascending: false, nullsFirst: false })
    .limit(200)

  const reals = ((realRowsRaw ?? []) as unknown as RealRow[]).map(realToRental)
  const mocks = ((mockRowsRaw ?? []) as unknown as MockRow[]).map(mockToRental)

  // Reals first, then mocks. Within each: online > busy > offline (the
  // queries above already pulled in that bucket order; JS sort below is
  // stable so prior orders survive the merge sort).
  const availabilityRank: Record<string, number> = { online: 0, busy: 1, offline: 2 }
  const merged: TruckRental[] = [...reals, ...mocks].sort((a, b) => {
    const am = a.is_mock ? 1 : 0
    const bm = b.is_mock ? 1 : 0
    if (am !== bm) return am - bm
    return (availabilityRank[a.availability] ?? 9) - (availabilityRank[b.availability] ?? 9)
  })

  const list = merged.filter((d) => matchesFilter(d, filter))

  // Chip count badges — render the full count for "All" and the
  // filtered count for the two specific filters. Keeps the UI honest
  // about how many trucks fit each rental model.
  const counts = {
    all: merged.length,
    self_drive: merged.filter((d) => matchesFilter(d, 'self_drive')).length,
    with_driver: merged.filter((d) => matchesFilter(d, 'with_driver')).length,
  }

  return (
    <Shell>
      <div className="max-w-3xl mx-auto px-4 pt-3 pb-24">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[24px] sm:text-[28px] font-extrabold tracking-tight leading-tight text-black">
              {cityLabel} <span className="gradient-text">Truck Rentals</span>
            </h1>
            <p className="mt-1 text-[13px] text-black/60 leading-snug">
              Pickup, box-van, engkel — pindahan rumah, distribusi barang,
              jasa angkut. Sopir + helper available. Yogyakarta, Bali.
            </p>
          </div>
          <div className="shrink-0 mt-1 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider text-black bg-brand/20 border border-brand/50">
            <TruckIcon className="w-3.5 h-3.5" strokeWidth={3} />
            <span>{list.length}</span>
          </div>
        </header>

        {/* Rental-type filter chips. Server-driven via ?type= so the
            page stays a server component — no client interactivity
            needed for a 3-state radio. Mocks today are mostly
            with_driver so "All" stays the default. */}
        <nav
          aria-label="Filter by rental type"
          className="mb-4 flex items-center gap-2 overflow-x-auto -mx-1 px-1"
        >
          <FilterChip
            href="/rentals/truck"
            active={filter === 'all'}
            label="All"
            count={counts.all}
          />
          <FilterChip
            href="/rentals/truck?type=with_driver"
            active={filter === 'with_driver'}
            label="With driver"
            count={counts.with_driver}
          />
          <FilterChip
            href="/rentals/truck?type=self_drive"
            active={filter === 'self_drive'}
            label="Self-drive"
            count={counts.self_drive}
          />
        </nav>

        {list.length === 0 ? (
          <div className="rounded-2xl p-8 text-center border border-black/10 bg-white shadow-sm space-y-3">
            <div
              className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #FACC15, #EAB308)',
                border: '1px solid rgba(0,0,0,0.85)',
              }}
            >
              <TruckIcon className="w-6 h-6 text-bg" strokeWidth={2.5} />
            </div>
            <div className="text-[14px] font-extrabold text-black">
              No truck rentals match this filter
            </div>
            <p className="text-[13px] text-black/60">
              Try the &ldquo;All&rdquo; chip, or check back as more drivers list their trucks.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {list.map((d) => {
              // Defensive guards — the SQL filter should keep these out,
              // but if a row sneaks past (e.g. admin cleared rate after
              // setting type), we skip rather than render Rp 0/day.
              if (d.rental_daily_rate_idr == null || d.rental_daily_rate_idr <= 0) return null
              if (!d.rental_type) return null

              // Vehicle line — e.g. "Mitsubishi L300 Pickup 2019". Collapses
              // to make+model when year is missing; falls back to null when
              // neither is present so the line disappears entirely.
              const makeModel = [d.vehicle_make, d.vehicle_model].filter(Boolean).join(' ')
              const vehicleParts: string[] = []
              if (makeModel) vehicleParts.push(makeModel)
              if (d.vehicle_year) vehicleParts.push(String(d.vehicle_year))
              const vehicleLine = vehicleParts.length ? vehicleParts.join(' ') : null

              const cityArea = [d.city, d.area]
                .filter((v) => v && v.trim().length > 0)
                .join(' · ') || null

              return (
                <RentalDriverCard
                  key={d.slug}
                  href={`/rentals/truck/${d.slug}`}
                  displayName={d.business_name}
                  coverImageUrl={d.vehicle_photos[0] ?? null}
                  profileImageUrl={d.profile_image_url}
                  vehicleLine={vehicleLine}
                  seats={d.vehicle_seats}
                  cityArea={cityArea}
                  rentalType={d.rental_type}
                  specialtyPill={truckClassLabel(d.vehicle_model)}
                  dailyRateIdr={d.rental_daily_rate_idr}
                  weeklyRateIdr={d.rental_weekly_rate_idr}
                  monthlyRateIdr={d.rental_monthly_rate_idr}
                  minDays={d.rental_min_days}
                  rating={d.rating}
                  tripsCount={d.trips_count}
                />
              )
            })}
          </div>
        )}

        {/* Compliance footer — surfaces the IndoCity directory model so
            users understand the platform doesn't compute, set, or appoint
            rental rates. Matches the safe-harbour copy used on /car. */}
        <p className="mt-8 text-center text-[11px] uppercase tracking-wider text-black/45">
          Self-published rates · agree rental terms with driver
        </p>
      </div>
    </Shell>
  )
}

// Filter-chip — a navigation Link styled as a pill. Active state shows
// inverted contrast (yellow fill on black ink). Count appears as a
// tabular-num suffix inside the chip.
function FilterChip({
  href,
  active,
  label,
  count,
}: {
  href: string
  active: boolean
  label: string
  count: number
}) {
  return (
    <Link
      href={href}
      prefetch
      className={
        'shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-extrabold uppercase tracking-wider border transition active:scale-95 ' +
        (active
          ? 'bg-[#FACC15] text-black border-black/85 shadow-[0_4px_12px_rgba(250,204,21,0.30)]'
          : 'bg-white text-black/70 border-black/15 hover:border-black/35')
      }
      aria-pressed={active}
    >
      <span>{label}</span>
      <span className="tabular-nums text-[11px] opacity-70">{count}</span>
    </Link>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  // White-background marketplace shell — matches /car, /tour, /handyman,
  // /laundry, and the rest of the app-wide white redesign. IndoCity
  // wordmark links home; no AppNav by design (these vertical marketplaces
  // present as a standalone surface, not part of the authenticated
  // dashboard chrome).
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
