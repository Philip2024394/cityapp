'use client'
import { useEffect, useState } from 'react'
import { Check, X, Clock, MapPin, StopCircle } from 'lucide-react'
import { idr } from '@/lib/format/idr'
import { useBeep } from '@/hooks/useBeep'

export type IncomingOrder = {
  id: string
  customerLabel?: string          // optional customer display name
  customerName?: string           // forwarded to the trip page on accept
  customerWhatsApp?: string       // E164, digits only
  pickupLabel: string
  pickupLat?: number
  pickupLng?: number
  dropoffLabel: string
  dropoffLat?: number
  dropoffLng?: number
  pitstopNote?: string
  distanceKm: number
  fare: number                    // trip fare (before pitstop fee)
  pitstopFee?: number             // 0 or undefined = no extra
}

type Props = {
  order: IncomingOrder | null     // null = closed
  timeoutSec?: number             // countdown seconds, default 300 (5 min)
  onAccept: (order: IncomingOrder) => void
  onDecline: (order: IncomingOrder) => void
  onExpire: (order: IncomingOrder) => void
}

/* ─────────────────────────────────────────────────────────────────────────
   IncomingOrderModal
   Full-screen overlay that pops when a customer taps WhatsApp on a rider's
   profile. Rider has TIMEOUT_SEC to accept or decline before it auto-
   expires. Loud alarm + vibration on mount; re-bursts every 2.8s. The
   accept tap becomes the platform's "trip started" anchor.
   ───────────────────────────────────────────────────────────────────── */
export default function IncomingOrderModal({
  order, timeoutSec = 300, onAccept, onDecline, onExpire,
}: Props) {
  const beep = useBeep()
  const [secondsLeft, setSecondsLeft] = useState(timeoutSec)

  // Reset timer + fire alarm when a new order opens
  useEffect(() => {
    if (!order) return
    setSecondsLeft(timeoutSec)
    const stopAlarm = beep.alarm()
    return () => stopAlarm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id])

  // Countdown — ticks once per second, fires onExpire at 0
  useEffect(() => {
    if (!order) return
    if (secondsLeft <= 0) { onExpire(order); return }
    const t = setTimeout(() => setSecondsLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [order, secondsLeft, onExpire])

  if (!order) return null

  const mm = Math.floor(secondsLeft / 60)
  const ss = (secondsLeft % 60).toString().padStart(2, '0')
  const urgent = secondsLeft <= 60   // last minute = red
  const totalFare = order.fare + (order.pitstopFee ?? 0)

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-[fadeUp_0.2s_ease-out_both]"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="incoming-title"
    >
      <div
        className="w-full max-w-md card relative overflow-hidden"
        style={{
          borderColor: urgent ? 'rgba(239,68,68,0.55)' : 'rgba(250,204,21,0.55)',
          boxShadow: urgent
            ? '0 0 0 2px rgba(239,68,68,0.18), 0 28px 60px rgba(239,68,68,0.22)'
            : '0 0 0 2px rgba(250,204,21,0.22), 0 28px 60px rgba(250,204,21,0.25)',
          animation: 'incomingPulse 1.4s ease-in-out infinite',
        }}
      >
        {/* Top strip — countdown badge + alert label */}
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{
            background: urgent
              ? 'linear-gradient(135deg, rgba(239,68,68,0.16), rgba(239,68,68,0.06))'
              : 'linear-gradient(135deg, rgba(250,204,21,0.16), rgba(250,204,21,0.06))',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <span className="dot-online" style={{ background: urgent ? '#EF4444' : '#FACC15' }} />
            <span
              id="incoming-title"
              className="text-[13px] font-extrabold uppercase tracking-wider"
              style={{ color: urgent ? '#EF4444' : '#FACC15' }}
            >
              {urgent ? 'Quickly — almost expired!' : 'New booking request'}
            </span>
          </div>
          <div
            className="font-mono font-extrabold text-[18px] tabular-nums"
            style={{ color: urgent ? '#EF4444' : '#FACC15' }}
          >
            <Clock className="w-4 h-4 inline -mt-0.5 mr-1" />
            {mm}:{ss}
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Route */}
          <div className="flex gap-3">
            <div className="flex flex-col items-center pt-1 shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-brand shadow-glow" />
              <div className="w-px flex-1 my-1 bg-line min-h-[20px]" />
              {order.pitstopNote && (
                <>
                  <div className="w-2.5 h-2.5 rounded-full bg-brand/80" style={{ border: '2px solid #FACC15' }} />
                  <div className="w-px flex-1 my-1 bg-line min-h-[20px]" />
                </>
              )}
              <div className="w-2.5 h-2.5 rounded-sm bg-online" />
            </div>
            <div className="flex-1 min-w-0 space-y-2.5 text-[14px]">
              <div>
                <div className="text-[11px] text-dim uppercase tracking-wider font-extrabold">Pick up</div>
                <div className="text-ink truncate flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-brand shrink-0" />
                  <span className="truncate">{order.pickupLabel}</span>
                </div>
              </div>
              {order.pitstopNote && (
                <div className="pl-2 -ml-2 border-l-2 border-brand/40">
                  <div className="text-[11px] text-brand uppercase tracking-wider font-extrabold flex items-center gap-1">
                    <StopCircle className="w-3 h-3" /> Pit stop
                  </div>
                  <div className="text-ink/85 truncate mt-0.5">{order.pitstopNote}</div>
                </div>
              )}
              <div>
                <div className="text-[11px] text-dim uppercase tracking-wider font-extrabold">Drop off</div>
                <div className="text-ink truncate flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-online shrink-0" />
                  <span className="truncate">{order.dropoffLabel}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Fare summary */}
          <div className="card p-3.5 flex items-center justify-between" style={{ background: 'rgba(250,204,21,0.05)' }}>
            <div>
              <div className="text-[11px] text-dim uppercase tracking-wider font-extrabold">Distance · Fare</div>
              <div className="font-extrabold text-[16px] mt-1">
                {order.distanceKm.toFixed(1)} km · <span className="gradient-text">{idr(totalFare)}</span>
              </div>
              {order.pitstopFee != null && order.pitstopFee > 0 && (
                <div className="text-[12px] text-muted mt-0.5">
                  {idr(order.fare)} trip + {idr(order.pitstopFee)} pit stop
                </div>
              )}
            </div>
          </div>

          {/* Coaching tip */}
          <div className="text-[12px] text-muted leading-relaxed flex items-start gap-2">
            <span aria-hidden>💡</span>
            <span>You can chat the customer on WhatsApp first, then come back here to accept within the timer.</span>
          </div>

          {/* CTAs */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => onDecline(order)}
              className="px-4 py-3 rounded-xl font-extrabold text-[14px] border border-line bg-white/5 text-muted hover:text-ink hover:border-white/20 transition min-h-[48px]"
            >
              <X className="w-4 h-4 inline -mt-0.5 mr-1" />
              Decline
            </button>
            <button
              onClick={() => onAccept(order)}
              className="px-4 py-3 rounded-xl font-extrabold text-[14px] text-bg transition min-h-[48px] flex items-center justify-center gap-1.5"
              style={{
                background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                boxShadow: '0 8px 24px rgba(34,197,94,0.35)',
              }}
            >
              <Check className="w-4 h-4" strokeWidth={3} />
              Accept order
            </button>
          </div>
        </div>

        <style jsx>{`
          @keyframes incomingPulse {
            0%, 100% { transform: scale(1); }
            50%      { transform: scale(1.015); }
          }
        `}</style>
      </div>
    </div>
  )
}
