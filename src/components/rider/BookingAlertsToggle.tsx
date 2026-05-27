'use client'
import { useEffect, useState } from 'react'
import { Bell, Loader2, AlertCircle, CheckCircle2, Smartphone, X as XIcon } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { isNative } from '@/lib/capacitor/isNative'
import { ensureNativePushRegistered } from '@/lib/notify/registerNativePush'
import { useHaptic } from '@/hooks/useHaptic'

// Pre-prompt rationale persistence (Play Store best practice 2024+:
// always explain WHY before triggering the OS permission dialog).
const PUSH_RATIONALE_KEY = 'cr.push-rationale.consent.v1'
function readPushRationaleConsent(): boolean {
  if (typeof window === 'undefined') return false
  try { return window.localStorage.getItem(PUSH_RATIONALE_KEY) === '1' } catch { return false }
}
function persistPushRationaleConsent() {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(PUSH_RATIONALE_KEY, '1') } catch { /* ignore */ }
}

// ============================================================================
// BookingAlertsToggle — driver dashboard toggle:
//   "Loud booking alerts"
//
// On enable (one tap):
//   • OS permission dialog (Android 13+ / iOS) via @capacitor/push-notifications
//   • FCM token registered to /api/drivers/me/push-token
//   • Consent flag saved to /api/drivers/me/booking-alerts-consent
//   • Driver hears 10-second loud "booking" sound on every customer Contact tap
//
// On disable:
//   • Consent flag cleared (push helper skips delivery even if tokens persist)
//   • Tokens NOT deleted — re-enable restores instantly
//
// Web users (PWA without native app): button shows "Install Android app" call
// to action instead. Browser push exists but cannot play loud 10-second
// sounds — honest UX rather than a half-working setting.
// ============================================================================

export default function BookingAlertsToggle() {
  const haptic = useHaptic()
  const [enabled, setEnabled] = useState(false)
  const [pending, setPending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showRationale, setShowRationale] = useState(false)
  const native = isNative()

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('drivers')
        .select('booking_alerts_enabled')
        .eq('user_id', user.id)
        .maybeSingle()
      if (cancelled) return
      const row = data as { booking_alerts_enabled?: boolean } | null
      setEnabled(!!row?.booking_alerts_enabled)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  async function performToggle(next: boolean) {
    setError(null)
    setPending(true)
    try {
      // ENABLE path — register native push token FIRST so a failure
      // doesn't leave consent=true with no delivery channel.
      if (next && native) {
        const r = await ensureNativePushRegistered()
        if (!r.ok) {
          if (r.reason === 'permission_denied') {
            setError('Izin notifikasi ditolak — aktifkan di Settings → Apps → IndoCity → Notifications, lalu coba lagi')
          } else {
            setError('Tidak bisa daftarkan device — coba lagi')
          }
          setPending(false)
          return
        }
      }

      const res = await fetch('/api/drivers/me/booking-alerts-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setError(json.error || `Gagal (${res.status})`); return }
      setEnabled(next)
      haptic.impact()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setPending(false)
    }
  }

  async function toggle() {
    haptic.tap()
    const next = !enabled
    // First-time native enable → show in-app rationale BEFORE the OS prompt
    // fires (Play Store best practice — disclosure → prompt → action).
    if (next && native && !readPushRationaleConsent()) {
      setShowRationale(true)
      return
    }
    await performToggle(next)
  }

  function onAcceptRationale() {
    persistPushRationaleConsent()
    setShowRationale(false)
    void performToggle(true)
  }

  if (loading) {
    return <div className="rounded-3xl bg-gray-100 border border-gray-200 shadow-sm h-24 shimmer" />
  }

  return (
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className="w-full rounded-3xl bg-gray-100 border border-gray-200 shadow-sm p-4 flex items-center gap-3 text-left transition active:scale-[0.99] disabled:opacity-60"
        style={{
          borderColor: enabled ? 'rgba(250,204,21,0.35)' : undefined,
          background: enabled ? 'rgba(250,204,21,0.05)' : undefined,
          minHeight: 64,
        }}
      >
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: enabled ? 'rgba(250,204,21,0.18)' : 'rgba(15,23,42,0.05)',
            border: `1px solid ${enabled ? 'rgba(250,204,21,0.35)' : 'rgba(15,23,42,0.10)'}`,
            color: enabled ? '#CA8A04' : '#6B7280',
          }}
        >
          <Bell className="w-5 h-5" strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-[14px] text-[#0F172A]">
            Loud booking alerts
          </div>
          <div className="text-[12px] text-gray-600 mt-0.5 leading-relaxed">
            {enabled
              ? 'On — your phone will play a 10-second loud sound the instant a customer taps Contact'
              : 'Off — get an unmissable 10-second sound the instant a customer wants to book you'}
          </div>
        </div>
        <div
          className="w-12 h-7 rounded-full p-0.5 transition shrink-0"
          style={{ background: enabled ? '#22C55E' : 'rgba(15,23,42,0.15)' }}
        >
          <div
            className="w-6 h-6 rounded-full bg-white transition-transform flex items-center justify-center shadow-sm"
            style={{ transform: enabled ? 'translateX(20px)' : 'translateX(0)' }}
          >
            {pending && <Loader2 className="w-3.5 h-3.5 text-gray-600 animate-spin" />}
          </div>
        </div>
      </button>

      {enabled && native && (
        <div
          className="rounded-3xl bg-gray-100 border border-gray-200 shadow-sm p-3 flex items-center gap-3 text-[12px] text-[#0F172A]"
          style={{ borderColor: 'rgba(34,197,94,0.30)', background: 'rgba(34,197,94,0.06)' }}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#16A34A' }} />
          <div className="flex-1 min-w-0 leading-relaxed">
            Booking alerts active. Keep our app installed and notifications enabled to never miss a job.
          </div>
        </div>
      )}

      {!native && (
        <div
          className="rounded-3xl bg-gray-100 border border-gray-200 shadow-sm p-3 flex items-center gap-3 text-[12px] text-[#0F172A]"
          style={{ borderColor: 'rgba(96,165,250,0.30)', background: 'rgba(96,165,250,0.06)' }}
        >
          <Smartphone className="w-4 h-4 shrink-0" style={{ color: '#2563EB' }} />
          <div className="flex-1 min-w-0 leading-relaxed">
            Loud alerts require the IndoCity Android app. Install from Google Play for the 10-second booking sound.
          </div>
        </div>
      )}

      {error && (
        <div
          className="rounded-xl p-3 flex items-start gap-2 text-[12px] leading-relaxed"
          style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)' }}
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#DC2626' }} />
          <span className="text-[#0F172A]">{error}</span>
        </div>
      )}

      {showRationale && (
        <PushNotificationRationale
          onAccept={onAcceptRationale}
          onDismiss={() => setShowRationale(false)}
        />
      )}
    </div>
  )
}

