'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MapPin, X } from 'lucide-react'
import { logNav } from '@/lib/perf/navTiming'

// ============================================================================
// LocationPermissionPrompt — warm-up modal shown when a first-time customer
// taps the "Enter App" CTA on the landing screen.
// ----------------------------------------------------------------------------
// Purpose:
//   - Soft-prime the OS location prompt with our own friendly explanation
//     before the browser-native permission dialog appears (industry best
//     practice — boosts grant rate vs cold prompts).
//   - Two paths, both terminate in onComplete() so the caller can route
//     the customer onward to /explore:
//       1. "Use my GPS"   → triggers navigator.geolocation.getCurrentPosition()
//                            → on success: cache coords in localStorage so
//                              every subsequent surface (cari, places, cart)
//                              picks them up without re-prompting.
//                            → on denied: surface inline error, allow Skip.
//       2. "Skip for now" → sets a localStorage flag noting the customer
//                            chose not to share. Subsequent surfaces fall
//                            back to manual entry / typed addresses.
//   - Compliance: stays on-device. We never POST these coords to any
//     IndoCity endpoint. The cache TTL (30 days) ensures we don't keep
//     stale location indefinitely; afterward the prompt re-appears.
// ============================================================================

export const LOCATION_CACHE_KEY = 'indocity:location:v1'
export const LOCATION_PROMPTED_KEY = 'indocity:location-prompted'
export const LOCATION_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000  // 30 days

export type CachedLocation = {
  lat: number
  lng: number
  savedAt: number
}

export function readCachedLocation(): CachedLocation | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LOCATION_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CachedLocation>
    if (typeof parsed.lat !== 'number' || typeof parsed.lng !== 'number' || typeof parsed.savedAt !== 'number') {
      return null
    }
    if (Date.now() - parsed.savedAt > LOCATION_CACHE_TTL_MS) return null
    return { lat: parsed.lat, lng: parsed.lng, savedAt: parsed.savedAt }
  } catch {
    return null
  }
}

export function writeCachedLocation(lat: number, lng: number): void {
  if (typeof window === 'undefined') return
  try {
    const payload: CachedLocation = { lat, lng, savedAt: Date.now() }
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(payload))
  } catch {
    /* swallow — quota / disabled storage */
  }
}

type Props = {
  open: boolean
  onComplete: () => void
}

export default function LocationPermissionPrompt({ open, onComplete }: Props) {
  const [requesting, setRequesting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const completedRef = useRef(false)

  // Reset transient state every time the modal opens.
  useEffect(() => {
    if (open) {
      completedRef.current = false
      setRequesting(false)
      setErrorMsg(null)
    }
  }, [open])

  const handleComplete = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true
    onComplete()
  }, [onComplete])

  const handleSkip = useCallback(() => {
    try {
      localStorage.setItem(LOCATION_PROMPTED_KEY, 'skipped')
    } catch { /* swallow */ }
    logNav('location-prompt:skipped')
    handleComplete()
  }, [handleComplete])

  const handleClose = useCallback(() => {
    // Closing the modal is treated as a skip — same downstream behaviour.
    try {
      localStorage.setItem(LOCATION_PROMPTED_KEY, 'skipped')
    } catch { /* swallow */ }
    logNav('location-prompt:skipped')
    handleComplete()
  }, [handleComplete])

  const handleUseGps = useCallback(() => {
    setErrorMsg(null)
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setErrorMsg('Geolocation is not supported on this device.')
      logNav('location-prompt:denied')
      return
    }
    setRequesting(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        writeCachedLocation(pos.coords.latitude, pos.coords.longitude)
        try {
          localStorage.setItem(LOCATION_PROMPTED_KEY, 'granted')
        } catch { /* swallow */ }
        setRequesting(false)
        logNav('location-prompt:granted')
        handleComplete()
      },
      (err) => {
        setRequesting(false)
        setErrorMsg(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was blocked. You can still skip and enter addresses manually.'
            : 'Could not read your location. Try again or skip for now.',
        )
        try {
          localStorage.setItem(LOCATION_PROMPTED_KEY, 'denied')
        } catch { /* swallow */ }
        logNav('location-prompt:denied')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    )
  }, [handleComplete])

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, handleClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-prompt-title"
    >
      {/* Backdrop — tapping it is treated as a skip-close. */}
      <button
        type="button"
        aria-label="Close"
        onClick={handleClose}
        className="absolute inset-0 bg-black/60"
      />

      {/* Sheet — bottom-sheet on mobile, centered card on >= sm. */}
      <div
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl px-5 pt-6 pb-6 sm:pb-7 animate-[slideUp_0.25s_ease-out] border-2 border-[#FACC15]"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)',
        }}
      >
        {/* Close (X) — also treated as skip per founder direction. */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="absolute top-3 right-3 w-11 h-11 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 active:scale-95 transition"
        >
          <X className="w-5 h-5" strokeWidth={2.5} />
        </button>

        {/* Drag handle hint (visible only on mobile bottom-sheet form). */}
        <div className="sm:hidden mx-auto mb-3 h-1.5 w-12 rounded-full bg-gray-200" aria-hidden />

        {/* Header icon */}
        <div className="flex justify-center mb-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: '#FACC15' }}
            aria-hidden
          >
            <MapPin className="w-8 h-8 text-[#0F172A]" strokeWidth={2.5} />
          </div>
        </div>

        <h2
          id="location-prompt-title"
          className="text-center text-[18px] font-extrabold text-[#0F172A] leading-snug"
        >
          Set your location
        </h2>
        <p className="mt-2 text-center text-[13px] font-medium text-gray-600 leading-relaxed">
          See distances, prices, and nearby drivers across Kita2u.
        </p>

        {errorMsg && (
          <p
            role="alert"
            className="mt-3 text-center text-[13px] font-semibold text-red-600 bg-red-50 rounded-xl px-3 py-2"
          >
            {errorMsg}
          </p>
        )}

        {/* Buttons stacked */}
        <div className="mt-5 space-y-2.5">
          <button
            type="button"
            onClick={handleUseGps}
            disabled={requesting}
            className="w-full min-h-[48px] rounded-2xl px-4 bg-[#FACC15] text-[#0F172A] font-extrabold text-[14px] hover:bg-[#FBBF24] active:scale-[0.99] transition shadow-[0_6px_18px_rgba(250,204,21,0.30)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {requesting ? 'Locating…' : 'Use my GPS'}
          </button>

          <button
            type="button"
            onClick={handleSkip}
            className="w-full min-h-[48px] rounded-2xl px-4 bg-gray-100 text-gray-700 font-bold text-[13px] hover:bg-gray-200 active:scale-[0.99] transition"
          >
            Skip for now
          </button>
        </div>

        {/* Compliance line */}
        <p className="mt-4 text-center text-[11px] font-semibold text-gray-500 leading-relaxed">
          We never share your location. Stored on your device only.
        </p>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(24px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
