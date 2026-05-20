'use client'
import { useEffect, useState } from 'react'
import { Bell, Loader2, AlertCircle, CheckCircle2, Smartphone } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { isNative } from '@/lib/capacitor/isNative'
import { ensureNativePushRegistered } from '@/lib/notify/registerNativePush'
import { useHaptic } from '@/hooks/useHaptic'

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

  async function toggle() {
    setError(null)
    haptic.tap()
    setPending(true)
    const next = !enabled
    try {
      // ENABLE path — register native push token FIRST so a failure
      // doesn't leave consent=true with no delivery channel.
      if (next && native) {
        const r = await ensureNativePushRegistered()
        if (!r.ok) {
          if (r.reason === 'permission_denied') {
            setError('Notification permission denied — enable in phone Settings → Apps → City Rider → Notifications, then try again')
          } else {
            setError('Could not register this device — try again')
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
      if (!res.ok) { setError(json.error || `Failed (${res.status})`); return }
      setEnabled(next)
      haptic.impact()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setPending(false)
    }
  }

  if (loading) {
    return <div className="card-dark h-24 shimmer" />
  }

  return (
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className="w-full card-dark p-4 flex items-center gap-3 text-left transition active:scale-[0.99] disabled:opacity-60"
        style={{
          borderColor: enabled ? 'rgba(250,204,21,0.35)' : 'rgba(255,255,255,0.08)',
          background: enabled ? 'rgba(250,204,21,0.05)' : undefined,
          minHeight: 64,
        }}
      >
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: enabled ? 'rgba(250,204,21,0.18)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${enabled ? 'rgba(250,204,21,0.35)' : 'rgba(255,255,255,0.10)'}`,
            color: enabled ? '#FACC15' : 'rgba(255,255,255,0.55)',
          }}
        >
          <Bell className="w-5 h-5" strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-[14px]">
            Loud booking alerts
          </div>
          <div className="text-[12px] text-muted mt-0.5 leading-relaxed">
            {enabled
              ? 'On — your phone will play a 10-second loud sound the instant a customer taps Contact'
              : 'Off — get an unmissable 10-second sound the instant a customer wants to book you'}
          </div>
        </div>
        <div
          className="w-12 h-7 rounded-full p-0.5 transition shrink-0"
          style={{ background: enabled ? '#22C55E' : 'rgba(255,255,255,0.12)' }}
        >
          <div
            className="w-6 h-6 rounded-full bg-white transition-transform flex items-center justify-center"
            style={{ transform: enabled ? 'translateX(20px)' : 'translateX(0)' }}
          >
            {pending && <Loader2 className="w-3.5 h-3.5 text-muted animate-spin" />}
          </div>
        </div>
      </button>

      {enabled && native && (
        <div
          className="card-dark p-3 flex items-center gap-3 text-[12px]"
          style={{ borderColor: 'rgba(34,197,94,0.30)', background: 'rgba(34,197,94,0.06)' }}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#22C55E' }} />
          <div className="flex-1 min-w-0 leading-relaxed">
            Booking alerts active. Keep our app installed and notifications enabled to never miss a job.
          </div>
        </div>
      )}

      {!native && (
        <div
          className="card-dark p-3 flex items-center gap-3 text-[12px]"
          style={{ borderColor: 'rgba(96,165,250,0.30)', background: 'rgba(96,165,250,0.06)' }}
        >
          <Smartphone className="w-4 h-4 shrink-0" style={{ color: '#60A5FA' }} />
          <div className="flex-1 min-w-0 leading-relaxed">
            Loud alerts require the City Rider Android app. Install from Google Play for the 10-second booking sound.
          </div>
        </div>
      )}

      {error && (
        <div
          className="rounded-xl p-3 flex items-start gap-2 text-[12px] leading-relaxed"
          style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)' }}
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
          <span className="text-ink/90">{error}</span>
        </div>
      )}
    </div>
  )
}
