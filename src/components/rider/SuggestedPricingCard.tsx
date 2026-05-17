'use client'
import { Lightbulb, CheckCircle2, AlertCircle } from 'lucide-react'
import { idr } from '@/lib/format/idr'

type Props = {
  city: string
  cityAveragePerKm: number      // peer benchmark (mock 2500 for now)
  cityAverageMinFee: number     // mock 10000
  yourPerKm: number
  yourMinFee: number
}

// Verdict: are you under, on-par, or over the local average?
// Tolerance ±10% considered "on-par".
function verdict(yours: number, avg: number): 'under' | 'par' | 'over' {
  if (yours < avg * 0.9) return 'under'
  if (yours > avg * 1.1) return 'over'
  return 'par'
}

export default function SuggestedPricingCard({
  city, cityAveragePerKm, cityAverageMinFee, yourPerKm, yourMinFee,
}: Props) {
  const perKmVerdict = verdict(yourPerKm, cityAveragePerKm)
  const minFeeVerdict = verdict(yourMinFee, cityAverageMinFee)

  const headline = headlineFor(perKmVerdict)

  return (
    <div
      className="card card-driver p-4 relative overflow-hidden"
      style={{
        borderColor:
          perKmVerdict === 'par'
            ? 'rgba(34,197,94,0.32)'
            : perKmVerdict === 'under'
            ? 'rgba(250,204,21,0.32)'
            : 'rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background:
              perKmVerdict === 'par' ? 'rgba(34,197,94,0.12)'
              : perKmVerdict === 'under' ? 'rgba(250,204,21,0.12)'
              : 'rgba(255,255,255,0.05)',
          }}
        >
          {perKmVerdict === 'par' ? (
            <CheckCircle2 className="w-4 h-4 text-online" />
          ) : perKmVerdict === 'under' ? (
            <Lightbulb className="w-4 h-4 text-brand" />
          ) : (
            <AlertCircle className="w-4 h-4 text-muted" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] uppercase tracking-wider font-extrabold text-dim">
            Pricing suggestion · {city}
          </div>
          <div className="text-[15px] font-extrabold mt-1">{headline}</div>
          <div className="text-[13px] text-muted mt-1.5 leading-relaxed">
            Average other riders in {city}: <span className="text-ink font-bold">{idr(cityAveragePerKm)}/km</span>{' '}
            · min <span className="text-ink font-bold">{idr(cityAverageMinFee)}</span>
          </div>

          {/* Side-by-side comparison */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Compare label="Your rate" value={`${idr(yourPerKm)}/km`} delta={deltaText(yourPerKm, cityAveragePerKm)} verdict={perKmVerdict} />
            <Compare label="Your min fee" value={idr(yourMinFee)} delta={deltaText(yourMinFee, cityAverageMinFee)} verdict={minFeeVerdict} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Compare({ label, value, delta, verdict }: { label: string; value: string; delta: string; verdict: 'under' | 'par' | 'over' }) {
  return (
    <div className="bg-white/3 border border-line rounded-xl p-2.5">
      <div className="text-[13px] text-dim font-bold">{label}</div>
      <div className="text-[14px] font-extrabold mt-0.5 text-ink">{value}</div>
      <div
        className="text-[13px] font-bold mt-1"
        style={{ color: verdict === 'par' ? '#22C55E' : verdict === 'under' ? '#FACC15' : 'rgba(255,255,255,0.55)' }}
      >
        {delta}
      </div>
    </div>
  )
}

function headlineFor(v: 'under' | 'par' | 'over'): string {
  if (v === 'par')   return 'You’re competitive 👌'
  if (v === 'under') return 'You can raise prices a bit'
  return 'You’re above the city average'
}

function deltaText(yours: number, avg: number): string {
  const diff = yours - avg
  if (Math.abs(diff) < avg * 0.05) return 'matches the average'
  const pct = Math.round((Math.abs(diff) / avg) * 100)
  return diff < 0 ? `↓ ${pct}% below` : `↑ ${pct}% above`
}
