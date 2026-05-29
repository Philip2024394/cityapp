'use client'
import { useEffect, useRef } from 'react'

// Fire a single view increment for the current promo on mount. Uses a
// ref to guard against React 18 dev-mode double-mounting, and stores a
// session-storage flag so a refresh within the same browser session
// doesn't inflate the counter. Separate from provider_profile_views —
// promo views drive the analytics on /dashboard/<v>/promos, not the
// site-wide profile view rollup.

export default function PromoViewTracker({ slug }: { slug: string }) {
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    const sessionKey = `cr-promo-viewed-${slug}`
    if (typeof window !== 'undefined') {
      try { if (window.sessionStorage.getItem(sessionKey)) return } catch { /* ignore */ }
    }
    fetch(`/api/promo-pages/${encodeURIComponent(slug)}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ kind: 'view' }),
      keepalive: true,
    }).catch(() => { /* fire-and-forget */ })
    try { window.sessionStorage.setItem(sessionKey, '1') } catch { /* ignore */ }
  }, [slug])
  return null
}
