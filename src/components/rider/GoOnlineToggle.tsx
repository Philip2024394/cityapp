'use client'
import { useEffect, useState } from 'react'
import { Power, X as XIcon, MapPin, ExternalLink } from 'lucide-react'
import { useHaptic } from '@/hooks/useHaptic'
import { useDriverLocationPing, type DriverLocationPingState } from '@/hooks/useDriverLocationPing'
import { useWakeLock } from '@/hooks/useWakeLock'
import { isNative } from '@/lib/capacitor/isNative'
import { startNativeBackgroundPing, stopNativeBackgroundPing } from '@/lib/capacitor/locationBridge'
import {
  maybePromptBatteryOpt,
  acceptBatteryOptPrompt,
  dismissBatteryOptPrompt,
} from '@/lib/capacitor/batteryOptPrompt'
import BatteryOptPromptModal from './BatteryOptPromptModal'

// Simple online/offline toggle. The driver decides when they're working
// by tapping the button — no shift duration picker, no auto-expiry.
//
// Critical UX rules baked in (per 2026-05 audit):
//   1. Server is the source of truth. UI optimistically flips, but on
//      fetch failure we ROLLBACK and surface a retry pill — never lie
//      that the driver is online when the DB still says offline.
//   2. Before triggering the native background-location OS prompt, we
//      show an in-app Bahasa disclosure modal explaining what + why
//      (required by Google Play "prominent disclosure" — #1 cause of
//      delivery-app rejections). Consent persisted in localStorage.
//   3. GPS-denied isn't a dead end: we replace the toggle CTA with a
//      recovery card that links to phone settings.

type Props = {
  defaultOnline?: boolean
  onChange?: (online: boolean) => void
}

const CONSENT_KEY = 'cr.bg-location.consent.v1'

function readConsent(): boolean {
  if (typeof window === 'undefined') return false
  try { return window.localStorage.getItem(CONSENT_KEY) === '1' } catch { return false }
}

function persistConsent() {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(CONSENT_KEY, '1') } catch { /* ignore */ }
}

