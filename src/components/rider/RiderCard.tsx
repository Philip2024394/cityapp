'use client'
import { useState } from 'react'
import Link from 'next/link'
import { MapPin, MessageCircle, RotateCw, Bike, Cog, Settings2, Palette, Hash, Package } from 'lucide-react'
import type { Rider } from '@/types/rider'
import { SERVICE_ICONS, SERVICE_LABELS } from '@/types/rider'
import { idr } from '@/lib/format/idr'

type Props = {
  rider: Rider
  distanceKm?: number | null
  estimatedFare?: number | null
  onWhatsApp?: () => void
  href?: string
}

export default function RiderCard({ rider, distanceKm, estimatedFare, onWhatsApp, href }: Props) {
  const hasQuote = estimatedFare != null
  const [flipped, setFlipped] = useState(false)

  function toggleFlip(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    setFlipped((v) => !v)
  }

  // 3D flip — perspective on the outer container, preserve-3d on the
  // inner transform layer, two absolutely-stacked faces with
  // backface-visibility hidden. Front sets height (position:relative);
  // back matches via absolute inset 0.
  const innerStyle: React.CSSProperties = {
    transformStyle: 'preserve-3d',
    transition: 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: flipped ? 'rotateY(180deg)' : 'none',
  }
  const faceStyle: React.CSSProperties = {
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
  }

  const FlipBtn = ({ onBack = false }: { onBack?: boolean }) => (
    <button
      type="button"
      onClick={toggleFlip}
      aria-label={onBack ? 'Show driver details' : 'Show bike details'}
      className="absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-full flex items-center justify-center transition active:scale-90"
      style={{
        background: 'rgba(10,10,10,0.85)',
        border: '1px solid rgba(250,204,21,0.45)',
        color: '#FACC15',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
      }}
    >
      <RotateCw className="w-3.5 h-3.5" strokeWidth={2.5} />
    </button>
  )

  const front = (
    <div
      className="card card-interactive p-4 animate-[fadeUp_0.4s_ease-out_both] relative overflow-hidden"
      style={{
        ...faceStyle,
        ...(hasQuote ? { borderColor: 'rgba(250,204,21,0.22)' } : undefined),
      }}
    >
      {hasQuote && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-60"
          style={{ background: 'radial-gradient(ellipse at top right, rgba(250,204,21,0.10), transparent 55%)' }}
        />
      )}

      <FlipBtn />

      <div className="relative flex gap-3 items-stretch">
        <div className="relative shrink-0">
          <img
            src={rider.photoUrl}
            alt={rider.name}
            className="w-16 h-16 rounded-2xl object-cover"
          />
          <span
            className={rider.isOnline ? 'dot-online absolute -bottom-0.5 -right-0.5 ring-2 ring-bg' : 'dot-offline absolute -bottom-0.5 -right-0.5 ring-2 ring-bg'}
            aria-label={rider.isOnline ? 'Online' : 'Offline'}
          />
        </div>

        <div className="flex-1 min-w-0">
          {/* Top row — name + price/fare. Right-padded so it never tucks
              under the flip button. */}
          <div className="flex items-start justify-between gap-2 pr-9">
            <div className="min-w-0">
              <div className="text-[15px] font-bold truncate">{rider.name}</div>
              <div className="flex items-center gap-1 text-[13px] text-muted mt-0.5 truncate">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{rider.area}</span>
                {distanceKm != null && (
                  <span className="text-dim shrink-0">· {distanceKm.toFixed(1)} km</span>
                )}
              </div>
            </div>

            {hasQuote ? (
              <div className="text-right shrink-0 -my-0.5">
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-dim">Total</div>
                <div className="text-[22px] font-extrabold gradient-text leading-tight">
                  {idr(estimatedFare)}
                </div>
                <div className="text-[11px] text-muted leading-tight">
                  {idr(rider.pricePerKm)}/km
                </div>
              </div>
            ) : (
              <div className="text-right shrink-0">
                <div className="text-[13px] text-brand font-extrabold leading-none">{idr(rider.pricePerKm)}</div>
                <div className="text-[11px] text-dim mt-1">/km</div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2">
            {rider.services.slice(0, 3).map(s => (
              <span key={s} className="chip-muted chip text-[13px] py-1 px-2" title={SERVICE_LABELS[s]}>
                <span className="text-[14px]">{SERVICE_ICONS[s]}</span>
                <span className="font-semibold">{SERVICE_LABELS[s].split(' ')[0]}</span>
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between mt-2.5">
            <div className="text-[12px] text-dim">
              {hasQuote
                ? <>min fee {idr(rider.minFee)}</>
                : <>min {idr(rider.minFee)} · WhatsApp direct</>}
            </div>
            {onWhatsApp && (
              <button
                onClick={(e) => {
                  e.preventDefault(); e.stopPropagation()
                  if (rider.isMock) return
                  onWhatsApp()
                }}
                aria-disabled={rider.isMock}
                className={`bg-[#25D366] text-white rounded-full px-3 py-1.5 flex items-center gap-1.5 text-[13px] font-extrabold shadow-[0_4px_12px_rgba(37,211,102,0.35)] transition ${
                  rider.isMock ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.03]'
                }`}
                aria-label={`WhatsApp ${rider.name}`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                {rider.isMock ? 'Sample' : (hasQuote ? 'Book' : 'Chat')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  // Back face — bike spec sheet. Absolute inset:0 so it matches the
  // front face's height. Rotated 180° so it reads correctly when the
  // outer .flip-inner is rotated.
  const transmissionLabel =
    rider.bike.type === 'matic'  ? 'Automatic' :
    rider.bike.type === 'sport'  ? 'Sport / Manual' :
    rider.bike.type === 'manual' ? 'Manual' : 'Unknown'

  const back = (
    <div
      className="card p-4 absolute inset-0 overflow-hidden"
      style={{
        ...faceStyle,
        transform: 'rotateY(180deg)',
        background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)',
        border: '1px solid rgba(250,204,21,0.25)',
      }}
    >
      <FlipBtn onBack />

      <div className="flex items-center gap-2 mb-3 pr-9">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #FACC15, #EAB308)' }}
        >
          <Bike className="w-5 h-5 text-bg" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-brand/70">Bike</div>
          <div className="text-[15px] font-extrabold text-ink truncate leading-tight">
            {rider.bike.make || '—'} {rider.bike.model || ''}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Spec icon={Cog}        label="Engine"       value={rider.bike.cc ? `${rider.bike.cc} cc` : '—'} />
        <Spec icon={Settings2}  label="Transmission" value={transmissionLabel} />
        <Spec icon={Palette}    label="Colour"       value={rider.bike.color || '—'} />
        <Spec icon={Hash}       label="Plate"        value={rider.bike.plate || '—'} mono />
        <Spec icon={Bike}       label="Year"         value={rider.bike.year ? String(rider.bike.year) : '—'} />
        <Spec icon={Package}    label="Top box"      value={rider.bike.hasBox ? 'Yes' : 'No'} />
      </div>
    </div>
  )

  const flipContainer = (
    <div className="relative" style={{ perspective: '1200px' }}>
      <div className="relative" style={innerStyle}>
        {front}
        {back}
      </div>
    </div>
  )

  if (href) {
    return <Link href={href} className="block">{flipContainer}</Link>
  }
  return flipContainer
}

function Spec({
  icon: Icon, label, value, mono = false,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div
      className="rounded-lg px-2.5 py-2"
      style={{ background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.15)' }}
    >
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-extrabold text-brand/70">
        <Icon className="w-3 h-3" strokeWidth={2.5} />
        {label}
      </div>
      <div
        className={`text-[13px] font-extrabold text-ink mt-0.5 truncate ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </div>
    </div>
  )
}