function PushNotificationRationale({
  onAccept, onDismiss,
}: {
  onAccept: () => void
  onDismiss: () => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onDismiss() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onDismiss])

  return (
    <>
      <div
        onClick={onDismiss}
        aria-hidden
        className="fixed inset-0 z-[80]"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(2px)' }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Izin notifikasi"
        className="fixed left-0 right-0 bottom-0 z-[90] pb-safe animate-[fadeUp_0.22s_ease-out]"
      >
        <div
          className="mx-auto max-w-md w-full bg-gray-100 border-t border-gray-200"
          style={{
            borderTopColor: 'rgba(250,204,21,0.40)',
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            boxShadow: '0 -20px 60px rgba(0,0,0,0.55)',
          }}
        >
          <div className="px-5 pt-5 pb-3 flex items-start gap-3">
            <div
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #FACC15, #EAB308)' }}
            >
              <Bell className="w-5 h-5 text-[#0F172A]" strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[18px] font-extrabold leading-tight text-[#0F172A]">
                Bunyi keras saat ada customer
              </h2>
              <p className="text-[14px] text-gray-600 leading-snug mt-1">
                Aktifkan supaya kamu tidak ketinggalan booking.
              </p>
            </div>
            <button
              onClick={onDismiss}
              aria-label="Tutup"
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-gray-600 hover:text-[#0F172A] transition bg-gray-50 border border-gray-200"
            >
              <XIcon className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>

          <div className="px-5 pb-4 space-y-3 text-[14px] text-[#0F172A] leading-relaxed">
            <p>
              IndoCity butuh izin notifikasi sekali saja supaya HP-mu bisa
              <strong> bunyi keras 10 detik</strong> setiap kali customer tap
              tombol Contact — walaupun HP-mu lagi terkunci.
            </p>
            <ul className="space-y-1.5 text-[13px] text-gray-600">
              <li>✓ Cuma saat ada customer baru — bukan iklan</li>
              <li>✓ Bisa di-mute kapan saja dari Settings HP</li>
              <li>✓ Tidak ada notifikasi marketing dari kami</li>
            </ul>
          </div>

          <div className="px-5 pb-5 grid grid-cols-1 gap-2">
            <button
              onClick={onAccept}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-brand to-brand2 text-[#0F172A] font-extrabold text-[14px] uppercase tracking-wider border border-black/85 active:scale-[0.99]"
              style={{ minHeight: 52 }}
            >
              Lanjut & izinkan notifikasi
            </button>
            <button
              onClick={onDismiss}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-transparent text-gray-600 font-extrabold text-[14px] uppercase tracking-wider border border-gray-200 active:scale-[0.99]"
              style={{ minHeight: 52 }}
            >
              Tidak sekarang
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
