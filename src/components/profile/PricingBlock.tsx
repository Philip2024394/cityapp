'use client'
import { idr } from '@/lib/format/idr'

// Generic pricing card — takes a label + array of tiers. Each vertical
// composes its own pricing shape: massage = 60/90/120 min; beautician
// = makeup/nail/hair packages; laundry = wash/wash-dry/wash-iron per kg;
// handyman = hour/day; etc.
//
// Tier shape:
//   label    — e.g. "60 min", "Hair", "Day · 8h"
//   amount   — number in IDR (renders via idr() formatter)
//   sub      — optional second line (e.g. "/kg", "/jam", "+ travel fee")
//   featured — optional flag for the headline tier (renders larger / yellow)

export type PricingTier = {
  label:   string
  amount:  number
  sub?:    string
  featured?: boolean
}

export default function PricingBlock({
  title = 'Pricing',
  tiers,
  footnote,
}: {
  title?: string
  tiers: PricingTier[]
  footnote?: string
}) {
  const items = (tiers ?? []).filter((t) => t && Number.isFinite(t.amount))
  if (items.length === 0) return null

  return (
    <section className="space-y-3">
      <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-ink/70">{title}</h2>
      <div className={`grid gap-2 ${items.length === 1 ? 'grid-cols-1' : items.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {items.map((t, i) => (
          <div
            key={t.label + i}
            className="rounded-2xl p-3 text-center"
            style={t.featured
              ? {
                  background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)',
                  color: '#0A0A0A',
                  border: '1px solid rgba(0,0,0,0.85)',
                  boxShadow: '0 8px 22px rgba(250,204,21,0.30)',
                }
              : {
                  background: 'rgba(0,0,0,0.55)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255,255,255,0.10)',
                }}
          >
            <div className={`text-[10px] uppercase tracking-wider font-extrabold ${t.featured ? 'text-black/70' : 'text-ink/55'}`}>
              {t.label}
            </div>
            <div className={`text-[18px] sm:text-[20px] font-black mt-1 leading-none ${t.featured ? 'text-black' : 'text-brand'}`}>
              {idr(t.amount)}
            </div>
            {t.sub && (
              <div className={`text-[11px] font-bold mt-1 ${t.featured ? 'text-black/65' : 'text-ink/55'}`}>
                {t.sub}
              </div>
            )}
          </div>
        ))}
      </div>
      {footnote && (
        <p className="text-[11px] text-muted leading-snug">{footnote}</p>
      )}
    </section>
  )
}
