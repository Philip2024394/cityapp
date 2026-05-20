'use client'
import Link from 'next/link'
import type { ComponentType, ReactNode } from 'react'

// ============================================================================
// EmptyState — shared "nothing to show yet" surface used by every driver
// dashboard list (Customer Book, Favourites, Operations, Rentals, Places,
// Reviews, Refer). Replaces ~5+ hand-rolled empty panels that drifted
// in tone, padding, and CTA placement (design audit 2026-05).
//
// Shape: yellow-tinted icon disc, headline, two-line sub, optional CTA.
// Always inside a .card (so driver-surface solid-black rule applies).
// ============================================================================

type CtaProps =
  | { ctaLabel: string; ctaHref: string; ctaOnClick?: never }
  | { ctaLabel: string; ctaOnClick: () => void; ctaHref?: never }
  | { ctaLabel?: undefined; ctaHref?: undefined; ctaOnClick?: undefined }

type Props = {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  headline: string
  sub?: ReactNode
} & CtaProps

export default function EmptyState({
  icon: Icon, headline, sub, ...cta
}: Props) {
  const ctaLabel = cta.ctaLabel
  const ctaHref = cta.ctaHref
  const ctaOnClick = cta.ctaOnClick

  return (
    <div className="card p-6 text-center space-y-3">
      <div
        className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{
          background: 'rgba(250,204,21,0.12)',
          border: '1px solid rgba(250,204,21,0.30)',
        }}
      >
        <Icon className="w-5 h-5 text-brand" strokeWidth={2.25} />
      </div>

      <div className="space-y-1.5">
        <div className="font-extrabold text-[16px]">{headline}</div>
        {sub && (
          <p className="text-[14px] text-muted leading-relaxed max-w-sm mx-auto">
            {sub}
          </p>
        )}
      </div>

      {ctaLabel && ctaHref && (
        <Link href={ctaHref} className="btn-primary inline-flex !w-auto mt-1">
          {ctaLabel}
        </Link>
      )}
      {ctaLabel && ctaOnClick && (
        <button type="button" onClick={ctaOnClick} className="btn-primary !w-auto mt-1">
          {ctaLabel}
        </button>
      )}
    </div>
  )
}
