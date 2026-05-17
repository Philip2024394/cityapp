'use client'
import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, MessageCircle, MapPin, Bike as BikeIcon, ArrowDownUp } from 'lucide-react'
import { MOCK_RIDERS } from '@/data/mockRiders'
import { haversineKm } from '@/lib/geo/haversine'
import { quoteBreakdown, rateFor, lowestStartingPrice, hasServiceOverrides } from '@/lib/pricing/quote'
import { buildWhatsAppLink } from '@/lib/whatsapp/buildLink'
import { idr } from '@/lib/format/idr'
import { bikeTitle } from '@/lib/format/bike'
import { useHaptic } from '@/hooks/useHaptic'
import { useBeep } from '@/hooks/useBeep'
import { SERVICE_ICONS, SERVICE_LABELS, type Rider, type ServiceType } from '@/types/rider'

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
  const pickupName = sp.get('pName') ?? 'Lokasi saya'
  const dropoffName = sp.get('dName') ?? 'Tujuan'

  const [sort, setSort] = useState<'cheapest' | 'nearest'>('cheapest')
  const [filter, setFilter] = useState<ServiceType | 'all'>('all')

  // If trip missing, bounce to /cari
  if (!pickup || !dropoff) {
    return (
      <main className="min-h-screen p-6 flex items-center justify-center">
        <div className="card p-6 text-center max-w-sm">
          <p className="text-[14px] text-muted">Trip belum diset.</p>
          <Link href="/cari" className="btn-primary mt-4 w-full">Plan trip dulu</Link>
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
      return { rider: r, fare: final, minApplied, distanceToPickup, perKm: pricing.pricePerKm, hasOverrides }
    })
    e.sort((a, b) =>
      sort === 'cheapest' ? a.fare - b.fare : a.distanceToPickup - b.distanceToPickup,
    )
    return e
  }, [tripKm, sort, filter, pickup])

  const cheapest = enriched[0]?.fare
  const mostExpensive = enriched.length > 0 ? Math.max(...enriched.map(x => x.fare)) : null

  function onWhatsApp(rider: Rider, fare: number, perKm: number) {
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
                      <div className="text-[11px] text-dim uppercase tracking-wider font-extrabold">Jemput</div>
                      <div className="truncate">{pickupName}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-dim uppercase tracking-wider font-extrabold">Antar</div>
                      <div className="truncate">{dropoffName}</div>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] text-dim uppercase tracking-wider font-extrabold">Jarak</div>
                  <div className="text-[20px] font-extrabold gradient-text leading-none mt-0.5">
                    {tripKm.toFixed(1)} km
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-line flex items-center justify-between gap-2">
                <span className="text-[12px] text-muted">
                  {enriched.length} rider tersedia
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
              label="Termurah"
            />
            <FilterChip
              active={sort === 'nearest'}
              onClick={() => { setSort('nearest'); haptic.tap() }}
              label="Terdekat dari jemput"
            />
            <div className="w-px h-5 bg-line shrink-0" />
            <FilterChip
              active={filter === 'all'}
              onClick={() => { setFilter('all'); haptic.tap() }}
              label="Semua"
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

          {/* Driver cards */}
          <div className="space-y-3">
            {enriched.map(({ rider, fare, minApplied, distanceToPickup, perKm, hasOverrides }, idx) => (
              <DriverCard
                key={rider.id}
                rider={rider}
                fare={fare}
                minApplied={minApplied}
                distanceToPickup={distanceToPickup}
                perKm={perKm}
                hasOverrides={hasOverrides}
                isCheapest={idx === 0 && sort === 'cheapest'}
                onWhatsApp={() => onWhatsApp(rider, fare, perKm)}
              />
            ))}
          </div>

          {enriched.length === 0 && (
            <div className="card p-8 text-center">
              <p className="text-muted text-[14px]">Tidak ada rider tersedia dengan filter ini.</p>
              <button onClick={() => setFilter('all')} className="btn-secondary mt-4">Reset filter</button>
            </div>
          )}
        </div>
      </main>
    </>
  )
}

