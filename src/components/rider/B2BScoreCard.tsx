'use client'
import { useEffect, useState } from 'react'
import { Trophy, TrendingUp, Loader2 } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { computeB2bScore, type ScoreResult } from '@/lib/scoring/b2bScore'

// ============================================================================
// B2BScoreCard — driver-facing transparency for the /business ranking.
//
// Shows the driver:
//   • Their composite score (0-100)
//   • Their rank within their city (#X of N)
//   • Their current tier (top / standard / hidden / removed)
//   • Component breakdown so they see WHY they're at that score
//   • "How to climb" hints — actionable, generated from the breakdown
//
// Only renders when the driver has business_contract_enabled=true. Hides
// silently otherwise so the dashboard isn't cluttered with B2B UI for
// drivers who haven't opted in.
//
// Computed CLIENT-SIDE from the driver's row + city peers — no API call
// needed. The DB columns (b2b_score, b2b_tier) are also updated nightly
// by the cron, but doing the compute live here means a driver who toggles
// or improves their stats sees the change immediately, not 24h later.
// ============================================================================

type DriverShape = {
  user_id: string
  city: string | null
  last_active_at: string | null
  rating: number | null
  trips_count: number | null
  created_at: string
  business_enabled_at: string | null
  business_contract_enabled: boolean
  subscriptions?: { status: 'trial' | 'active' | 'past_due' | 'canceled' | null } | { status: 'trial' | 'active' | 'past_due' | 'canceled' | null }[] | null
}

const TIER_META = {
  top:      { label: 'Top driver',       color: '#FACC15', bg: 'rgba(250,204,21,0.10)', border: 'rgba(250,204,21,0.35)' },
  standard: { label: 'Standard',         color: '#22C55E', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.30)' },
  hidden:   { label: 'Hidden by default', color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.30)' },
  removed:  { label: 'Not listed',        color: '#EF4444', bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.30)' },
} as const

