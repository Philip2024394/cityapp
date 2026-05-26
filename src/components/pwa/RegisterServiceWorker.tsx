'use client'
import { useEffect } from 'react'

// ============================================================================
// Registers the IndoCity service worker on first mount.
// ----------------------------------------------------------------------------
// Mounted once at the root layout. Silently no-ops in browsers that don't
// support service workers (older iOS Safari < 11.3). Registration failure
// is logged but never thrown — the app keeps working.
//
// We register on 'load' rather than immediately so the SW install doesn't
// compete with the initial page render for bandwidth on slow mobile
// connections (typical Indonesian motorcycle courier 3G).
// ============================================================================

export default function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    // ── DEV-MODE: never register, and ACTIVELY UNREGISTER any existing
    //    service worker + clear all caches. A stale SW from a previous
    //    session intercepts dev requests and serves cached HTML/JS, so
    //    Turbopack rebuilds don't show up in the browser. This kills it.
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => {
          r.unregister().then((ok) => {
            if (ok) console.log('[pwa-dev] unregistered stale service worker')
          })
        })
      }).catch(() => { /* swallow */ })
      if (typeof caches !== 'undefined') {
        caches.keys().then((keys) => {
          keys.forEach((k) => caches.delete(k))
        }).catch(() => { /* swallow */ })
      }
      return
    }

    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => {
          // Surfacing this to console only — never block the app.
          console.warn('[pwa] service worker registration failed:', err)
        })
    }

    if (document.readyState === 'complete') {
      onLoad()
    } else {
      window.addEventListener('load', onLoad, { once: true })
      return () => window.removeEventListener('load', onLoad)
    }
  }, [])

  return null
}
