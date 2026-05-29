'use client'
import { useEffect, useState } from 'react'

// Bottom banner that prompts the visitor to add IndoCity to their
// home screen. Once installed, the app opens in standalone mode (no
// browser URL bar, no footer chrome) — full-screen on every device.
//
// Behaviour:
//   • Android Chrome / Edge: native `beforeinstallprompt` flow
//   • iOS Safari: text instructions (no programmatic API)
//   • Hidden when the app already runs in standalone mode
//   • Hidden once dismissed (localStorage flag, expires in 14 days)

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'indocity_install_dismissed_until'
const DISMISS_DAYS = 14

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  // Modern: matchMedia. Fallback: iOS-only navigator.standalone.
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true
  const nav = window.navigator as unknown as { standalone?: boolean }
  return Boolean(nav.standalone)
}

function isIOSSafari(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window)
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
  return isIOS && isSafari
}

function isDismissed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const until = Number(localStorage.getItem(DISMISS_KEY) || '0')
    return Number.isFinite(until) && Date.now() < until
  } catch { return false }
}

function setDismissed() {
  try {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000
    localStorage.setItem(DISMISS_KEY, String(until))
  } catch { /* swallow */ }
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)
  const [ios, setIos] = useState(false)

  useEffect(() => {
    if (isStandalone()) return
    if (isDismissed()) return

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)

    // iOS Safari never fires beforeinstallprompt — fall back to a
    // text-instruction variant after a short delay so we don't fight
    // the first paint.
    let iosTimer: ReturnType<typeof setTimeout> | null = null
    if (isIOSSafari()) {
      iosTimer = setTimeout(() => {
        setIos(true)
        setShow(true)
      }, 3000)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      if (iosTimer) clearTimeout(iosTimer)
    }
  }, [])

  if (!show) return null

  async function install() {
    if (!deferred) return
    try {
      await deferred.prompt()
      const choice = await deferred.userChoice
      if (choice.outcome === 'accepted') {
        setShow(false)
      } else {
        setDismissed()
        setShow(false)
      }
    } catch { setShow(false) }
  }

  function dismiss() {
    setDismissed()
    setShow(false)
  }

  return (
    <div
      role="dialog"
      aria-label="Add Kita2u to your home screen"
      className="fixed inset-x-0 z-50 pb-safe"
      style={{ bottom: 0 }}
    >
      <div
        className="mx-auto max-w-md m-3 rounded-2xl shadow-xl border border-gray-200 bg-white p-4"
        style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.18)' }}
      >
        <div className="flex items-start gap-3">
          <div
            className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: '#FACC15' }}
            aria-hidden
          >
            <img
              src="/icons/icon-192.png"
              alt=""
              className="w-9 h-9 rounded-md"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-black text-black leading-tight">
              Install Kita2u
            </div>
            <p className="text-[12px] text-black/65 leading-snug mt-1">
              {ios
                ? 'Tap the Share icon below, then "Add to Home Screen" — opens full-screen.'
                : 'Add to your home screen for full-screen access, faster loading, and a clean look.'}
            </p>
            <div className="flex items-center gap-2 mt-3">
              {!ios && (
                <button
                  type="button"
                  onClick={install}
                  className="rounded-full px-4 py-2 text-[12px] font-extrabold uppercase tracking-wider text-bg bg-brand hover:brightness-105 active:scale-[0.98] transition"
                >
                  Install
                </button>
              )}
              <button
                type="button"
                onClick={dismiss}
                className="rounded-full px-3 py-2 text-[12px] font-bold text-black/65 hover:text-black"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
