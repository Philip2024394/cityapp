'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getBrowserSupabase } from '@/lib/supabase/client'

// Auth-aware CTA for the public /partners overview page. Detects three
// states and renders accordingly:
//   • already a partner → "Open dashboard" + "View pending bookings"
//   • signed in but not a partner → "Continue setup →" linking signup
//   • anonymous → "Join free" (original behaviour) + sign-in shortcut
// Keeps /partners/page.tsx server-rendered for SEO; this island only
// hydrates the CTA blocks.

type Status = 'loading' | 'partner' | 'signedIn' | 'anon'

export default function PartnerProgramCTA({ variant }: { variant: 'top' | 'bottom' }) {
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) { setStatus('anon'); return }
    let cancelled = false
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      if (!data?.session?.user) { setStatus('anon'); return }
      try {
        const r = await fetch('/api/partners/me/bookings', { cache: 'no-store' })
        if (cancelled) return
        if (r.ok) {
          const j = await r.json() as { partners?: unknown[] }
          if (Array.isArray(j.partners) && j.partners.length > 0) {
            setStatus('partner')
            return
          }
        }
        setStatus('signedIn')
      } catch {
        setStatus('signedIn')
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (status === 'loading') {
    return (
      <div className={variant === 'bottom' ? 'text-center' : ''}>
        <div className="inline-block rounded-full bg-white/5 h-[52px] w-[220px] animate-pulse" />
      </div>
    )
  }

  if (status === 'partner') {
    return (
      <div className={variant === 'bottom' ? 'text-center' : ''}>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard/partner"
            className="inline-flex items-center gap-2 rounded-full bg-brand text-bg px-7 py-3.5 text-[14px] font-extrabold uppercase tracking-wider hover:brightness-105"
          >
            Open partner dashboard →
          </Link>
          <Link
            href="/dashboard/partner/bookings?status=pending"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/40 text-ink px-6 py-3.5 text-[13px] font-extrabold uppercase tracking-wider hover:bg-white/5"
          >
            Pending bookings
          </Link>
        </div>
        <p className="text-[12px] text-ink/60 mt-3">
          You are already a partner — every CTA on this page links to your dashboard.
        </p>
      </div>
    )
  }

  if (status === 'signedIn') {
    return (
      <div className={variant === 'bottom' ? 'text-center' : ''}>
        <Link
          href="/partners/signup"
          className="inline-flex items-center gap-2 rounded-full bg-brand text-bg px-7 py-3.5 text-[14px] font-extrabold uppercase tracking-wider hover:brightness-105"
        >
          Continue partner setup →
        </Link>
        <p className="text-[12px] text-ink/60 mt-3">
          Signed in — one short form left to activate your partner profile.
        </p>
      </div>
    )
  }

  // anonymous
  return (
    <div className={variant === 'bottom' ? 'text-center' : ''}>
      <Link
        href="/partners/signup"
        className="inline-flex items-center gap-2 rounded-full bg-brand text-bg px-7 py-3.5 text-[14px] font-extrabold uppercase tracking-wider hover:brightness-105"
      >
        Join free →
      </Link>
      <p className="text-[12px] text-ink/60 mt-3">
        Already a partner? <Link href="/dashboard/partner" className="text-brand underline">Open dashboard →</Link>
      </p>
    </div>
  )
}
