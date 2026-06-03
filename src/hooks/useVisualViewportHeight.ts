'use client'
import { useEffect } from 'react'

// ============================================================================
// useVisualViewportHeight — keyboard-aware layout sizing
// ----------------------------------------------------------------------------
// Mount-once side-effect that listens to the Visual Viewport API and writes
// the current visible-viewport height to a CSS custom property `--vvh`
// (visual viewport height). Use it in CSS via `calc(var(--vvh, 100vh) * X)`
// to make any fixed-height element shrink when the mobile keyboard opens.
//
// Founder report 2026-06-03: /cari booking container is `height: 70vh`
// fixed at the bottom of the screen. When the on-screen keyboard opens
// it overlays the bottom 40–50% of the viewport, hiding the suggestion
// dropdown above the address input. Customer can't tap their address
// even though it's there. Using --vvh × 0.7 instead of 70vh makes the
// container shrink with the visible viewport, so the dropdown stays
// above the keyboard.
//
// Browser support: visualViewport is in every modern mobile browser
// (Chrome Android 61+, Safari iOS 13+). Older browsers fall back to the
// `100vh` default in `calc(var(--vvh, 100vh) * X)` — same as before,
// nothing breaks.
// ============================================================================

export function useVisualViewportHeight() {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return

    const update = () => {
      const h = window.visualViewport?.height ?? window.innerHeight
      document.documentElement.style.setProperty('--vvh', `${Math.round(h)}px`)
    }
    update()
    window.visualViewport.addEventListener('resize', update)
    window.visualViewport.addEventListener('scroll', update)
    return () => {
      window.visualViewport?.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('scroll', update)
    }
  }, [])
}
