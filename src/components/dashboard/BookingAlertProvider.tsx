'use client'
// ============================================================================
// BookingAlertProvider — provider-side receiver for the WhatsApp intent
// intercept alert. Mounts inside every vertical dashboard's layout
// (/dashboard/car, /dashboard/rider, /dashboard/beautician, /dashboard/
// handyman, /dashboard/laundry, /dashboard/massage, /dashboard/home-
// clean, /dashboard/tour-guide, /dashboard/facial, /dashboard/skincare,
// /dashboard/rentals, /dashboard/property).
//
// Lifecycle:
//   1. Reads the signed-in driver's user_id.
//   2. Registers the service worker + ensures Web Push subscription on
//      first mount (best-effort; user must approve Notifications first).
//   3. Subscribes to Supabase Realtime channel `driver:<id>` event
//      'inbound_intent'. When fired:
//        - plays the looping alert audio (if unlocked)
//        - vibrates (Android only)
//        - mounts the modal popup
//      The driver dismisses or taps "Open WhatsApp" to stop the loop.
//   4. On first mount, if the page hasn't received a user gesture this
//      session, surfaces a small yellow "Tap to enable alerts" card that
//      unlocks audio autoplay + requests Notifications permission on tap.
//
// Browser limits respected:
//   • Audio only plays after user gesture (one-time unlock).
//   • Background audio is killed by browsers; we don't pretend otherwise.
//     If the PWA is backgrounded, the popup is queued; Web Push wakes
//     the driver, and the audio resumes when they foreground the PWA.
//   • Vibration is Android-only; iOS no-ops silently.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { MessageCircle, Bell } from 'lucide-react'

