import Link from 'next/link'
import { Car as CarIcon } from 'lucide-react'
import { getAdminSupabase } from '@/lib/supabase/admin'
import RentalsCarFilter, {
  type RentalCardData,
} from './RentalsCarFilter'
import type { RentalType } from '@/components/marketplace/RentalDriverCard'

// ============================================================================
// /rentals/car — Car-rental marketplace
// ----------------------------------------------------------------------------
// IndoCity rental hub for cars. Drivers list their vehicle for self-drive
// (lepas kunci) OR with-driver (by-day chauffeur) hire. Distinct from /car
// (the per-km live-ride marketplace) — different mental model, different
// pricing surface.
//
// Eligibility (per mig 0097):
//   • drivers: vehicle_type='car' AND status='active'
//             AND rental_daily_rate_idr IS NOT NULL
//             AND (paid_until IS NULL OR paid_until >= today)
//   • mock_drivers: vehicle_type='car' AND rental_daily_rate_idr IS NOT NULL
//             AND mock_hidden_at IS NULL
//
// Compliance copy:
//   • "From Rp X/day" / "Self-published by driver"
//   • Footer: "All rates self-published by drivers. IndoCity is a software
//     directory — we never set or modify prices."
// No fare computation, no order matching, no "total cost" language.
// ============================================================================

export const metadata = {
  title: 'Car Rentals · IndoCity',
  description:
    'Browse car rentals in Indonesia — lepas kunci (self-drive) or with ' +
    'driver. Daily, weekly, monthly rates. Self-published by drivers. ' +
    'IndoCity is a directory; we never set prices.',
}

// Server-side render on every request so newly-paid drivers appear without
// a redeploy. Matches /car, /tour, /rent.
export const dynamic = 'force-dynamic'

const REAL_COLS = [
  'user_id', 'slug', 'business_name', 'bio', 'whatsapp_e164',
  'brand_logo_url', 'city', 'area', 'availability',
  'rating', 'trips_count',
  'vehicle_type', 'vehicle_make', 'vehicle_model', 'vehicle_year',
  'vehicle_color', 'vehicle_seats', 'vehicle_photos',
  'rental_type',
  'rental_daily_rate_idr', 'rental_weekly_rate_idr',
  'rental_monthly_rate_idr', 'rental_min_days',
  'paid_until',
].join(', ')

const MOCK_COLS = [
  'id', 'slug', 'business_name', 'bio', 'whatsapp_e164',
  'profile_image_url', 'city', 'area', 'availability',
  'rating',
  'vehicle_type', 'vehicle_make', 'vehicle_model', 'vehicle_year',
  'vehicle_color', 'vehicle_seats', 'vehicle_photos',
  'rental_type',
  'rental_daily_rate_idr', 'rental_weekly_rate_idr',
  'rental_monthly_rate_idr', 'rental_min_days',
].join(', ')

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

// vehicle_photos lives in jsonb — Supabase types it as `unknown`. Normalise
// to a string[] dropping anything malformed so the cover lookup is safe.
function normalisePhotos(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((u): u is string => typeof u === 'string' && u.length > 0)
}

// Compose the vehicle line — e.g. "Honda Brio Satya 2022 · Putih". Falls
// back to make+model when year / colour are absent so the line never
// disappears entirely.
function composeVehicleLine(
  make: string | null,
  model: string | null,
  year: number | null,
  color: string | null,
): string | null {
  const parts: string[] = []
  const makeModel = [make, model].filter(Boolean).join(' ')
  if (makeModel) parts.push(makeModel)
  if (year) parts.push(String(year))
  const head = parts.join(' ')
  if (!head) return null
  return color ? `${head} · ${color}` : head
}

function composeCityArea(city: string | null, area: string | null): string | null {
  const v = [city, area].filter((s) => s && s.trim().length > 0).join(' · ')
  return v.length > 0 ? v : null
}

function realToCard(r: RealRow): RentalCardData | null {
  // Defensive guards: the SQL filter should keep these out, but if a row
  // sneaks past (e.g. type marked but rate cleared by an admin tool), we
  // skip it rather than render an Rp 0/day card.
  if (r.rental_daily_rate_idr == null || r.rental_daily_rate_idr <= 0) return null
  if (!r.rental_type) return null

  const photos = normalisePhotos(r.vehicle_photos)
  return {
    slug:            r.slug,
    displayName:     r.business_name,
    coverImageUrl:   photos[0] ?? null,
    profileImageUrl: r.brand_logo_url,
    vehicleLine:     composeVehicleLine(r.vehicle_make, r.vehicle_model, r.vehicle_year, r.vehicle_color),
    seats:           r.vehicle_seats,
    cityArea:        composeCityArea(r.city, r.area),
    rentalType:      r.rental_type,
    dailyRateIdr:    r.rental_daily_rate_idr,
    weeklyRateIdr:   r.rental_weekly_rate_idr,
    monthlyRateIdr:  r.rental_monthly_rate_idr,
    minDays:         r.rental_min_days,
    rating:          r.rating,
    tripsCount:      r.trips_count ?? 0,
    // Dedicated rental profile page — distinct from /car/[slug] which is
    // the live-ride per-km surface (wrong context for daily/weekly hire).
    href:            `/rentals/car/${r.slug}`,
  }
}

