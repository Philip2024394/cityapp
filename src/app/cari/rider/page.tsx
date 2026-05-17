'use client'
import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, Star, ArrowRight } from 'lucide-react'
import { MOCK_RIDERS } from '@/data/mockRiders'
import { haversineKm } from '@/lib/geo/haversine'
import { quoteBreakdown, rateFor, lowestStartingPrice, hasServiceOverrides } from '@/lib/pricing/quote'
import { buildWhatsAppLink } from '@/lib/whatsapp/buildLink'
import { idr } from '@/lib/format/idr'
import { bikeTitle } from '@/lib/format/bike'
import { useHaptic } from '@/hooks/useHaptic'
import { useBeep } from '@/hooks/useBeep'
import { SERVICE_ICONS, SERVICE_LABELS, SERVICE_SHORT, type Rider, type ServiceType } from '@/types/rider'
import PlatformDisclaimer from '@/components/layout/PlatformDisclaimer'

export default function Page() {
  return (
    <Suspense fallback={<LoadingShell />}>
      <DriverResults />
    </Suspense>
  )
}

function DriverResults() {
  const router = useRouter()
  const sp = useSearchParams()
  const haptic = useHaptic()
  const beep = useBeep()

  const pickup = readCoord(sp, 'pLat', 'pLng')
  const dropoff = readCoord(sp, 'dLat', 'dLng')
  const pickupName = sp.get('pName') ?? 'My location'
  const dropoffName = sp.get('dName') ?? 'Destination'
  const pitstopNote = sp.get('stop') ?? null   // null = no pit stop requested

  const [sort, setSort] = useState<'cheapest' | 'nearest'>('cheapest')
  // Read service choice from URL — set by /cari when customer picks one of
  // the 3 service cards. Defaults to 'all' if the param is missing or invalid.
  const initialFilter = (() => {
    const f = sp.get('filter')
    if (f === 'person' || f === 'parcel' || f === 'food') return f
    return 'all' as const
  })()
  const [filter, setFilter] = useState<ServiceType | 'all'>(initialFilter)

  // If trip missing, bounce to /cari
  if (!pickup || !dropoff) {
    return (
      <main className="min-h-screen p-6 flex items-center justify-center">
        <div className="card p-6 text-center max-w-sm">
          <p className="text-[14px] text-muted">Trip not set.</p>
          <Link href="/cari" className="btn-primary mt-4 w-full">Plan a trip first</Link>
        </div>
      </main>
    )
  }

  const tripKm = haversineKm(pickup, dropoff)

  const enriched = useMemo(() => {
    const list = MOCK_RIDERS.filter(r =>
      r.isOnline &&
      r.subscriptionStatus !== 'past_due' &&
      (filter === 'all' || r.services.includes(filter)),
    )
    const e = list.map(r => {
      // If a specific service is filtered, price for THAT service.
      // Otherwise show the lowest-starting price across the rider's enabled services.
      const pricing = filter === 'all' ? lowestStartingPrice(r) : rateFor(r, filter)
      const { final, minApplied } = quoteBreakdown(tripKm, pricing)
      const distanceToPickup = haversineKm(pickup, { lat: r.lat, lng: r.lng })
      const hasOverrides = filter === 'all' && hasServiceOverrides(r)
      const pitstopFee = pitstopNote ? (r.pitstopFee ?? 0) : 0
      const totalFare = final + pitstopFee
      return { rider: r, fare: final, pitstopFee, totalFare, minApplied, distanceToPickup, perKm: pricing.pricePerKm, hasOverrides }
    })
    e.sort((a, b) =>
      sort === 'cheapest' ? a.totalFare - b.totalFare : a.distanceToPickup - b.distanceToPickup,
    )
    return e
  }, [tripKm, sort, filter, pickup, pitstopNote])

  const cheapest = enriched[0]?.totalFare
  const mostExpensive = enriched.length > 0 ? Math.max(...enriched.map(x => x.totalFare)) : null

  function onWhatsApp(rider: Rider, fare: number, perKm: number, pitstopFee: number) {
    haptic.buzz()
    beep.play()
    const link = buildWhatsAppLink({
      riderName: rider.name,
      riderWhatsAppE164: rider.whatsappE164,
      pickup: { lat: pickup!.lat, lng: pickup!.lng, label: pickupName },
      dropoff: { lat: dropoff!.lat, lng: dropoff!.lng, label: dropoffName },
      distanceKm: tripKm,
      pricePerKm: perKm,
      fare,
      pitstop: pitstopNote ? { note: pitstopNote, fee: pitstopFee } : undefined,
    })
    window.open(link, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <Header />

      <main className="min-h-screen pb-16">
        <div className="max-w-xl mx-auto px-4 pt-3 space-y-4">
          {/* Trip summary card */}
          <div className="card p-4 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-60"
                 style={{ background: 'radial-gradient(ellipse at top right, rgba(250,204,21,0.12), transparent 60%)' }} />
            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3 flex-1 min-w-0">
                  <div className="flex flex-col items-center pt-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-brand shadow-glow" />
                    <div className="w-px flex-1 my-1 bg-line min-h-[20px]" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-online" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2 text-[14px]">
                    <div>
                      <div className="text-[11px] text-dim uppercase tracking-wider font-extrabold">Pick up</div>
                      <div className="truncate">{pickupName}</div>
                    </div>
                    {pitstopNote && (
                      <div className="pl-2 -ml-2 border-l-2 border-brand/40">
                        <div className="text-[11px] text-brand uppercase tracking-wider font-extrabold flex items-center gap-1">
                          🛑 Pit stop
                        </div>
                        <div className="text-ink/85 truncate">{pitstopNote}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-[11px] text-dim uppercase tracking-wider font-extrabold">Drop off</div>
                      <div className="truncate">{dropoffName}</div>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] text-dim uppercase tracking-wider font-extrabold">Distance</div>
                  <div className="text-[20px] font-extrabold gradient-text leading-none mt-0.5">
                    {tripKm.toFixed(1)} km
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-line flex items-center justify-between gap-2">
                <span className="text-[12px] text-muted">
                  {enriched.length} rider{enriched.length === 1 ? '' : 's'} available
                </span>
                {cheapest != null && mostExpensive != null && (
                  <span className="text-[12px] font-bold">
                    <span className="text-brand">{idr(cheapest)}</span>
                    {mostExpensive !== cheapest && (
                      <span className="text-dim"> – {idr(mostExpensive)}</span>
                    )}
                  </span>
                )}
              </div>
              <button
                onClick={() => router.push('/cari')}
                className="absolute top-3 right-3 text-[12px] text-dim hover:text-brand font-bold"
              >
                ✎
              </button>
            </div>
          </div>

          {/* Filter / sort */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <FilterChip
              active={sort === 'cheapest'}
              onClick={() => { setSort('cheapest'); haptic.tap() }}
              label="Cheapest"
            />
            <FilterChip
              active={sort === 'nearest'}
              onClick={() => { setSort('nearest'); haptic.tap() }}
              label="Nearest to pickup"
            />
            <div className="w-px h-5 bg-line shrink-0" />
            <FilterChip
              active={filter === 'all'}
              onClick={() => { setFilter('all'); haptic.tap() }}
              label="All"
            />
            {(Object.keys(SERVICE_LABELS) as ServiceType[]).map(s => (
              <FilterChip
                key={s}
                active={filter === s}
                onClick={() => { setFilter(s); haptic.tap() }}
                label={`${SERVICE_ICONS[s]} ${SERVICE_LABELS[s].split(' ')[0]}`}
              />
            ))}
          </div>

          {/* Driver cards — featured-banner style for the top 4 */}
          <div className="space-y-3">
            {enriched.slice(0, 4).map((item, idx) => (
              <FeaturedDriverCard
                key={item.rider.id}
                item={item}
                isCheapest={idx === 0 && sort === 'cheapest'}
                onWhatsApp={() => onWhatsApp(item.rider, item.fare, item.perKm, item.pitstopFee)}
              />
            ))}
          </div>

          {enriched.length === 0 && (
            <div className="card p-8 text-center">
              <p className="text-muted text-[14px]">No riders match this filter.</p>
              <button onClick={() => setFilter('all')} className="btn-secondary mt-4">Reset filter</button>
            </div>
          )}

          <PlatformDisclaimer variant="compact" />
        </div>
      </main>
    </>
  )
}

// Rough pickup ETA estimate. Assumes ~25 km/h average city speed in Bali.
// Replace with real routing data (Mapbox/OSRM) when available.
function etaMinutes(km: number): number {
  return Math.max(1, Math.round((km / 25) * 60))
}

function FeaturedDriverCard({
  item, isCheapest, onWhatsApp,
}: {
  item: {
    rider: Rider
    fare: number
    pitstopFee: number
    totalFare: number
    minApplied: boolean
    distanceToPickup: number
    perKm: number
    hasOverrides: boolean
  }
  isCheapest: boolean
  onWhatsApp: () => void
}) {
  const { rider, fare, distanceToPickup, minApplied } = item
  const eta = etaMinutes(distanceToPickup)

  return (
    <article
      className={
        'card card-driver relative overflow-hidden animate-[fadeUp_0.4s_ease-out_both]' +
        (isCheapest ? ' card-driver-cheapest' : '')
      }
    >
      <img
        src="https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2018,%202026,%2001_32_57%20AM.png"
        alt=""
        className="block w-full h-auto"
        loading="lazy"
      />

      {/* Driver name ribbon — flush top-left edge */}
      <div className="absolute top-0 left-0 z-10 max-w-[60%]">
        <span className="ribbon-cheapest truncate block">{rider.name}</span>
      </div>

      {/* Bike model — plain uppercase text in the top-right corner.
          Line 1: MAKE MODEL  |  Line 2: YEAR */}
      <div className="absolute top-3 right-[28px] z-10 text-right max-w-[42%]">
        <div className="text-[14px] font-extrabold text-black leading-tight truncate uppercase tracking-wide">
          {rider.bike.make} {rider.bike.model}
        </div>
        <div className="text-[12px] font-medium text-black/80 leading-tight mt-0.5">
          {rider.bike.year}
        </div>
      </div>

      {/* Avatar + identity with frosted scrim for contrast over photo */}
      <Link
        href={`/r/${rider.slug}`}
        aria-label={`View ${rider.name}'s profile`}
        className="absolute left-4 top-10 flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-brand/60 rounded-2xl z-10"
      >
        <span className="relative shrink-0">
          <img
            src={rider.photoUrl}
            alt={rider.name}
            className="w-[58px] h-[58px] rounded-2xl object-cover ring-2 ring-white/80"
          />
          <span className="dot-online absolute bottom-1 right-1 ring-2 ring-white" aria-label="Online" />
        </span>
        {rider.rating != null && (
          <span
            className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[13px] font-bold leading-none"
            style={{
              background: 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          >
            <Star className="w-3.5 h-3.5 fill-black text-black shrink-0" aria-hidden />
            <span className="text-black">{rider.rating.toFixed(1)}</span>
            {rider.trips != null && (
              <span className="text-[12px] text-gray-700 ml-0.5 font-semibold">
                ({rider.trips.toLocaleString()} trips)
              </span>
            )}
          </span>
        )}
      </Link>

      {/* Bottom info panel — overlays the lower portion of the image */}
      <div className="absolute inset-x-0 bottom-0 pointer-events-none">
        <div className="relative px-3.5 pt-2.5 pb-3 space-y-1.5 pointer-events-auto">
          {/* Trust chips: box + services (excl. parcel + food) */}
          <div className="flex flex-wrap items-center gap-1.5">
            {rider.bike.hasBox && (
              <span className="pill-soft pill-soft-online" aria-label="Has box">
                <span aria-hidden>📦</span>
                Box
              </span>
            )}
            {rider.services.filter(s => s !== 'parcel' && s !== 'food').map(s => (
              <span key={s} className="pill-soft" aria-label={SERVICE_LABELS[s]}>
                <span aria-hidden>{SERVICE_ICONS[s]}</span>
                {SERVICE_SHORT[s]}
              </span>
            ))}
          </div>

          {/* Price block (left) + Primary CTA (right) */}
          <div className="pt-1 flex items-end justify-between gap-3">
            <div className="flex flex-col leading-none drop-shadow min-w-0">
              <span className="text-[17px] font-extrabold text-gray-700 whitespace-nowrap">
                {idr(fare)}
              </span>
              <span className="mt-1.5 text-[12px] font-bold text-gray-700 whitespace-nowrap">
                ~{eta} {eta === 1 ? 'min' : 'mins'} away
                {minApplied && <span className="text-brand ml-1.5">· min fare</span>}
              </span>
            </div>
            <button
              onClick={onWhatsApp}
              aria-label={`Book ${rider.name}`}
              className="h-[39px] min-w-[118px] pl-2.5 pr-1 rounded-full flex items-center justify-between gap-1 border border-black active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-brand/60 shrink-0"
              style={{
                background: 'linear-gradient(135deg, #FACC15, #F59E0B)',
                boxShadow: '0 6px 16px rgba(250,204,21,0.28)',
              }}
            >
              <span className="text-[12px] font-extrabold uppercase tracking-wider text-black whitespace-nowrap">
                Book driver
              </span>
              <span
                aria-hidden
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                style={{ background: '#000' }}
              >
                <ArrowRight className="w-3 h-3 text-white" strokeWidth={3} />
              </span>
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

function Header() {
  return (
    <header className="sticky top-0 z-40 glass-strong pt-safe">
      <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/cari" className="flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-ink">
          <ChevronLeft className="w-4 h-4" />
          Edit trip
        </Link>
        <div className="text-[14px] font-extrabold">
          City <span className="gradient-text">Rider</span>
        </div>
        <div className="w-16" />
      </div>
    </header>
  )
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-bold transition border whitespace-nowrap"
      style={{
        background: active ? '#FACC15' : 'rgba(255,255,255,0.04)',
        color: active ? '#0A0A0A' : 'rgba(255,255,255,0.75)',
        borderColor: active ? '#FACC15' : 'rgba(255,255,255,0.1)',
      }}
    >
      {label}
    </button>
  )
}

function LoadingShell() {
  return (
    <main className="min-h-screen p-4 space-y-3">
      <div className="card h-24 shimmer" />
      <div className="card h-32 shimmer" />
      <div className="card h-32 shimmer" />
    </main>
  )
}

function readCoord(sp: URLSearchParams, latKey: string, lngKey: string) {
  const lat = parseFloat(sp.get(latKey) ?? '')
  const lng = parseFloat(sp.get(lngKey) ?? '')
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
  return null
}

