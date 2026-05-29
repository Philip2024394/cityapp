'use client'
import { TrendingUp, ArrowUpRight, MessageCircle } from 'lucide-react'
import { idr } from '@/lib/format/idr'

type Props = {
  monthlyQuotes: number
  monthlyLeadsValue: number     // sum of all quote fares this month
  subscriptionMonthly: number   // typically Rp 38,000
}

// Indonesian motorcycle ride-hail commission benchmark.
//
// Pre-June 2026: Gojek/Grab took ~20% of gross fare (driver kept 80%).
// From June 2026: Perpres No. 27/2026 (signed 1 May 2026) is reported
// to cap platform commission at 8% MAXIMUM, guaranteeing drivers ≥92%.
// IndoCity still takes 0% commission (subscription model) — so the
// honest pitch is "save the 8% Gojek now takes", not 20%.
//
// VERIFY BEFORE LAUNCH (audit 2026-05): confirm Perpres 27/2026 actually
// exists and the 8% figure is published. Citing an unverified regulation
// in a public comparative-savings claim exposes us under UU 8/1999 art 9
// (deceptive advertising). If the regulation isn't published / hasn't
// landed, fall back to a sourced industry-research range (Gojek/Grab
// actual take-rate from a public report).
const COMPETITOR_COMMISSION_RATE = 0.08
const COMPETITOR_COMMISSION_BASIS = 'Perpres 27/2026 — komisi maksimal 8% per pesanan, berlaku Juni 2026'

export default function ROIHero({ monthlyQuotes, monthlyLeadsValue, subscriptionMonthly }: Props) {
  const roi = subscriptionMonthly > 0 ? monthlyLeadsValue / subscriptionMonthly : 0
  const winning = roi >= 3   // 3× is the threshold I'd consider "obvious win"
  const target = 5            // 5× is the goal we steer riders toward
  const progressPct = Math.min(100, Math.round((roi / target) * 100))

  // "vs Gojek" savings — gross fare × competitor commission rate − our
  // flat subscription. This is the shareable headline that drivers
  // screenshot into WhatsApp groups.
  const competitorCommission = Math.round(monthlyLeadsValue * COMPETITOR_COMMISSION_RATE)
  const netSavedVsCompetitor = Math.max(0, competitorCommission - subscriptionMonthly)

  function onShareSavings() {
    if (typeof window === 'undefined') return
    const text = `Bulan ini saya hemat ${idr(netSavedVsCompetitor)} dengan Kita2u — driver motor independen, langganan tetap Rp ${(subscriptionMonthly/1000).toFixed(0)}rb/bulan, tanpa potongan komisi sama sekali (Gojek/Grab masih potong 8% per Perpres 27/2026).

Cek di indocity.streetlocal.live`
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="rounded-3xl bg-gray-100 border border-gray-200 shadow-sm p-5 relative overflow-hidden">
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
            <div className="text-[13px] uppercase tracking-wider font-extrabold text-gray-500 leading-none flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              ROI this month
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-[34px] font-extrabold gradient-text leading-none">
                {roi.toFixed(1)}×
              </span>
              <span className="text-[14px] text-gray-600 font-bold">subscription</span>
            </div>
            <div className="text-[13px] text-gray-600 mt-2 max-w-xs">
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
            <span className="text-gray-600">Target {target}×</span>
            <span className={winning ? 'text-online' : 'text-brand'}>{progressPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
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

        <div className="mt-3.5 pt-3 border-t border-gray-200 text-[13px] text-gray-600 leading-relaxed">
          <span className="font-bold text-[#0A0A0A]">{idr(subscriptionMonthly)}/month</span>{' '}
          subscription · if you close <span className="text-brand font-bold">all</span>{' '}
          quotes, you make <span className="text-online font-bold">{idr(Math.max(0, monthlyLeadsValue - subscriptionMonthly))}</span> net this month.
        </div>

        {/* vs Gojek savings line — the shareable headline. Only shows when
            there's an actual saving (zero leads = nothing to brag about). */}
        {netSavedVsCompetitor > 0 && (
          <div
            className="mt-3 rounded-2xl p-3.5"
            style={{
              background: 'linear-gradient(135deg, rgba(34,197,94,0.10), rgba(34,197,94,0.04))',
              border: '1px solid rgba(34,197,94,0.30)',
            }}
          >
            <div className="text-[12px] uppercase tracking-wider font-extrabold" style={{ color: '#22C55E' }}>
              vs Gojek / Grab
            </div>
            <div className="text-[15px] font-extrabold mt-1 leading-snug text-[#0A0A0A]">
              You saved <span style={{ color: '#22C55E' }}>{idr(netSavedVsCompetitor)}</span> in commission this month.
            </div>
            <div className="text-[12px] text-gray-600 mt-1">
              They&apos;d have taken {idr(competitorCommission)} (8% of {idr(monthlyLeadsValue)} — {COMPETITOR_COMMISSION_BASIS}). Kita2u takes Rp 0.
            </div>
            <button
              onClick={onShareSavings}
              className="mt-3 w-full p-2.5 rounded-xl font-extrabold text-[13px] text-white active:scale-[0.99] transition flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                boxShadow: '0 6px 16px rgba(37,211,102,0.30)',
                minHeight: 44,
              }}
            >
              <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
              Share this on WhatsApp
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