export default function GoOnlineToggle({ defaultOnline = false, onChange }: Props) {
  const [online, setOnline] = useState(defaultOnline)
  const [pending, setPending] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [showDisclosure, setShowDisclosure] = useState(false)
  const [showBatteryOpt, setShowBatteryOpt] = useState(false)
  const [ping, setPing] = useState<DriverLocationPingState>({
    status: 'idle', lastSentAt: null, lastError: null,
  })
  const haptic = useHaptic()

  // Live location loop — only runs while the toggle is online.
  useDriverLocationPing(online, { onStatus: setPing })
  // Wake Lock — keep the screen on while online so the location watcher
  // doesn't get killed by OS screen sleep.
  useWakeLock(online)

  useEffect(() => {
    setOnline(defaultOnline)
  }, [defaultOnline])

  async function postAvailability(state: 'online' | 'offline'): Promise<boolean> {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    try {
      const res = await fetch('/api/drivers/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: state }),
        signal: ctrl.signal,
      })
      return res.ok
    } catch {
      return false
    } finally {
      clearTimeout(timer)
    }
  }

  async function commitOnline() {
    // 1. Optimistic flip + haptic
    setOnline(true)
    setSyncError(null)
    setPending(true)
    haptic.impact()

    // 2. Native background ping (after consent persisted at modal accept time)
    if (isNative()) {
      void startNativeBackgroundPing()
    }

    // 3. Server commit — rollback on failure
    const ok = await postAvailability('online')
    setPending(false)
    if (!ok) {
      setOnline(false)
      setSyncError('Gagal sinkron ke server. Tap ulang untuk coba lagi.')
      if (isNative()) void stopNativeBackgroundPing()
      onChange?.(false)
      return
    }
    onChange?.(true)

    // 4. Battery-optimization prompt (Android only, once per device).
    // Fired AFTER the successful handshake so we don't ask drivers who
    // can't even reach the server — and so the explainer lands on a
    // happy-path moment ("you're online — here's how to STAY online").
    if (isNative()) {
      try {
        const shouldPrompt = await maybePromptBatteryOpt()
        if (shouldPrompt) setShowBatteryOpt(true)
      } catch {
        /* prompt is best-effort — never block the online flow */
      }
    }
  }

  async function goOnline() {
    // On native + first-time, gate behind the disclosure modal.
    if (isNative() && !readConsent()) {
      setShowDisclosure(true)
      return
    }
    await commitOnline()
  }

  async function goOffline() {
    setOnline(false)
    setSyncError(null)
    setPending(true)
    haptic.impact()
    if (isNative()) {
      void stopNativeBackgroundPing()
    }
    const ok = await postAvailability('offline')
    setPending(false)
    if (!ok) {
      // Rollback — server still thinks we're online, UI should match
      setOnline(true)
      setSyncError('Gagal sinkron ke server. Tap ulang untuk pergi offline.')
      onChange?.(true)
      return
    }
    onChange?.(false)
  }

  function onPress() {
    if (pending) return  // idempotent — ignore double-tap
    if (online) {
      void goOffline()
    } else {
      void goOnline()
    }
  }

  function onAcceptDisclosure() {
    persistConsent()
    setShowDisclosure(false)
    void commitOnline()
  }

  function onAcceptBatteryOpt() {
    setShowBatteryOpt(false)
    void acceptBatteryOptPrompt()
  }

  function onDismissBatteryOpt() {
    setShowBatteryOpt(false)
    void dismissBatteryOptPrompt()
  }

  // GPS denied — recovery path instead of a dead-end "tap to activate"
  const gpsDenied = online && ping.status === 'denied'

  const gpsHint = (() => {
    if (syncError) return syncError
    if (!online) return 'Lokasi GPS akan aktif saat online'
    if (ping.status === 'denied') return 'Izin lokasi diblokir — aktifkan di pengaturan'
    if (ping.status === 'unavailable') return 'GPS tidak tersedia di device ini'
    if (ping.status === 'requesting') return 'Mencari lokasi…'
    if (ping.lastSentAt) {
      const ageS = Math.max(0, Math.round((Date.now() - ping.lastSentAt) / 1000))
      return `Live · update terakhir ${ageS < 5 ? 'baru saja' : `${ageS} detik lalu`}`
    }
    return 'Update lokasi setiap 30 detik'
  })()

  return (
    <>
      <div className="card p-5 relative overflow-hidden">
        <div
          className="absolute inset-0 transition-opacity duration-500 pointer-events-none"
          style={{
            opacity: online && !syncError ? 1 : 0,
            background: 'radial-gradient(ellipse at center, rgba(34,197,94,0.18) 0%, transparent 60%)',
          }}
        />
        <div className="relative flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={online && !syncError ? 'dot-online' : 'dot-offline'} />
              <span className="text-[14px] font-extrabold tracking-wider uppercase text-muted">
                {online && !syncError ? 'Online — customer bisa lihat kamu' : 'Offline'}
              </span>
            </div>
            <div className="text-xl font-extrabold mt-1.5">
              {pending
                ? 'Menyinkron…'
                : online && !syncError
                  ? 'Kamu tampil di marketplace'
                  : 'Tap untuk mulai terima order'}
            </div>
            <div
              className="text-[14px] mt-1 leading-snug"
              style={{ color: syncError ? '#FCA5A5' : 'rgba(255,255,255,0.55)' }}
            >
              {gpsHint}
            </div>
          </div>

          <button
            onClick={onPress}
            disabled={pending}
            className="shrink-0 relative disabled:opacity-70"
            aria-label={online ? 'Pergi offline' : 'Pergi online'}
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center font-extrabold transition-all"
              style={{
                background: online && !syncError
                  ? 'linear-gradient(135deg, #22C55E, #16A34A)'    // fresh green
                  : 'linear-gradient(135deg, #B91C1C, #7F1D1D)',   // dark red
                boxShadow: online && !syncError
                  ? '0 0 28px rgba(34,197,94,0.55)'
                  : '0 0 22px rgba(185,28,28,0.45)',
                color: '#ffffff',
                minWidth: 80,
                minHeight: 80,
              }}
            >
              <Power className="w-7 h-7" strokeWidth={3} />
            </div>
          </button>
        </div>

        {/* GPS denied — explicit recovery card replacing the dead-end hint */}
        {gpsDenied && (
          <div
            className="relative mt-4 rounded-2xl p-4"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.32)',
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.18)' }}
              >
                <MapPin className="w-4 h-4" style={{ color: '#FCA5A5' }} strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-extrabold leading-snug" style={{ color: '#FCA5A5' }}>
                  Izin lokasi diblokir
                </div>
                <p className="text-[14px] text-muted leading-relaxed mt-1">
                  Customer tidak bisa lihat posisimu sampai izin lokasi diaktifkan.
                  Buka pengaturan browser/HP → izinkan lokasi untuk cityriders.id.
                </p>
                <a
                  href="https://support.google.com/chrome/answer/142065"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 text-[14px] font-extrabold text-brand hover:underline"
                >
                  Panduan aktifkan lokasi
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Native background-location disclosure modal — Google Play prominent
          disclosure requirement. Shown ONCE per device before native ping. */}
      {showDisclosure && (
        <BackgroundLocationDisclosure
          onAccept={onAcceptDisclosure}
          onDismiss={() => setShowDisclosure(false)}
        />
      )}

      {/* Battery-optimization whitelist modal — Android only, shown ONCE
          per device on first successful "Go Online" handshake. */}
      {showBatteryOpt && (
        <BatteryOptPromptModal
          onAccept={onAcceptBatteryOpt}
          onDismiss={onDismissBatteryOpt}
        />
      )}
    </>
  )
}

