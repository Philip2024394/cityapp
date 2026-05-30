'use client'
import { use, useEffect, useMemo, useState } from 'react'
import { notFound } from 'next/navigation'
import DriverProfileShell, { type DriverPublic } from '@/components/profile/DriverProfileShell'
import { fetchDriverBySlugBrowser, fetchActiveDriversBrowser } from '@/lib/drivers/queries'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { logNav } from '@/lib/perf/navTiming'
import type { Rider } from '@/types/rider'
import type { TourPackage } from '@/lib/tours/types'
import { mockToursForSlug } from '@/lib/tours/templates'

// =============================================================================
// /r/[slug] — bike driver profile page
// =============================================================================
// Customer's destination from /cari driver-result cards. Renders the shared
// DriverProfileShell which embeds the booking widget (typed pickup + dropoff
// + multi-stop + WhatsApp deep-link), the vehicle showcase, and the
// alternatives fallback when the driver is busy/offline.
//
// Compliance posture: PM 12/2019 software-directory positioning. The shell
// labels estimates as "Estimate · driver's own rate" and the BOOK NOW CTA
// opens wa.me directly — no internal POST. See DriverProfileShell.tsx
// header for the full compliance note.
// =============================================================================

export default function RiderProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)

  // perf instrumentation — measures cari → r/[slug] (Driver profile) hop.
  useEffect(() => { logNav('r/[slug]:mount') }, [])

  // Same boot pattern the old page used: sync mock lookup for instant
  // render, then upgrade to the live Supabase row if one exists.
  const [rider, setRider] = useState<Rider | null>(null)
  const [resolved, setResolved] = useState(false)
  useEffect(() => {
    let cancelled = false
    fetchDriverBySlugBrowser(slug).then((r) => {
      if (cancelled) return
      setRider(r)
      setResolved(true)
    }).catch(() => {
      if (cancelled) return
      setResolved(true)
    })
    return () => { cancelled = true }
  }, [slug])

  // Re-fetch on focus — driver could have toggled availability while
  // the customer was on this page (or returning from WhatsApp). Keeps
  // the online / busy / offline branch honest without polling.
  useEffect(() => {
    function refetchOnFocus() {
      if (document.visibilityState !== 'visible') return
      fetchDriverBySlugBrowser(slug).then((r) => {
        if (r) setRider(r)
      }).catch(() => { /* best-effort */ })
    }
    document.addEventListener('visibilitychange', refetchOnFocus)
    window.addEventListener('focus', refetchOnFocus)
    return () => {
      document.removeEventListener('visibilitychange', refetchOnFocus)
      window.removeEventListener('focus', refetchOnFocus)
    }
  }, [slug])

  // Alternatives — only populate when the page driver is NOT online.
  // Same vehicle_type (bike), excludes the current slug, limited to 5.
  // Uses the existing fetchActiveDriversBrowser helper to avoid duplicating
  // the marketplace's subscription / online_until gating.
  const [alternatives, setAlternatives] = useState<Rider[]>([])
  const needAlternatives = !!rider && (rider.availability === 'busy' || rider.availability === 'offline'
    || (!rider.availability && !rider.isOnline))
  useEffect(() => {
    if (!needAlternatives) { setAlternatives([]); return }
    let cancelled = false
    fetchActiveDriversBrowser('bike').then((list) => {
      if (cancelled) return
      const filtered = list
        .filter((d) => d.slug !== slug)
        .filter((d) => d.availability === 'online' || d.isOnline)
        .slice(0, 5)
      setAlternatives(filtered)
    }).catch(() => { /* best-effort */ })
    return () => { cancelled = true }
  }, [needAlternatives, slug])

  // Published tours — real drivers query driver_tour_packages; mocks
  // render synthetic tours from MOCK_TOUR_ASSIGNMENTS so the demo bike
  // profiles visibly carry the Tours tab.
  const [tours, setTours] = useState<TourPackage[]>([])
  useEffect(() => {
    if (!rider) return
    if (rider.isMock) {
      setTours(mockToursForSlug(rider.slug) as unknown as TourPackage[])
      return
    }
    const isUuid = /^[0-9a-f-]{36}$/i.test(rider.id)
    if (!isUuid) { setTours([]); return }
    const supabase = getBrowserSupabase()
    if (!supabase) return
    let cancelled = false
    supabase
      .from('driver_tour_packages')
      .select('*')
      .eq('driver_id', rider.id)
      .eq('published', true)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled || error || !data) return
        setTours(data as unknown as TourPackage[])
      })
    return () => { cancelled = true }
  }, [rider])

  // Slug validation + 404 — same gate the old page used. Wait until the
  // initial fetch resolved so a slow Supabase response doesn't 404
  // prematurely.
  if (resolved && !rider) notFound()
  if (!rider) return null

  return (
    <DriverProfileShell
      driver={riderToDriverPublic(rider, 'bike', tours)}
      alternatives={alternatives.map((d) => riderToDriverPublic(d, 'bike'))}
    />
  )
}

