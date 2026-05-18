'use client'
import { useEffect, useState } from 'react'
import { Clock, MessageCircle, X, Check, AlertCircle, ChevronRight } from 'lucide-react'
import { idr } from '@/lib/format/idr'

export type WaitingStatus = 'pending' | 'accepted' | 'declined' | 'expired'

export type RiderSuggestion = {
  riderId: string
  name: string
  photoUrl: string
  bikeLabel: string            // "Honda BeAT"
  distanceKm: number           // from customer's pickup
  fare: number                 // total fare for this trip
}

type Props = {
  riderName: string
  riderPhotoUrl: string
  status: WaitingStatus
  startedAt: number            // ms timestamp the order was created
  timeoutSec?: number          // default 300 (5 min)
  whatsappLink: string         // already-built wa.me URL
  onCancel: () => void
  onSeeOthers: () => void
  /** When status is 'expired' or 'declined', a list of nearest online
   *  riders for the customer to one-tap re-send to. Customer always picks
   *  manually — platform never auto-assigns. */
  suggestions?: RiderSuggestion[]
  onPickSuggestion?: (riderId: string) => void
}

// Customer-side companion to the driver's IncomingOrderModal.
// 4 states: pending (countdown), accepted (green), declined (muted),
// expired (red). Declined + expired states render a soft-suggest list
// of 3 nearby online riders the customer can one-tap re-send to.
export default function CustomerWaitingState({
  riderName, riderPhotoUrl, status, startedAt, timeoutSec = 300,
  whatsappLink, onCancel, onSeeOthers,
  suggestions = [], onPickSuggestion,
}: Props) {
  // Tick once a second so the countdown stays live (pending only)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (status !== 'pending') return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [status])

  const secondsLeft = Math.max(0, timeoutSec - Math.floor((now - startedAt) / 1000))
  const mm = Math.floor(secondsLeft / 60)
  const ss = (secondsLeft % 60).toString().padStart(2, '0')

  // ── ACCEPTED ──
  if (status === 'accepted') {
    return (
      <div className="card p-5 border-online/40 bg-online/5 animate-[fadeUp_0.3s_ease-out_both]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src={riderPhotoUrl} alt="" className="w-12 h-12 rounded-xl object-cover" />
            <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-online border-2 border-bg flex items-center justify-center">
              <Check className="w-3 h-3 text-bg" strokeWidth={3} />
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] uppercase tracking-wider font-extrabold text-online">Accepted</div>
            <div className="font-extrabold text-[15px] mt-0.5">{riderName} is on the way</div>
          </div>
        </div>
        <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="btn-wa w-full mt-4">
          <MessageCircle className="w-4 h-4" />
          Open WhatsApp chat
        </a>
        <div className="text-[12px] text-muted text-center mt-2">
          Coordinate pickup details on WhatsApp
        </div>
      </div>
    )
  }

  // ── DECLINED & EXPIRED — share suggestions block ──
  if (status === 'declined' || status === 'expired') {
    const isExpired = status === 'expired'
    return (
      <div
        className="card p-5 animate-[fadeUp_0.3s_ease-out_both]"
        style={{
          borderColor: isExpired ? 'rgba(239,68,68,0.30)' : 'rgba(255,255,255,0.10)',
          background:  isExpired ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.03)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: isExpired ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)' }}
          >
            {isExpired ? <AlertCircle className="w-5 h-5 text-danger" /> : <X className="w-5 h-5 text-muted" />}
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="text-[12px] uppercase tracking-wider font-extrabold"
              style={{ color: isExpired ? '#EF4444' : 'rgba(255,255,255,0.55)' }}
            >
              {isExpired ? 'Timed out' : 'Declined'}
            </div>
            <div className="font-extrabold text-[15px] mt-0.5">
              {isExpired ? `${riderName} didn’t respond` : `${riderName} can’t take this one`}
            </div>
          </div>
        </div>

        {/* Suggestions block — soft auto-suggest, customer still picks */}
        {suggestions.length > 0 && onPickSuggestion ? (
          <>
            <div className="text-[13px] font-bold text-muted mt-4 mb-2.5">
              These riders are online now:
            </div>
            <div className="space-y-2">
              {suggestions.map(s => (
                <button
                  key={s.riderId}
                  onClick={() => onPickSuggestion(s.riderId)}
                  className="w-full card card-interactive p-3 flex items-center gap-3 text-left"
                >
                  <img src={s.photoUrl} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-[14px] truncate">{s.name}</div>
                    <div className="text-[12px] text-muted truncate">
                      {s.bikeLabel} · ~{s.distanceKm.toFixed(1)} km
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[15px] font-extrabold gradient-text leading-none whitespace-nowrap">
                      {idr(s.fare)}
                    </div>
                    <div className="text-[12px] text-online font-bold mt-1 flex items-center gap-1 justify-end">
                      <MessageCircle className="w-3 h-3" />
                      Send
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={onSeeOthers}
                    className="w-full mt-3 px-3 py-2 rounded-xl border border-line text-[13px] font-bold text-muted hover:text-ink hover:border-brand/40 transition min-h-[40px] flex items-center justify-center gap-1">
              See all nearby riders <ChevronRight className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button onClick={onSeeOthers} className="btn-primary w-full mt-4">
            See other riders <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    )
  }

  // ── PENDING (default) ──
  const urgent = secondsLeft <= 60
  return (
    <div
      className="card p-5 relative overflow-hidden animate-[fadeUp_0.3s_ease-out_both]"
      style={{
        borderColor: urgent ? 'rgba(239,68,68,0.4)' : 'rgba(250,204,21,0.35)',
        boxShadow: urgent
          ? '0 0 0 1px rgba(239,68,68,0.18), 0 16px 40px rgba(239,68,68,0.10)'
          : '0 0 0 1px rgba(250,204,21,0.18), 0 16px 40px rgba(250,204,21,0.10)',
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at top, rgba(250,204,21,0.08), transparent 60%)' }}
      />
      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src={riderPhotoUrl} alt="" className="w-12 h-12 rounded-xl object-cover" />
            <span className="dot-online absolute -bottom-0.5 -right-0.5 ring-2 ring-bg" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] uppercase tracking-wider font-extrabold text-brand flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Waiting for accept
            </div>
            <div className="font-extrabold text-[15px] mt-0.5">{riderName}</div>
          </div>
          <div
            className="font-mono font-extrabold text-[18px] tabular-nums shrink-0"
            style={{ color: urgent ? '#EF4444' : '#FACC15' }}
          >
            {mm}:{ss}
          </div>
        </div>

        <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
           className="btn-wa w-full mt-4 !min-h-[44px] !py-2.5 !text-[14px]">
          <MessageCircle className="w-4 h-4" />
          Chat on WhatsApp while waiting
        </a>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <button onClick={onCancel}
                  className="px-3 py-2 rounded-xl border border-line text-[13px] font-bold text-muted hover:text-ink hover:border-white/20 transition min-h-[40px]">
            Cancel
          </button>
          <button onClick={onSeeOthers}
                  className="px-3 py-2 rounded-xl border border-line text-[13px] font-bold text-muted hover:text-ink hover:border-brand/40 transition min-h-[40px]">
            See other riders
          </button>
        </div>
      </div>
    </div>
  )
}