function BackgroundLocationDisclosure({
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
        aria-label="Izin lokasi latar belakang"
        className="fixed left-0 right-0 bottom-0 z-[90] pb-safe animate-[fadeUp_0.22s_ease-out]"
      >
        <div
          className="mx-auto max-w-md w-full"
          style={{
            background: '#0A0A0A',
            borderTop: '1px solid rgba(250,204,21,0.40)',
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
              <MapPin className="w-5 h-5 text-bg" strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[18px] font-extrabold leading-tight">
                Lokasi kamu saat online
              </h2>
              <p className="text-[14px] text-muted leading-snug mt-1">
                City Rider butuh izin lokasi sekali saja untuk bisa kerja.
              </p>
            </div>
            <button
              onClick={onDismiss}
              aria-label="Tutup"
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-muted hover:text-ink transition"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
            >
              <XIcon className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>

          <div className="px-5 pb-4 space-y-3 text-[14px] text-ink/90 leading-relaxed">
            <p>
              Saat kamu <strong>Online</strong>, posisimu dikirim ke marketplace
              setiap 30 detik supaya customer bisa lihat kamu di peta dan kontak
              kamu langsung.
            </p>
            <p>
              Lokasi diakses <strong>walau aplikasi tertutup atau layar terkunci</strong> —
              ini supaya kamu tetap muncul di marketplace meskipun lagi naik motor
              tanpa buka HP.
            </p>
            <ul className="space-y-1.5 text-[13px] text-muted">
              <li>✓ Hanya saat kamu <strong>Online</strong> — tap Offline untuk berhenti</li>
              <li>✓ Tidak disimpan sebagai riwayat perjalanan</li>
              <li>✓ Tidak dibagikan ke pihak ketiga</li>
            </ul>
          </div>

          <div className="px-5 pb-5 grid grid-cols-1 gap-2">
            <button
              onClick={onAccept}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-brand to-brand2 text-bg font-extrabold text-[14px] uppercase tracking-wider border border-black/85 active:scale-[0.99]"
              style={{ minHeight: 52 }}
            >
              Lanjut & aktifkan lokasi
            </button>
            <button
              onClick={onDismiss}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-transparent text-muted font-extrabold text-[14px] uppercase tracking-wider border border-white/10 active:scale-[0.99]"
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
