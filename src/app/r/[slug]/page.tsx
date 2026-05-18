'use client'
import { use, useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, MapPin, Bike as BikeIcon, MessageCircle } from 'lucide-react'
import RiderRadar from '@/components/rider/RiderRadar'
import PickupDropoffPicker from '@/components/rider/PickupDropoffPicker'
import OfflineFallback from '@/components/rider/OfflineFallback'
import PlatformDisclaimer from '@/components/layout/PlatformDisclaimer'
import { findRiderBySlug, getOnlineRiders } from '@/data/mockRiders'
import { fetchDriverBySlugBrowser } from '@/lib/drivers/queries'
import { useGeolocation, type GeoPoint } from '@/hooks/useGeolocation'
import { useHaptic } from '@/hooks/useHaptic'
import { useBeep } from '@/hooks/useBeep'
import { haversineKm } from '@/lib/geo/haversine'
import { quoteBreakdown, rateFor } from '@/lib/pricing/quote'
import { buildWhatsAppLink } from '@/lib/whatsapp/buildLink'
import { idr } from '@/lib/format/idr'
import { SERVICE_ICONS, SERVICE_LABELS, SERVICE_SHORT, type ServiceType, type Rider } from '@/types/rider'

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

  const geo = useGeolocation(true)
  const haptic = useHaptic()
  const beep = useBeep()

  const [pickup, setPickup] = useState<GeoPoint | null>(null)
  const [dropoff, setDropoff] = useState<GeoPoint | null>(null)
  const [pickupLabel, setPickupLabel] = useState('My location')
  const [dropoffLabel, setDropoffLabel] = useState('')

  // Selected service — defaults to the first one the rider offers.
  const [service, setService] = useState<ServiceType | null>(
    maybeRider?.services[0] ?? null,
  )

  const pricing = useMemo(() => {
    if (!maybeRider || !service) {
      return { pricePerKm: maybeRider?.pricePerKm ?? 0, minFee: maybeRider?.minFee ?? 0 }
    }
    return rateFor(maybeRider, service)
  }, [maybeRider, service])

  const quote = useMemo(() => {
    if (!maybeRider || !pickup || !dropoff) return null
    const distanceKm = haversineKm(pickup, dropoff)
    const { final, minApplied } = quoteBreakdown(distanceKm, pricing)
    return { distanceKm, fare: final, minApplied }
  }, [pickup, dropoff, maybeRider, pricing])

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

  // Send WhatsApp — pure deep-link, no platform-side record. The directory's
  // job ends here; the rest of the booking happens between the customer and
  // the independent rider on WhatsApp. Keeps the platform on the directory
  // side of Permenhub PM 12/2019 classification (we are a listing service,
  // not an aplikasi penyedia jasa angkutan).
  function onSend() {
    if (!pickup || !dropoff || !quote) return
    const link = buildWhatsAppLink({
      riderName: rider.name,
      riderWhatsAppE164: rider.whatsappE164,
      pickup: { lat: pickup.lat, lng: pickup.lng, label: pickupLabel || undefined },
      dropoff: { lat: dropoff.lat, lng: dropoff.lng, label: dropoffLabel || undefined },
      distanceKm: quote.distanceKm,
      pricePerKm: pricing.pricePerKm,
      fare: quote.fare,
    })
    beep.play()
    haptic.buzz()
    window.open(link, '_blank', 'noopener,noreferrer')
  }

  // OFFLINE fallback view
  if (!rider.isOnline || rider.subscriptionStatus === 'past_due') {
    const nearby = getOnlineRiders(rider.id)
    return (
      <main className="min-h-screen pb-16">
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
    <main className="min-h-screen pb-40">
      <BackNav />
      <div className="max-w-2xl mx-auto px-4 pt-2 space-y-5">
        <RiderHero rider={rider} />

        <RiderRadar
          customer={pickup ?? geo.coords ?? null}
          rider={{ lat: rider.lat, lng: rider.lng, name: rider.name }}
        />

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

        {/* Service picker (only when rider offers > 1 service) */}
        {rider.services.length > 1 && (
          <div className="card p-4">
            <div className="text-[12px] text-dim uppercase tracking-wider font-extrabold mb-2.5">
              Service
            </div>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${rider.services.length}, 1fr)` }}>
              {rider.services.map(s => {
                const r = rateFor(rider, s)
                const active = service === s
                return (
                  <button
                    key={s}
                    onClick={() => { setService(s); haptic.tap() }}
                    className="rounded-2xl border text-center py-2.5 px-2 transition"
                    style={{
                      background:   active ? 'rgba(250,204,21,0.10)' : 'rgba(255,255,255,0.04)',
                      borderColor:  active ? 'rgba(250,204,21,0.45)' : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <div className="text-[20px] leading-none">{SERVICE_ICONS[s]}</div>
                    <div className="text-[13px] font-extrabold mt-1.5" style={{ color: active ? '#FACC15' : '#fff' }}>
                      {SERVICE_SHORT[s]}
                    </div>
                    <div className="text-[12px] text-muted mt-0.5">{idr(r.pricePerKm)}/km</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Live quote card */}
        <div className="card p-5 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-60"
               style={{ background: 'radial-gradient(ellipse at top right, rgba(250,204,21,0.16), transparent 60%)' }} />
          <div className="relative flex items-baseline justify-between">
            <div>
              <div className="text-[12px] text-dim uppercase tracking-wider font-bold">
                Fare estimate{service && <> · {SERVICE_SHORT[service]}</>}
              </div>
              <div className="text-[34px] font-extrabold gradient-text mt-1 leading-none">
                {quote ? idr(quote.fare) : '—'}
              </div>
              <div className="text-[13px] text-muted mt-2">
                {quote
                  ? `${quote.distanceKm.toFixed(1)} km × ${idr(pricing.pricePerKm)}`
                  : 'Set pickup & drop off to see price'}
              </div>
              {quote?.minApplied && (
                <div className="text-brand text-[12px] mt-1">Min fee {idr(pricing.minFee)} applies</div>
              )}
            </div>
            <div className="text-right text-[13px] text-muted">
              <div className="font-bold text-ink">{idr(pricing.pricePerKm)}</div>
              <div className="text-dim">/km</div>
              <div className="mt-2 font-bold text-ink">min {idr(pricing.minFee)}</div>
            </div>
          </div>
        </div>

        {/* Bike section */}
        <div className="card p-5">
          <div className="text-[12px] text-dim uppercase tracking-wider font-bold mb-2">Bike</div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 shrink-0 rounded-2xl bg-white/5 flex items-center justify-center text-3xl">
              🛵
            </div>
            <div className="flex-1">
              <div className="font-extrabold text-lg">{rider.bike.make} {rider.bike.model}</div>
              <div className="text-[13px] text-muted">
                {rider.bike.year} · {rider.bike.color} · <span className="capitalize">{rider.bike.type}</span>
              </div>
              {rider.bike.plate && (
                <div className="text-[12px] text-dim mt-1 font-mono">{rider.bike.plate}</div>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {rider.bio && (
          <div className="card p-5">
            <div className="text-[12px] text-dim uppercase tracking-wider font-bold mb-2">About the rider</div>
            <p className="text-[14px] leading-relaxed text-ink/90">{rider.bio}</p>
          </div>
        )}
      </div>

      {/* Sticky bottom bar — pure WhatsApp CTA. The directory hands the
          customer off to WhatsApp; everything after that is between the
          customer and the independent rider. */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="glass-strong rounded-2xl p-3">
            <button
              onClick={onSend}
              disabled={!quote}
              className="btn-wa w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MessageCircle className="w-5 h-5" />
              {quote
                ? `Open WhatsApp · ${idr(quote.fare)}`
                : 'Set pickup & drop off to send'}
            </button>
            <p className="text-[11px] text-dim text-center mt-2">
              Booking, payment + dispute handled directly between you and the rider
            </p>
          </div>
        </div>
      </div>

      {/* Compact disclaimer above the sticky CTA (rendered in page body
          padding so it sits visible above the fixed bottom area) */}
      <div className="max-w-2xl mx-auto"><PlatformDisclaimer variant="compact" /></div>
    </main>
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
          <div className="flex flex-wrap gap-1.5 mt-3">
            {rider.services.map(s => (
              <span key={s} className="chip-muted chip">
                <span>{SERVICE_ICONS[s]}</span>
                <span>{SERVICE_LABELS[s]}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