function mockToCard(r: MockRow): RentalCardData | null {
  if (r.rental_daily_rate_idr == null || r.rental_daily_rate_idr <= 0) return null
  if (!r.rental_type) return null

  const photos = normalisePhotos(r.vehicle_photos)
  return {
    slug:            r.slug,
    displayName:     r.business_name,
    coverImageUrl:   photos[0] ?? null,
    profileImageUrl: r.profile_image_url,
    vehicleLine:     composeVehicleLine(r.vehicle_make, r.vehicle_model, r.vehicle_year, r.vehicle_color),
    seats:           r.vehicle_seats,
    cityArea:        composeCityArea(r.city, r.area),
    rentalType:      r.rental_type,
    dailyRateIdr:    r.rental_daily_rate_idr,
    weeklyRateIdr:   r.rental_weekly_rate_idr,
    monthlyRateIdr:  r.rental_monthly_rate_idr,
    minDays:         r.rental_min_days,
    rating:          r.rating,
    tripsCount:      0,
    href:            `/rentals/car/${r.slug}`,
  }
}

export default async function RentalsCarMarketplacePage() {
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

  // Today as YYYY-MM-DD for the paid_until window. Phase 1: no real
  // car-rental drivers exist yet, so this branch is currently a no-op,
  // but it's wired so the gate is live the moment dashboard signups land.
  const today = new Date().toISOString().slice(0, 10)

  const { data: realRowsRaw } = await admin
    .from('drivers')
    .select(REAL_COLS)
    .eq('status', 'active')
    .eq('vehicle_type', 'car')
    .not('rental_daily_rate_idr', 'is', null)
    .or(`paid_until.is.null,paid_until.gte.${today}`)
    .order('availability', { ascending: true })
    .order('rating', { ascending: false, nullsFirst: false })
    .order('trips_count', { ascending: false })
    .limit(200)

  const { data: mockRowsRaw } = await admin
    .from('mock_drivers')
    .select(MOCK_COLS)
    .eq('vehicle_type', 'car')
    .not('rental_daily_rate_idr', 'is', null)
    .is('mock_hidden_at', null)
    .order('availability', { ascending: true })
    .order('rating', { ascending: false, nullsFirst: false })
    .limit(200)

  const reals = ((realRowsRaw ?? []) as unknown as RealRow[])
    .map(realToCard)
    .filter((c): c is RentalCardData => c !== null)
  const mocks = ((mockRowsRaw ?? []) as unknown as MockRow[])
    .map(mockToCard)
    .filter((c): c is RentalCardData => c !== null)

  // Reals first, then mocks. Sort stable so the underlying availability /
  // rating order from the queries survives the merge.
  const cards: RentalCardData[] = [...reals, ...mocks]

  return (
    <Shell>
      <div className="max-w-3xl mx-auto px-4 pt-3 pb-24">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[24px] sm:text-[28px] font-extrabold tracking-tight leading-tight text-black">
              Car <span className="gradient-text">Rentals</span>
            </h1>
            <p className="mt-1 text-[13px] text-black/65 leading-snug">
              Lepas kunci (self-drive) or with driver. Yogyakarta, Bali, Bandung.
              Daily, weekly, monthly rates.
            </p>
          </div>
          <div className="shrink-0 mt-1 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider text-black bg-[#FACC15]/30 border border-[#FACC15]/60">
            <CarIcon className="w-3.5 h-3.5" strokeWidth={3} />
            <span>{cards.length}</span>
          </div>
        </header>

        {cards.length === 0 ? (
          <div className="rounded-2xl p-8 text-center border border-black/10 bg-white shadow-sm space-y-3">
            <div
              className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #FACC15, #EAB308)',
                border: '1px solid rgba(0,0,0,0.85)',
              }}
            >
              <CarIcon className="w-6 h-6 text-black" strokeWidth={2.5} />
            </div>
            <div className="text-[14px] font-extrabold text-black">
              No car rentals listed yet
            </div>
            <p className="text-[13px] text-black/60">
              Check back shortly — rental drivers are joining the directory now.
            </p>
          </div>
        ) : (
          <RentalsCarFilter cards={cards} />
        )}

        {/* Compliance footer */}
        <p className="mt-8 text-center text-[12px] text-black/55 leading-relaxed max-w-md mx-auto">
          All rates self-published by drivers. IndoCity is a software directory
          {' '}— we never set or modify prices. Contact drivers directly via
          WhatsApp to arrange rental.
        </p>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  // Matches the white shell used by /car, /tour, /handyman after the
  // app-wide white redesign. IndoCity wordmark links home; no AppNav by
  // design — the rental marketplaces present as a standalone surface.
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
