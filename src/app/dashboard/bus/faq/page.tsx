'use client'
// ============================================================================
// /dashboard/bus/faq — FAQ editor for the bus profile "Contact Us" surface.
// ----------------------------------------------------------------------------
// Writes to `drivers.faqs` (jsonb, mig 0170). Bus profile renders the same
// array as the FAQ accordion at the top of the "Contact Us" panel.
//
// Auth model + Supabase reads/writes mirror the truck/services pattern:
//   • DEV bypass via tryLoadDevDriver() for localhost impersonation.
//   • Otherwise: requires a signed-in user; redirects to /login on miss.
//
// UI:
//   • One card per FAQ — input for q, textarea for a, trash icon to remove.
//   • "+ Add question" pushes a new empty row.
//   • "Save FAQ" submits via the matching API route (sanitiser strips
//     empty rows + caps q ≤ 200 / a ≤ 1000).
//   • "Reset" clears all FAQs after confirm().
//
// COMPLIANCE: CityDrivers is a software directory under PM 12/2019. The
// driver self-publishes every Q/A. The platform never edits these.
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, HelpCircle, Plus, Trash2, Check, Loader2, Save, RotateCcw } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { tryLoadDevDriver } from '@/lib/dev/loadDriverSelf'

// ----------------------------------------------------------------------------
// Local shape — only the column this page edits.
// ----------------------------------------------------------------------------
type FAQItem = { q: string; a: string }

type LoadState =
  | { kind: 'loading' }
  | { kind: 'unauth' }
  | { kind: 'no_supabase' }
  | { kind: 'no_driver' }
  | { kind: 'ready'; userId: string; faqs: FAQItem[] }
  | { kind: 'error'; message: string }

const Q_MAX = 200
const A_MAX = 1000

// ============================================================================
// Page entry
// ============================================================================
export default function BusFaqPage() {
  const router = useRouter()
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  const reload = useCallback(async () => {
    // DEV BYPASS — localhost impersonation via cr-dev-uid cookie.
    const dev = await tryLoadDevDriver()
    if (dev) {
      const row = dev.driver as unknown as { faqs?: FAQItem[] | null }
      const list = Array.isArray(row.faqs) ? row.faqs! : []
      setState({ kind: 'ready', userId: dev.userId, faqs: list })
      return
    }

    const supabase = getBrowserSupabase()
    if (!supabase) { setState({ kind: 'no_supabase' }); return }
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) { setState({ kind: 'unauth' }); return }
    const { data, error } = await supabase
      .from('drivers')
      .select('user_id, faqs')
      .eq('user_id', user.id)
      .maybeSingle()
    if (error)  { setState({ kind: 'error', message: error.message }); return }
    if (!data)  { setState({ kind: 'no_driver' }); return }
    const row  = data as { faqs?: unknown }
    const list = Array.isArray(row.faqs) ? (row.faqs as FAQItem[]) : []
    setState({ kind: 'ready', userId: user.id, faqs: list })
  }, [])

  useEffect(() => { void reload() }, [reload])

  if (state.kind === 'loading')     return <Shell><Skeleton /></Shell>
  if (state.kind === 'no_supabase') return <FullMsg>Auth not configured.</FullMsg>
  if (state.kind === 'unauth') {
    // Defer the redirect so we don't re-render on every keystroke; the
    // FullMsg + CTA mirrors the truck/services pattern.
    return (
      <FullMsg
        cta={{ href: '/login?next=/dashboard/bus/faq', label: 'Sign in' }}
        onMount={() => { router.replace('/login?next=/dashboard/bus/faq') }}
      >
        Sign in to edit your FAQ.
      </FullMsg>
    )
  }
  if (state.kind === 'no_driver')   return <FullMsg cta={{ href: '/signup/bus', label: 'Create bus driver profile' }}>No bus driver profile yet.</FullMsg>
  if (state.kind === 'error')       return <FullMsg>Could not load: {state.message}</FullMsg>

  return <Editor initialFaqs={state.faqs} onReload={() => void reload()} />
}

