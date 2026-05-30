// =============================================================================
// /cityriders/parcel — Parcel-delivery hub (UMKM + Shopee seller front door)
// =============================================================================
// IndoCity is an Indonesian SOFTWARE DIRECTORY (PM 12/2019, Permenhub
// 118/2018). This page surfaces bike / car / truck drivers who have opted
// into B2B parcel contracts. Drivers self-publish all rates; the platform
// takes 0% commission. Customer + driver agree the contract on WhatsApp;
// we never touch the money.
//
// The page deliberately surfaces ONLY the driver-browser. No hero
// rate-card table, no marketing comparison strip. The browser itself is
// the product: chip toggle (Bike / Car / Truck) + landscape cards with
// the LOWEST published rate + a yellow View profile button. Customers
// who want context arrive from /cityriders, which already explains the
// "100% to driver" wedge.
// =============================================================================

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getAdminSupabase } from '@/lib/supabase/admin'
import {
  PARCEL_RATE_TIER_DEFAULTS_BIKE,
  PARCEL_RATE_TIER_DEFAULTS_CAR,
} from '@/lib/parcel/defaults'
import { getBikeImageUrl } from '@/data/bikeImages'
import { getCarImageUrl } from '@/data/carImages'
import ParcelHubBrowser, {
  type ParcelHubBikeCarRow,
  type ParcelHubTruckRow,
} from '@/components/parcel/ParcelHubBrowser'

// Brand assets — same logo + palette as the /cityriders parent so the two
// pages read as one product surface.
const BRAND_LOGO_URL =
  'https://ik.imagekit.io/nepgaxllc/Untitleddasdasdasasd-removebg-preview.png?updatedAt=1779015947714'

export const metadata = {
  title: 'Parcel delivery Yogyakarta — Direct WhatsApp to driver',
  description:
    'Bike, car, and truck drivers for bulk parcel delivery in Yogyakarta. From Rp 4,500/parcel. No platform commission.',
}

// Always SSR per request so a driver who just enabled parcel_b2b shows up
// immediately. Same posture as /car, /tour, /rent.
export const dynamic = 'force-dynamic'

// -----------------------------------------------------------------------------
// Mock projection types — narrowed to the columns we actually select on
// the mock_drivers fallback path. Real-driver rows match
// ParcelHubBikeCarRow / ParcelHubTruckRow directly from the column list.
// -----------------------------------------------------------------------------
type MockBikeCarRow = {
  slug:              string
  business_name:     string
  profile_image_url: string | null
  cover_image_url:   string | null
  vehicle_photos:    string[] | null
  availability:      'online' | 'busy' | 'offline' | null
  /** Bike-specific make/model — populated only for vehicle_type='bike' */
  bike_make:         string | null
  bike_model:        string | null
  /** Car/truck-specific make/model — populated for car/truck/minibus */
  vehicle_make:      string | null
  vehicle_model:     string | null
  area:              string | null
  city:              string | null
  rating:            number | null
}
type MockTruckRow = MockBikeCarRow & {
  rental_daily_rate_idr: number | null
  rental_min_days:       number | null
}

