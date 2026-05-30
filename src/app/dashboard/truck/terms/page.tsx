'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileText, Check, RotateCcw, Loader2, ArrowLeft } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import AppNav from '@/components/layout/AppNav'

// /dashboard/truck/terms — long-form Terms editor for truck drivers.
// Mirrors beautician/terms 1:1: seeds an editable template when
// legal_terms is null so drivers don't stare at an empty box,
// auto-saves on blur. Backed by legal_terms (text) on the drivers
// table — Phase 2 migration adds the column; until then the save will
// fail silently.

const TODAY = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

function termsTemplate(driverName: string): string {
  return `TERMS OF SERVICE — ${driverName}

1. Services
${driverName} provides truck / pickup transport services as described on this profile, by appointment. Common jobs include pindahan rumah (house moves), cargo delivery, inter-city transport, and bulky-item runs.

2. Bookings & cancellations
Bookings are confirmed when a deposit is received. For daily rentals, cancellations made at least 1 day before the agreed start time are eligible for a full refund. For hourly jobs, the hourly deposit is retained if cancelled after confirmation. Cancellations due to unsafe road or weather conditions are exempt.

3. Fares, tolls & extras
Fares are based on the rate shown on this profile. Toll roads, parking, ferry tickets, and fuel surcharges for routes outside the agreed area are passed through at cost and added to the final fare.

4. Loading, unloading & waiting time
The agreed fare includes a reasonable loading and unloading window (typically 30 minutes at each end for in-city jobs). Time beyond this window is charged at the overtime rate per hour stated below, rounded up to the next half-hour.

5. Helpers (anak buah)
If you request helpers to load or unload, helper fees are quoted separately per person per job and confirmed in writing before the trip. The driver alone is not expected to lift heavy or bulky items without booked helpers.

6. Weight & cargo limits
The maximum cargo weight is the legal payload of the vehicle as listed on its STNK / registration. Overloading is refused — it voids vehicle insurance and risks road-safety penalties. Hazardous, illegal, or perishable goods that require refrigeration are not accepted unless arranged in advance.

7. Overtime
Work continuing past the agreed window — whether due to loading delays, traffic, or scope changes — is billed at the overtime rate per hour stated on this profile, agreed before the extra time begins.

8. Damage liability
Reasonable care is taken with all cargo. The customer is responsible for properly packing fragile items. Liability for damage in transit is limited to the amount paid for the trip unless the customer arranges separate cargo insurance and notifies us in writing before pickup. Pre-existing damage on items should be photographed by the customer at pickup.

9. Conduct
We reserve the right to refuse service for behaviour that is abusive, unsafe, or inconsistent with safe driving. Smoking, open alcohol, and illegal substances are not permitted in the cab.

10. Limitation of liability
Our liability is limited to the amount paid for the trip. We are not responsible for indirect or consequential losses. Standard vehicle insurance applies; cargo insurance is the customer's responsibility unless purchased separately.

11. Contact
For any concerns, contact us via the WhatsApp number or contact form on our profile.

Last updated: ${TODAY}`
}

type DriverTermsRow = {
  business_name?: string | null
  legal_terms?:   string | null
}

export default function TruckDriverTermsPage() {
  const router = useRouter()
  const [driver,   setDriver]   = useState<DriverTermsRow | null>(null)
  const [draft,    setDraft]    = useState('')
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const userIdRef = useRef<string | null>(null)
  const lastSaved = useRef<string>('')

  const load = useCallback(async () => {
    const supabase = getBrowserSupabase()
    if (!supabase) { setLoading(false); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login?next=/dashboard/truck/terms'); return }
    userIdRef.current = user.id
    setLoading(true)
    try {
      const { data } = await supabase
        .from('drivers')
        .select('business_name, legal_terms')
        .eq('user_id', user.id)
        .maybeSingle()
      const row = (data ?? null) as DriverTermsRow | null
      setDriver(row)
      const initial = (row?.legal_terms ?? '').trim()
        ? (row?.legal_terms ?? '')
        : termsTemplate(row?.business_name?.trim() || 'Your truck business')
      setDraft(initial)
      lastSaved.current = initial
    } finally { setLoading(false) }
  }, [router])
  useEffect(() => { void load() }, [load])

  async function commit(value: string) {
    const supabase = getBrowserSupabase()
    const uid = userIdRef.current
    if (!supabase || !uid) return false
    if (value === lastSaved.current) return true
    setSaving(true)
    try {
      const { error } = await supabase
        .from('drivers')
        .update({ legal_terms: value })
        .eq('user_id', uid)
      if (error) { alert(error.message || 'Could not save.'); return false }
      lastSaved.current = value
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1500)
      return true
    } finally { setSaving(false) }
  }

  function reset() {
    if (!driver) return
    if (!confirm('Reset to the template? Your current text will be replaced.')) return
    const tpl = termsTemplate(driver.business_name?.trim() || 'Your truck business')
    setDraft(tpl)
    void commit(tpl)
  }

  if (loading) return <Shell><Loading /></Shell>

  return (
    <Shell>
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-32">
        <Link
          href="/dashboard/truck"
          className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-black/55 hover:text-black mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
          Back to dashboard
        </Link>

        <div className="rounded-3xl border border-yellow-200/70 bg-gradient-to-br from-yellow-50 to-white p-5 shadow-sm mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-yellow-500 text-black flex items-center justify-center shadow-sm shrink-0">
              <FileText size={22} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-[20px] font-black leading-tight text-black truncate">Terms &amp; Conditions</h1>
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
              <span className="w-7 h-7 rounded-lg bg-yellow-100 text-yellow-700 flex items-center justify-center shrink-0">
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
            className="w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5 text-[13px] text-black placeholder:text-black/40 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 leading-relaxed font-mono"
            style={{ minHeight: 480 }}
          />

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => void commit(draft)}
              disabled={saving}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider disabled:opacity-50 transition min-h-[44px]"
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
  return <div className="flex items-center justify-center pt-32"><div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" /></div>
}