// ============================================================================
// Editor — local state + Save FAQ + Reset
// ============================================================================
function Editor({ initialFaqs, onReload }: { initialFaqs: FAQItem[]; onReload: () => void }) {
  const [items, setItems] = useState<FAQItem[]>(initialFaqs)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [errMsg, setErrMsg] = useState<string | null>(null)

  // Keep local in sync if the row reloads (post-save, etc.).
  useEffect(() => { setItems(initialFaqs) }, [initialFaqs])

  function addItem() {
    setItems((cur) => [...cur, { q: '', a: '' }])
  }
  function removeItem(idx: number) {
    setItems((cur) => cur.filter((_, i) => i !== idx))
  }
  function updateItem(idx: number, patch: Partial<FAQItem>) {
    setItems((cur) => cur.map((it, i) => i === idx ? { ...it, ...patch } : it))
  }

  async function save() {
    if (saving) return
    setSaving(true)
    setErrMsg(null)
    try {
      const res = await fetch('/api/drivers/me/faqs', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ faqs: items }),
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        setErrMsg(`Save failed (${res.status})${txt ? `: ${txt.slice(0, 200)}` : ''}`)
        return
      }
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1600)
      onReload()
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  async function resetAll() {
    if (items.length === 0) return
    if (!window.confirm('Remove all FAQs? This clears the list immediately and saves an empty list to your profile.')) return
    setItems([])
    setSaving(true)
    setErrMsg(null)
    try {
      const res = await fetch('/api/drivers/me/faqs', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ faqs: [] }),
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        setErrMsg(`Reset failed (${res.status})${txt ? `: ${txt.slice(0, 200)}` : ''}`)
        return
      }
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1600)
      onReload()
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Reset failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Shell>
      <div className="max-w-2xl mx-auto px-4 sm:px-5 pt-4 pb-32">
        <Link
          href="/dashboard/bus"
          className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-black/55 hover:text-black mb-3 min-h-[44px]"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
          Back to dashboard
        </Link>

        {/* Hero strip — same yellow gradient pattern the truck/services page uses */}
        <div
          className="rounded-3xl p-5 shadow-sm mb-4"
          style={{
            background: 'linear-gradient(135deg, #FACC15 0%, #FEF9C3 100%)',
            border: '1px solid rgba(234,179,8,0.35)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm shrink-0"
              style={{ background: '#EAB308', color: '#0A0A0A' }}
            >
              <HelpCircle size={22} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-[20px] font-black leading-tight text-[#0A0A0A] truncate">Driver FAQ</h1>
                <SavedBadge flash={savedFlash} saving={saving} />
              </div>
              <p className="text-[12.5px] text-[#0A0A0A]/75 leading-snug">
                Shown at the top of the <strong>Contact Us</strong> panel on your bus profile.
                Q ≤ 200 chars · A ≤ 1000 chars.
              </p>
            </div>
          </div>
        </div>

        {/* List */}
        <section className="rounded-3xl bg-white border border-gray-200 p-5 shadow-sm mb-4 space-y-3">
          {items.length === 0 ? (
            <div className="rounded-xl bg-gray-50 border border-dashed border-gray-300 p-6 text-center">
              <HelpCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" strokeWidth={2} />
              <p className="text-[13px] text-black/55 leading-snug">
                No questions yet. Tap <strong>+ Add question</strong> below to start.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {items.map((it, idx) => (
                <FaqCard
                  key={idx}
                  index={idx}
                  item={it}
                  onChange={(patch) => updateItem(idx, patch)}
                  onRemove={() => removeItem(idx)}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={addItem}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] text-[#0A0A0A] px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider transition min-h-[44px]"
          >
            <Plus size={14} strokeWidth={3} />
            Add question
          </button>
        </section>

        {/* Action row — Save FAQ + Reset */}
        <div className="flex flex-col sm:flex-row items-stretch gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-black hover:bg-[#0A0A0A] text-white px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider disabled:opacity-60 disabled:cursor-not-allowed transition min-h-[44px]"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} strokeWidth={2.5} />}
            Save FAQ
          </button>
          <button
            type="button"
            onClick={resetAll}
            disabled={saving || items.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-gray-300 text-black/70 hover:bg-gray-50 px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed transition min-h-[44px]"
          >
            <RotateCcw size={14} strokeWidth={2.5} />
            Reset
          </button>
        </div>

        {errMsg && (
          <p className="text-[12px] text-rose-600 leading-snug mt-3">{errMsg}</p>
        )}
      </div>
    </Shell>
  )
}

// ============================================================================
// Per-FAQ card — q input + a textarea + remove trash icon
// ============================================================================
function FaqCard({
  index, item, onChange, onRemove,
}: {
  index:    number
  item:     FAQItem
  onChange: (patch: Partial<FAQItem>) => void
  onRemove: () => void
}) {
  return (
    <div className="relative rounded-2xl bg-gray-50 border border-gray-200 p-3 space-y-2">
      <div className="flex items-center gap-1">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white border border-gray-200 text-[12px] font-extrabold text-black/60 shrink-0">
          {index + 1}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove FAQ"
          className="w-9 h-9 rounded-lg bg-white border border-gray-200 text-rose-600 hover:bg-rose-50 hover:border-rose-200 flex items-center justify-center transition"
        >
          <Trash2 size={15} strokeWidth={2.5} />
        </button>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[12px] font-extrabold uppercase tracking-wider text-black/70">Question</label>
          <span className={`text-[12px] tabular-nums ${item.q.length >= Q_MAX - 20 ? 'text-amber-600' : 'text-black/40'}`}>
            {item.q.length} / {Q_MAX}
          </span>
        </div>
        <input
          type="text"
          value={item.q}
          onChange={(e) => onChange({ q: e.target.value.slice(0, Q_MAX) })}
          placeholder="How many passengers fit?"
          maxLength={Q_MAX}
          className="w-full rounded-xl bg-white border border-gray-200 px-3 py-2.5 text-[13px] font-bold text-black placeholder:text-black/40 placeholder:font-normal focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 min-h-[44px]"
        />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[12px] font-extrabold uppercase tracking-wider text-black/70">Answer</label>
          <span className={`text-[12px] tabular-nums ${item.a.length >= A_MAX - 100 ? 'text-amber-600' : 'text-black/40'}`}>
            {item.a.length} / {A_MAX}
          </span>
        </div>
        <textarea
          value={item.a}
          onChange={(e) => onChange({ a: e.target.value.slice(0, A_MAX) })}
          placeholder="14 passengers + luggage, all seated with seatbelts."
          maxLength={A_MAX}
          rows={3}
          className="w-full rounded-xl bg-white border border-gray-200 px-3 py-2.5 text-[13px] text-black placeholder:text-black/40 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 leading-snug resize-y"
          style={{ minHeight: 80 }}
        />
      </div>
    </div>
  )
}

// ============================================================================
// Layout helpers
// ============================================================================
function SavedBadge({ flash, saving }: { flash: boolean; saving: boolean }) {
  if (saving) {
    return (
      <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-wider text-black/55 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5">
        <Loader2 size={10} className="animate-spin" /> Saving
      </span>
    )
  }
  if (flash) {
    return (
      <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-full px-2 py-0.5">
        <Check size={10} strokeWidth={3} /> Saved
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-wider text-[#854D0E] bg-white/70 border border-[#FACC15] rounded-full px-2 py-0.5">
      Live
    </span>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] bg-[#F5F5F4] text-[#0A0A0A]">
      <AppNav />
      {children}
    </main>
  )
}

function Skeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-5 pt-4 pb-32 animate-pulse">
      <div className="h-4 w-32 rounded bg-gray-200 mb-3" />
      <div className="rounded-3xl bg-gray-100 h-24 mb-4" />
      <div className="rounded-3xl bg-gray-100 h-64 mb-4" />
    </div>
  )
}

function FullMsg({
  children, cta, onMount,
}: {
  children: React.ReactNode
  cta?:     { href: string; label: string }
  onMount?: () => void
}) {
  useEffect(() => { onMount?.() }, [onMount])
  return (
    <Shell>
      <div className="max-w-md mx-auto px-4 pt-24 text-center">
        <div className="text-[14px] font-bold text-black/70 leading-relaxed">{children}</div>
        {cta && (
          <Link
            href={cta.href}
            className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#FACC15] text-[#0A0A0A] text-[13px] font-extrabold shadow-[0_8px_24px_rgba(250,204,21,0.45)] active:scale-[0.97] transition"
            style={{ minHeight: 44 }}
          >
            {cta.label}
          </Link>
        )}
      </div>
    </Shell>
  )
}
