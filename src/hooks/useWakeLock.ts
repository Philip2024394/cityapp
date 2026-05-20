'use client'
import { useEffect, useRef } from 'react'

// ============================================================================
// useWakeLock — holds the screen-wake-lock while `enabled` is true so the
// driver's phone screen doesn't auto-dim or sleep while they're online.
// Without this, a driver who props their phone on the bike dash will
// lose the location ping the moment the OS sleeps the screen
// (location watcher stops firing on a sleeping screen).
//
// Re-acquires on visibility change because the browser auto-releases the
// lock when the page goes hidden (e.g. driver switches to WhatsApp).
// When they come back to the dashboard the lock re-grabs immediately.
//
// Silently no-ops on unsupported browsers (older iOS Safari). The
// dashboard still works — just falls back to the OS's normal screen
// timeout while the dashboard is foreground.
// ============================================================================

type WakeLockState = 'idle' | 'active' | 'unsupported' | 'denied'

export function useWakeLock(enabled: boolean, onStatus?: (s: WakeLockState) => void) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (typeof navigator === 'undefined') return
    const supported = 'wakeLock' in navigator
    if (!supported) {
      onStatus?.('unsupported')
      return
    }

    let cancelled = false

    async function acquire() {
      try {
        const wl = await navigator.wakeLock.request('screen')
        if (cancelled) {
          wl.release().catch(() => { /* ignore */ })
          return
        }
        sentinelRef.current = wl
        onStatus?.('active')
        wl.addEventListener('release', () => {
          // OS released us (visibility change, low battery, etc.).
          // Mark idle — we'll re-acquire on the next visibilitychange
          // or when `enabled` flips back true.
          sentinelRef.current = null
          onStatus?.('idle')
        })
      } catch {
        onStatus?.('denied')
      }
    }

    async function release() {
      const s = sentinelRef.current
      sentinelRef.current = null
      if (s) {
        try { await s.release() } catch { /* ignore */ }
      }
      onStatus?.('idle')
    }

    function onVis() {
      if (document.visibilityState === 'visible' && enabled && !sentinelRef.current) {
        void acquire()
      }
    }

    if (enabled) void acquire()
    else void release()
    document.addEventListener('visibilitychange', onVis)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
      void release()
    }
  }, [enabled, onStatus])
}
