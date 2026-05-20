'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MapPinned, Loader2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { useHaptic } from '@/hooks/useHaptic'
import { TOUR_LANGUAGES, type TourLanguageCode } from '@/data/tourLanguages'

// ============================================================================
// TourGuideToggle — driver dashboard toggle:
//   "Available as tour guide (8-hour day)"
//
// One-tap enable with sane defaults (Rp 350k/day, Bahasa selected). Once
// on, an inline panel exposes:
//   • Day rate input (Rp, clamped 200k–750k)
//   • Multi-select language chips
//
// Self-saves on edit (debounced by re-submit) so the driver doesn't need
// a separate "Save" button.
// ============================================================================

const RATE_MIN = 200_000
const RATE_MAX = 750_000

export default function TourGuideToggle() {
  const haptic = useHaptic()
  const [enabled, setEnabled] = useState(false)
  const [dayRate, setDayRate] = useState<number>(350_000)
  const [languages, setLanguages] = useState<TourLanguageCode[]>(['id'])
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
        .select('tour_guide_enabled, tour_guide_day_rate_idr, tour_guide_languages, city')
        .eq('user_id', user.id)
        .maybeSingle()
      if (cancelled) return
      if (data) {
        const row = data as {
          tour_guide_enabled?: boolean
          tour_guide_day_rate_idr?: number | null
          tour_guide_languages?: string[] | null
          city?: string | null
        }
        setEnabled(!!row.tour_guide_enabled)
        setDayRate(row.tour_guide_day_rate_idr ?? 350_000)
        setLanguages(
          (row.tour_guide_languages?.filter((c) => TOUR_LANGUAGES.some((l) => l.code === c)) as TourLanguageCode[])
          ?? ['id'],
        )
        setCity(row.city ?? null)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  async function commit(next: { enabled?: boolean; dayRateIdr?: number; languages?: TourLanguageCode[] }) {
    setError(null)
    setPending(true)
    try {
      const body: Record<string, unknown> = {
        enabled: next.enabled ?? enabled,
      }
      if (next.dayRateIdr !== undefined) body.dayRateIdr = next.dayRateIdr
      if (next.languages !== undefined) body.languages = next.languages

      const res = await fetch('/api/drivers/me/tour-guide-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setError(json.error || `Failed (${res.status})`); return }
      if (next.enabled !== undefined) setEnabled(next.enabled)
      if (next.dayRateIdr !== undefined) setDayRate(next.dayRateIdr)
      if (next.languages !== undefined) setLanguages(next.languages)
      haptic.impact()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setPending(false)
    }
  }

  async function toggle() {
    haptic.tap()
    await commit({ enabled: !enabled })
  }

  function toggleLanguage(code: TourLanguageCode) {
    haptic.tap()
    const has = languages.includes(code)
    // Bahasa always assumed — don't allow removing it.
    if (has && code === 'id') return
    const next = has ? languages.filter((c) => c !== code) : [...languages, code]
    void commit({ languages: next })
  }

  function commitRate() {
    const clamped = Math.min(RATE_MAX, Math.max(RATE_MIN, Math.round(dayRate || 0)))
    if (clamped !== dayRate) setDayRate(clamped)
    void commit({ dayRateIdr: clamped })
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
          background: enabled ? 'rgba(250,204,21,0.05)' : undefined,
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
          <MapPinned className="w-5 h-5" strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-[14px]">
            Tour guide — full-day (8h)
          </div>
          <div className="text-[12px] text-muted mt-0.5 leading-relaxed">
            {enabled
              ? `Listed on /places under Tour Guide — tourists + locals book you for a full day at Rp ${dayRate.toLocaleString('en-US')}`
              : 'Earn from day tours — show up on /places under "Tour Guide" so tourists and locals can book you for a full day out'}
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
          className="card-dark p-3 space-y-3"
          style={{ borderColor: 'rgba(250,204,21,0.25)', background: 'rgba(250,204,21,0.04)' }}
        >
          {/* Day rate */}
          <div>
            <label className="text-[11px] uppercase tracking-wider font-extrabold text-muted">
              Day rate (8 hours, including fuel)
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-[14px] font-extrabold text-muted">Rp</span>
              <input
                type="number"
                inputMode="numeric"
                min={RATE_MIN}
                max={RATE_MAX}
                step={25_000}
                value={dayRate}
                onChange={(e) => setDayRate(Number(e.target.value))}
                onBlur={commitRate}
                className="flex-1 min-w-0 rounded-xl px-3 py-2.5 text-[14px] font-extrabold text-ink focus:outline-none focus:ring-2 focus:ring-brand/60"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  minHeight: 44,
                }}
              />
              <span className="text-[12px] text-muted">/ day</span>
            </div>
            <div className="text-[11px] text-muted/80 mt-1">
              Range Rp {RATE_MIN.toLocaleString('en-US')} – {RATE_MAX.toLocaleString('en-US')}. Tap outside to save.
            </div>
          </div>

          {/* Languages */}
          <div>
            <label className="text-[11px] uppercase tracking-wider font-extrabold text-muted">
              Languages you speak
            </label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {TOUR_LANGUAGES.map((lang) => {
                const active = languages.includes(lang.code)
                const locked = lang.code === 'id'  // Bahasa always selected
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => toggleLanguage(lang.code)}
                    disabled={pending || locked}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12px] font-extrabold transition active:scale-95"
                    style={{
                      background: active ? 'linear-gradient(135deg, #FACC15, #EAB308)' : 'rgba(255,255,255,0.04)',
                      color: active ? '#0A0A0A' : 'rgba(255,255,255,0.70)',
                      border: `1px solid ${active ? 'rgba(0,0,0,0.40)' : 'rgba(255,255,255,0.10)'}`,
                      minHeight: 32,
                      opacity: locked ? 0.85 : 1,
                    }}
                    title={locked ? 'Always selected' : undefined}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.labelId}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* View link */}
          <Link
            href="/places?tour=1"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-extrabold text-[12px] text-ink hover:text-brand transition"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', minHeight: 36 }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#22C55E' }} />
            View my tour-guide card{city ? <> in {city}</> : ''}
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
