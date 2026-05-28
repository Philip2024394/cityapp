import Link from 'next/link'
import { ChevronRight, Plus, Search, Star } from 'lucide-react'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { listRentalsForCity } from '@/lib/rentals/queries'
import { idrShort } from '@/lib/format/idr'

// ============================================================================
// /rent — Unified rentals marketplace (2026-05-28 redesign)
// ----------------------------------------------------------------------------
// Was the bike-only marketplace; now the canonical "all rentals" shell that
// /explore's Rental tile routes to. Matches the /beautician + /places shell
// exactly: white card container, wordmark header, fixed backdrop image,
// search input, chip row (All · Bike · Car · Bus · Truck), landscape row
// cards, positive WhatsApp footer.
//
// Data sources (one query per vehicle type — fanned out because the 4
// types live in 2 different table families):
//   • Bike  → bike_rentals + mock_bike_rentals via listRentalsForCity()
//   • Car   → drivers + mock_drivers where vehicle_type='car'   AND rental_daily_rate_idr IS NOT NULL
//   • Bus   → drivers + mock_drivers where vehicle_type='minibus' AND rental_daily_rate_idr IS NOT NULL
//   • Truck → drivers + mock_drivers where vehicle_type='truck' AND rental_daily_rate_idr IS NOT NULL
//
// Card routes:
//   • Bike  → /rent/{slug}            (unchanged — existing bike profile page)
//   • Car   → /rentals/car/{slug}     (existing car-rental profile)
//   • Truck → /rentals/truck/{slug}   (existing truck-rental profile)
//   • Bus   → /rentals/bus/{slug} when present; today buses route to /bus/{slug}
//             because no dedicated /rentals/bus/[slug] surface exists yet
//             (follow-up: build a daily-hire bus profile page).
//
// Chip + search filter is URL-driven (?type=, ?q=) — same pattern as
// /rentals/truck, keeps the page a server component with no client island
// (constraint: edit only this file).
//
// Compliance posture: IndoCity is a software directory (PM 12/2019). All
// rates are self-published by the owner / driver — we surface, never set.
// ============================================================================

export const metadata = {
  title: 'Rentals · IndoCity',
  description:
    'Browse every rental in your city — bike, car, bus, truck — by day, ' +
    'week, or month. Self-published rates. Book direct via WhatsApp. ' +
    'IndoCity is a software directory; we never set prices.',
}

// Force fresh data each request so newly-approved listings appear without
// a redeploy. Matches /rentals/car, /rentals/truck, /bus.
export const dynamic = 'force-dynamic'

// ─────────────────────────────────────────────────────────────────────────────
// Type definitions
// ─────────────────────────────────────────────────────────────────────────────

type VehicleType = 'bike' | 'car' | 'bus' | 'truck'
type ChipValue   = 'all' | VehicleType

type UnifiedRental = {
  vehicleType:   VehicleType
  slug:          string
  href:          string
  displayName:   string
  imageUrl:      string | null
  subtitleLine:  string | null   // e.g. "Honda PCX 150 · 2023" or "Hiace Premio 2022"
  cityArea:      string | null
  dailyRateIdr:  number | null
  rating:        number | null
  isMock:        boolean
}

type DriverRealRow = {
  user_id:                string
  slug:                   string
  business_name:          string
  brand_logo_url:         string | null
  city:                   string | null
  area:                   string | null
  rating:                 number | null
  trips_count:            number | null
  vehicle_type:           string
  vehicle_make:           string | null
  vehicle_model:          string | null
  vehicle_year:           number | null
  vehicle_color:          string | null
  vehicle_photos:         unknown
  rental_daily_rate_idr:  number | null
  paid_until:             string | null
}

type DriverMockRow = {
  id:                     string
  slug:                   string
  business_name:          string
  profile_image_url:      string | null
  city:                   string | null
  area:                   string | null
  rating:                 number | null
  vehicle_type:           string
  vehicle_make:           string | null
  vehicle_model:          string | null
  vehicle_year:           number | null
  vehicle_color:          string | null
  vehicle_photos:         unknown
  rental_daily_rate_idr:  number | null
}

const DRIVER_REAL_COLS = [
  'user_id', 'slug', 'business_name', 'brand_logo_url', 'city', 'area',
  'rating', 'trips_count',
  'vehicle_type', 'vehicle_make', 'vehicle_model', 'vehicle_year', 'vehicle_color', 'vehicle_photos',
  'rental_daily_rate_idr', 'paid_until',
].join(', ')

