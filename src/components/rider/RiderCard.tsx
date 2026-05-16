'use client'
import Link from 'next/link'
import { MapPin, MessageCircle } from 'lucide-react'
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

  const cardBody = (
    <div
      className="card card-interactive p-4 animate-[fadeUp_0.4s_ease-out_both] relative overflow-hidden"
      style={hasQuote ? { borderColor: 'rgba(250,204,21,0.22)' } : undefined}
    >
      {hasQuote && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-60"
          style={{ background: 'radial-gradient(ellipse at top right, rgba(250,204,21,0.10), transparent 55%)' }}
        />
      )}

      <div className="relative flex gap-3 items-stretch">
        {/* Photo */}
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

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
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

            {/* THE HERO: total fare when quote available */}
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
            {rider.bike.hasBox && (
              <span className="chip-muted chip text-[13px] py-1 px-2">📦 Box</span>
            )}
          </div>

          <div className="flex items-center justify-between mt-2.5">
            <div className="text-[12px] text-dim">
              {hasQuote
                ? <>min fee {idr(rider.minFee)}</>
                : <>min {idr(rider.minFee)} · WhatsApp langsung</>}
            </div>
            {onWhatsApp && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onWhatsApp() }}
                className="bg-[#25D366] text-white rounded-full px-3 py-1.5 flex items-center gap-1.5 text-[13px] font-extrabold shadow-[0_4px_12px_rgba(37,211,102,0.35)] hover:scale-[1.03] transition"
                aria-label={`WhatsApp ${rider.name}`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                {hasQuote ? 'Pesan' : 'Chat'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  if (href) {
    return <Link href={href} className="block">{cardBody}</Link>
  }
  return cardBody
}
