'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Briefcase, Loader2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { useHaptic } from '@/hooks/useHaptic'

// ============================================================================
// BusinessContractToggle — third zero-think toggle on the driver dashboard:
//   "Available for business contracts"
//
// Single tap on enable:
//   • Driver flagged business_contract_enabled = true in DB
//   • Default capacity = 30 parcels/day (editable later)
//   • Default services = ['parcels','documents']
//   • Appears immediately on the public /business directory
//
// Single tap on disable:
//   • Flag flips false; driver vanishes from /business
//   • Config preserved so re-enable restores prior settings
//
// Surfaces a "View my public page" link once enabled so the driver can
// see how businesses will see them.
// ============================================================================

export default function BusinessContractToggle() {
  const haptic = useHaptic()
  const [enabled, setEnabled] = useState(false)
  const [city, setCity] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('drivers')
        .select('business_contract_enabled, city')
        .eq('user_id', user.id)
        .maybeSingle()
      if (cancelled) return
      if (data) {
        setEnabled(!!data.business_contract_enabled)
        setCity(data.city ?? null)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  async function toggle() {
    setError(null)
    haptic.tap()
    setPending(true)
    const next = !enabled
    try {
      const res = await fetch('/api/drivers/me/business-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setError(json.error || `Failed (${res.status})`); return }
      setEnabled(next)
      haptic.impact()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setPending(false)
    }
  }

  if (loading) {
    return <div className="card-dark h-24 shimmer" />
  }

  return (
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className="w-full card-dark p-4 flex items-center gap-3 text-left transition active:scale-[0.99] disabled:opacity-60"
        style={{
          borderColor: enabled ? 'rgba(250,204,21,0.35)' : 'rgba(255,255,255,0.08)',
          background:  enabled ? 'rgba(250,204,21,0.05)' : undefined,
          minHeight: 64,
        }}
      >
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: enabled ? 'rgba(250,204,21,0.18)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${enabled ? 'rgba(250,204,21,0.35)' : 'rgba(255,255,255,0.10)'}`,
            color: enabled ? '#FACC15' : 'rgba(255,255,255,0.55)',
          }}
        >
          <Briefcase className="w-5 h-5" strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-[14px]">
            Available for business contracts
          </div>
          <div className="text-[12px] text-muted mt-0.5 leading-relaxed">
            {enabled
              ? 'Listed on /business — Shopee sellers, restaurants, warungs can message you for regular delivery contracts'
              : 'Get steady work — small businesses (Shopee/TikTok sellers, restaurants) message you directly for daily parcel runs'}
          </div>
        </div>
        <div
          className="w-12 h-7 rounded-full p-0.5 transition shrink-0"
          style={{ background: enabled ? '#22C55E' : 'rgba(255,255,255,0.12)' }}
        >
          <div
            className="w-6 h-6 rounded-full bg-white transition-transform flex items-center justify-center"
            style={{ transform: enabled ? 'translateX(20px)' : 'translateX(0)' }}
          >
            {pending && <Loader2 className="w-3.5 h-3.5 text-muted animate-spin" />}
          </div>
        </div>
      </button>

      {enabled && (
        <div
          className="card-dark p-3 flex items-center gap-3 text-[12px]"
          style={{ borderColor: 'rgba(34,197,94,0.30)', background: 'rgba(34,197,94,0.06)' }}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#22C55E' }} />
          <div className="flex-1 min-w-0 leading-relaxed">
            You&apos;re live on the business directory{city ? <> for <strong className="text-ink">{city}</strong></> : ''}. Edit capacity + services any time below.
          </div>
          <Link
            href="/business"
            target="_blank"
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-extrabold text-[12px] text-ink hover:text-brand transition"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', minHeight: 36 }}
          >
            View
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {error && (
        <div
          className="rounded-xl p-3 flex items-start gap-2 text-[12px] leading-relaxed"
          style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)' }}
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
          <span className="text-ink/90">{error}</span>
        </div>
      )}
    </div>
  )
}