const DRIVER_MOCK_COLS = [
  'id', 'slug', 'business_name', 'profile_image_url', 'city', 'area',
  'rating',
  'vehicle_type', 'vehicle_make', 'vehicle_model', 'vehicle_year', 'vehicle_color', 'vehicle_photos',
  'rental_daily_rate_idr',
].join(', ')

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const SUPPORTED_CITY_SLUGS = [
  'yogyakarta','denpasar','jakarta','bandung','surabaya','medan','semarang',
  'makassar','malang','solo',
] as const

function capitalise(s: string): string {
  if (!s) return s
  return s[0]!.toUpperCase() + s.slice(1)
}

function parseChip(raw: string | undefined): ChipValue {
  if (raw === 'bike' || raw === 'car' || raw === 'bus' || raw === 'truck') return raw
  return 'all'
}

function normalisePhotos(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((u): u is string => typeof u === 'string' && u.length > 0)
}

function composeVehicleLine(
  make: string | null,
  model: string | null,
  year: number | null,
  color: string | null,
): string | null {
  const makeModel = [make, model].filter(Boolean).join(' ')
  const parts: string[] = []
  if (makeModel) parts.push(makeModel)
  if (year)      parts.push(String(year))
  const head = parts.join(' ')
  if (!head) return null
  return color ? `${head} · ${color}` : head
}

function composeCityArea(city: string | null, area: string | null): string | null {
  const v = [city, area].filter((s) => s && s.trim().length > 0).join(' · ')
  return v.length > 0 ? v : null
}

// Deterministic placeholder rating per row (4.3 – 4.9). Used when the row
// has no real rating yet — matches the /beautician + /places treatment.
function placeholderRating(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h) + seed.charCodeAt(i)
    h |= 0
  }
  return 4.3 + ((Math.abs(h) % 70) / 100)
}

// Vehicle-type → card href mapping. Buses currently route to /bus/[slug]
// because no /rentals/bus/[slug] surface exists yet.
function hrefForType(vt: VehicleType, slug: string): string {
  if (vt === 'bike')  return `/rent/${slug}`
  if (vt === 'car')   return `/rentals/car/${slug}`
  if (vt === 'truck') return `/rentals/truck/${slug}`
  return `/bus/${slug}`
}

function typeLabel(vt: VehicleType): string {
  if (vt === 'bike')  return 'Bike'
  if (vt === 'car')   return 'Car'
  if (vt === 'truck') return 'Truck'
  return 'Bus'
}

// ─────────────────────────────────────────────────────────────────────────────
// Data loaders — one per vehicle type. All return UnifiedRental[].
// ─────────────────────────────────────────────────────────────────────────────

async function loadBikes(city: string): Promise<UnifiedRental[]> {
  const rows = await listRentalsForCity(city)
  return rows.map((r) => ({
    vehicleType:  'bike',
    slug:         r.slug,
    href:         `/rent/${r.slug}`,
    displayName:  r.ownerCompany || r.ownerName,
    imageUrl:     r.imageUrls[0] ?? null,
    subtitleLine: composeVehicleLine(r.brand, r.model, r.year || null, r.color),
    cityArea:     composeCityArea(r.city, null),
    dailyRateIdr: r.dailyPriceIdr,
    rating:       r.rating,
    isMock:       Boolean(r.isMock),
  }))
}

