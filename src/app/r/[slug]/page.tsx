'use client'
import { use, useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Drawer } from 'vaul'
import {
  MapPin, Bike as BikeIcon, Star, X as XIcon,
  Search as SearchIcon, Check, Plus,
} from 'lucide-react'
import OfflineFallback from '@/components/rider/OfflineFallback'
import PlaceAutocomplete from '@/components/inputs/PlaceAutocomplete'
import { findRiderBySlug, getOnlineRiders } from '@/data/mockRiders'
import { fetchDriverBySlugBrowser } from '@/lib/drivers/queries'
import { useGeolocation, type GeoPoint } from '@/hooks/useGeolocation'
import { useHaptic } from '@/hooks/useHaptic'
import { rateFor, quoteBreakdown } from '@/lib/pricing/quote'
import { haversineKm } from '@/lib/geo/haversine'
import { idr } from '@/lib/format/idr'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { nearestCity, citySlugLabel, SUPPORTED_CITIES } from '@/lib/cities'
import { SERVICE_SHORT, type ServiceType, type Rider } from '@/types/rider'

// Landing-page brand images — reused on the driver-page service tiles
// so the visual language stays consistent between marketplace and
// driver storefront.
const SERVICE_TILE_IMAGES: Record<ServiceType, string> = {
  person: 'https://ik.imagekit.io/nepgaxllc/Untitleddasdas-removebg-preview.png',
  parcel: 'https://ik.imagekit.io/nepgaxllc/Untitledsddasd-removebg-preview.png?updatedAt=1779013880961',
  food:   'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2017,%202026,%2005_29_25%20PM.png?updatedAt=1779013783890',
}
const PLACES_TILE_IMAGE =
  'https://ik.imagekit.io/nepgaxllc/Untitledwrr-removebg-preview.png?updatedAt=1778253100200'

// Public review rendered in the "What riders say" section
type ReviewRow = {
  id: string
  reviewer_name: string
  reviewer_country: string | null
  rating: number
  comment: string | null
  created_at: string
}

// Shape of a curated place tile rendered in "My favourite places"
type FavePlace = {
  place_id: string
  note: string | null
  place: {
    slug: string
    name: string
    category: string
    image_urls: string[] | null
    city: string
    rating: number | null
  }
}

// Shape of a cross-sell driver card
type CrossSellDriver = {
  user_id: string
  slug: string
  business_name: string
  photo_url: string | null
  city: string
  price_per_km: number | null
  rating: number | null
}

