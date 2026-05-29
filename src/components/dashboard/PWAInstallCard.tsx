'use client'
// ============================================================================
// PWAInstallCard — yellow "Install CityRiders to your home screen" card
// shown on /dashboard/car and /dashboard/rider home pages.
// ----------------------------------------------------------------------------
// • Hides itself if running in standalone mode (already installed).
// • Hides itself if dismissed (persisted in localStorage forever).
// • Chrome/Android: listens for beforeinstallprompt; tap fires
//   prompt() — native OS install sheet.
// • iOS Safari: shows manual "Tap Share → Add to Home Screen" copy
//   instead (beforeinstallprompt never fires on iOS).
// ============================================================================

import { useEffect, useState } from 'react'
import { Share2, Plus, X as XIcon, Smartphone } from 'lucide-react'

const DISMISS_KEY = 'cr_pwa_install_dismissed_v1'

type DeferredEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true
    // iOS Safari uses non-standard navigator.standalone
    const nav = window.navigator as Navigator & { standalone?: boolean }
    if (nav.standalone === true) return true
  } catch {}
  return false
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua)
}

export default function PWAInstallCard() {
  const [deferred, setDeferred]   = useState<DeferredEvent | null>(null)
  const [dismissed, setDismissed] = useState(true) // start hidden until we know
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)
  const ios = isIOS()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isStandalone()) { setDismissed(true); return }
    try {
      const v = localStorage.getItem(DISMISS_KEY)
      setDismissed(v === '1')
    } catch {
      setDismissed(false)
    }
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as DeferredEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  const dismiss = () => {
    setDismissed(true)
    try { localStorage.setItem(DISMISS_KEY, '1') } catch {}
  }

  const install = async () => {
    if (deferred) {
      try {
        await deferred.prompt()
        const { outcome } = await deferred.userChoice
        if (outcome === 'accepted') dismiss()
      } catch {}
      setDeferred(null)
      return
    }
    if (ios) {
      setShowIOSInstructions((v) => !v)
      return
    }
  }

  if (dismissed) return null
  // Android + not yet installable → hide (no prompt available yet)
  if (!ios && !deferred) return null

  return (
    <section
      className="rounded-2xl p-4 mb-4 relative"
      style={{
        background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)',
        color:      '#0A0A0A',
        boxShadow:  '0 12px 28px rgba(250,204,21,0.30)',
        border:     '2px solid #0A0A0A',
      }}
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="absolute top-2 right-2 w-7 h-7 rounded-full inline-flex items-center justify-center active:scale-95"
        style={{ background: 'rgba(10,10,10,0.12)', color: '#0A0A0A' }}
      >
        <XIcon className="w-3.5 h-3.5" strokeWidth={3} />
      </button>

      <div className="flex items-start gap-3 pr-7">
        <span
          className="shrink-0 w-10 h-10 rounded-xl inline-flex items-center justify-center"
          style={{ background: '#0A0A0A', color: '#FACC15' }}
        >
          <Smartphone className="w-5 h-5" strokeWidth={2.5} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-black leading-tight">Install CityRiders</h3>
          <p className="text-[12px] font-bold opacity-80 leading-snug mt-0.5">
            Put it on your home screen so booking alerts can ring + vibrate even when
            this tab is closed.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={install}
        className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl font-extrabold uppercase tracking-wider active:scale-[0.99] transition"
        style={{
          minHeight:  44,
          background: '#0A0A0A',
          color:      '#FACC15',
          fontSize:   13,
        }}
      >
        {ios && !deferred ? 'How to install on iPhone' : 'Install to home screen'}
      </button>

      {showIOSInstructions && ios && (
        <div
          className="mt-3 rounded-xl p-3 text-[12px] font-bold leading-snug"
          style={{ background: 'rgba(10,10,10,0.10)', color: '#0A0A0A' }}
        >
          <div className="flex items-start gap-2">
            <Share2 className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2.5} />
            <span>
              1. Tap the <strong>Share</strong> icon in Safari&apos;s bottom bar
            </span>
          </div>
          <div className="flex items-start gap-2 mt-1.5">
            <Plus className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2.5} />
            <span>
              2. Scroll down and tap <strong>Add to Home Screen</strong>
            </span>
          </div>
        </div>
      )}
    </section>
  )
}
