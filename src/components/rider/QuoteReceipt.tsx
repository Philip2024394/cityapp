'use client'
import { MapPin, Box, Bike as BikeIcon } from 'lucide-react'
import type { Rider } from '@/types/rider'
import { idr } from '@/lib/format/idr'
import { SERVICE_ICONS, SERVICE_LABELS } from '@/types/rider'

type Props = {
  rider: Rider
  pickupLabel?: string
  dropoffLabel?: string
  distanceKm: number
  fare: number
  minApplied: boolean
  onSend: () => void
  onCancel: () => void
}

export default function QuoteReceipt({
  rider, pickupLabel, dropoffLabel, distanceKm, fare, minApplied, onSend, onCancel,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Rider mini-header */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <img src={rider.photoUrl} alt={rider.name} className="w-12 h-12 rounded-xl object-cover" />
          <span className={rider.isOnline ? 'dot-online absolute -bottom-0.5 -right-0.5 ring-2 ring-bg2' : 'dot-offline absolute -bottom-0.5 -right-0.5 ring-2 ring-bg2'} />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-[15px]">{rider.name}</div>
          <div className="text-[13px] text-muted flex items-center gap-1.5">
            <BikeIcon className="w-3 h-3" />
            {rider.bike.make} {rider.bike.model} {rider.bike.year}
            {rider.bike.hasBox && <span className="text-online ml-1">✓ Box</span>}
          </div>
        </div>
      </div>

      {/* Route */}
      <div className="card p-4">
        <div className="flex gap-3">
          <div className="flex flex-col items-center pt-1">
            <div className="w-2.5 h-2.5 rounded-full bg-brand shadow-glow" />
            <div className="w-px flex-1 my-1 bg-line min-h-[28px]" />
            <div className="w-2.5 h-2.5 rounded-sm bg-online" />
          </div>
          <div className="flex-1 space-y-3 text-[14px]">
            <div>
              <div className="text-[12px] text-dim uppercase tracking-wider font-bold">Jemput</div>
              <div className="text-ink mt-0.5">{pickupLabel || 'Lokasi saya'}</div>
            </div>
            <div>
              <div className="text-[12px] text-dim uppercase tracking-wider font-bold">Antar</div>
              <div className="text-ink mt-0.5">{dropoffLabel || 'Lokasi tujuan'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Fare summary */}
      <div className="card p-5 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-50"
             style={{ background: 'radial-gradient(ellipse at top right, rgba(250,204,21,0.12), transparent 60%)' }} />
        <div className="relative">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-[12px] text-dim uppercase tracking-wider font-bold">Estimasi</div>
              <div className="text-3xl font-extrabold gradient-text mt-1">{idr(fare)}</div>
            </div>
            <div className="text-right text-[13px] text-muted">
              <div><span className="font-bold text-ink">{distanceKm.toFixed(1)} km</span></div>
              <div className="mt-0.5">{idr(rider.pricePerKm)}/km</div>
              {minApplied && <div className="text-brand text-[12px] mt-0.5">Min fee {idr(rider.minFee)} berlaku</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Services Andi covers */}
      <div className="flex flex-wrap gap-1.5">
        {rider.services.map(s => (
          <span key={s} className="chip-muted chip">
            <span>{SERVICE_ICONS[s]}</span>
            <span>{SERVICE_LABELS[s]}</span>
          </span>
        ))}
      </div>

      {/* CTAs */}
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="btn-secondary flex-1">Batal</button>
        <button onClick={onSend} className="btn-wa flex-[2]">
          <MessageCircleIcon />
          Kirim ke WhatsApp
        </button>
      </div>

      <p className="text-[12px] text-dim text-center pt-1 flex items-center justify-center gap-1.5">
        <Box className="w-3 h-3" />
        Estimasi disimpan untuk analitik rider · pembayaran langsung di lapangan
      </p>
    </div>
  )
}

function MessageCircleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}
