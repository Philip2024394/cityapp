'use client'
import { TrendingUp, ArrowUpRight } from 'lucide-react'
import { idr } from '@/lib/format/idr'

type Props = {
  monthlyQuotes: number
  monthlyLeadsValue: number     // sum of all quote fares this month
  subscriptionMonthly: number   // typically Rp 30,000
}

export default function ROIHero({ monthlyQuotes, monthlyLeadsValue, subscriptionMonthly }: Props) {
  const roi = subscriptionMonthly > 0 ? monthlyLeadsValue / subscriptionMonthly : 0
  const winning = roi >= 3   // 3× is the threshold I'd consider "obvious win"
  const target = 5            // 5× is the goal we steer riders toward
  const progressPct = Math.min(100, Math.round((roi / target) * 100))

  return (
    <div className="card card-driver p-5 relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-70"
        style={{
          background: winning
            ? 'radial-gradient(ellipse at top right, rgba(34,197,94,0.16), transparent 60%)'
            : 'radial-gradient(ellipse at top right, rgba(250,204,21,0.16), transparent 60%)',
        }}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[13px] uppercase tracking-wider font-extrabold text-dim leading-none flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              ROI this month
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-[34px] font-extrabold gradient-text leading-none">
                {roi.toFixed(1)}×
              </span>
              <span className="text-[14px] text-muted font-bold">subscription</span>
            </div>
            <div className="text-[13px] text-muted mt-2 max-w-xs">
              {monthlyQuotes} quotes received · {idr(monthlyLeadsValue)} total lead value
            </div>
          </div>
          <span className={(winning ? 'chip-online' : 'chip') + ' chip text-[13px] py-1 px-2.5 shrink-0'}>
            <ArrowUpRight className="w-3 h-3" />
            {winning ? 'Profit' : 'Growing'}
          </span>
        </div>

        {/* Progress to 5× target */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[13px] font-bold mb-1.5">
            <span className="text-muted">Target {target}×</span>
            <span className={winning ? 'text-online' : 'text-brand'}>{progressPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progressPct}%`,
                background: winning
                  ? 'linear-gradient(90deg, #22C55E, #16A34A)'
                  : 'linear-gradient(90deg, #FACC15, #EAB308)',
              }}
            />
          </div>
        </div>

        <div className="mt-3.5 pt-3 border-t border-line text-[13px] text-muted leading-relaxed">
          <span className="font-bold text-ink/90">{idr(subscriptionMonthly)}/month</span>{' '}
          subscription · if you close <span className="text-brand font-bold">all</span>{' '}
          quotes, you make <span className="text-online font-bold">{idr(Math.max(0, monthlyLeadsValue - subscriptionMonthly))}</span> net this month.
        </div>
      </div>
    </div>
  )
}