// CityDrivers dashboards where BookingAlertProvider actually belongs.
// The WhatsApp-intent intercept alert is a ride-hail dispatch surface —
// it doesn't make sense on Kita2u creator dashboards (beautician, handyman,
// laundry, massage, home-clean, facial, tour-guide, etc.). Founder audit
// 2026-06-07 flagged this widget as a CityDrivers leak on Kita2u dashboards.
const CITYDRIVERS_DASHBOARD_PREFIXES = [
  '/dashboard/rider',
  '/dashboard/car',
  '/dashboard/truck',
  '/dashboard/bus',
  '/dashboard/jeep',
]
function isOnCityDriversDashboard(pathname: string | null): boolean {
  if (!pathname) return false
  return CITYDRIVERS_DASHBOARD_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

const ALERT_AUDIO_URL  = '/sounds/booking-alert.mp3'
const VIBRATE_PATTERN  = [400, 200, 400, 200, 400]    // 1.6s burst
const VIBRATE_INTERVAL = 2000                          // re-trigger every 2s while popup open
const SESSION_UNLOCK_KEY = 'cr_alert_audio_unlocked_v1'

type InboundIntent = { source: string; at: string }

type Props = {
  driverId: string
}

export default function BookingAlertProvider({ driverId }: Props) {
  const pathname = usePathname()
  // Kita2u creator dashboards: no-op. The component is still mounted by
  // their layouts (preserving the existing import graph) but renders
  // nothing and runs no audio / vibration / Supabase channel.
  if (!isOnCityDriversDashboard(pathname)) return null

  return <BookingAlertInner driverId={driverId} />
}

function BookingAlertInner({ driverId }: Props) {
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const [intent, setIntent]               = useState<InboundIntent | null>(null)
  const [showUnlockCard, setShowUnlockCard] = useState(false)
  const audioRef       = useRef<HTMLAudioElement | null>(null)
  const vibrateTimer   = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Audio element setup ──────────────────────────────────────────────
  useEffect(() => {
    const a = new Audio(ALERT_AUDIO_URL)
    a.loop     = true
    a.preload  = 'auto'
    a.volume   = 0.85
    audioRef.current = a
    return () => {
      try { a.pause() } catch {}
      audioRef.current = null
    }
  }, [])

  // ── Surface unlock card once per session if needed ───────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const unlocked = sessionStorage.getItem(SESSION_UNLOCK_KEY) === '1'
      setAudioUnlocked(unlocked)
      setShowUnlockCard(!unlocked)
    } catch {
      setShowUnlockCard(true)
    }
  }, [])

  const unlockAudio = useCallback(async () => {
    const a = audioRef.current
    if (!a) return
    try {
      a.muted = true
      await a.play()
      a.pause()
      a.currentTime = 0
      a.muted = false
      setAudioUnlocked(true)
      try { sessionStorage.setItem(SESSION_UNLOCK_KEY, '1') } catch {}
    } catch {
      // Some browsers still block — leave the card up.
      return
    }
    setShowUnlockCard(false)
    // Best-effort: also ask for Notifications + subscribe to push now.
    void requestNotificationsAndSubscribe(driverId)
  }, [driverId])

  // ── Realtime subscription ────────────────────────────────────────────
  useEffect(() => {
    if (!driverId) return
    const supabase = getBrowserSupabase()
    if (!supabase) return
    const channel = supabase.channel(`driver:${driverId}`)
    channel
      .on('broadcast', { event: 'inbound_intent' }, ({ payload }) => {
        setIntent({
          source: typeof payload?.source === 'string' ? payload.source : 'other',
          at:     typeof payload?.at === 'string' ? payload.at : new Date().toISOString(),
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [driverId])

  // ── When intent fires: play audio + vibrate ──────────────────────────
  useEffect(() => {
    if (!intent) return
    const a = audioRef.current
    if (a && audioUnlocked) {
      try {
        a.currentTime = 0
        void a.play()
      } catch {}
    }
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try { navigator.vibrate(VIBRATE_PATTERN) } catch {}
      vibrateTimer.current = setInterval(() => {
        try { navigator.vibrate(VIBRATE_PATTERN) } catch {}
      }, VIBRATE_INTERVAL)
    }
    return () => {
      try { a?.pause() } catch {}
      if (a) a.currentTime = 0
      if (vibrateTimer.current) {
        clearInterval(vibrateTimer.current)
        vibrateTimer.current = null
      }
      try { navigator.vibrate?.(0) } catch {}
    }
  }, [intent, audioUnlocked])

  const dismiss = useCallback(() => setIntent(null), [])

  return (
    <>
      {showUnlockCard && <UnlockCard onTap={unlockAudio} />}
      {intent && <IntentPopup onDismiss={dismiss} />}
    </>
  )
}

// ============================================================================
// Unlock card — yellow, persistent until tapped. Once tapped, audio is
// unlocked for the session AND Notification permission is requested.
// ============================================================================
function UnlockCard({ onTap }: { onTap: () => void }) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="fixed left-3 right-3 z-[60] mx-auto flex items-center gap-3 rounded-2xl px-4 py-3 active:scale-[0.99] transition"
      style={{
        bottom:          'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        maxWidth:        '460px',
        background:      '#FACC15',
        color:           '#0A0A0A',
        boxShadow:       '0 12px 28px rgba(250,204,21,0.55)',
        border:          '2px solid #0A0A0A',
      }}
    >
      <span
        className="shrink-0 w-9 h-9 rounded-full inline-flex items-center justify-center"
        style={{ background: '#0A0A0A', color: '#FACC15' }}
      >
        <Bell className="w-4 h-4" strokeWidth={3} />
      </span>
      <span className="flex-1 text-left">
        <span className="block text-[13px] font-black leading-tight">Enable booking alerts</span>
        <span className="block text-[11.5px] font-bold opacity-80 leading-tight mt-0.5">
          Tap so we can ring + vibrate when a customer wants to message you.
        </span>
      </span>
    </button>
  )
}

// ============================================================================
// Intent popup — full-screen yellow/charcoal modal with pulse + ONE
// big "You have a WhatsApp message" button. Tap stops the music and
// closes the popup. Provider then checks their WhatsApp.
//
// No Open/Decline split — that pattern would turn the platform into a
// dispatch system (regulatory issue for ride drivers, complexity bloat
// for service providers).
// ============================================================================
function IntentPopup({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center px-4"
      style={{ background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(4px)' }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="cr-alert-title"
    >
      <div
        className="relative w-full max-w-[420px] rounded-3xl p-6 sm:p-7 text-center"
        style={{
          background: 'linear-gradient(180deg, #FACC15 0%, #EAB308 100%)',
          color:      '#0A0A0A',
          border:     '3px solid #0A0A0A',
          boxShadow:  '0 24px 64px rgba(0,0,0,0.55)',
          animation:  'cr-pulse 1.2s ease-in-out infinite',
        }}
      >
        <div
          className="mx-auto w-16 h-16 rounded-full inline-flex items-center justify-center"
          style={{ background: '#0A0A0A', color: '#FACC15' }}
        >
          <MessageCircle className="w-8 h-8" strokeWidth={2.5} />
        </div>

        <h2 id="cr-alert-title" className="mt-4 text-[22px] font-black leading-tight">
          Pesan WhatsApp baru
        </h2>
        <p className="mt-2 text-[13px] font-bold leading-snug" style={{ color: '#1f1f1f' }}>
          Ada pelanggan baru saja menekan tombol WhatsApp Anda. Pesannya akan
          segera masuk ke WhatsApp Anda.
        </p>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-2xl font-extrabold uppercase tracking-wider active:scale-[0.99] transition"
          style={{
            minHeight:  64,
            background: '#0A0A0A',
            color:      '#FACC15',
            fontSize:   15,
            boxShadow:  '0 8px 18px rgba(0,0,0,0.25)',
          }}
        >
          OK · Hentikan alarm
        </button>
        <p className="mt-3 text-[11px] font-bold leading-snug" style={{ color: '#1f1f1f', opacity: 0.75 }}>
          Tekan untuk menghentikan suara. Lalu buka WhatsApp untuk membalas.
        </p>
      </div>

      <style jsx>{`
        @keyframes cr-pulse {
          0%, 100% { transform: scale(1);    box-shadow: 0 24px 64px rgba(0,0,0,0.55), 0 0 0 0   rgba(250,204,21,0.65); }
          50%      { transform: scale(1.02); box-shadow: 0 24px 64px rgba(0,0,0,0.55), 0 0 0 18px rgba(250,204,21,0.00); }
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// Push subscription helper — registers SW, asks for Notifications, fetches
// VAPID public key from /api/dashboard/push/subscribe (GET), subscribes
// via PushManager, then POSTs the subscription back.
// ============================================================================
async function requestNotificationsAndSubscribe(driverId: string): Promise<void> {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
  if (!('Notification' in window)) return
  try {
    const perm = Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission
    if (perm !== 'granted') return

    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    const meta = await fetch('/api/dashboard/push/subscribe').then((r) => r.ok ? r.json() : null)
    const vapidPublic: string | undefined = meta?.vapid_public
    if (!vapidPublic) return

    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublic) as BufferSource,
      })
    }
    const json = sub.toJSON()
    await fetch('/api/dashboard/push/subscribe', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        driver_id: driverId,
        endpoint:  json.endpoint,
        p256dh:    json.keys?.p256dh,
        auth_key:  json.keys?.auth,
      }),
    })
  } catch {
    // best-effort
  }
}

function urlBase64ToUint8Array(s: string): Uint8Array {
  const padded = s + '='.repeat((4 - (s.length % 4)) % 4)
  const b64    = padded.replace(/-/g, '+').replace(/_/g, '/')
  const raw    = atob(b64)
  const out    = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}
