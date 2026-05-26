'use client'
import Link from 'next/link'

type Props = {
  /** links: 4 link chips, no paragraph, no container. Lean for the landing.
   *  compact: 1-line subtle credit + one link.
   *  full: 3-line clear disclaimer paragraph + 4 links. */
  variant?: 'links' | 'compact' | 'full'
}

// Footer disclaimer affirming IndoCity's position as a SOFTWARE
// LISTING PLATFORM for independent riders — NOT a transportation
// service provider. Used on every customer-facing page to anchor the
// SaaS positioning and reduce risk of being classified as APJT
// (Aplikasi Penyedia Jasa Transportasi) under Permenhub PM 12/2019.
//
// Wording reviewed against the 5 classification tests Indonesian
// transport authorities apply. DO NOT alter without legal review.
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
        IndoCity is a software directory.{' '}
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
          <span className="font-bold text-muted">IndoCity</span> is a software listing platform
          for independent motorcycle couriers. We do not provide transportation services.
          All trips are arranged directly between customers and independent riders, who set their
          own prices and operate their own businesses.
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