function DriverCard({
  rider, fare, minApplied, distanceToPickup, isCheapest, onWhatsApp, perKm, hasOverrides,
}: {
  rider: Rider; fare: number; minApplied: boolean; distanceToPickup: number; isCheapest: boolean; onWhatsApp: () => void; perKm: number; hasOverrides: boolean
}) {
  return (
    <article
      className={
        'card card-driver relative overflow-hidden animate-[fadeUp_0.4s_ease-out_both]' +
        (isCheapest ? ' card-driver-cheapest' : '')
      }
    >
      {/* Cheapest ribbon — sits flush along the top-left edge */}
      {isCheapest && (
        <div className="absolute top-0 left-0 z-10">
          <span className="ribbon-cheapest">
            <span aria-hidden>⚡</span>
            Termurah
          </span>
        </div>
      )}

      <div className={'p-4 ' + (isCheapest ? 'pt-9' : '')}>
        {/* Top row: driver identity (left) + price block (right) */}
        <div className="flex gap-3 items-start">
          {/* Driver photo with online dot */}
          <Link
            href={`/r/${rider.slug}`}
            aria-label={`Lihat profil ${rider.name}`}
            className="relative shrink-0 block min-w-[44px] min-h-[44px] rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand/60"
          >
            <img
              src={rider.photoUrl}
              alt={rider.name}
              className="w-16 h-16 rounded-2xl object-cover ring-1 ring-white/10"
            />
            <span
              className="dot-online absolute -bottom-0.5 -right-0.5 ring-2 ring-bg"
              aria-label="Online"
            />
          </Link>

          {/* Name + bike block */}
          <div className="flex-1 min-w-0">
            <Link
              href={`/r/${rider.slug}`}
              className="inline-block font-extrabold text-[16px] leading-tight hover:text-brand transition truncate max-w-full align-bottom"
            >
              {rider.name}
            </Link>

            {/* Bike — automotive listing style */}
            <div className="mt-1.5 flex items-center gap-1.5 min-w-0">
              <BikeIcon className="w-3.5 h-3.5 text-brand shrink-0" aria-hidden />
              <span className="text-[14px] font-bold text-ink/90 truncate">
                {rider.bike.make} {rider.bike.model}
              </span>
            </div>
            <div className="mt-0.5 text-[13px] text-muted">
              {rider.bike.year} · {rider.bike.color} · {capFirst(rider.bike.type)}
            </div>

            {/* Plate + box badges */}
            {(rider.bike.plate || rider.bike.hasBox) && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {rider.bike.plate && (
                  <span className="plate-tag" aria-label={`Plat nomor ${rider.bike.plate}`}>
                    {rider.bike.plate}
                  </span>
                )}
                {rider.bike.hasBox && (
                  <span className="pill-soft pill-soft-online" aria-label="Bawa box">
                    <span aria-hidden>📦</span>
                    Box
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Price block — visual anchor */}
          <div
            className={'price-block shrink-0' + (isCheapest ? ' price-block-cheapest' : '')}
          >
            <div className="text-[13px] uppercase tracking-wider font-extrabold text-dim leading-none">
              Total
            </div>
            <div className="text-[24px] font-extrabold gradient-text leading-tight mt-1 whitespace-nowrap">
              {idr(fare)}
            </div>
            <div className="text-[13px] text-muted leading-none mt-1 whitespace-nowrap">
              {hasOverrides && <span className="text-brand/90">dari </span>}
              {idr(perKm)}<span className="text-dim">/km</span>
            </div>
            {minApplied && (
              <div className="text-[13px] text-brand/90 font-bold leading-none mt-1.5 whitespace-nowrap">
                min {idr(rider.minFee)}
              </div>
            )}
          </div>
        </div>

        {/* Footer: trust info (left) + WhatsApp CTA (right) */}
        <div className="mt-3.5 pt-3 border-t border-line flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span className="pill-soft" title={rider.area}>
              <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden />
              <span className="truncate max-w-[140px]">{rider.area}</span>
            </span>
            <span className="pill-soft" aria-label={`${distanceToPickup.toFixed(1)} kilometer dari titik jemput`}>
              ~{distanceToPickup.toFixed(1)} km dari jemput
            </span>
          </div>
          <button
            onClick={onWhatsApp}
            className="btn-wa-compact shrink-0"
            aria-label={`Chat WhatsApp dengan ${rider.name}`}
          >
            <MessageCircle className="w-4 h-4" aria-hidden />
            WhatsApp
          </button>
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

function capFirst(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }
