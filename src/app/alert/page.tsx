'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { MessageCircle, Check, X as XIcon, AlertCircle } from 'lucide-react'

// ============================================================================
// /alert — driver-side alert screen.
// ----------------------------------------------------------------------------
// Landed-on when the driver TAPS a booking-alert push notification. The
// notification's data payload carries pingId + source, which we read
// from the URL (set by attachPushTapHandler).
//
// FLOW:
//   1. POST /api/drivers/me/push-ack — records the acknowledgement so
//      we can compute response-time for B2B scoring + dashboard analytics
//   2. Driver taps "Open WhatsApp" — fires whatsapp:// deep link
//   3. Driver replies to customer in WhatsApp (the actual contract)
//
// LEGAL POSTURE: nothing here is communicated to the customer. The ack
// is private platform telemetry; the WhatsApp reply IS the customer-
// facing communication. Directory posture preserved.
// ============================================================================

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Alert />
    </Suspense>
  )
}

function Alert() {
  const sp = useSearchParams()
  const pingId = sp.get('pingId')
  const source = sp.get('source') ?? 'other'
  const [acked, setAcked] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ack as soon as the screen is shown — driver opening this screen
  // proves they noticed the alert. Idempotent server-side (first ack wins).
  useEffect(() => {
    if (!pingId || acked) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/drivers/me/push-ack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pingId, via: 'app_button' }),
        })
        if (!cancelled && res.ok) setAcked(true)
      } catch {
        if (!cancelled) setError('Could not record acknowledgement — alert still cleared')
      }
    })()
    return () => { cancelled = true }
  }, [pingId, acked])

  function openWhatsApp() {
    // Notify server we opened WA — second ack reason (overrides only if
    // first hadn't already landed; the API guards against double-ack).
    if (pingId) {
      void fetch('/api/drivers/me/push-ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pingId, via: 'wa_opened' }),
        keepalive: true,
      })
    }
    // Direct app deep-link — Android/iOS will switch to WhatsApp's inbox
    // (NOT a specific chat — we don't know the customer's number; they
    // are messaging us). Fallback to wa.me opens the web build.
    window.location.href = 'whatsapp://'
    setTimeout(() => {
      // If WhatsApp app didn't open, route to web build
      window.location.href = 'https://web.whatsapp.com/'
    }, 1500)
  }

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-4 py-8" style={{ background: '#0A0A0A' }}>
      <div className="w-full max-w-sm space-y-5">
        {/* Pulsing alert glyph */}
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)',
              boxShadow: '0 0 60px rgba(250,204,21,0.45)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          >
            <MessageCircle className="w-12 h-12 text-black" strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <div className="text-[26px] font-extrabold text-ink leading-tight">New booking</div>
            <div className="text-[14px] text-muted mt-1">
              {source === 'business'
                ? 'A business buyer is contacting you'
                : 'A customer is contacting you'}
            </div>
            <div className="text-[12px] text-muted/70 mt-1">
              They are sending you a WhatsApp message right now
            </div>
          </div>
        </div>

        {/* Primary CTA — open WhatsApp */}
        <button
          type="button"
          onClick={openWhatsApp}
          className="w-full rounded-2xl flex items-center justify-center gap-2.5 active:scale-[0.99] transition"
          style={{
            background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
            color: '#FFFFFF',
            minHeight: 64,
            fontSize: 17,
            fontWeight: 800,
            boxShadow: '0 10px 30px rgba(37,211,102,0.40)',
          }}
        >
          <MessageCircle className="w-5 h-5" strokeWidth={2.5} />
          Open WhatsApp
        </button>

        {/* Secondary — dismiss (still ack'd above).
            Converted from <button onClick={router.push}> to <Link prefetch>
            2026-05 perf pass — the ack already fires in the mount effect
            so we don't need a synchronous handler. Link prefetches
            /dashboard so the back-nav lands instantly. */}
        <Link
          href="/dashboard"
          prefetch
          className="w-full rounded-2xl flex items-center justify-center gap-2 transition active:scale-[0.99]"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: 'rgba(255,255,255,0.75)',
            minHeight: 52,
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {acked ? <Check className="w-4 h-4" style={{ color: '#22C55E' }} /> : <XIcon className="w-4 h-4" />}
          Got it — back to dashboard
        </Link>

        {/* Status line */}
        <div className="text-center text-[12px] text-muted/60">
          {acked ? 'Alert acknowledged' : 'Recording…'}
        </div>

        {error && (
          <div
            className="rounded-xl p-3 flex items-start gap-2 text-[12px] leading-relaxed"
            style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)' }}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
            <span className="text-ink/90">{error}</span>
          </div>
        )}

        <div className="text-center pt-2">
          <Link href="/dashboard" className="text-[12px] text-muted/60 hover:text-ink transition">
            ← Cancel
          </Link>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.06); opacity: 0.92; }
        }
      `}</style>
    </main>
  )
}
