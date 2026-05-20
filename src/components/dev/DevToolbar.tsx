'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Wrench, LogIn, LogOut, X as XIcon, ChevronRight, User } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'

// ============================================================================
// DevToolbar — floating bottom-right widget visible ONLY in development.
// ----------------------------------------------------------------------------
// One-tap shortcuts for working on the app without OTP / onboarding:
//   • Sign in as test driver → hits /api/dev/sign-in-as → /dashboard
//   • Sign out → clears the current session
//   • Quick links to key pages
//
// Render is gated on `process.env.NODE_ENV !== 'production'` AT BUILD
// TIME — Next.js inlines the env var into the client bundle, so a
// production build never ships this component's DOM at all.
// ============================================================================

const IS_DEV = process.env.NODE_ENV !== 'production'

const QUICK_LINKS: ReadonlyArray<{ label: string; href: string }> = [
  { label: 'Driver dashboard', href: '/dashboard' },
  { label: 'Refer drivers',    href: '/dashboard/refer' },
  { label: 'Onboarding (edit)', href: '/onboarding?mode=edit' },
  { label: 'My public profile', href: '/r/test-driver-0050' },
  { label: 'Customer marketplace', href: '/cari' },
  { label: 'Privacy',          href: '/privacy' },
  { label: 'Contact',          href: '/contact' },
  { label: 'Legal',            href: '/legal' },
]

export default function DevToolbar() {
  const [open, setOpen] = useState(false)
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null)

  useEffect(() => {
    if (!IS_DEV) return
    const supabase = getBrowserSupabase()
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => {
      setSignedInEmail(data?.user?.email ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedInEmail(session?.user?.email ?? null)
    })
    return () => { sub.subscription.unsubscribe() }
  }, [])

  async function signOut() {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (!IS_DEV) return null

  return (
    <div
      className="fixed z-[100] pb-safe pr-safe"
      style={{ bottom: 12, right: 12 }}
    >
      {open ? (
        <div
          className="rounded-2xl p-3 w-[260px] max-h-[72vh] overflow-y-auto"
          style={{
            background: 'rgba(15,15,20,0.96)',
            border: '1px solid rgba(250,204,21,0.30)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.50)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-[12px] uppercase tracking-wider font-extrabold text-brand">
              <Wrench className="w-3.5 h-3.5" />
              Dev toolbar
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="w-7 h-7 rounded-full flex items-center justify-center text-muted hover:text-ink"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <XIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          </div>

          {/* Current auth state */}
          <div
            className="rounded-xl p-2.5 mb-2 text-[12px]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <div className="flex items-center gap-1.5 text-dim uppercase tracking-wider font-extrabold mb-0.5">
              <User className="w-3 h-3" />
              Auth state
            </div>
            <div className="font-mono break-all" style={{ color: signedInEmail ? '#22C55E' : '#94A3B8' }}>
              {signedInEmail ?? 'signed out'}
            </div>
          </div>

          {/* Sign in / out */}
          <div className="space-y-1.5 mb-3">
            <a
              href="/api/dev/sign-in-as"
              className="w-full flex items-center justify-between gap-2 p-2.5 rounded-xl font-extrabold text-[13px] active:scale-[0.98] transition"
              style={{
                background: 'linear-gradient(135deg, #FACC15, #EAB308)',
                color: '#0A0A0A',
                minHeight: 44,
              }}
            >
              <span className="inline-flex items-center gap-1.5">
                <LogIn className="w-4 h-4" strokeWidth={2.5} />
                Sign in as test driver
              </span>
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
            {signedInEmail && (
              <button
                onClick={signOut}
                className="w-full flex items-center justify-between gap-2 p-2.5 rounded-xl font-bold text-[13px] active:scale-[0.98] transition text-ink"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  minHeight: 44,
                }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <LogOut className="w-4 h-4" strokeWidth={2.5} />
                  Sign out
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick navigation */}
          <div className="text-[12px] uppercase tracking-wider font-extrabold text-dim mb-1.5 px-1">
            Quick nav
          </div>
          <div className="space-y-0.5">
            {QUICK_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block px-2.5 py-2 rounded-lg text-[13px] font-bold text-ink hover:text-brand transition"
                style={{ background: 'transparent', minHeight: 36 }}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open dev toolbar"
          className="rounded-full flex items-center justify-center transition active:scale-95"
          style={{
            width: 48,
            height: 48,
            background: 'rgba(15,15,20,0.92)',
            border: '1px solid rgba(250,204,21,0.45)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.50), 0 0 12px rgba(250,204,21,0.20)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <Wrench className="w-5 h-5 text-brand" strokeWidth={2.25} />
        </button>
      )}
    </div>
  )
}