export default function RiderProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  // Initial render uses sync mock lookup so the page boots instantly.
  // Then we upgrade to the live Supabase row if one exists.
  const [maybeRider, setMaybeRider] = useState<Rider | null>(() => findRiderBySlug(slug) ?? null)
  useEffect(() => {
    let cancelled = false
    fetchDriverBySlugBrowser(slug).then((r) => {
      if (!cancelled && r) setMaybeRider(r)
    })
    return () => { cancelled = true }
  }, [slug])

  // Layer 1 ↔ Layer 2 content: places this driver curates + nearby drivers
  // for the cross-sell strip. Fetched after the driver row is available so
  // we can scope by city. Both fail silently — public page must still render
  // even if the discovery layer is empty.
  const [favePlaces, setFavePlaces] = useState<FavePlace[]>([])
  const [crossSell, setCrossSell]   = useState<CrossSellDriver[]>([])
  const [reviews, setReviews]       = useState<ReviewRow[]>([])
  const [reviewStats, setReviewStats] = useState<{ avg: number; count: number } | null>(null)
  useEffect(() => {
    if (!maybeRider) return
    const supabase = getBrowserSupabase()
    if (!supabase) return
    let cancelled = false
    ;(async () => {
      const [favRes, csRes, revRes, allRevRes] = await Promise.all([
        supabase
          .from('driver_places')
          .select('place_id, note, places(slug, name, category, image_urls, city, rating)')
          .eq('driver_user_id', maybeRider.id)
          .order('display_order'),
        supabase
          .from('drivers')
          .select('user_id, slug, business_name, photo_url, city, price_per_km, rating')
          .eq('city', maybeRider.city)
          .eq('status', 'active')
          .neq('user_id', maybeRider.id)
          .order('rating', { ascending: false, nullsFirst: false })
          .limit(4),
        supabase
          .from('reviews')
          .select('id, reviewer_name, reviewer_country, rating, comment, created_at')
          .eq('driver_user_id', maybeRider.id)
          .eq('status', 'visible')
          .order('created_at', { ascending: false })
          .limit(5),
        // Aggregate stats — fetch ratings to compute live avg + count.
        // For ≤500 reviews per driver this scan is cheap; if a driver
        // ever crosses that we can move it to a materialized view.
        supabase
          .from('reviews')
          .select('rating')
          .eq('driver_user_id', maybeRider.id)
          .eq('status', 'visible'),
      ])
      if (cancelled) return
      const fav = ((favRes.data ?? []) as unknown as FavePlace[]).filter((x) => x.place)
      setFavePlaces(fav)
      setCrossSell((csRes.data ?? []) as CrossSellDriver[])
      setReviews((revRes.data ?? []) as ReviewRow[])
      const ratings = ((allRevRes.data ?? []) as { rating: number }[]).map((r) => r.rating)
      if (ratings.length > 0) {
        const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length
        setReviewStats({ avg, count: ratings.length })
      } else {
        setReviewStats(null)
      }
    })()
    return () => { cancelled = true }
  }, [maybeRider])

  const geo = useGeolocation(true)
  const haptic = useHaptic()

  const [pickup, setPickup] = useState<GeoPoint | null>(null)
  const [dropoff, setDropoff] = useState<GeoPoint | null>(null)
  const [pickupLabel, setPickupLabel] = useState('My location')
  const [dropoffLabel, setDropoffLabel] = useState('')
  // Pit-stop note — free-text request the rider should make on the way
  // (e.g. "buy 1 Coca-Cola at warung depan"). Carried through to the
  // WhatsApp deep-link so the driver sees it in the booking message.
  // Tile has 3 states (matching /cari exactly): collapsed-CTA,
  // collapsed-with-note (tap to edit), or expanded textarea.
  const [pitstop, setPitstop] = useState('')
  const [pitstopOpen, setPitstopOpen] = useState(false)

  // Reviews popup state — opened from the small button next to the
  // 'Pick up' label. Shows last 4 reviews, refreshes live from the
  // `reviews` array already fetched (limit 5 in the load effect).
  const [reviewsOpen, setReviewsOpen] = useState(false)

  // Places picker drawer state
  const [placesOpen, setPlacesOpen] = useState(false)
  const [placeSearch, setPlaceSearch] = useState('')
  type PickablePlace = {
    id: string
    slug: string
    name: string
    category: string
    city: string
    lat: number
    lng: number
    image_urls: string[] | null
    rating: number | null
    isFavourite?: boolean
  }
  const [allPlaces, setAllPlaces] = useState<PickablePlace[]>([])

  // Centroid used as the geocoder proximity bias so local addresses
  // (street names + villages around the driver's city) rank highest.
  const driverCityCentroid = useMemo(() => {
    if (!maybeRider?.city) return null
    return SUPPORTED_CITIES.find((c) => c.slug === maybeRider.city) ?? null
  }, [maybeRider?.city])

  // Selected service — defaults to the first one the rider offers.
  // Declared up here so the quote useMemo below can reference it.
  const [service, setService] = useState<ServiceType | null>(
    maybeRider?.services[0] ?? null,
  )

  // City-mismatch detection — once GPS lands, find the customer's
  // nearest supported city and compare to the driver's service city.
  // If they don't match, the booking card is replaced with a
  // "Driver doesn't service your city" container.
  const userCity = useMemo(() => {
    if (!geo.coords) return null
    return nearestCity(geo.coords.lat, geo.coords.lng)
  }, [geo.coords])
  const cityMismatch = !!(
    userCity && maybeRider?.city &&
    userCity.city.slug.toLowerCase() !== maybeRider.city.toLowerCase()
  )

  // Live trip quote — distance × driver's per-km, floored at min-fee.
  // Drives the price shown on the Confirm Driver button.
  const quote = useMemo(() => {
    if (!maybeRider || !pickup || !dropoff) return null
    const distanceKm = haversineKm(pickup, dropoff)
    const pricing = service ? rateFor(maybeRider, service) : { pricePerKm: maybeRider.pricePerKm, minFee: maybeRider.minFee }
    const { final, minApplied } = quoteBreakdown(distanceKm, pricing)
    return { distanceKm, fare: final, minApplied, pricePerKm: pricing.pricePerKm }
  }, [maybeRider, pickup, dropoff, service])

  // Fetch ALL approved places from the main-app directory (not just the
  // driver's city). The drawer is a discovery surface — let customers
  // browse the whole catalog and pick anything. Sort order:
  //   1. Driver's curated favourites (with ★)
  //   2. Places in the driver's service city
  //   3. Everything else, alphabetical
  // Fare estimate per row uses THIS driver's per-km rate, so prices
  // reflect the chosen driver regardless of place city.
  useEffect(() => {
    if (!maybeRider) return
    const supabase = getBrowserSupabase()
    if (!supabase) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('places')
        .select('id, slug, name, category, city, lat, lng, image_urls, rating')
        .eq('status', 'approved')
        .order('name')
        .limit(300)
      if (cancelled) return
      const rows = (data ?? []) as PickablePlace[]
      const favIds = new Set(favePlaces.map((f) => f.place_id))
      const driverCity = maybeRider.city
      rows.forEach((r) => { r.isFavourite = favIds.has(r.id) })
      rows.sort((a, b) => {
        if (a.isFavourite && !b.isFavourite) return -1
        if (b.isFavourite && !a.isFavourite) return 1
        const aLocal = a.city === driverCity
        const bLocal = b.city === driverCity
        if (aLocal && !bLocal) return -1
        if (bLocal && !aLocal) return 1
        return a.name.localeCompare(b.name)
      })
      setAllPlaces(rows)
    })()
    return () => { cancelled = true }
  // favePlaces dep matters because favourite tags depend on it
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maybeRider?.city, favePlaces])

  // Filtered list for the search box inside the drawer
  const filteredPlaces = useMemo(() => {
    const q = placeSearch.trim().toLowerCase()
    if (!q) return allPlaces.slice(0, 60)
    return allPlaces
      .filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
      .slice(0, 60)
  }, [allPlaces, placeSearch])

  function selectPlace(p: PickablePlace) {
    setDropoff({ lat: p.lat, lng: p.lng, accuracyM: 0 })
    setDropoffLabel(p.name)
    setPlaceSearch('')
    setPlacesOpen(false)
    haptic.tap()
  }

  // Inline location-allow chip — visible above the booking card when
  // GPS hasn't been granted yet and the customer hasn't explicitly
  // dismissed the prompt. Soft nudge, never blocks browsing.
  const [locChipDismissed, setLocChipDismissed] = useState(false)
  const showLocChip =
    !locChipDismissed && !geo.coords && geo.status !== 'requesting'

  // Auto-fill pickup with customer GPS on grant
  useMemo(() => {
    if (geo.coords && !pickup) setPickup(geo.coords)
  }, [geo.coords, pickup])

  if (!maybeRider) {
    notFound()
  }
  const rider = maybeRider

  function onUseMyLocation() {
    haptic.tap()
    geo.request()
    if (geo.coords) { setPickup(geo.coords); setPickupLabel('My location') }
  }

  // OFFLINE fallback view
  if (!rider.isOnline || rider.subscriptionStatus === 'past_due') {
    const nearby = getOnlineRiders(rider.id)
    return (
      <main className="min-h-screen pb-16">
        <PageBackground />
        <BackNav />
        <div className="max-w-2xl mx-auto px-4 pt-2">
          <RiderHero rider={rider} dimmed />
          <div className="mt-5">
            <OfflineFallback
              offlineRider={rider}
              nearbyRiders={nearby}
              customerLocation={pickup ?? geo.coords}
            />
          </div>
        </div>
      </main>
    )
  }

  // ONLINE view
  return (
    <main className="min-h-screen pb-6">
      <PageBackground />
      <BackNav />
      <div className="max-w-2xl mx-auto px-4 pt-2 space-y-3">
        <RiderHero rider={rider} />

        {/* Service picker — 4 black tile-buttons with brand images.
            No drop-shadows in the unselected state. Selected tile gets
            a soft yellow halo glow BEHIND the button (via an absolute-
            positioned blurred sibling) so the selection reads visually
            without modifying the button itself. */}
        <div className="grid grid-cols-4 gap-1.5">
          {(['person','parcel','food'] as const).map(s => {
            const r = rateFor(rider, s)
            const active = service === s
            const offered = rider.services.includes(s)
            return (
              <div key={s} className="relative">
                {active && (
                  <span
                    aria-hidden
                    className="absolute -inset-1 rounded-2xl pointer-events-none"
                    style={{
                      background: 'rgba(250,204,21,0.45)',
                      filter: 'blur(14px)',
                      zIndex: 0,
                    }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => { setService(s); haptic.tap() }}
                  className="relative w-full rounded-xl text-center py-2 px-1.5 flex flex-col items-center gap-0.5"
                  style={{
                    // Pure black button. The selection signal is the yellow
                    // halo behind (rendered by the sibling above) plus the
                    // label colour change — the button face itself never
                    // gains a tint, border, or shadow that could dirty the
                    // PNG icon's transparent edges.
                    background:   '#0A0A0A',
                    border:       '1px solid rgba(255,255,255,0.08)',
                    boxShadow:    'none',
                    opacity:      offered ? 1 : 0.6,
                    zIndex: 1,
                  }}
                >
                  <img
                    src={SERVICE_TILE_IMAGES[s]}
                    alt=""
                    className="h-9 w-auto object-contain"
                    loading="eager"
                  />
                  <div className="text-[11px] font-extrabold mt-0.5" style={{ color: active ? '#FACC15' : '#fff' }}>
                    {SERVICE_SHORT[s]}
                  </div>
                  <div className="text-[10px] text-muted leading-none">{idr(r.pricePerKm)}/km</div>
                </button>
              </div>
            )
          })}
          {/* Places tile — opens picker drawer */}
          <div className="relative">
            {dropoffLabel && (
              <span
                aria-hidden
                className="absolute -inset-1 rounded-2xl pointer-events-none"
                style={{
                  background: 'rgba(250,204,21,0.45)',
                  filter: 'blur(14px)',
                  zIndex: 0,
                }}
              />
            )}
            <button
              type="button"
              onClick={() => { setPlacesOpen(true); haptic.tap() }}
              className="relative w-full rounded-xl text-center py-2 px-1.5 flex flex-col items-center gap-0.5"
              style={{
                background:   '#0A0A0A',
                border:       '1px solid rgba(255,255,255,0.08)',
                boxShadow:    'none',
                zIndex: 1,
              }}
            >
              <img
                src={PLACES_TILE_IMAGE}
                alt=""
                className="h-9 w-auto object-contain"
                loading="eager"
              />
              <div className="text-[11px] font-extrabold mt-0.5" style={{ color: dropoffLabel ? '#FACC15' : '#fff' }}>
                Places
              </div>
              <div className="text-[10px] text-muted leading-none truncate max-w-full">
                {citySlugLabel(rider.city) || rider.city}
              </div>
            </button>
          </div>
        </div>

        {showLocChip && (
          <div
            className="rounded-xl px-3 py-2.5 flex items-center gap-3"
            style={{
              background: 'rgba(250,204,21,0.10)',
              border: '1px solid rgba(250,204,21,0.40)',
            }}
          >
            <MapPin className="w-4 h-4 shrink-0" style={{ color: '#EF4444' }} />
            <p className="flex-1 min-w-0 text-[12px] text-ink leading-snug">
              Allow location for accurate distance + fair price estimate.
            </p>
            <button
              type="button"
              onClick={() => { haptic.tap(); geo.request() }}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-brand text-bg font-extrabold text-[11px] uppercase tracking-wider"
            >
              Allow
            </button>
            <button
              type="button"
              onClick={() => setLocChipDismissed(true)}
              aria-label="Dismiss"
              className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-muted hover:text-ink"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {cityMismatch ? (
          /* City-mismatch state — driver doesn't service the user's
             city. Replaces the booking flow with a clear redirect to
             the main app's drivers-in-your-city search. */
          <div
            className="rounded-2xl p-5 text-center border"
            style={{
              background: 'rgba(239,68,68,0.10)',
              borderColor: 'rgba(239,68,68,0.40)',
            }}
          >
            <MapPin className="w-6 h-6 mx-auto mb-2" style={{ color: '#EF4444' }} />
            <p className="text-[14px] font-extrabold text-ink leading-snug">
              {rider.name} is not servicing your city
            </p>
            <p className="text-[13px] text-muted leading-snug mt-1">
              You appear to be near <strong className="text-ink">{userCity?.city.label}</strong>.
              Search for drivers within your area on the main app.
            </p>
            <Link
              href={`/cari?city=${encodeURIComponent(userCity?.city.slug ?? '')}`}
              className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-brand to-brand2 text-bg font-extrabold text-[14px] uppercase tracking-wider border border-black/85 active:scale-[0.99]"
            >
              <SearchIcon className="w-4 h-4" />
              Find drivers near me
            </Link>
          </div>
        ) : (
          /* Booking stack — three separate brand-yellow tile cards
             (Pickup, Pit stop, Drop off) mirroring the /cari main-app
             pattern exactly, plus a dark Confirm Driver CTA tile that
             stands out as the action terminus against the three
             yellow controls. */
          <div className="space-y-2">
            {/* PICKUP TILE — yellow gradient, label + autocomplete with
                a dark-red GPS rightSlot button. */}
            <div
              className="rounded-2xl p-2.5 text-bg bg-gradient-to-r from-brand to-brand2 shadow-[0_8px_22px_rgba(250,204,21,0.30)]"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider">Pick up</span>
                <button
                  type="button"
                  onClick={() => { setReviewsOpen(true); haptic.tap() }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-bg/85 text-brand text-[10px] font-extrabold uppercase tracking-wider border border-bg/30 active:scale-95 transition"
                  aria-label="Show recent reviews"
                >
                  <Star className="w-3 h-3 fill-current" strokeWidth={0} />
                  Reviews
                  {reviewStats && (
                    <span className="opacity-80">· {reviewStats.count}</span>
                  )}
                </button>
              </div>
              <PlaceAutocomplete
                value={pickupLabel}
                onChange={setPickupLabel}
                onSelect={(s) => {
                  setPickup({ lat: s.lat, lng: s.lng, accuracyM: 0 })
                  setPickupLabel(s.label)
                  haptic.tap()
                }}
                placeholder={pickup ? 'Pick-up name (optional)' : 'Where do you want to be picked up?'}
                className="flex-1 min-w-0 bg-bg/75 border border-bg/30 text-ink placeholder:text-white/50 rounded-xl px-3 py-2.5 text-[14px] font-bold focus:outline-none focus:bg-bg/90 transition"
                near={geo.coords ?? driverCityCentroid}
                countryCodes={['id']}
                ariaLabel="Pick up location"
                rightSlot={
                  <button
                    onClick={onUseMyLocation}
                    aria-label="Auto-set my GPS location"
                    className="shrink-0 w-12 rounded-xl flex items-center justify-center text-white transition active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #B91C1C, #7F1D1D)',
                      boxShadow:
                        '0 4px 12px rgba(127,29,29,0.55), 0 0 0 2px rgba(0,0,0,0.18) inset',
                    }}
                  >
                    <MapPin className={`w-5 h-5 ${geo.status === 'requesting' ? 'animate-pulse' : ''}`} strokeWidth={2.5} />
                  </button>
                }
              />
            </div>

            {/* PIT STOP TILE — 3-state tile matching /cari exactly:
                  1. collapsed + empty  → "+ Add a pit stop" CTA
                  2. collapsed + text   → "Pit stop set: …" (tap to edit)
                  3. expanded           → textarea + dynamic close/save */}
            {(() => {
              const hasNote = pitstop.trim().length > 0
              if (!pitstopOpen && !hasNote) {
                return (
                  <button
                    onClick={() => { setPitstopOpen(true); haptic.tap() }}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-2xl text-bg bg-gradient-to-r from-brand to-brand2 shadow-[0_8px_22px_rgba(250,204,21,0.30)] hover:from-brand2 hover:to-brand transition"
                  >
                    <span
                      className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                      style={{
                        background: '#0A0A0A',
                        boxShadow: '0 0 0 1px rgba(0,0,0,0.18) inset',
                      }}
                      aria-hidden
                    >
                      <Plus className="w-4 h-4 text-brand" strokeWidth={3.5} />
                    </span>
                    <span className="flex-1 text-left text-[13px] font-extrabold uppercase tracking-wider">Add a pit stop</span>
                  </button>
                )
              }
              if (!pitstopOpen && hasNote) {
                return (
                  <button
                    onClick={() => { setPitstopOpen(true); haptic.tap() }}
                    aria-label="Edit pit stop"
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-2xl text-bg bg-gradient-to-r from-brand to-brand2 shadow-[0_8px_22px_rgba(250,204,21,0.30)] hover:from-brand2 hover:to-brand transition"
                  >
                    <span className="shrink-0 w-7 h-7 rounded-full bg-bg flex items-center justify-center" style={{ boxShadow: '0 0 10px rgba(249,115,22,0.65)' }}>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#F97316' }} />
                    </span>
                    <span className="flex-1 text-left min-w-0">
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider opacity-80">Pit stop set · tap to edit</span>
                      <span className="block text-[13px] font-extrabold truncate">{pitstop.trim()}</span>
                    </span>
                  </button>
                )
              }
              return (
                <div className="rounded-2xl p-2.5 text-bg bg-gradient-to-r from-brand to-brand2 shadow-[0_8px_22px_rgba(250,204,21,0.30)] animate-[fadeUp_0.3s_ease-out_both] space-y-2">
                  <div className="mb-1">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider">Pit stop</span>
                  </div>
                  <textarea
                    rows={2}
                    maxLength={140}
                    className="w-full bg-bg/75 border border-bg/30 text-ink placeholder:text-white/50 rounded-xl px-3 py-2.5 text-[13px] font-bold focus:outline-none focus:bg-bg/90 transition resize-none"
                    placeholder='e.g. "Stop at warung, buy 1 pack Marlboro"'
                    value={pitstop}
                    onChange={(e) => setPitstop(e.target.value)}
                    autoFocus
                  />
                  {hasNote ? (
                    <button
                      onClick={() => { setPitstopOpen(false); haptic.tap() }}
                      aria-label="Save pit stop"
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-bg text-brand font-extrabold text-[12px] uppercase tracking-wider hover:bg-black transition"
                    >
                      <Plus className="w-4 h-4" strokeWidth={2.5} />
                      Add pit stop
                    </button>
                  ) : (
                    <button
                      onClick={() => { setPitstopOpen(false); setPitstop(''); haptic.tap() }}
                      aria-label="Close pit stop"
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-bg text-ink font-extrabold text-[12px] uppercase tracking-wider hover:bg-black transition"
                    >
                      <XIcon className="w-4 h-4" strokeWidth={2.5} />
                      Close pit stop
                    </button>
                  )}
                </div>
              )
            })()}

            {/* DROP OFF TILE — same autocomplete pattern as pickup,
                without a GPS button (drop-off is wherever you're going). */}
            <div
              className="rounded-2xl p-2.5 text-bg bg-gradient-to-r from-brand to-brand2 shadow-[0_8px_22px_rgba(250,204,21,0.30)]"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider">Drop off</span>
                <button
                  type="button"
                  onClick={() => { setPlacesOpen(true); haptic.tap() }}
                  className="text-[11px] font-extrabold uppercase tracking-wider opacity-90 hover:opacity-100"
                >
                  Pick from Places
                </button>
              </div>
              <PlaceAutocomplete
                value={dropoffLabel}
                onChange={setDropoffLabel}
                onSelect={(s) => {
                  setDropoff({ lat: s.lat, lng: s.lng, accuracyM: 0 })
                  setDropoffLabel(s.label)
                  haptic.tap()
                }}
                placeholder="Where do you want to go?"
                className="w-full bg-bg/75 border border-bg/30 text-ink placeholder:text-white/50 rounded-xl px-3 py-2.5 text-[14px] font-bold focus:outline-none focus:bg-bg/90 transition"
                near={pickup ?? geo.coords ?? driverCityCentroid}
                countryCodes={['id']}
                ariaLabel="Drop off location"
              />
            </div>

            {/* CONFIRM DRIVER CTA TILE — dark with brand-yellow edge,
                matching /cari's "View drivers" terminus exactly. Shows
                live fare on the right when both pickup + drop-off set. */}
            <button
              onClick={() => {
                // Build the WhatsApp message with tappable Google Maps
                // pins for each endpoint + a directions link the driver
                // can open straight into navigation. WhatsApp auto-
                // linkifies these so the driver just taps to launch the
                // Maps app.
                const mapPin = (lat: number, lng: number) =>
                  `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`
                const lines = [`Hi ${rider.name}, saya mau booking via City Rider.`]
                if (pickupLabel || pickup || dropoffLabel || dropoff || pitstop) {
                  lines.push('')
                  if (pickupLabel || pickup) {
                    lines.push(`📍 Pickup: ${pickupLabel || 'My location'}`)
                    if (pickup) lines.push(mapPin(pickup.lat, pickup.lng))
                  }
                  if (pitstop) {
                    if (pickup) lines.push('')
                    lines.push(`🛑 Pit stop: ${pitstop}`)
                  }
                  if (dropoffLabel || dropoff) {
                    if (pickup || pitstop) lines.push('')
                    lines.push(`🏁 Drop off: ${dropoffLabel || '—'}`)
                    if (dropoff) lines.push(mapPin(dropoff.lat, dropoff.lng))
                  }
                  // Single tap-to-navigate link when both endpoints are set
                  if (pickup && dropoff) {
                    lines.push(
                      '',
                      'Directions:',
                      `https://www.google.com/maps/dir/?api=1&origin=${pickup.lat.toFixed(6)},${pickup.lng.toFixed(6)}&destination=${dropoff.lat.toFixed(6)},${dropoff.lng.toFixed(6)}&travelmode=driving`,
                    )
                  }
                }
                if (service) lines.push('', `Service: ${SERVICE_SHORT[service]}`)
                if (quote) {
                  lines.push(
                    '',
                    `Distance: ${quote.distanceKm.toFixed(1)} km`,
                    `Fare est: ${idr(quote.fare)}${quote.minApplied ? ' (min fare)' : ''}`,
                  )
                }
                // Safety reminder embedded in the booking message — adds
                // a paper trail of warning given (helmet, SIM C, vehicle
                // check, ride-at-own-risk). Doesn't make the platform
                // liable but strengthens the directory defence.
                lines.push(
                  '',
                  '⚠️ Sebelum berangkat: pastikan SIM C, helm, dan kondisi motor OK.',
                  'Perjalanan langsung antara saya & driver — di luar tanggung jawab City Rider.',
                  '',
                  'Apakah tersedia?',
                )
                const url = `https://wa.me/${rider.whatsappE164.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(lines.join('\n'))}`
                haptic.buzz()
                window.open(url, '_blank', 'noopener,noreferrer')
              }}
              disabled={!pickup || !dropoff}
              className="w-full flex items-center justify-center gap-2 p-3.5 !mt-6 rounded-2xl text-brand font-extrabold text-[15px] bg-gradient-to-r from-bg to-[#1a1a1a] border-2 border-brand hover:border-brand2 active:scale-[0.99] transition-all shadow-[0_10px_28px_rgba(0,0,0,0.55),0_0_0_1px_rgba(250,204,21,0.18)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              <span>Confirm Driver</span>
              {quote ? (
                <span className="text-[13px] font-bold text-brand/85 ml-1">· {idr(quote.fare)}</span>
              ) : (
                <span className="text-[12px] font-bold text-dim ml-1">· set pickup + drop off</span>
              )}
            </button>
          </div>
        )}

        {/* What riders say — public anonymous reviews. Same legal model
            as Yelp / Google Reviews. */}
        {reviews.length > 0 && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-brand fill-brand" strokeWidth={0} />
                <h2 className="text-[12px] text-dim uppercase tracking-wider font-bold">
                  What riders say
                </h2>
              </div>
              {reviewStats && (
                <span className="text-[12px] font-extrabold text-brand">
                  ★ {reviewStats.avg.toFixed(1)} ({reviewStats.count})
                </span>
              )}
            </div>
            <ul className="space-y-3">
              {reviews.map((r) => (
                <li key={r.id} className="border-l-2 border-brand/40 pl-3">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[11px] text-brand">
                      {'★'.repeat(r.rating)}<span className="text-dim">{'★'.repeat(5 - r.rating)}</span>
                    </span>
                    <span className="text-[13px] font-extrabold text-ink">{r.reviewer_name}</span>
                    {r.reviewer_country && (
                      <span className="text-[11px] text-muted">· {r.reviewer_country}</span>
                    )}
                  </div>
                  {r.comment && (
                    <p className="text-[13px] text-ink/85 mt-1 leading-snug">{r.comment}</p>
                  )}
                </li>
              ))}
            </ul>
            <Link
              href={`/r/${rider.slug}/review`}
              className="mt-4 inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-xl border border-brand/40 text-[12px] font-extrabold uppercase tracking-wider text-brand hover:bg-brand/10 transition"
            >
              <Star className="w-3.5 h-3.5" />
              Leave a review
            </Link>
          </div>
        )}

        {/* Empty-state CTA so even drivers with zero reviews give
            customers a path to leave the first one. */}
        {reviews.length === 0 && (
          <Link
            href={`/r/${rider.slug}/review`}
            className="card card-interactive p-3 flex items-center justify-between text-[13px] font-bold"
          >
            <span className="flex items-center gap-2">
              <Star className="w-4 h-4 text-brand" />
              Be the first to review {rider.name.split(' ')[0]}
            </span>
            <span className="text-brand">→</span>
          </Link>
        )}

        {/* My favourite places — Layer 1 ↔ Layer 2 bridge. Each tile links
            to the public place page, which in turn lists drivers who tour
            that place (network compounding loop). */}
        {favePlaces.length > 0 && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-brand" />
              <h2 className="text-[12px] text-dim uppercase tracking-wider font-bold">
                {rider.name.split(' ')[0]}&apos;s favourite places
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {favePlaces.slice(0, 6).map((fp) => {
                const photo = fp.place.image_urls?.[0] ?? null
                return (
                  <Link
                    key={fp.place_id}
                    href={`/places/${fp.place.slug}?utm_source=driver-page&utm_campaign=${rider.slug}`}
                    className="block rounded-xl overflow-hidden bg-black/60 border border-white/10 hover:border-brand/40 transition group"
                  >
                    <div className="aspect-[4/3] bg-black/40">
                      {photo ? (
                        <img
                          src={photo}
                          alt={fp.place.name}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-dim" />
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <div className="text-[12px] font-extrabold text-ink leading-tight line-clamp-2">
                        {fp.place.name}
                      </div>
                      {fp.note && (
                        <p className="text-[11px] text-muted mt-1 leading-snug line-clamp-2 italic">
                          &ldquo;{fp.note}&rdquo;
                        </p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Cross-sell strip — Layer 2 retention. Customer who arrived via
            a driver share now sees the network. Same city, sorted by rating.
            Each card link carries utm_source=cross-sell + utm_from=<slug>
            so attribution lands on the right driver's dashboard. */}
        {crossSell.length > 0 && (
          <div className="card p-5">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-[12px] text-dim uppercase tracking-wider font-bold">
                Other drivers in {rider.city}
              </h2>
              <Link
                href={`/cari?city=${encodeURIComponent(rider.city)}`}
                className="text-[12px] font-bold text-brand"
              >
                Browse all →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {crossSell.map((d) => (
                <Link
                  key={d.user_id}
                  href={`/r/${d.slug}?utm_source=cross-sell&utm_from=${rider.slug}`}
                  className="block rounded-xl overflow-hidden bg-black/50 border border-white/10 hover:border-brand/40 transition group"
                >
                  <div className="aspect-square bg-black/40">
                    {d.photo_url ? (
                      <img src={d.photo_url} alt={d.business_name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-dim">—</div>
                    )}
                  </div>
                  <div className="p-2">
                    <div className="text-[12px] font-extrabold text-ink leading-tight truncate">
                      {d.business_name}
                    </div>
                    <div className="text-[11px] text-muted mt-0.5">
                      {d.rating != null && <>★ {d.rating.toFixed(1)} · </>}
                      {d.price_per_km != null ? `Rp ${d.price_per_km.toLocaleString('id-ID')}/km` : ''}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reviews popup — fires from the small 'Reviews' button on the
          Pick up tile. Renders last 4 visible reviews from `reviews`
          (the same array fed into the on-page reviews section, sorted
          newest-first by the load effect). Auto-refreshes whenever
          the parent reload runs. */}
      {reviewsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
          onClick={() => setReviewsOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Recent reviews"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl p-4 space-y-3 max-h-[88vh] overflow-y-auto"
            style={{
              background: '#0E0E0E',
              border: '1px solid rgba(250,204,21,0.40)',
              boxShadow: '0 16px 38px rgba(0,0,0,0.55)',
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-brand fill-brand" strokeWidth={0} />
                <h3 className="text-[15px] font-extrabold">
                  Reviews for {rider.name.split(' ')[0]}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReviewsOpen(false)}
                aria-label="Close reviews"
                className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-muted hover:bg-white/5 transition"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            {reviewStats && (
              <div className="text-[12px] text-muted">
                ★ <span className="text-brand font-extrabold">{reviewStats.avg?.toFixed(1) ?? '—'}</span>
                {' '}from {reviewStats.count} review{reviewStats.count === 1 ? '' : 's'}
              </div>
            )}

            {reviews.length === 0 ? (
              <div className="card p-5 text-center">
                <p className="text-[13px] text-muted">
                  No reviews yet. Be the first.
                </p>
                <Link
                  href={`/r/${rider.slug}/review`}
                  className="mt-3 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-brand to-brand2 text-bg font-extrabold text-[12px] uppercase tracking-wider"
                >
                  <Star className="w-3.5 h-3.5" />
                  Leave a review
                </Link>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {reviews.slice(0, 4).map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl p-3"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(250,204,21,0.18)' }}
                  >
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[12px] text-brand">
                        {'★'.repeat(r.rating)}<span className="text-dim">{'★'.repeat(5 - r.rating)}</span>
                      </span>
                      <span className="text-[13px] font-extrabold text-ink">{r.reviewer_name}</span>
                      {r.reviewer_country && (
                        <span className="text-[11px] text-muted">· {r.reviewer_country}</span>
                      )}
                    </div>
                    {r.comment && (
                      <p className="text-[13px] text-ink/85 mt-1 leading-snug">{r.comment}</p>
                    )}
                    <div className="text-[10px] text-dim mt-1.5 font-mono">
                      {new Date(r.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {reviews.length > 0 && (
              <Link
                href={`/r/${rider.slug}/review`}
                className="mt-1 inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-xl border border-brand/40 text-[12px] font-extrabold uppercase tracking-wider text-brand hover:bg-brand/10 transition"
              >
                <Star className="w-3.5 h-3.5" />
                Leave a review
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Places picker — opens when the "Places" service tile is tapped.
          Bottom-sheet drawer with search + scrollable list. Favourites
          (curated by this driver) are tagged with a star and float to
          the top. Selecting a place autofills the booking drop-off. */}
      <Drawer.Root open={placesOpen} onOpenChange={setPlacesOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60" />
          <Drawer.Content
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl flex flex-col overflow-hidden"
            style={{
              // 90px taller than the previous 85vh cap — gives more room
              // for browsing the full main-app place directory.
              maxHeight: 'calc(85vh + 90px)',
              // Brand background image + dark gradient overlay so each
              // place row stays legible while the drawer carries the
              // brand mood. Two backgrounds in one shorthand: top layer
              // is the linear-gradient scrim, bottom layer is the image.
              backgroundImage:
                'linear-gradient(rgba(10,10,10,0.78), rgba(10,10,10,0.88)),' +
                " url('https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2008_23_29%20PM.png')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              // Yellow top edge per design: a thick brand-yellow strip
              // along the very top of the drawer.
              borderTop: '4px solid #FACC15',
              boxShadow: '0 -8px 24px rgba(0,0,0,0.45), 0 -1px 0 rgba(250,204,21,0.40) inset',
            }}
          >
            <Drawer.Title className="sr-only">Pick a place for drop off</Drawer.Title>
            <Drawer.Description className="sr-only">
              Search or browse places — selecting one will autofill the booking drop off.
            </Drawer.Description>
            <div
              className="mx-auto mt-2 h-1.5 w-12 rounded-full"
              style={{ background: 'rgba(250,204,21,0.55)' }}
            />
            <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-[16px] font-extrabold leading-tight">Pick a place</h3>
                <p className="text-[11px] text-muted leading-snug mt-0.5">
                  {citySlugLabel(rider.city) || rider.city} directory Places
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPlacesOpen(false)}
                aria-label="Close"
                className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-muted hover:bg-white/5"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 pb-2">
              <div className="relative">
                <SearchIcon className="w-4 h-4 text-dim absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search places by name or category"
                  value={placeSearch}
                  onChange={(e) => setPlaceSearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-[14px] text-ink placeholder:text-dim focus:outline-none focus:border-brand/40"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-6">
              {filteredPlaces.length === 0 ? (
                <p className="text-[13px] text-muted text-center py-12">
                  {allPlaces.length === 0 ? 'Loading places…' : 'No matches.'}
                </p>
              ) : (
                <ul className="space-y-2">
                  {filteredPlaces.map((p) => {
                    const photo = p.image_urls?.[0] ?? null
                    // Per-place price preview using THIS driver's rate
                    let perPlaceFare: number | null = null
                    if (pickup) {
                      const km = haversineKm(pickup, { lat: p.lat, lng: p.lng })
                      const pricing = service ? rateFor(rider, service) : { pricePerKm: rider.pricePerKm, minFee: rider.minFee }
                      perPlaceFare = quoteBreakdown(km, pricing).final
                    }
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => selectPlace(p)}
                          className="w-full p-2 flex items-stretch gap-3 text-left rounded-2xl bg-black/55 transition hover:bg-black/70"
                          style={{
                            border: '1px solid rgba(250,204,21,0.55)',
                            boxShadow: '0 1px 0 rgba(250,204,21,0.10) inset',
                          }}
                        >
                          <div className="w-14 h-14 shrink-0 relative rounded-lg overflow-hidden bg-black/60 border border-white/10">
                            {photo ? (
                              <img src={photo} alt="" className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <MapPin className="w-4 h-4 text-dim" />
                              </div>
                            )}
                            {p.rating != null && (
                              <span
                                className="absolute bottom-0.5 left-0.5 inline-flex items-center gap-0.5 px-1 py-[1px] rounded-md text-[9px] font-extrabold leading-none"
                                style={{
                                  background: 'rgba(0,0,0,0.78)',
                                  color: '#FACC15',
                                  border: '1px solid rgba(250,204,21,0.50)',
                                }}
                              >
                                <Star className="w-2 h-2 fill-current" strokeWidth={0} />
                                {p.rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 self-center">
                            <div className="flex items-center gap-1.5">
                              {p.isFavourite && <Star className="w-3 h-3 text-brand fill-brand shrink-0" />}
                              <span className="text-[13px] font-extrabold text-ink truncate">{p.name}</span>
                            </div>
                            <div className="text-[11px] text-muted truncate flex items-center gap-1">
                              <MapPin className="w-3 h-3 shrink-0" style={{ color: '#EF4444' }} />
                              {citySlugLabel(p.city) || p.city}
                              <span className="opacity-60">·</span>
                              {p.category.replace(/_/g, ' ')}
                            </div>
                          </div>
                          {perPlaceFare != null && (
                            <div className="self-center text-right shrink-0">
                              <div className="text-[12px] font-extrabold text-brand">
                                {idr(perPlaceFare)}
                              </div>
                              <div className="text-[10px] text-dim">fare est.</div>
                            </div>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </main>
  )
}

// PageBackground — fixed-viewport background image for the driver
// shareable page. The dark gradient overlay keeps every card readable
// over the image without disabling its mood. background-attachment:fixed
// is avoided because iOS Safari renders it incorrectly; instead we use
// position: fixed on the bg div so it sits in the viewport while content
// scrolls over it.
function PageBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        backgroundImage:
          'linear-gradient(rgba(10,10,10,0.62), rgba(10,10,10,0.78)),' +
          " url('https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2004_57_59%20AM.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    />
  )
}

// Minimal header — just the City Rider logo + name on the left and a
// close-X on the right. No back arrow, no glass blur, no dark band.
// Close routes to "/" (marketplace home) since "close" implies leaving
// the driver page entirely.
function BackNav() {
  return (
    <header className="pt-safe">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 min-w-0">
          <img
            src="https://ik.imagekit.io/nepgaxllc/Untitleddasdasdasasd-removebg-preview.png?updatedAt=1779015947714"
            alt=""
            className="h-7 w-auto shrink-0"
            loading="eager"
          />
          <span className="text-[15px] font-extrabold tracking-tight">
            City <span className="gradient-text">Rider</span>
          </span>
        </Link>
        <Link
          href="/"
          aria-label="Close"
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-bg active:scale-95 transition"
          style={{
            background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)',
            boxShadow: '0 4px 12px rgba(250,204,21,0.35), 0 0 0 1px rgba(0,0,0,0.18) inset',
          }}
        >
          <XIcon className="w-4 h-4" strokeWidth={3} />
        </Link>
      </div>
    </header>
  )
}

// RiderHero — no card container. Just photo + name + bike + a red
// map-pin row showing the city this driver services. Sits flush
// against the page background.
function RiderHero({ rider, dimmed }: { rider: ReturnType<typeof findRiderBySlug>; dimmed?: boolean }) {
  if (!rider) return null
  return (
    <div className="flex items-start gap-4 px-1">
      <div className="relative shrink-0">
        <img
          src={rider.photoUrl}
          alt={rider.name}
          className="w-20 h-20 rounded-2xl object-cover ring-2 ring-white/15"
          style={{ filter: dimmed ? 'grayscale(1) brightness(0.6)' : undefined }}
        />
        {!dimmed && rider.isOnline && (
          <span className="dot-online absolute -bottom-1 -right-1 ring-2 ring-bg2 !w-3.5 !h-3.5" />
        )}
        {!dimmed && rider.rating != null && (
          <span
            className="absolute -top-1.5 -left-1.5 inline-flex items-center gap-0.5 px-1.5 py-[2px] rounded-full text-[11px] font-extrabold leading-none"
            style={{
              background: '#0A0A0A',
              color: '#FACC15',
              border: '1.5px solid #FACC15',
              boxShadow: '0 2px 6px rgba(0,0,0,0.55)',
            }}
          >
            <Star className="w-2.5 h-2.5 fill-current" strokeWidth={0} />
            {rider.rating.toFixed(1)}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h1 className="text-2xl font-extrabold leading-tight">{rider.name}</h1>
          {rider.trips != null && rider.rating != null && (
            <span className="text-[11px] text-muted font-bold">
              {rider.trips.toLocaleString('en-US')} trips
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[13px] mt-1.5">
          <MapPin className="w-4 h-4 shrink-0" style={{ color: '#EF4444' }} />
          <span className="text-ink/90 font-extrabold">
            {citySlugLabel(rider.city) || rider.city}
          </span>
          <span className="text-[11px] text-muted">· service area</span>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-muted mt-1">
          <BikeIcon className="w-3.5 h-3.5 text-brand" />
          <span className="font-bold">
            {rider.bike.make} {rider.bike.model} · {rider.bike.year}
          </span>
        </div>
      </div>
    </div>
  )
}
