'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bike, Users, Loader2, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { useHaptic } from '@/hooks/useHaptic'

// ============================================================================
// RentalToggles — two zero-think toggles on the driver dashboard:
//   1. "Rent out my bike"            → activates self-ride rental
//   2. "Offer bike + driver tour"    → activates with-driver tour service
//
// Both flip the rental_mode + available_now on a single bike_rentals row
// owned by the driver. The row is auto-created from the driver's profile
// (bike make/model/year, city, WhatsApp, etc.) with city-tier rental
// defaults + standard weekly/monthly formula + market tour rates.
//
// Driver doesn't fill out 20 fields. They tap. The row goes into
// admin-review (status='pending'); once approved it appears on /rent
// alongside their already-live driver profile on /cari.
// ============================================================================

type RentalState = {
  hasRental: boolean
  selfRide: boolean
  withDriver: boolean
  approved: boolean
  rentalId: string | null
  rentalSlug: string | null
}

export default function RentalToggles() {
  const haptic = useHaptic()
  const [state, setState] = useState<RentalState>({
    hasRental: false,
    selfRide: false,
    withDriver: false,
    approved: false,
    rentalId: null,
    rentalSlug: null,
  })
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<'self' | 'tour' | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Hydrate from Supabase — read the driver's own rental row (if any) so
  // toggle state reflects the live DB.
  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('bike_rentals')
        .select('id, slug, rental_mode, available_now, status')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (cancelled) return
      if (data) {
        const live = data.available_now === true
        setState({
          hasRental: true,
          selfRide:   live && (data.rental_mode === 'self_ride'   || data.rental_mode === 'both'),
          withDriver: live && (data.rental_mode === 'with_driver' || data.rental_mode === 'both'),
          approved:   data.status === 'approved',
          rentalId:   data.id,
          rentalSlug: data.slug,
        })
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  async function toggle(kind: 'self' | 'tour') {
    setError(null)
    haptic.tap()
    setPending(kind)
    // Compute the next composite mode from the desired flip.
    const nextSelf = kind === 'self' ? !state.selfRide : state.selfRide
    const nextTour = kind === 'tour' ? !state.withDriver : state.withDriver
    const mode =
      nextSelf && nextTour ? 'both'        :
      nextSelf             ? 'self_ride'   :
      nextTour             ? 'with_driver' :
                             'off'
    try {
      const res = await fetch('/api/rentals/quick-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setError(json.error || `Failed (${res.status})`); return }
      setState((s) => ({
        ...s,
        hasRental: mode !== 'off' || s.hasRental,
        selfRide: nextSelf,
        withDriver: nextTour,
        rentalId: json.id ?? s.rentalId,
        rentalSlug: json.slug ?? s.rentalSlug,
        // Newly-created rentals start pending; existing approved stays approved.
        approved: json.created ? false : s.approved,
      }))
      haptic.impact()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setPending(null)
    }
  }

  if (loading) {
    return <div className="rounded-3xl bg-gray-100 border border-gray-200 shadow-sm h-24 shimmer" />
  }

  return (
    <div className="space-y-2.5">
      {/* Header */}
      <div className="px-1">
        <div className="text-[12px] uppercase tracking-wider font-extrabold text-gray-500">
          Earn extra — bike rental
        </div>
        <p className="text-[12px] text-gray-600 mt-0.5 leading-relaxed">
          Flip a toggle. We use your bike details + city to set the lowest competitive rates.
          You can adjust prices anytime.
        </p>
      </div>

      <ToggleCard
        active={state.selfRide}
        pending={pending === 'self'}
        onToggle={() => toggle('self')}
        icon={<Bike className="w-5 h-5" strokeWidth={2.25} />}
        title="Rent out my bike"
        subtitle={state.selfRide
          ? 'Listed on /rent — customers can rent your bike daily / weekly / monthly'
          : 'Earn passive income when your bike is idle'}
      />

      <ToggleCard
        active={state.withDriver}
        pending={pending === 'tour'}
        onToggle={() => toggle('tour')}
        icon={<Users className="w-5 h-5" strokeWidth={2.25} />}
        title="Offer bike + driver tour"
        subtitle={state.withDriver
          ? 'Listed for 3h / 6h / 8h tours — petrol included within 30km'
          : 'Take tourists on city or attraction tours (3h / 6h / 8h blocks)'}
      />

      {/* Status footer — shows approval state + edit link */}
      {state.hasRental && (state.selfRide || state.withDriver) && (
        <div
          className="rounded-3xl bg-gray-100 border border-gray-200 shadow-sm p-3 flex items-center gap-3 text-[12px] text-[#0F172A]"
          style={{
            borderColor: state.approved ? 'rgba(34,197,94,0.30)' : 'rgba(245,158,11,0.30)',
            background: state.approved ? 'rgba(34,197,94,0.06)' : 'rgba(245,158,11,0.06)',
          }}
        >
          {state.approved
            ? <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#16A34A' }} />
            : <Loader2 className="w-4 h-4 shrink-0 animate-spin" style={{ color: '#D97706' }} />}
          <div className="flex-1 min-w-0 leading-relaxed">
            {state.approved
              ? <>Live on the rental marketplace.{' '}
                  {state.rentalSlug && (
                    <Link href={`/rent/${state.rentalSlug}`} target="_blank" className="text-brand font-bold underline">View listing</Link>
                  )}
                </>
              : <>Pending admin review — usually approved within 24 hours.</>}
          </div>
          {state.rentalId && (
            <Link
              href={`/dashboard/rentals/${state.rentalId}/edit`}
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-extrabold text-[12px] text-[#0F172A] hover:text-brand transition bg-gray-50 border border-gray-200"
              style={{ minHeight: 36 }}
            >
              Edit
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      )}

      {error && (
        <div
          className="rounded-xl p-3 flex items-start gap-2 text-[12px] leading-relaxed"
          style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)' }}
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#DC2626' }} />
          <span className="text-[#0F172A]">{error}</span>
        </div>
      )}
    </div>
  )
}

function ToggleCard({
  active, pending, onToggle, icon, title, subtitle,
}: {
  active: boolean
  pending: boolean
  onToggle: () => void
  icon: React.ReactNode
  title: string
  subtitle: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      className="w-full rounded-3xl bg-gray-100 border border-gray-200 shadow-sm p-4 flex items-center gap-3 text-left transition active:scale-[0.99] disabled:opacity-60"
      style={{
        borderColor: active ? 'rgba(250,204,21,0.35)' : undefined,
        background:  active ? 'rgba(250,204,21,0.05)' : undefined,
        minHeight: 64,
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: active ? 'rgba(250,204,21,0.18)' : 'rgba(15,23,42,0.05)',
          border: `1px solid ${active ? 'rgba(250,204,21,0.35)' : 'rgba(15,23,42,0.10)'}`,
          color: active ? '#CA8A04' : '#6B7280',
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-[14px] text-[#0F172A]">{title}</div>
        <div className="text-[12px] text-gray-600 mt-0.5 leading-relaxed">{subtitle}</div>
      </div>
      <div
        className="w-12 h-7 rounded-full p-0.5 transition shrink-0"
        style={{ background: active ? '#22C55E' : 'rgba(15,23,42,0.15)' }}
      >
        <div
          className="w-6 h-6 rounded-full bg-white transition-transform flex items-center justify-center shadow-sm"
          style={{ transform: active ? 'translateX(20px)' : 'translateX(0)' }}
        >
          {pending && <Loader2 className="w-3.5 h-3.5 text-gray-600 animate-spin" />}
        </div>
      </div>
    </button>
  )
}