// Generic driver-rental loader. `vt` is the schema discriminator
// ('car' | 'minibus' | 'truck'); `outType` is the chip value we tag the
// row with so the chip filter matches.
async function loadDriverRentals(
  vt: 'car' | 'minibus' | 'truck',
  outType: VehicleType,
): Promise<UnifiedRental[]> {
  const admin = getAdminSupabase()
  if (!admin) return []
  const today = new Date().toISOString().slice(0, 10)

  const [realRes, mockRes] = await Promise.all([
    admin
      .from('drivers')
      .select(DRIVER_REAL_COLS)
      .eq('status', 'active')
      .eq('vehicle_type', vt)
      .not('rental_daily_rate_idr', 'is', null)
      .or(`paid_until.is.null,paid_until.gte.${today}`)
      .order('rating', { ascending: false, nullsFirst: false })
      .limit(200),
    admin
      .from('mock_drivers')
      .select(DRIVER_MOCK_COLS)
      .eq('vehicle_type', vt)
      .not('rental_daily_rate_idr', 'is', null)
      .is('mock_hidden_at', null)
      .order('rating', { ascending: false, nullsFirst: false })
      .limit(200),
  ])

  const reals: UnifiedRental[] = ((realRes.data ?? []) as unknown as DriverRealRow[])
    .filter((r) => r.rental_daily_rate_idr != null && r.rental_daily_rate_idr > 0)
    .map((r) => {
      const photos = normalisePhotos(r.vehicle_photos)
      return {
        vehicleType:  outType,
        slug:         r.slug,
        href:         hrefForType(outType, r.slug),
        displayName:  r.business_name,
        imageUrl:     photos[0] ?? r.brand_logo_url,
        subtitleLine: composeVehicleLine(r.vehicle_make, r.vehicle_model, r.vehicle_year, r.vehicle_color),
        cityArea:     composeCityArea(r.city, r.area),
        dailyRateIdr: r.rental_daily_rate_idr,
        rating:       r.rating,
        isMock:       false,
      }
    })

  const mocks: UnifiedRental[] = ((mockRes.data ?? []) as unknown as DriverMockRow[])
    .filter((r) => r.rental_daily_rate_idr != null && r.rental_daily_rate_idr > 0)
    .map((r) => {
      const photos = normalisePhotos(r.vehicle_photos)
      return {
        vehicleType:  outType,
        slug:         r.slug,
        href:         hrefForType(outType, r.slug),
        displayName:  r.business_name,
        imageUrl:     photos[0] ?? r.profile_image_url,
        subtitleLine: composeVehicleLine(r.vehicle_make, r.vehicle_model, r.vehicle_year, r.vehicle_color),
        cityArea:     composeCityArea(r.city, r.area),
        dailyRateIdr: r.rental_daily_rate_idr,
        rating:       r.rating,
        isMock:       true,
      }
    })

  return [...reals, ...mocks]
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function RentPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; type?: string; q?: string }>
}) {
  const params = await searchParams
  const citySlug = SUPPORTED_CITY_SLUGS.includes(
    (params.city ?? '') as typeof SUPPORTED_CITY_SLUGS[number],
  )
    ? (params.city as string)
    : 'yogyakarta'
  const cityLabel = capitalise(citySlug)
  const activeChip = parseChip(params.type)
  const query      = (params.q ?? '').trim()

  // Fan out — 4 vehicle types live in 2 table families, so we issue 4
  // independent queries in parallel. Bus + truck Phase 1 mostly carries
  // mock seeds; bike already has real listings via /rent/list.
  const [bikes, cars, buses, trucks] = await Promise.all([
    loadBikes(citySlug),
    loadDriverRentals('car',     'car'),
    loadDriverRentals('minibus', 'bus'),
    loadDriverRentals('truck',   'truck'),
  ])

  const allRentals: UnifiedRental[] = [...bikes, ...cars, ...buses, ...trucks]

  // Chip filter — keep all when 'all', otherwise narrow to the picked type.
  let visible = activeChip === 'all'
    ? allRentals
    : allRentals.filter((r) => r.vehicleType === activeChip)

  // Free-text search — matches name, subtitle, city/area.
  if (query) {
    const q = query.toLowerCase()
    visible = visible.filter((r) =>
      r.displayName.toLowerCase().includes(q) ||
      (r.subtitleLine ?? '').toLowerCase().includes(q) ||
      (r.cityArea ?? '').toLowerCase().includes(q),
    )
  }

  // Sort: reals before mocks; within each, by rating desc (placeholder
  // ratings stand in when null so the order stays stable).
  visible.sort((a, b) => {
    if (a.isMock !== b.isMock) return a.isMock ? 1 : -1
    const ar = a.rating ?? placeholderRating(a.slug)
    const br = b.rating ?? placeholderRating(b.slug)
    return br - ar
  })

  const chips: Array<{ id: ChipValue; label: string }> = [
    { id: 'all',   label: 'All'   },
    { id: 'bike',  label: 'Bike'  },
    { id: 'car',   label: 'Car'   },
    { id: 'bus',   label: 'Bus'   },
    { id: 'truck', label: 'Truck' },
  ]

  // Build chip href preserving city + q. Picking the same chip clears the
  // filter ("All" semantics) — matches the /rentals/truck chip behaviour.
  function chipHref(id: ChipValue): string {
    const sp = new URLSearchParams()
    if (citySlug !== 'yogyakarta') sp.set('city', citySlug)
    if (id !== 'all')              sp.set('type', id)
    if (query)                     sp.set('q', query)
    const qs = sp.toString()
    return qs ? `/rent?${qs}` : '/rent'
  }

  return (
    <Shell>
      <div className="px-[15px] pb-10">
        <div
          className="mx-auto bg-white rounded-3xl shadow-2xl w-full overflow-hidden"
          style={{
            maxWidth: 640,
            boxShadow: '0 20px 60px rgba(15,23,42,0.10), 0 2px 8px rgba(15,23,42,0.04)',
          }}
        >
          <div className="flex flex-col p-4 sm:p-5">
            {/* ROW 1 — Header: title + small "List" yellow pill */}
            <div className="flex items-center justify-between gap-2 shrink-0">
              <div className="min-w-0">
                <h1 className="text-[18px] sm:text-[20px] font-black tracking-tight text-[#0A0A0A] leading-tight">
                  Rentals in {cityLabel}
                </h1>
                <p className="text-[12px] font-bold text-[#71717A] leading-tight mt-0.5 truncate">
                  Bike · Car · Bus · Truck — by day, week, month
                </p>
              </div>
              <Link
                href="/rent/list/new"
                aria-label="List your rental"
                className="shrink-0 inline-flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full text-[#0A0A0A] font-extrabold text-[13px] active:scale-95 transition"
                style={{
                  background: '#FACC15',
                  boxShadow: '0 4px 12px rgba(250,204,21,0.45)',
                  minHeight: 32,
                }}
              >
                <span
                  className="w-5 h-5 rounded-full inline-flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.10)' }}
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                </span>
                <span>List</span>
              </Link>
            </div>

            {/* ROW 2 — Search input (GET form so the page can stay a server
                component — submitting nav-replaces with ?q=…). */}
            <form
              method="GET"
              action="/rent"
              className="mt-3 relative shrink-0"
              role="search"
            >
              {/* Preserve current city + chip in hidden inputs so submitting
                  the search doesn't drop them. */}
              {citySlug !== 'yogyakarta' && (
                <input type="hidden" name="city" value={citySlug} />
              )}
              {activeChip !== 'all' && (
                <input type="hidden" name="type" value={activeChip} />
              )}
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search rentals — brand, model, area…"
                aria-label="Search rentals"
                className="w-full bg-[#F4F4F5] border border-[#E4E4E7] text-[#0A0A0A] placeholder:text-[#71717A] rounded-xl pl-3 pr-11 py-2.5 text-[14px] font-bold focus:outline-none focus:bg-white focus:border-[#FACC15] transition"
                style={{ minHeight: 44 }}
              />
              <button
                type="submit"
                aria-label="Run search"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full inline-flex items-center justify-center text-[#52525B] hover:text-[#0A0A0A] transition"
              >
                <Search className="w-[18px] h-[18px]" strokeWidth={2.4} />
              </button>
            </form>

            {/* ROW 3 — Vehicle-type chip row */}
            <nav
              aria-label="Filter rentals by vehicle type"
              className="mt-3 -mx-1 px-1 flex gap-2 overflow-x-auto overscroll-contain shrink-0"
              style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
            >
              {chips.map((chip) => {
                const active = chip.id === activeChip
                return (
                  <Link
                    key={chip.id}
                    href={chipHref(chip.id)}
                    prefetch
                    aria-pressed={active}
                    className="shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-extrabold tracking-tight transition active:scale-95 inline-flex items-center"
                    style={{
                      background: active ? '#FACC15' : '#F4F4F5',
                      color:      active ? '#0A0A0A' : '#52525B',
                      border:     active ? '1px solid #FACC15' : '1px solid #E4E4E7',
                      boxShadow:  active ? '0 4px 12px rgba(250,204,21,0.35)' : 'none',
                      minHeight:  34,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {chip.label}
                  </Link>
                )
              })}
            </nav>

            {/* ROW 4 — Card list */}
            <div
              className="mt-3 flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2 -mx-1 px-1"
              style={{ maxHeight: '62vh', scrollbarWidth: 'thin' }}
            >
              {visible.length === 0 && (
                <div className="py-10 text-center">
                  <p className="text-[13px] font-bold text-[#71717A] leading-snug">
                    {query
                      ? `No results for "${query}". Try a different keyword.`
                      : 'No rentals in this category yet. Try a different filter.'}
                  </p>
                </div>
              )}
              {visible.map((r) => (
                <RentalRowCard key={`${r.vehicleType}-${r.slug}`} rental={r} />
              ))}
            </div>

            {/* ROW 5 — Positive WhatsApp footer */}
            <p className="mt-3 text-center text-[12px] text-[#52525B] font-bold leading-snug px-2 shrink-0">
              Book direct via WhatsApp · No commissions, no platform fees
              — you pay the owner directly.
            </p>
          </div>
        </div>
      </div>
    </Shell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// RentalRowCard — landscape card matching the /beautician + /places shape.
// 88px image left, name + vehicle line + daily rate middle, type + location
// pills below, ★ rating + yellow chevron right.
// ─────────────────────────────────────────────────────────────────────────────
function RentalRowCard({ rental: r }: { rental: UnifiedRental }) {
  const rating = (r.rating ?? placeholderRating(r.slug)).toFixed(1)
  const rate   = r.dailyRateIdr ? `${idrShort(r.dailyRateIdr)}/day` : 'Inquire'

  return (
    <Link
      href={r.href}
      aria-label={`Open ${r.displayName}`}
      className="w-full text-left flex items-center gap-3 p-2.5 rounded-xl bg-white border border-[#E4E4E7] hover:border-[#FACC15] active:scale-[0.99] transition"
      style={{
        minHeight: 112,
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      {/* Image — 88px square */}
      <div className="shrink-0 rounded-lg overflow-hidden bg-[#F4F4F5]" style={{ width: 88, height: 88 }}>
        {r.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={r.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #FACC15, #EAB308)' }}
            aria-hidden
          >
            <span className="text-[#0A0A0A] font-black text-[24px]">
              {r.displayName?.[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
        )}
      </div>

      {/* Middle column */}
      <div className="min-w-0 flex-1">
        <span className="block text-[14px] font-black text-[#0A0A0A] truncate leading-tight">
          {r.displayName}
        </span>
        {r.subtitleLine && (
          <div className="mt-1 text-[12px] font-bold text-[#52525B] leading-tight truncate">
            {r.subtitleLine}
          </div>
        )}
        <div className="mt-1.5 text-[13px] font-extrabold text-[#0A0A0A] leading-tight">
          {rate}
        </div>
        <div className="mt-1.5 flex items-center gap-1 overflow-hidden">
          <span
            className="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 bg-[#FEF9C3] border border-[#FDE68A] text-[#854D0E] text-[12px] font-extrabold leading-none whitespace-nowrap"
          >
            {typeLabel(r.vehicleType)}
          </span>
          {r.cityArea && (
            <span
              className="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 bg-[#FEF9C3] border border-[#FDE68A] text-[#854D0E] text-[12px] font-extrabold leading-none whitespace-nowrap truncate"
              style={{ maxWidth: 180 }}
            >
              {r.cityArea}
            </span>
          )}
        </div>
      </div>

      {/* Right column — rating top, chevron bottom */}
      <div className="shrink-0 flex flex-col items-end justify-between h-[88px] py-0.5">
        <span className="inline-flex items-center gap-0.5 text-[12px] font-extrabold text-[#0A0A0A]">
          <Star className="w-3 h-3" strokeWidth={2.5} fill="#FACC15" style={{ color: '#FACC15' }} aria-hidden />
          {rating}
        </span>
        <ChevronRight className="w-5 h-5" strokeWidth={2.75} aria-hidden style={{ color: '#FACC15' }} />
      </div>
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Shell — wordmark header + fixed backdrop image (matches /beautician).
// ─────────────────────────────────────────────────────────────────────────────
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="relative min-h-[100dvh]"
      style={{ color: '#0A0A0A' }}
    >
      {/* Backdrop image — same one /beautician + /explore + landing use for
          brand continuity. */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          backgroundImage: `url('https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2027,%202026,%2011_47_55%20PM.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* Soft white scrim at the top so the dark wordmark stays readable on
          any backdrop. */}
      <div
        aria-hidden
        className="fixed inset-x-0 top-0 h-32 -z-10 pointer-events-none bg-gradient-to-b from-white/65 to-transparent"
      />

      <header className="relative z-30 pt-safe">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" aria-label="IndoCity home" className="inline-block hover:opacity-85 transition">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://ik.imagekit.io/nepgaxllc/Untitleddfsdfsdfs-removebg-preview.png"
              alt="IndoCity"
              className="h-8 sm:h-10 w-auto"
            />
          </Link>
        </div>
      </header>

      {children}
    </main>
  )
}