export default async function CityRidersParcelHubPage() {
  const admin = getAdminSupabase()

  const DRIVER_COLS =
    'slug, business_name, brand_logo_url, vehicle_photos, availability, bike_make, bike_model, vehicle_make, vehicle_model, parcel_rate_tiers, parcel_daily_capacity, parcel_service_zone, rating'
  const TRUCK_COLS =
    'slug, business_name, brand_logo_url, vehicle_photos, availability, vehicle_make, vehicle_model, rental_daily_rate_idr, rental_min_days, area, city, rating'
  // Mock projections include make/model so we can resolve the thumbnail
  // through the ImageKit catalogs (bikeImages / carImages) — mocks were
  // seeded with unsplash placeholders that we don't want surfacing on
  // the brand-managed parcel hub.
  const MOCK_DRIVER_COLS =
    'slug, business_name, profile_image_url, cover_image_url, vehicle_photos, availability, bike_make, bike_model, vehicle_make, vehicle_model, area, city, rating'
  const MOCK_TRUCK_COLS =
    'slug, business_name, profile_image_url, cover_image_url, vehicle_photos, availability, bike_make, bike_model, vehicle_make, vehicle_model, rental_daily_rate_idr, rental_min_days, area, city, rating'

  let bikes:  ParcelHubBikeCarRow[] = []
  let cars:   ParcelHubBikeCarRow[] = []
  let trucks: ParcelHubTruckRow[]   = []

  if (admin) {
    const [
      bikeRes, carRes, truckRes,
      mockBikeRes, mockCarRes, mockTruckRes,
    ] = await Promise.all([
      admin
        .from('drivers')
        .select(DRIVER_COLS)
        .eq('status', 'active')
        .eq('parcel_b2b_enabled', true)
        .eq('vehicle_type', 'bike')
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(12),
      admin
        .from('drivers')
        .select(DRIVER_COLS)
        .eq('status', 'active')
        .eq('parcel_b2b_enabled', true)
        .eq('vehicle_type', 'car')
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(12),
      admin
        .from('drivers')
        .select(TRUCK_COLS)
        .eq('status', 'active')
        .eq('vehicle_type', 'truck')
        .not('rental_daily_rate_idr', 'is', null)
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(12),
      admin
        .from('mock_drivers')
        .select(MOCK_DRIVER_COLS)
        .eq('vehicle_type', 'bike')
        .is('mock_hidden_at', null)
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(12),
      admin
        .from('mock_drivers')
        .select(MOCK_DRIVER_COLS)
        .eq('vehicle_type', 'car')
        .is('mock_hidden_at', null)
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(12),
      admin
        .from('mock_drivers')
        .select(MOCK_TRUCK_COLS)
        .eq('vehicle_type', 'truck')
        .not('rental_daily_rate_idr', 'is', null)
        .is('mock_hidden_at', null)
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(12),
    ])

    // Resolve a mock's thumbnail to an ImageKit URL via the curated bike
    // / car catalogs. Falls through to the mock's own ImageKit profile
    // image (avanza-budi.png etc.) when no catalog hit; finally to the
    // generic vehicle silhouette baked into the catalogs.
    const resolveMockBikePhoto = (m: MockBikeCarRow): string =>
      getBikeImageUrl(m.bike_make, m.bike_model) ?? m.profile_image_url ?? m.cover_image_url ?? ''
    const resolveMockCarPhoto = (m: MockBikeCarRow): string =>
      getCarImageUrl(m.vehicle_make, m.vehicle_model) ?? m.profile_image_url ?? m.cover_image_url ?? ''
    // Trucks aren't catalogued (no truck image catalog yet) — mocks have
    // ImageKit profile_image_url URLs (l300-pickup, carry-pickup, etc.)
    // so use those directly.
    const resolveMockTruckPhoto = (m: MockTruckRow): string =>
      m.profile_image_url ?? m.cover_image_url ?? ''

    const projectMockToDriverBike = (m: MockBikeCarRow): ParcelHubBikeCarRow => ({
      slug:                  m.slug,
      business_name:         m.business_name,
      brand_logo_url:        m.profile_image_url ?? m.cover_image_url ?? null,
      vehicle_photos:        [resolveMockBikePhoto(m)].filter(Boolean),
      availability:          m.availability,
      parcel_rate_tiers:     null,
      parcel_daily_capacity: null,
      parcel_service_zone:
        m.area && m.city ? `${m.area}, ${m.city}` : (m.city ?? m.area ?? null),
      rating:                m.rating,
    })
    const projectMockToDriverCar = (m: MockBikeCarRow): ParcelHubBikeCarRow => ({
      slug:                  m.slug,
      business_name:         m.business_name,
      brand_logo_url:        m.profile_image_url ?? m.cover_image_url ?? null,
      vehicle_photos:        [resolveMockCarPhoto(m)].filter(Boolean),
      availability:          m.availability,
      parcel_rate_tiers:     null,
      parcel_daily_capacity: null,
      parcel_service_zone:
        m.area && m.city ? `${m.area}, ${m.city}` : (m.city ?? m.area ?? null),
      rating:                m.rating,
    })
    const projectMockToTruck = (m: MockTruckRow): ParcelHubTruckRow => ({
      slug:                  m.slug,
      business_name:         m.business_name,
      brand_logo_url:        m.profile_image_url ?? m.cover_image_url ?? null,
      vehicle_photos:        [resolveMockTruckPhoto(m)].filter(Boolean),
      availability:          m.availability,
      rental_daily_rate_idr: m.rental_daily_rate_idr,
      rental_min_days:       m.rental_min_days,
      area:                  m.area,
      city:                  m.city,
      rating:                m.rating,
    })

    // Real-row shape — wider than what the client component consumes
    // because we use bike_make/model to resolve the photo here. Narrowed
    // back to ParcelHubBikeCarRow after the photo-resolution step.
    type RealBikeCarRow = ParcelHubBikeCarRow & {
      bike_make:     string | null
      bike_model:    string | null
      vehicle_make:  string | null
      vehicle_model: string | null
    }
    type RealTruckRow = ParcelHubTruckRow & {
      vehicle_make:  string | null
      vehicle_model: string | null
    }
    const enrichRealBike = (r: RealBikeCarRow): ParcelHubBikeCarRow => {
      const photos = Array.isArray(r.vehicle_photos) ? r.vehicle_photos : []
      if (photos.find((u) => typeof u === 'string' && u.trim())) return r
      // No uploaded photo — fall back to the catalog image keyed off
      // bike_make + bike_model. getBikeImageUrl never returns null.
      return { ...r, vehicle_photos: [getBikeImageUrl(r.bike_make, r.bike_model)] }
    }
    const enrichRealCar = (r: RealBikeCarRow): ParcelHubBikeCarRow => {
      const photos = Array.isArray(r.vehicle_photos) ? r.vehicle_photos : []
      if (photos.find((u) => typeof u === 'string' && u.trim())) return r
      return { ...r, vehicle_photos: [getCarImageUrl(r.vehicle_make, r.vehicle_model)] }
    }
    const enrichRealTruck = (r: RealTruckRow): ParcelHubTruckRow => {
      const photos = Array.isArray(r.vehicle_photos) ? r.vehicle_photos : []
      if (photos.find((u) => typeof u === 'string' && u.trim())) return r
      // No truck catalog yet — fall back to brand_logo_url. UI then drops
      // to the truck glyph if both are empty.
      return { ...r, vehicle_photos: r.brand_logo_url ? [r.brand_logo_url] : [] }
    }

    const realBikes  = ((bikeRes.data  ?? []) as unknown as RealBikeCarRow[]).map(enrichRealBike)
    const realCars   = ((carRes.data   ?? []) as unknown as RealBikeCarRow[]).map(enrichRealCar)
    const realTrucks = ((truckRes.data ?? []) as unknown as RealTruckRow[]).map(enrichRealTruck)
    const mBikes     = ((mockBikeRes.data  ?? []) as unknown as MockBikeCarRow[]).map(projectMockToDriverBike)
    const mCars      = ((mockCarRes.data   ?? []) as unknown as MockBikeCarRow[]).map(projectMockToDriverCar)
    const mTrucks    = ((mockTruckRes.data ?? []) as unknown as MockTruckRow[]).map(projectMockToTruck)

    // Dedupe by slug — a real driver with the same slug as a mock wins.
    const dedupe = <T extends { slug: string }>(real: T[], mock: T[]): T[] => {
      const seen = new Set(real.map((r) => r.slug))
      return [...real, ...mock.filter((m) => !seen.has(m.slug))].slice(0, 12)
    }
    bikes  = dedupe(realBikes,  mBikes)
    cars   = dedupe(realCars,   mCars)
    trucks = dedupe(realTrucks, mTrucks)
  }

  return (
    <main
      className="relative min-h-[100dvh] text-[#0A0A0A]"
      style={{
        background:
          'radial-gradient(circle at top, #FEF3C7 0%, #F5F5F4 70%, #E7E5E4 100%)',
      }}
    >
      <div className="mx-auto bg-white lg:my-6 lg:max-w-[480px] lg:rounded-[32px] lg:shadow-[0_24px_80px_rgba(10,10,10,0.18)] lg:overflow-hidden">

        {/* ─── Header — brand mark top-left + back link right ─────── */}
        <header
          className="flex items-center justify-between gap-2 px-4 pb-3 bg-white"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 14px)' }}
        >
          <Link
            href="/cityriders"
            className="inline-flex items-center gap-2 active:scale-[0.97] transition"
            aria-label="CityRiders home"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BRAND_LOGO_URL}
              alt=""
              className="w-9 h-9 rounded-xl"
              style={{ boxShadow: '0 2px 8px rgba(10,10,10,0.18)' }}
            />
            <span className="font-black text-[18px] tracking-tight leading-none text-[#0A0A0A]">
              CityRiders
            </span>
          </Link>
          <Link
            href="/cityriders"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold transition"
            style={{
              background: '#F5F5F4',
              color: '#0A0A0A',
              border: '1px solid rgba(0,0,0,0.10)',
            }}
          >
            ← Home
          </Link>
        </header>

        {/* ─── Hero text — what this page actually is, on white. */}
        <section className="px-5 pt-4 pb-5 bg-white">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#EAB308] mb-2">
            Bulk parcel &middot; city delivery
          </div>
          <h1 className="text-[22px] sm:text-[26px] font-black leading-[1.1] tracking-tight text-[#0A0A0A]">
            Lowest customer-paid rates in Yogyakarta.
          </h1>
          <p className="mt-2 text-[13px] font-bold text-[#0A0A0A]/75 leading-snug">
            Direct driver pricing &middot; no commission &middot; no platform fees added.
          </p>
          <p className="mt-1 text-[12.5px] font-bold text-[#0A0A0A]/55 leading-snug">
            Untuk UMKM, toko online, atau kirim paket sekali dalam kota.
            Harga driver langsung — tidak ada komisi platform.
          </p>
          <p className="mt-3 text-[12px] text-[#71717A] leading-relaxed">
            Pick a vehicle &middot; see the lowest rate &middot; tap the driver
            and arrange the contract on WhatsApp.{' '}
            <strong className="text-[#0A0A0A]">Every rupiah you pay goes to the driver.</strong>
          </p>
        </section>

        {/* ─── Browser — single white card; chip-filtered driver list ───── */}
        <div className="px-[15px] pt-1 pb-10">
          <ParcelHubBrowser
            bikes={bikes}
            cars={cars}
            trucks={trucks}
            bikeDefaultLowest={PARCEL_RATE_TIER_DEFAULTS_BIKE.tier_51_100}
            carDefaultLowest={PARCEL_RATE_TIER_DEFAULTS_CAR.tier_51_100}
          />
        </div>

        {/* ─── CTA strip — driver acquisition ──────────────────────── */}
        <section className="bg-[#0A0A0A] text-white">
          <div className="px-5 py-8 text-center">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#FACC15] mb-2">
              Are you a driver?
            </div>
            <h2 className="text-[20px] sm:text-[24px] font-black leading-tight">
              Earn 100% from bulk contracts.
            </h2>
            <p className="mt-3 text-[12.5px] text-white/70 max-w-md mx-auto">
              List your bike, car, or truck on the parcel program. We never
              take commission &middot; you keep every rupiah the customer pays.
            </p>
            <div className="mt-5">
              <Link
                href="/drivers"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#FACC15] text-[#0A0A0A] text-[14px] font-extrabold shadow-[0_8px_24px_rgba(250,204,21,0.55)] active:scale-[0.97] transition"
                style={{ minHeight: 48 }}
              >
                List your vehicle
                <ArrowRight className="w-4 h-4" strokeWidth={3} />
              </Link>
            </div>
          </div>
        </section>

        {/* ─── Disclaimer footer ──────────────────────────────────── */}
        <section className="px-5 py-6 bg-white">
          <p className="text-[11px] text-black/50 leading-relaxed text-center">
            CityRiders is a software directory under PM 12/2019. Drivers
            self-publish rates. The platform takes 0% commission.
          </p>
        </section>

      </div>
    </main>
  )
}
