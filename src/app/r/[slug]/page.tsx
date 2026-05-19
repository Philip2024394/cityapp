'use client'
import { use, useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Drawer } from 'vaul'
import {
  MapPin, Bike as BikeIcon, Star, X as XIcon, Crosshair,
  Search as SearchIcon, Compass, Check,
} from 'lucide-react'
import OfflineFallback from '@/components/rider/OfflineFallback'
import { findRiderBySlug, getOnlineRiders } from '@/data/mockRiders'
import { fetchDriverBySlugBrowser } from '@/lib/drivers/queries'
import { useGeolocation, type GeoPoint } from '@/hooks/useGeolocation'
import { useHaptic } from '@/hooks/useHaptic'
import { rateFor, quoteBreakdown } from '@/lib/pricing/quote'
import { haversineKm } from '@/lib/geo/haversine'
import { idr } from '@/lib/format/idr'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { nearestCity, citySlugLabel } from '@/lib/cities'
import { SERVICE_SHORT, type ServiceType, type Rider } from '@/types/rider'

// Landing-page brand images — reused on the driver-page service tiles
// so the visual language stays consistent between marketplace and
// driver storefront.
const SERVICE_TILE_IMAGES: Record<ServiceType, string> = {
  person: 'https://ik.imagekit.io/nepgaxllc/Untitleddasdas-removebg-preview.png',
  parcel: 'https://ik.imagekit.io/nepgaxllc/Untitledsddasd-removebg-preview.png?updatedAt=1779013880961',
  food:   'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2017,%202026,%2005_29_25%20PM.png?updatedAt=1779013783890',
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
  useEffect(() => {
    if (!maybeRider) return
    const supabase = getBrowserSupabase()
    if (!supabase) return
    let cancelled = false
    ;(async () => {
      const [favRes, csRes] = await Promise.all([
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
      ])
      if (cancelled) return
      const fav = ((favRes.data ?? []) as unknown as FavePlace[]).filter((x) => x.place)
      setFavePlaces(fav)
      setCrossSell((csRes.data ?? []) as CrossSellDriver[])
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
  const [pitstop, setPitstop] = useState('')

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

        {/* Service picker — 4 black tile-buttons (20% smaller than before)
            with brand images from the landing page. Fourth tile opens the
            Places drawer so customers can pick a destination from the
            directory; selecting a place autofills the booking drop-off. */}
        <div className="grid grid-cols-4 gap-1.5">
          {(['person','parcel','food'] as const).map(s => {
            const r = rateFor(rider, s)
            const active = service === s
            const offered = rider.services.includes(s)
            return (
              <button
                key={s}
                onClick={() => { setService(s); haptic.tap() }}
                className="rounded-xl border text-center py-2 px-1.5 transition flex flex-col items-center gap-0.5"
                style={{
                  background:   '#0A0A0A',
                  borderColor:  active ? 'rgba(250,204,21,0.65)' : 'rgba(255,255,255,0.10)',
                  boxShadow:    active ? '0 3px 10px rgba(250,204,21,0.20)' : 'none',
                  opacity:      offered ? 1 : 0.6,
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
            )
          })}
          {/* Places tile — opens picker drawer */}
          <button
            type="button"
            onClick={() => { setPlacesOpen(true); haptic.tap() }}
            className="rounded-xl border text-center py-2 px-1.5 transition flex flex-col items-center gap-0.5"
            style={{
              background:   '#0A0A0A',
              borderColor:  dropoffLabel ? 'rgba(250,204,21,0.65)' : 'rgba(255,255,255,0.10)',
            }}
          >
            <div className="h-9 flex items-center justify-center">
              <Compass className="w-7 h-7 text-brand" strokeWidth={2.2} />
            </div>
            <div className="text-[11px] font-extrabold mt-0.5" style={{ color: dropoffLabel ? '#FACC15' : '#fff' }}>
              Places
            </div>
            <div className="text-[10px] text-muted leading-none">
              {dropoffLabel ? 'picked ✓' : 'pick dropoff'}
            </div>
          </button>
        </div>

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
          /* Yellow booking card — pickup → pit-stop → drop off, all in
             one stacked container. Pickup and drop-off are the trip
             endpoints; the pit-stop is a free-text request along the
             way (e.g. "pick me up a Coca-Cola"). */
          <div
            className="rounded-2xl p-4 space-y-3 border"
            style={{
              background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)',
              borderColor: '#000',
            }}
          >
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center pt-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-black/85" />
                <div className="w-px h-7 bg-black/30 my-1" />
                <div className="w-2.5 h-2.5 rounded-sm bg-black/55" />
                <div className="w-px h-7 bg-black/30 my-1" />
                <div className="w-2.5 h-2.5 rounded-sm bg-black/85" />
              </div>
              <div className="flex-1 min-w-0 space-y-3">
                {/* Pick up */}
                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-black/70 mb-1 flex items-center justify-between">
                    <span>Pick up</span>
                    <button
                      onClick={onUseMyLocation}
                      className="text-black text-[11px] font-extrabold flex items-center gap-1 normal-case"
                    >
                      <Crosshair className="w-3 h-3" />
                      {geo.status === 'requesting' ? 'Searching…' : 'My location'}
                    </button>
                  </div>
                  <input
                    className="w-full px-3 py-2.5 rounded-xl bg-white/90 border border-black/15 text-[14px] text-black font-bold placeholder:text-black/40 focus:outline-none focus:border-black/40"
                    placeholder={pickup ? 'Set — name the place (optional)' : 'Type pickup address or tap My location'}
                    value={pickupLabel ?? ''}
                    onChange={(e) => setPickupLabel(e.target.value)}
                  />
                </div>
                {/* Pit stop */}
                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-black/70 mb-1">
                    Pit stop <span className="font-normal opacity-70">(optional)</span>
                  </div>
                  <input
                    className="w-full px-3 py-2.5 rounded-xl bg-white/90 border border-black/15 text-[14px] text-black font-bold placeholder:text-black/40 focus:outline-none focus:border-black/40"
                    placeholder="e.g. pick me up a Coca-Cola on the way"
                    value={pitstop}
                    onChange={(e) => setPitstop(e.target.value)}
                  />
                </div>
                {/* Drop off */}
                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-black/70 mb-1">
                    Drop off
                  </div>
                  <input
                    className="w-full px-3 py-2.5 rounded-xl bg-white/90 border border-black/15 text-[14px] text-black font-bold placeholder:text-black/40 focus:outline-none focus:border-black/40"
                    placeholder="Destination address"
                    value={dropoffLabel ?? ''}
                    onChange={(e) => setDropoffLabel(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Confirm Driver — primary CTA. Carries pickup + pit-stop +
                drop-off + service + the live fare estimate. When quote is
                set, the price renders ON the button so the customer
                commits with a known price. */}
            <button
              type="button"
              onClick={() => {
                const lines = [`Hi ${rider.name}, saya mau booking via City Rider.`]
                if (pickupLabel || dropoffLabel || pitstop) {
                  lines.push('')
                  if (pickupLabel)  lines.push(`Pickup:    ${pickupLabel}`)
                  if (pitstop)      lines.push(`Pit stop:  ${pitstop}`)
                  if (dropoffLabel) lines.push(`Drop off:  ${dropoffLabel}`)
                }
                if (service) lines.push('', `Service:   ${SERVICE_SHORT[service]}`)
                if (quote) {
                  lines.push(
                    '',
                    `Distance:  ${quote.distanceKm.toFixed(1)} km`,
                    `Fare est:  ${idr(quote.fare)}${quote.minApplied ? ' (min fare)' : ''}`,
                  )
                }
                lines.push('', 'Apakah tersedia?')
                const url = `https://wa.me/${rider.whatsappE164.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(lines.join('\n'))}`
                haptic.buzz()
                window.open(url, '_blank', 'noopener,noreferrer')
              }}
              className="w-full inline-flex items-center justify-between gap-2 px-4 py-3 rounded-2xl bg-black text-brand font-extrabold text-[14px] uppercase tracking-wider border border-black active:scale-[0.99]"
            >
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                Confirm Driver
              </span>
              {quote ? (
                <span className="text-[15px]">{idr(quote.fare)}</span>
              ) : (
                <span className="text-[11px] opacity-70 normal-case tracking-normal">
                  set pickup + drop off
                </span>
              )}
            </button>
          </div>
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

      {/* Places picker — opens when the "Places" service tile is tapped.
          Bottom-sheet drawer with search + scrollable list. Favourites
          (curated by this driver) are tagged with a star and float to
          the top. Selecting a place autofills the booking drop-off. */}
      <Drawer.Root open={placesOpen} onOpenChange={setPlacesOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60" />
          <Drawer.Content
            className="fixed bottom-0 left-0 right-0 z-50 bg-bg2 rounded-t-3xl flex flex-col"
            style={{
              // 90px taller than the previous 85vh cap — gives more room
              // for browsing the full main-app place directory.
              maxHeight: 'calc(85vh + 90px)',
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
                <p className="text-[12px] text-muted leading-snug mt-0.5">
                  Fare uses {rider.name.split(' ')[0]}&apos;s rate ({idr(rider.pricePerKm)}/km) ·
                  showing all City Riders places
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
                          className="w-full card p-2 flex items-stretch gap-3 text-left hover:border-brand/40 transition"
                        >
                          <div className="w-14 shrink-0 rounded-lg overflow-hidden bg-black/60 border border-white/10">
                            {photo ? (
                              <img src={photo} alt="" className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <MapPin className="w-4 h-4 text-dim" />
                              </div>
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
                              {p.rating != null ? ` · ★ ${p.rating.toFixed(1)}` : ''}
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
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-ink hover:bg-white/5 active:scale-95 transition"
        >
          <XIcon className="w-5 h-5" strokeWidth={2.5} />
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
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h1 className="text-2xl font-extrabold leading-tight">{rider.name}</h1>
          {rider.rating != null && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-extrabold"
              style={{ background: 'rgba(250,204,21,0.18)', color: '#FACC15', border: '1px solid rgba(250,204,21,0.40)' }}
            >
              <Star className="w-3 h-3 fill-current" strokeWidth={0} />
              {rider.rating.toFixed(1)}
              {rider.trips != null && (
                <span className="text-[10px] font-bold text-brand/70 ml-0.5">
                  ({rider.trips.toLocaleString('en-US')})
                </span>
              )}
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
