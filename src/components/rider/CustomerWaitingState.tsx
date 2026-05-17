'use client'
import { useEffect, useState } from 'react'
import { Clock, MessageCircle, X, Check, AlertCircle, ChevronRight } from 'lucide-react'

export type WaitingStatus = 'pending' | 'accepted' | 'declined' | 'expired'

type Props = {
  riderName: string
  riderPhotoUrl: string
  status: WaitingStatus
  startedAt: number          // ms timestamp the order was created
  timeoutSec?: number        // default 300 (5 min)
  whatsappLink: string       // already-built wa.me URL
  onCancel: () => void
  onSeeOthers: () => void
}

// Customer-side companion to the driver's IncomingOrderModal.
// Shows "Waiting for {rider} to accept" with a synced countdown,
// flips to "Accepted!" or "Declined" or "Timed out" based on status.
export default function CustomerWaitingState({
  riderName, riderPhotoUrl, status, startedAt, timeoutSec = 300,
  whatsappLink, onCancel, onSeeOthers,
}: Props) {
  // Tick once a second so the countdown stays live
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

  // ── DECLINED ──
  if (status === 'declined') {
    return (
      <div className="card p-5 border-line bg-white/3 animate-[fadeUp_0.3s_ease-out_both]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
            <X className="w-5 h-5 text-muted" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] uppercase tracking-wider font-extrabold text-muted">Declined</div>
            <div className="font-extrabold text-[15px] mt-0.5">{riderName} can&apos;t take this one</div>
          </div>
        </div>
        <button onClick={onSeeOthers} className="btn-primary w-full mt-4">
          See other riders <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    )
  }

  // ── EXPIRED ──
  if (status === 'expired') {
    return (
      <div className="card p-5 border-danger/30 bg-danger/5 animate-[fadeUp_0.3s_ease-out_both]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-danger/15 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-danger" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] uppercase tracking-wider font-extrabold text-danger">Timed out</div>
            <div className="font-extrabold text-[15px] mt-0.5">{riderName} didn&apos;t respond</div>
            <div className="text-[13px] text-muted mt-0.5">Try a different rider</div>
          </div>
        </div>
        <button onClick={onSeeOthers} className="btn-primary w-full mt-4">
          See other riders <ChevronRight className="w-4 h-4" />
        </button>
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
