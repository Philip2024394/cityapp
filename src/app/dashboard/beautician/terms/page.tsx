'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Check, RotateCcw, Loader2 } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import AppNav from '@/components/layout/AppNav'

// /dashboard/beautician/terms — long-form Terms editor. Backed by the
// universal /api/beautician/me/profile validator (legal_terms column).
// Seeds an editable template when the column is null so vendors don't
// stare at an empty box. Auto-saves on blur — same pattern as the
// banner / promo editors on /edit.

const TODAY = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

function termsTemplate(vendorName: string): string {
  return `TERMS OF SERVICE — ${vendorName}

1. Services
${vendorName} provides beauty services as described on this profile, by appointment.

2. Bookings & cancellations
Bookings are confirmed when payment is received. Cancellations made at least 24 hours before the appointment are eligible for a full refund. Cancellations made less than 24 hours before the appointment are non-refundable.

3. Refunds
If you are not satisfied with the service, please contact us within 24 hours. Refunds are issued at the discretion of the service provider in line with applicable consumer law.

4. Conduct
We reserve the right to refuse service to any client whose behaviour is abusive, unsafe, or inconsistent with a professional environment.

5. Limitation of liability
Our liability is limited to the amount paid for the service. We are not responsible for indirect or consequential losses.

6. Contact
For any concerns, contact us via the WhatsApp number or contact form on our profile.

Last updated: ${TODAY}`
}

type ProviderRow = {
  display_name?: string | null
  legal_terms?:  string | null
}

export default function BeauticianTermsPage() {
  const router = useRouter()
  const [provider, setProvider] = useState<ProviderRow | null>(null)
  const [draft,    setDraft]    = useState('')
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const lastSaved = useRef<string>('')

  const load = useCallback(async () => {
    const supabase = getBrowserSupabase()
    if (!supabase) { setLoading(false); return }
    const { data } = await supabase.auth.getSession()
    if (!data?.session?.user) { router.replace('/login?next=/dashboard/beautician/terms'); return }
    setLoading(true)
    try {
      const r = await fetch('/api/beautician/me', { cache: 'no-store' })
      if (r.ok) {
        const j = await r.json() as { provider: ProviderRow | null }
        const p = j.provider
        setProvider(p)
        const initial = (p?.legal_terms ?? '').trim()
          ? (p?.legal_terms ?? '')
          : termsTemplate(p?.display_name?.trim() || 'Your business')
        setDraft(initial)
        lastSaved.current = initial
      }
    } finally { setLoading(false) }
  }, [router])
  useEffect(() => { void load() }, [load])

  async function commit(value: string) {
    if (value === lastSaved.current) return true
    setSaving(true)
    try {
      const r = await fetch('/api/beautician/me/profile', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ legal_terms: value }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.ok) { alert(j?.error || 'Could not save.'); return false }
      lastSaved.current = value
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1500)
      return true
    } finally { setSaving(false) }
  }

  function reset() {
    if (!provider) return
    if (!confirm('Reset to the template? Your current text will be replaced.')) return
    const tpl = termsTemplate(provider.display_name?.trim() || 'Your business')
    setDraft(tpl)
    void commit(tpl)
  }

  if (loading) return <Shell><Loading /></Shell>

  return (
    <Shell>
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-32">
        <div className="rounded-3xl border border-pink-200/70 bg-gradient-to-br from-pink-50 to-white p-5 shadow-sm mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <FileText size={22} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-[20px] font-black leading-tight text-black truncate">Terms & Conditions</h1>
                <SavedBadge flash={savedFlash} saving={saving} />
              </div>
              <p className="text-[12.5px] text-black/70 leading-snug">
                Required when payments are on. Customers see a link in the footer of your profile.
              </p>
            </div>
          </div>
        </div>

        <section className="rounded-3xl bg-white border border-gray-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-extrabold uppercase tracking-wider text-black/70 inline-flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
                <FileText size={16} strokeWidth={2.5} />
              </span>
              Your terms
            </span>
            <span className={`text-[12px] tabular-nums ${draft.length >= 18000 ? 'text-amber-600 font-bold' : 'text-black/45'}`}>
              {draft.length.toLocaleString()} / 20,000
            </span>
          </div>

          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void commit(draft)}
            maxLength={20000}
            rows={20}
            placeholder="Write your terms…"
            className="w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5 text-[13px] text-black placeholder:text-black/40 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 leading-relaxed font-mono"
            style={{ minHeight: 480 }}
          />

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => void commit(draft)}
              disabled={saving}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider disabled:opacity-50 transition min-h-[44px]"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={2.5} />}
              Save now
            </button>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white hover:bg-gray-50 text-black/70 border border-gray-200 px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider min-h-[44px] transition"
            >
              <RotateCcw size={13} strokeWidth={2.5} />
              Reset to template
            </button>
          </div>

          <p className="text-[12px] text-black/55 leading-snug pt-1">
            Auto-saves when you tap outside the textbox. We seed a starter
            template so you can edit, not write from scratch.
          </p>
        </section>
      </div>
    </Shell>
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
  return <div className="flex items-center justify-center pt-32"><div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" /></div>
}
