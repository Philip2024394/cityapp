'use client'
import { use, useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, MapPin, Bike as BikeIcon, Star } from 'lucide-react'
import PickupDropoffPicker from '@/components/rider/PickupDropoffPicker'
import OfflineFallback from '@/components/rider/OfflineFallback'
import { findRiderBySlug, getOnlineRiders } from '@/data/mockRiders'
import { fetchDriverBySlugBrowser } from '@/lib/drivers/queries'
import { useGeolocation, type GeoPoint } from '@/hooks/useGeolocation'
import { useHaptic } from '@/hooks/useHaptic'
import { haversineKm } from '@/lib/geo/haversine'
import { rateFor } from '@/lib/pricing/quote'
import { idr } from '@/lib/format/idr'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { SERVICE_ICONS, SERVICE_SHORT, type ServiceType, type Rider } from '@/types/rider'

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

  // Selected service — defaults to the first one the rider offers.
  const [service, setService] = useState<ServiceType | null>(
    maybeRider?.services[0] ?? null,
  )

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

        {/* Service picker — 3 big tile-buttons (Bike / Parcel / Food).
            Always renders all 3 even if the rider only offers some,
            so the booking UX is consistent across every driver page.
            Services the rider doesn't actually offer fall back to the
            default per-km rate from rateFor(). */}
        <div className="card p-4">
          <div className="text-[12px] text-dim uppercase tracking-wider font-extrabold mb-2.5">
            Service
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['person','parcel','food'] as const).map(s => {
              const r = rateFor(rider, s)
              const active = service === s
              const offered = rider.services.includes(s)
              return (
                <button
                  key={s}
                  onClick={() => { setService(s); haptic.tap() }}
                  className="rounded-2xl border text-center py-3 px-2 transition flex flex-col items-center gap-1.5"
                  style={{
                    background:   active ? 'rgba(250,204,21,0.10)' : 'rgba(255,255,255,0.04)',
                    borderColor:  active ? 'rgba(250,204,21,0.45)' : 'rgba(255,255,255,0.08)',
                    opacity:      offered ? 1 : 0.55,
                  }}
                >
                  <div className="text-[34px] leading-none">{SERVICE_ICONS[s]}</div>
                  <div className="text-[14px] font-extrabold mt-1" style={{ color: active ? '#FACC15' : '#fff' }}>
                    {SERVICE_SHORT[s]}
                  </div>
                  <div className="text-[12px] text-muted">{idr(r.pricePerKm)}/km</div>
                </button>
              )
            })}
          </div>
        </div>

        <PickupDropoffPicker
          pickup={pickup}
          dropoff={dropoff}
          pickupLabel={pickupLabel}
          dropoffLabel={dropoffLabel}
          onUseMyLocation={onUseMyLocation}
          onPickupLabelChange={setPickupLabel}
          onDropoffLabelChange={setDropoffLabel}
          status={geo.status}
        />

        {/* Contact Driver — primary CTA. Opens WhatsApp with a prefilled
            message that carries the customer's pickup + dropoff if they
            entered them above; otherwise a generic intro. Keeps the page
            single-screen and replaces the old fare-estimate + sticky bar. */}
        <button
          type="button"
          onClick={() => {
            const lines = [`Hi ${rider.name}, saya lihat profilmu di City Rider.`]
            if (pickupLabel || dropoffLabel) {
              lines.push('')
              if (pickupLabel)  lines.push(`Pickup:  ${pickupLabel}`)
              if (dropoffLabel) lines.push(`Drop off: ${dropoffLabel}`)
            }
            if (service) lines.push('', `Service: ${SERVICE_SHORT[service]}`)
            lines.push('', 'Apakah tersedia?')
            const url = `https://wa.me/${rider.whatsappE164.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(lines.join('\n'))}`
            haptic.buzz()
            window.open(url, '_blank', 'noopener,noreferrer')
          }}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-brand to-brand2 text-bg font-extrabold text-[15px] uppercase tracking-wider border border-black/85 shadow-[0_8px_22px_rgba(250,204,21,0.30)] active:scale-[0.99]"
        >
          Contact Driver
        </button>

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

function BackNav() {
  return (
    <header className="sticky top-0 z-40 glass-strong pt-safe">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 text-[14px] font-bold text-muted hover:text-ink">
          <ChevronLeft className="w-4 h-4" />
          Marketplace
        </Link>
        <div className="text-[15px] font-extrabold gradient-text">City Rider</div>
      </div>
    </header>
  )
}

function RiderHero({ rider, dimmed }: { rider: ReturnType<typeof findRiderBySlug>; dimmed?: boolean }) {
  if (!rider) return null
  return (
    <div className="card p-5 grid-bg relative overflow-hidden">
      <div className="flex items-start gap-4">
        <div className="relative">
          <img
            src={rider.photoUrl}
            alt={rider.name}
            className="w-20 h-20 rounded-2xl object-cover ring-2 ring-line"
            style={{ filter: dimmed ? 'grayscale(1) brightness(0.6)' : undefined }}
          />
          {!dimmed && rider.isOnline && (
            <span className="dot-online absolute -bottom-1 -right-1 ring-2 ring-bg2 !w-3.5 !h-3.5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-extrabold leading-tight">{rider.name}</h1>
          <div className="flex items-center gap-1.5 text-[13px] text-muted mt-1">
            <MapPin className="w-3.5 h-3.5" />
            {rider.area} · {rider.city}
          </div>
          <div className="flex items-center gap-1.5 text-[13px] mt-1">
            <BikeIcon className="w-3.5 h-3.5 text-brand" />
            <span className="text-ink/90 font-bold">{rider.bike.make} {rider.bike.model} {rider.bike.year}</span>
          </div>
          <div className="text-[12px] text-dim mt-0.5">
            {rider.bike.color} · {rider.bike.type[0]!.toUpperCase() + rider.bike.type.slice(1)}
          </div>
        </div>
      </div>
    </div>
  )
}
