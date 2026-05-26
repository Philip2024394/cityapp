'use client'

// Seamless scrolling promo ribbon. Two copies of the same text scroll
// across so the loop never has a visible gap. Used on the profile pages
// (beautician + handyman + …) to surface promo_text.
//
// Width is full-parent; height ~28px. Pill-shaped so it sits cleanly
// between the portfolio carousel and the CTA row.

export type RunningMarqueeProps = {
  /** Text to scroll. Required — caller is responsible for the fallback
   *  copy (so each vertical can write its own default voice). */
  text: string
  /** Optional accent — the pill background. Pink #FDF2F8 by default to
   *  match beautician; pass a yellow tint for handyman, etc. */
  background?: string
  /** Text colour for the scrolling text. Defaults to neutral gray-500. */
  color?: string
  /** Scroll duration in seconds. Slower = calmer. Default 28s. */
  durationSec?: number
}

export default function RunningMarquee({
  text,
  background = '#FDF2F8',
  color = '#6B7280',
  durationSec = 28,
}: RunningMarqueeProps) {
  return (
    <div className="overflow-hidden py-1.5 rounded-full" style={{ background }}>
      <style>{`@keyframes cr-marquee { from { transform: translateX(0%); } to { transform: translateX(-50%); } }`}</style>
      <div
        className="flex whitespace-nowrap"
        style={{ animation: `cr-marquee ${durationSec}s linear infinite` }}
      >
        {[0, 1].map((k) => (
          <span
            key={k}
            aria-hidden={k === 1 ? true : undefined}
            className="px-8 text-[16px] tracking-wide"
            style={{ color }}
          >
            {text} ✦
          </span>
        ))}
      </div>
    </div>
  )
}
