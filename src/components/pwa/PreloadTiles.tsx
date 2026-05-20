'use client'
import { useEffect } from 'react'
import {
  preloadCityTiles,
  nearestPreloadCity,
  PRELOAD_CITIES,
} from '@/lib/map/preloadTiles'

// ============================================================================
// Mounted once at the app root. Kicks off a low-priority, off-thread
// pre-warm of the nearest major-city tile pack into the Service Worker
// cache so subsequent map views are instant — even when the user goes
// underground / has flaky signal / opens the app on data with weak bars.
//
// EXECUTION MODEL:
//   • Waits for window 'load' so it doesn't compete with first paint
//   • Wraps the actual prefetch in requestIdleCallback (or 3s timeout
//     fallback) so it runs after the browser has nothing important to do
//   • Bails out entirely on save-data or 2G (handled inside preloadCityTiles)
//   • Runs only ONCE per session — guarded with sessionStorage so dev
//     hot-reload doesn't re-fire
//
// PRIORITY ORDER:
//   1. The city nearest the user's geolocation (best signal of where
//      they actually need tiles)
//   2. Fallback to Yogyakarta (our launch market) if geo isn't granted
// ============================================================================

const SESSION_KEY = 'cr_tiles_preloaded_v1'

export default function PreloadTiles() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    // Honour the one-per-session guard — pre-warming twice in a session
    // wastes user data without payoff.
    try {
      if (window.sessionStorage.getItem(SESSION_KEY)) return
    } catch { /* private mode — fall through, no big deal */ }

    function schedule(cb: () => void) {
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback
      if (ric) ric(cb, { timeout: 4000 })
      else setTimeout(cb, 3000)
    }

    function fire() {
      // Try geolocation FIRST (cheap, single low-accuracy ping). On grant
      // we pick the nearest preload-city; on deny/timeout we fall back
      // to Yogyakarta as the launch-market default.
      const fallback = PRELOAD_CITIES[0]
      if (!navigator.geolocation) {
        void preloadCityTiles(fallback).then(markDone)
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const city = nearestPreloadCity(pos.coords.latitude, pos.coords.longitude) ?? fallback
          void preloadCityTiles(city).then(markDone)
        },
        () => {
          void preloadCityTiles(fallback).then(markDone)
        },
        // Low-accuracy, fast — we only need "which city". Don't burn
        // GPS battery for a tile pre-warm.
        { enableHighAccuracy: false, timeout: 4000, maximumAge: 600_000 },
      )
    }

    function markDone() {
      try { window.sessionStorage.setItem(SESSION_KEY, '1') } catch { /* ignore */ }
    }

    // Wait for window load so first paint isn't competing with prefetch.
    if (document.readyState === 'complete') {
      schedule(fire)
    } else {
      const onLoad = () => { schedule(fire); window.removeEventListener('load', onLoad) }
      window.addEventListener('load', onLoad)
      return () => window.removeEventListener('load', onLoad)
    }
  }, [])

  return null
}
