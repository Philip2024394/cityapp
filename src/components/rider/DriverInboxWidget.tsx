'use client'
import { useCallback, useEffect, useState } from 'react'
import { Bell, Check, MessageCircle, Loader2 } from 'lucide-react'
import { useHaptic } from '@/hooks/useHaptic'

// ============================================================================
// DriverInboxWidget — driver dashboard card showing UNACKNOWLEDGED customer
// contact pings. Polls /api/drivers/me/inbox every 10s while the dashboard
// is visible. Self-hides when there are no pending pings (no permanent
// chrome — only appears when a customer is actually waiting for a reply).
//
// Each row gives the rider two actions:
//   1. Buka WhatsApp  — opens their WhatsApp inbox (the message landed
//                       in the standard WA conversation, not in our app).
//                       Native deep-link "whatsapp://".
//   2. Got it         — POST /api/drivers/me/push-ack
//                       Records acknowledged_at + stops the local 10s
//                       booking-alert sound on native via the notification
//                       cancel call. The customer's /cari/pending page
//                       picks up the ack within 5s (its own poll) and
//                       shows the green "Driver melihat pesanmu" badge.
//
// LEGAL POSTURE: this is private telemetry surface for the driver. The
// customer never sees the contents of this widget — only the boolean
// ack appearing on their pending page. Directory positioning preserved.
// ============================================================================

const POLL_MS = 10_000

type Ping = {
  id: string
  pinged_at: string
  source_page: string | null
  customer_anon_id: string | null
}

const SOURCE_LABEL: Record<string, string> = {
  cari_rider:   'Marketplace booking',
  business:     'Business directory',
  profile_card: 'Profile page',
  other:        'Customer tap',
}

function timeAgo(iso: string): string {
  const ms = Date.now() - Date.parse(iso)
  const s = Math.floor(ms / 1000)
  if (s < 30) return 'baru saja'
  if (s < 60) return `${s} detik`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} menit`
  return `${Math.floor(m / 60)} jam`
}

export default function DriverInboxWidget() {
  const haptic = useHaptic()
  const [pings, setPings] = useState<Ping[]>([])
  const [loaded, setLoaded] = useState(false)
  const [acking, setAcking] = useState<Set<string>>(new Set())

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/drivers/me/inbox', { cache: 'no-store' })
      if (!res.ok) return
      const j = (await res.json()) as { pings: Ping[] }
      setPings(j.pings ?? [])
    } catch { /* network blip — retry next tick */ }
    finally {
      setLoaded(true)
    }
  }, [])

  // Poll every 10s while the dashboard is visible. Document-visibility
  // gate stops the poll while the tab is backgrounded.
  useEffect(() => {
    void refresh()
    if (typeof window === 'undefined') return
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, POLL_MS)
    const onVis = () => { if (document.visibilityState === 'visible') void refresh() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [refresh])

  async function onAck(pingId: string) {
    if (acking.has(pingId)) return
    setAcking((s) => new Set(s).add(pingId))
    haptic.impact()
    try {
      const res = await fetch('/api/drivers/me/push-ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pingId, via: 'app_button' }),
      })
      if (res.ok) {
        // Optimistic remove — refresh fires anyway on next tick
        setPings((arr) => arr.filter((p) => p.id !== pingId))
      }
    } finally {
      setAcking((s) => { const n = new Set(s); n.delete(pingId); return n })
    }
  }

  function onOpenWhatsApp() {
    haptic.tap()
    // Universal WhatsApp open — works on web (wa.me redirect) and native
    // (whatsapp:// deep link). We don't know the customer's number from
    // the ping (anon by design), so we just open the driver's WhatsApp
    // inbox where the customer's message has already landed.
    if (typeof window === 'undefined') return
    window.open('https://wa.me/', '_blank', 'noopener,noreferrer')
  }

  // Self-hide when nothing to show.
  if (!loaded || pings.length === 0) return null

  return (
    <div
      className="rounded-3xl bg-gray-100 border border-gray-200 shadow-sm p-4 space-y-2.5"
      style={{
        background: 'rgba(34,197,94,0.06)',
        border: '1px solid rgba(34,197,94,0.40)',
        boxShadow: '0 0 0 1px rgba(34,197,94,0.18), 0 8px 24px rgba(15,23,42,0.08)',
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(34,197,94,0.18)', border: '1px solid rgba(34,197,94,0.35)' }}
        >
          <Bell className="w-4 h-4" style={{ color: '#22C55E' }} strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-extrabold leading-tight" style={{ color: '#16A34A' }}>
            {pings.length === 1
              ? '1 customer menunggu balasan'
              : `${pings.length} customer menunggu balasan`}
          </div>
          <div className="text-[12px] text-gray-600 mt-0.5">
            Buka WhatsApp untuk reply — atau tap "Got it" untuk stop alert.
          </div>
        </div>
      </div>

      <ul className="space-y-2">
        {pings.map((p) => {
          const isAcking = acking.has(p.id)
          return (
            <li
              key={p.id}
              className="rounded-xl p-2.5 flex items-center gap-2 bg-gray-50 border border-gray-200"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-extrabold truncate text-[#0F172A]">
                  {SOURCE_LABEL[p.source_page ?? 'other'] ?? 'Customer tap'}
                </div>
                <div className="text-[12px] text-gray-600 mt-0.5">
                  {timeAgo(p.pinged_at)} yang lalu
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenWhatsApp}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-[12px] font-extrabold active:scale-95 transition"
                style={{
                  background: 'linear-gradient(135deg, #25D366, #128C7E)',
                  minHeight: 36,
                }}
              >
                <MessageCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => onAck(p.id)}
                disabled={isAcking}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[#0F172A] text-[12px] font-extrabold active:scale-95 transition disabled:opacity-60"
                style={{
                  background: 'linear-gradient(135deg, #FACC15, #EAB308)',
                  border: '1px solid rgba(0,0,0,0.85)',
                  minHeight: 36,
                }}
              >
                {isAcking
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                Got it
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