export default function B2BScoreCard() {
  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [result, setResult] = useState<ScoreResult | null>(null)
  const [rank, setRank] = useState<{ position: number; total: number } | null>(null)

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      // Load own driver row + subscription.
      const { data: meRaw } = await supabase
        .from('drivers')
        .select('user_id, city, last_active_at, rating, trips_count, created_at, business_enabled_at, business_contract_enabled, subscriptions(status)')
        .eq('user_id', user.id)
        .maybeSingle()
      if (cancelled) return
      const me = meRaw as unknown as DriverShape | null
      if (!me || !me.business_contract_enabled) {
        setLoading(false)
        return
      }
      setEnabled(true)

      const sub = Array.isArray(me.subscriptions) ? me.subscriptions[0] : me.subscriptions
      const myResult = computeB2bScore({
        lastActiveAt:       me.last_active_at,
        rating:             me.rating,
        reviewsCount:       me.trips_count ?? 0,
        tripsCount:         me.trips_count ?? 0,
        createdAt:          me.created_at,
        businessEnabledAt:  me.business_enabled_at,
        subscriptionStatus: sub?.status ?? null,
      })
      setResult(myResult)

      // Compute city rank live — fetch all opted-in drivers in the same
      // city, score each, sort. Small N so this is cheap.
      if (me.city) {
        const { data: peersRaw } = await supabase
          .from('drivers')
          .select('user_id, city, last_active_at, rating, trips_count, created_at, business_enabled_at, business_contract_enabled, subscriptions(status)')
          .eq('business_contract_enabled', true)
          .eq('status', 'active')
          .eq('city', me.city)
        if (cancelled) return
        const peers = (peersRaw ?? []) as unknown as DriverShape[]
        const scored = peers.map((p) => {
          const psub = Array.isArray(p.subscriptions) ? p.subscriptions[0] : p.subscriptions
          return {
            user_id: p.user_id,
            score: computeB2bScore({
              lastActiveAt:       p.last_active_at,
              rating:             p.rating,
              reviewsCount:       p.trips_count ?? 0,
              tripsCount:         p.trips_count ?? 0,
              createdAt:          p.created_at,
              businessEnabledAt:  p.business_enabled_at,
              subscriptionStatus: psub?.status ?? null,
            }).score,
          }
        })
        scored.sort((a, b) => b.score - a.score)
        const idx = scored.findIndex((s) => s.user_id === me.user_id)
        if (idx >= 0) setRank({ position: idx + 1, total: scored.length })
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) return <div className="rounded-3xl bg-gray-100 border border-gray-200 shadow-sm h-24 shimmer" />
  if (!enabled || !result) return null

  const tierMeta = TIER_META[result.tier]
  const components: Array<[string, number, number]> = [
    ['Activity',     result.breakdown.activity,     30],
    ['Rating',       result.breakdown.rating,       25],
    ['Freshness',    result.breakdown.freshness,    15],
    ['Trips',        result.breakdown.trips,        15],
    ['Tenure',       result.breakdown.tenure,       10],
    ['Subscription', result.breakdown.subscription, 5],
  ]

  return (
    <div
      className="rounded-3xl bg-gray-100 border border-gray-200 shadow-sm p-4 space-y-3"
      style={{ borderColor: tierMeta.border, background: tierMeta.bg }}
    >
      {/* Header — rank + score */}
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: `${tierMeta.color}26`,
            border: `1px solid ${tierMeta.color}55`,
            color: tierMeta.color,
          }}
        >
          <Trophy className="w-5 h-5" strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] uppercase tracking-wider font-extrabold" style={{ color: tierMeta.color }}>
            Your B2B rank — {tierMeta.label}
          </div>
          <div className="text-[16px] font-extrabold mt-0.5 leading-tight text-[#0F172A]">
            {rank ? <>#{rank.position} <span className="text-gray-600 font-bold">of {rank.total}</span></> : 'Listed'}
          </div>
          <div className="text-[12px] text-gray-600 mt-0.5">
            Score <span className="text-[#0F172A] font-extrabold">{result.score}/100</span>
            {result.inGracePeriod && <> · <span style={{ color: '#16A34A' }}>30-day grace</span></>}
          </div>
        </div>
      </div>

      {/* Component breakdown — visual bars */}
      <div className="space-y-2">
        {components.map(([label, got, max]) => {
          const pct = Math.round((got / max) * 100)
          const isMaxed = got >= max - 1
          return (
            <div key={label}>
              <div className="flex items-center justify-between text-[12px] font-bold mb-1">
                <span className="text-gray-600">{label}</span>
                <span className={isMaxed ? 'text-online' : 'text-[#0F172A]'}>
                  {got}<span className="text-gray-500">/{max}</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(15,23,42,0.08)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: isMaxed
                      ? 'linear-gradient(90deg, #22C55E, #16A34A)'
                      : `linear-gradient(90deg, ${tierMeta.color}, ${tierMeta.color}99)`,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* How to climb — actionable hints from the algorithm */}
      {result.notes.length > 0 && (
        <div className="pt-2 border-t border-gray-200 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-brand" />
            <div className="text-[12px] uppercase tracking-wider font-extrabold text-gray-500">
              How to climb
            </div>
          </div>
          <ul className="space-y-1 text-[12px] text-[#0F172A] leading-relaxed">
            {result.notes.slice(0, 3).map((n, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-brand mt-0.5">·</span>
                <span className="flex-1">{n}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// Loader fallback while the suspense above resolves — exported because
// the dashboard might want to render its own skeleton.
export function B2BScoreCardLoader() {
  return (
    <div className="rounded-3xl bg-gray-100 border border-gray-200 shadow-sm p-4 flex items-center gap-3">
      <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
      <span className="text-[13px] text-gray-600">Loading your B2B score…</span>
    </div>
  )
}
