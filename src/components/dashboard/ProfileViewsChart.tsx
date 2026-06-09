'use client'
import Link from 'next/link'

// Plan-gated profile-views chart for the Kita2u dashboards.
// Task 12/12 — Linktree-parity retention. Free shows last 28 days as
// raw daily bars; Pro / Studio shows the last 365 days condensed into
// 52 weekly bins so the chart stays readable. The bar colour is the
// creator's chosen theme_color (falls back to Kita2u yellow).
//
// No chart library — plain flex-row of <div> bars with heights
// proportional to that bucket's view count.

type Props = {
  series: Array<{ day: string; views: number }>
  retentionDays: number
  plan: 'free' | 'pro' | 'studio'
  totalViews: number
  themeColor?: string
}

export default function ProfileViewsChart({
  series,
  retentionDays,
  plan,
  totalViews,
  themeColor,
}: Props) {
  const accent = themeColor || '#FACC15'

  // Pro / Studio: condense the 365-day series into 52 weekly bins so the
  // chart fits comfortably. Free stays raw (28 bars).
  const buckets: Array<{ label: string; views: number }> = []
  if (plan === 'free') {
    for (const d of series) buckets.push({ label: d.day, views: d.views })
  } else {
    for (let i = 0; i < series.length; i += 7) {
      const chunk = series.slice(i, i + 7)
      const sum = chunk.reduce((acc, d) => acc + d.views, 0)
      const label = chunk[chunk.length - 1]?.day ?? chunk[0]?.day ?? ''
      buckets.push({ label, views: sum })
    }
  }

  const maxViews = Math.max(1, ...buckets.map((b) => b.views))

  return (
    <section
      className="rounded-3xl bg-white border border-gray-200 p-4 shadow-sm"
      aria-label="Profile views chart"
    >
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h2 className="text-[14px] font-black text-black leading-tight">
          Profile views — last {retentionDays} days
        </h2>
        <span className="text-[11px] font-bold uppercase tracking-wider text-black/50">
          {plan === 'free' ? 'Free' : plan === 'pro' ? 'Pro' : 'Studio'}
        </span>
      </div>

      {/* Bars — flex row, each bar height proportional to bucket / max.
          aria-hidden because the chart is purely supplemental to the
          totals + retention copy that surround it. */}
      <div
        className="flex items-end gap-[2px] h-24 w-full"
        aria-hidden
      >
        {buckets.map((b, i) => {
          const pct = (b.views / maxViews) * 100
          return (
            <div
              key={`${b.label}-${i}`}
              className="flex-1 rounded-sm min-h-[2px]"
              style={{
                height: `${Math.max(pct, b.views > 0 ? 6 : 2)}%`,
                background: b.views > 0 ? accent : '#E5E7EB',
              }}
              title={`${b.label}: ${b.views} view${b.views === 1 ? '' : 's'}`}
            />
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-[12px] text-black/70 tabular-nums">
        <span>Total: <b className="text-black">{totalViews.toLocaleString()}</b></span>
        <span className="text-black/45">
          {plan === 'free' ? 'daily' : 'weekly bins'}
        </span>
      </div>

      {/* Upgrade prompt — only Free needs to see this. Mirrors the
          Linktree-parity messaging: 28 days now, 365 after upgrade.
          Pro/Studio already have the full window so showing them an
          upgrade CTA would be wrong. */}
      {plan === 'free' && (
        <div className="mt-3 rounded-2xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-[12px] leading-snug text-amber-900">
          Want the full year? Upgrade to Pro for Rp 38,000/month →{' '}
          <Link
            href="/pricing"
            className="font-extrabold underline underline-offset-2 hover:text-amber-700"
          >
            See plans
          </Link>
        </div>
      )}
    </section>
  )
}
