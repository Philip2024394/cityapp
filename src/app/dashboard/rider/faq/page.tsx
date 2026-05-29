'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { HelpCircle, Check, Plus, X, ChevronUp, ChevronDown, Loader2, ArrowLeft } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import AppNav from '@/components/layout/AppNav'

// /dashboard/rider/faq — FAQ editor for bike riders (ojek). Mirrors the
// beautician/faq UX 1:1: debounced auto-save (1s after last edit) for
// the list, instant commit for the master toggle. Backed by faq_items
// (jsonb) + faq_enabled (boolean) on the drivers table — bike riders
// share the drivers table with vehicle_type='bike' discriminator.
// Migration 0144 added these columns.
//
// Writes go directly to the drivers row via the browser Supabase client
// because /api/onboarding/driver is a row-create endpoint, not a generic
// profile updater (unlike beautician/me/profile).

type FAQItem = { q: string; a: string }
type DriverFaqRow = {
  faq_items?:   FAQItem[] | null
  faq_enabled?: boolean   | null
}

const MAX_ITEMS = 30
const Q_MAX = 200
const A_MAX = 2000

export default function RiderFaqPage() {
  const router = useRouter()
  const [items,    setItems]    = useState<FAQItem[]>([])
  const [enabled,  setEnabled]  = useState(false)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const userIdRef       = useRef<string | null>(null)
  const initialLoadDone = useRef(false)
  const lastSavedSig    = useRef<string>('')
  const saveTimer       = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    const supabase = getBrowserSupabase()
    if (!supabase) { setLoading(false); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login?next=/dashboard/rider/faq'); return }
    userIdRef.current = user.id
    setLoading(true)
    try {
      const { data } = await supabase
        .from('drivers')
        .select('faq_items, faq_enabled')
        .eq('user_id', user.id)
        .maybeSingle()
      const row = (data ?? null) as DriverFaqRow | null
      const list = Array.isArray(row?.faq_items) ? row!.faq_items! : []
      const flag = !!row?.faq_enabled
      setItems(list)
      setEnabled(flag)
      lastSavedSig.current = JSON.stringify(list)
      initialLoadDone.current = true
    } finally { setLoading(false) }
  }, [router])
  useEffect(() => { void load() }, [load])

  // Debounced auto-save for the FAQ array. The toggle commits via its
  // own immediate call, so we only watch `items` here.
  useEffect(() => {
    if (!initialLoadDone.current) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    const sig = JSON.stringify(items)
    if (sig === lastSavedSig.current) return
    saveTimer.current = setTimeout(() => { void commitItems(items) }, 1000)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  async function commitItems(next: FAQItem[]) {
    const supabase = getBrowserSupabase()
    const uid = userIdRef.current
    if (!supabase || !uid) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('drivers')
        .update({ faq_items: next })
        .eq('user_id', uid)
      if (error) { alert(error.message || 'Could not save.'); return }
      lastSavedSig.current = JSON.stringify(next)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1500)
    } finally { setSaving(false) }
  }

  async function setEnabledNow(next: boolean) {
    const supabase = getBrowserSupabase()
    const uid = userIdRef.current
    if (!supabase || !uid) return
    setEnabled(next)
    const prev = enabled
    try {
      const { error } = await supabase
        .from('drivers')
        .update({ faq_enabled: next })
        .eq('user_id', uid)
      if (error) {
        setEnabled(prev)
        alert(error.message || 'Could not save.')
        return
      }
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1500)
    } catch {
      setEnabled(prev)
    }
  }

  function addItem() {
    if (items.length >= MAX_ITEMS) return
    setItems((cur) => [...cur, { q: '', a: '' }])
  }
  function removeItem(idx: number) {
    setItems((cur) => cur.filter((_, i) => i !== idx))
  }
  function move(idx: number, dir: -1 | 1) {
    const next = idx + dir
    if (next < 0 || next >= items.length) return
    setItems((cur) => {
      const copy = cur.slice()
      const [it] = copy.splice(idx, 1)
      copy.splice(next, 0, it)
      return copy
    })
  }
  function updateItem(idx: number, patch: Partial<FAQItem>) {
    setItems((cur) => cur.map((it, i) => i === idx ? { ...it, ...patch } : it))
  }

  if (loading) return <Shell><Loading /></Shell>

  const count = items.length
  const counterAmber = count >= 25

  return (
    <Shell>
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-32">
        <Link
          href="/dashboard/rider"
          className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-black/55 hover:text-black mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
          Back to dashboard
        </Link>

        <div className="rounded-3xl border border-yellow-200/70 bg-gradient-to-br from-yellow-50 to-white p-5 shadow-sm mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-yellow-500 text-black flex items-center justify-center shadow-sm shrink-0">
              <HelpCircle size={22} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-[20px] font-black leading-tight text-black truncate">Rider FAQ</h1>
                <SavedBadge flash={savedFlash} saving={saving} />
              </div>
              <p className="text-[12.5px] text-black/70 leading-snug">
                Shown above the contact form on your profile. Helps riders self-serve.
              </p>
            </div>
          </div>
        </div>

        {/* Master toggle */}
        <Section title="Visibility" icon={<HelpCircle size={16} strokeWidth={2.5} />}>
          <button
            type="button"
            onClick={() => void setEnabledNow(!enabled)}
            className={`w-full rounded-xl p-3 border flex items-center justify-between gap-3 transition min-h-[56px] ${
              enabled
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <div className="min-w-0 text-left">
              <div className="text-[13px] font-extrabold text-black">Show FAQ on profile</div>
              <div className="text-[12px] text-black/55 leading-snug mt-0.5">
                {enabled
                  ? 'Visible above the contact form. Off-switch hides it instantly.'
                  : 'Hidden. Toggle on once you have a few questions written.'}
              </div>
            </div>
            <span
              className={`shrink-0 inline-flex items-center w-11 h-6 rounded-full transition ${
                enabled ? 'bg-yellow-500' : 'bg-gray-300'
              }`}
              aria-hidden
            >
              <span
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  enabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </span>
          </button>
        </Section>

        {/* List */}
        <Section
          title="Questions"
          icon={<HelpCircle size={16} strokeWidth={2.5} />}
          headerRight={
            <span className={`text-[12px] tabular-nums font-bold ${counterAmber ? 'text-amber-600' : 'text-black/50'}`}>
              {count} / {MAX_ITEMS}
            </span>
          }
        >
          {items.length === 0 ? (
            <div className="rounded-xl bg-gray-50 border border-dashed border-gray-300 p-6 text-center">
              <HelpCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" strokeWidth={2} />
              <p className="text-[13px] text-black/55 leading-snug">
                No questions yet. Tap <strong>Add question</strong> below to start.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {items.map((it, idx) => (
                <FaqCard
                  key={idx}
                  index={idx}
                  total={items.length}
                  item={it}
                  onChange={(patch) => updateItem(idx, patch)}
                  onRemove={() => removeItem(idx)}
                  onMoveUp={() => move(idx, -1)}
                  onMoveDown={() => move(idx, 1)}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={addItem}
            disabled={count >= MAX_ITEMS}
            className="w-full mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed transition min-h-[44px]"
          >
            <Plus size={14} strokeWidth={3} />
            Add question
          </button>

          <p className="text-[12px] text-black/55 leading-snug pt-1">
            Saves automatically a second after you stop typing.
          </p>
        </Section>
      </div>
    </Shell>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Per-FAQ card
// ─────────────────────────────────────────────────────────────────────

function FaqCard({
  index, total, item, onChange, onRemove, onMoveUp, onMoveDown,
}: {
  index:      number
  total:      number
  item:       FAQItem
  onChange:   (patch: Partial<FAQItem>) => void
  onRemove:   () => void
  onMoveUp:   () => void
  onMoveDown: () => void
}) {
  return (
    <div className="relative rounded-2xl bg-gray-50 border border-gray-200 p-3 space-y-2">
      {/* Header row — index + reorder + delete */}
      <div className="flex items-center gap-1">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white border border-gray-200 text-[12px] font-extrabold text-black/60 shrink-0">
          {index + 1}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          aria-label="Move up"
          className="w-9 h-9 rounded-lg bg-white border border-gray-200 text-black/65 hover:text-black hover:bg-gray-100 flex items-center justify-center disabled:opacity-35 disabled:cursor-not-allowed transition"
        >
          <ChevronUp size={15} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          aria-label="Move down"
          className="w-9 h-9 rounded-lg bg-white border border-gray-200 text-black/65 hover:text-black hover:bg-gray-100 flex items-center justify-center disabled:opacity-35 disabled:cursor-not-allowed transition"
        >
          <ChevronDown size={15} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove"
          className="w-9 h-9 rounded-lg bg-white border border-gray-200 text-rose-600 hover:bg-rose-50 hover:border-rose-200 flex items-center justify-center transition ml-1"
        >
          <X size={15} strokeWidth={2.5} />
        </button>
      </div>

      {/* Question */}
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
          placeholder="Do you do airport pickups?"
          maxLength={Q_MAX}
          className="w-full rounded-xl bg-white border border-gray-200 px-3 py-2.5 text-[13px] font-bold text-black placeholder:text-black/40 placeholder:font-normal focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 min-h-[44px]"
        />
      </div>

      {/* Answer */}
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
          placeholder="Yes — Ngurah Rai airport runs daily. Message me on WhatsApp to confirm pickup time and meeting point."
          maxLength={A_MAX}
          rows={3}
          className="w-full rounded-xl bg-white border border-gray-200 px-3 py-2.5 text-[13px] text-black placeholder:text-black/40 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 leading-snug resize-y"
          style={{ minHeight: 80 }}
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Layout helpers
// ─────────────────────────────────────────────────────────────────────

function Section({
  title, icon, headerRight, children,
}: {
  title:        string
  icon?:        React.ReactNode
  headerRight?: React.ReactNode
  children:     React.ReactNode
}) {
  return (
    <section className="rounded-3xl bg-white border border-gray-200 p-5 shadow-sm space-y-3 mb-4">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-wider text-black/70">
          {icon && (
            <span className="w-7 h-7 rounded-lg bg-yellow-100 text-yellow-700 flex items-center justify-center shrink-0">
              {icon}
            </span>
          )}
          <span>{title}</span>
        </span>
        {headerRight}
      </div>
      {children}
    </section>
  )
}

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
  return null
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] bg-white text-black">
      <AppNav />
      {children}
    </main>
  )
}
function Loading() {
  return <div className="flex items-center justify-center pt-32"><div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" /></div>
}
