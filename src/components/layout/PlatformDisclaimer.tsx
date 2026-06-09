'use client'
import Link from 'next/link'

type Props = {
  /** links: 4 link chips, no paragraph, no container. Lean for the landing.
   *  compact: 1-line subtle credit + one link.
   *  full: 3-line clear disclaimer paragraph + 4 links. */
  variant?: 'links' | 'compact' | 'full'
}

// Footer disclaimer affirming Kita2u's position as SaaS / software
// directory for independent creators and small businesses.
// 2026-06-09 rewrite per founder direction — removed all motorcycle-
// courier + transportation-service language (CityDrivers-era copy)
// because Kita2u is apps-for-business now, not a transport directory.
// CityDrivers (citydrivers.id) keeps the transport-law positioning on
// its own host; Kita2u stays creator-SaaS positioning here.
export default function PlatformDisclaimer({ variant = 'full' }: Props) {
  if (variant === 'links') {
    return (
      <div className="relative z-20 flex items-center justify-center gap-3 text-[11px] text-dim pb-4 pt-2 px-4">
        <Link href="/about"   className="hover:text-ink transition">About</Link>
        <span aria-hidden>·</span>
        <Link href="/terms"   className="hover:text-ink transition">Terms</Link>
        <span aria-hidden>·</span>
        <Link href="/privacy" className="hover:text-ink transition">Privacy</Link>
        <span aria-hidden>·</span>
        <Link href="/legal"   className="hover:text-ink transition">Legal info</Link>
      </div>
    )
  }
  if (variant === 'compact') {
    return (
      <div className="text-center text-[11px] text-dim leading-relaxed pt-3 pb-2 px-4 max-w-3xl mx-auto">
        Kita2u is a software directory.{' '}
        <Link href="/legal" className="text-muted hover:text-ink underline-offset-2 hover:underline">
          See legal info
        </Link>
      </div>
    )
  }
  return (
    <footer className="relative z-20 mt-auto px-4 py-5 border-t border-line/50 bg-bg/60 backdrop-blur-md">
      <div className="max-w-3xl mx-auto space-y-2 text-center">
        <p className="text-[11px] text-dim leading-relaxed">
          <span className="font-bold text-muted"><span style={{ color: '#0A0A0A' }}>Kita</span><span style={{ color: '#FACC15' }}>2u</span></span> is a software directory
          for independent creators, small businesses, and service providers. We do not sell,
          ship, or fulfil any product, and we never take a per-transaction commission. Every
          order, booking, and conversation happens directly between the customer and the
          business through their own WhatsApp.
        </p>
        <div className="flex items-center justify-center gap-3 text-[11px] text-dim">
          <Link href="/about"   className="hover:text-ink">About</Link>
          <span aria-hidden>·</span>
          <Link href="/terms"   className="hover:text-ink">Terms</Link>
          <span aria-hidden>·</span>
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          <span aria-hidden>·</span>
          <Link href="/legal"   className="hover:text-ink">Legal info</Link>
        </div>
      </div>
    </footer>
  )
}