// -----------------------------------------------------------------------------
// Adapter — Rider (legacy bike shape) → DriverPublic (shell shape). The
// Rider shape stores motorbike spec on `rider.bike` rather than
// `vehicle_*` columns; this mapper normalises into the shared contract
// the shell consumes regardless of vertical.
// -----------------------------------------------------------------------------
function riderToDriverPublic(r: Rider, vehicleType: 'bike' | 'car', tours: TourPackage[] = []): DriverPublic {
  // Availability — legacy mocks only carry isOnline. Promote that to
  // the three-state string the shell expects.
  const availability: 'online' | 'busy' | 'offline' =
    r.availability === 'busy'    ? 'busy'    :
    r.availability === 'offline' ? 'offline' :
    r.availability === 'online'  ? 'online'  :
    r.isOnline                   ? 'online'  : 'offline'

  // Vehicle photos — the bike vertical stores a single photo on
  // `rider.bike.photoUrl`. Wrap into an array so the shell's
  // single-photo showcase works uniformly.
  const photos: string[] = []
  if (r.bike?.photoUrl) photos.push(r.bike.photoUrl)

  return {
    id:             r.id,
    slug:           r.slug,
    business_name:  r.name,
    bio:            r.bio || null,
    whatsapp_e164:  r.whatsappE164,
    photo_url:      r.photoUrl ?? null,
    city:           r.city || null,
    area:           r.area || null,
    rating:         r.rating ?? null,
    trips_count:    r.trips ?? null,
    availability,
    vehicle_type:   vehicleType,
    vehicle_make:   r.bike?.make ?? null,
    vehicle_model:  r.bike?.model ?? null,
    vehicle_year:   r.bike?.year ?? null,
    vehicle_color:  r.bike?.color ?? null,
    vehicle_seats:  null, // bikes don't carry seat counts
    vehicle_photos: photos,
    price_per_km:   r.pricePerKm ?? null,
    min_fee:        r.minFee ?? null,
    pitstop_fee:    r.pitstopFee ?? null,
    lat:            typeof r.lat === 'number' ? r.lat : null,
    lng:            typeof r.lng === 'number' ? r.lng : null,
    services:       Array.isArray(r.services) ? (r.services as string[]) : [],
    // service_offerings (mig 0110) — the legacy Rider type doesn't carry
    // this column today, so we default to []. Bike drivers will see the
    // empty section hidden by the shell. When the Rider shape is upgraded
    // to surface drivers.service_offerings, swap [] for r.serviceOfferings.
    service_offerings: ((r as unknown as { serviceOfferings?: unknown }).serviceOfferings as string[] | undefined) ?? [],
    // Hourly hire + working hours — threaded through from drivers (mig
    // 0156). Bike drivers who opt into hourly hire on /dashboard/rider
    // now surface the Hourly Booking tab on their public profile.
    hourly_enabled:        r.hourlyEnabled ?? null,
    hourly_3h_rate_idr:    r.hourly3hRateIdr ?? null,
    hourly_6h_rate_idr:    r.hourly6hRateIdr ?? null,
    hourly_8h_rate_idr:    r.hourly8hRateIdr ?? null,
    working_hours_start:   r.workingHoursStart ?? null,
    working_hours_end:     r.workingHoursEnd ?? null,
    languages:             r.languages ?? null,
    tours,
  }
}
