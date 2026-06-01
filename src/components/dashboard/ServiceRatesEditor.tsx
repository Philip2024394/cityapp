'use client'
// ============================================================================
// ServiceRatesEditor — shared dashboard editor for per-service rate overrides
// ----------------------------------------------------------------------------
// Drives /dashboard/truck/rates and /dashboard/bus/rates. Reads the canonical
// per-vehicle catalog (TRUCK_SERVICE_OFFERINGS / BUS_SERVICE_OFFERINGS) and
// lets the signed-in driver edit a free-text label + IDR amount + optional
// per-unit suffix on every rate row.
//
// Persistence:
//   - GET  /api/drivers/me/service-rates  → hydrate existing overrides
//   - POST /api/drivers/me/service-rates  → replace `drivers.service_rates`
//
// Reset semantics:
//   - "Reset to default" on a single card removes that service_id from the
//     local state and triggers a single-card save; the public profile then
//     falls back to the catalog default for that service.
//   - "Save all" persists the entire local state in one POST.
//
// Styling matches /dashboard/truck/services + /dashboard/bus/services:
//   yellow brand (#FACC15 / #EAB308), white cards, 13px text floor,
//   44px tap targets.
//
// COMPLIANCE: CityDrivers is a software directory under PM 12/2019. The driver
// self-publishes every rate here; the platform never sets, computes, or
// modifies fares.
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Layers, Plus, Minus, RotateCcw, Loader2, Check, Save, Truck, Bus,
} from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { tryLoadDevDriver } from '@/lib/dev/loadDriverSelf'
import type { ServiceCatalogEntry, RateRow } from '@/lib/drivers/serviceOfferings'

type ServiceRates = Record<string, { rates: RateRow[] }>

type LoadState =
  | { kind: 'loading' }
  | { kind: 'unauth' }
  | { kind: 'no_supabase' }
  | { kind: 'no_driver' }
  | { kind: 'ready'; rates: ServiceRates }
  | { kind: 'error'; message: string }

// ----------------------------------------------------------------------------
// IDR helpers — display thousands with dots, parse digits-only.
// ----------------------------------------------------------------------------
function formatIdr(value: number | null | undefined | string): string {
  if (value === null || value === undefined || value === '') return ''
  const n = typeof value === 'number' ? value : Number(String(value).replace(/\D/g, ''))
  if (!Number.isFinite(n) || n <= 0) return ''
  return n.toLocaleString('id-ID')
}
function parseIdr(text: string): number {
  const digits = text.replace(/\D/g, '')
  if (!digits) return 0
  const n = Number(digits)
  return Number.isFinite(n) ? n : 0
}

// ============================================================================
// Page entry
// ============================================================================
export default function ServiceRatesEditor({
  vehicleType, catalog, backHref, title,
}: {
  vehicleType: 'truck' | 'bus'
  catalog:     readonly ServiceCatalogEntry[]
  backHref:    string
  title:       string
}) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  const reload = useCallback(async () => {
    // DEV BYPASS — localhost impersonation via cr-dev-uid cookie.
    const dev = await tryLoadDevDriver()
    if (dev) {
      const raw = (dev.driver as { service_rates?: unknown }).service_rates
      setState({ kind: 'ready', rates: sanitizeServiceRates(raw) })
      return
    }

    const supabase = getBrowserSupabase()
    if (!supabase) { setState({ kind: 'no_supabase' }); return }
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) { setState({ kind: 'unauth' }); return }

    try {
      const r = await fetch('/api/drivers/me/service-rates', { cache: 'no-store' })
      if (r.status === 401) { setState({ kind: 'unauth' }); return }
      if (!r.ok) {
        const j = await r.json().catch(() => ({})) as { error?: string }
        setState({ kind: 'error', message: j.error ?? `HTTP ${r.status}` })
        return
      }
      const j = await r.json() as { service_rates: ServiceRates }
      setState({ kind: 'ready', rates: sanitizeServiceRates(j.service_rates) })
    } catch (e) {
      setState({ kind: 'error', message: (e as Error).message })
    }
  }, [])

  useEffect(() => { void reload() }, [reload])

  if (state.kind === 'loading')     return <Shell><Skeleton /></Shell>
  if (state.kind === 'no_supabase') return <FullMsg>Auth not configured.</FullMsg>
  if (state.kind === 'unauth')      return <FullMsg cta={{ href: `/login?next=/dashboard/${vehicleType}/rates`, label: 'Sign in' }}>Sign in to edit your per-service rates.</FullMsg>
  if (state.kind === 'no_driver')   return <FullMsg cta={{ href: `/signup?role=driver&vehicle=${vehicleType}`, label: 'Create driver profile' }}>No driver profile yet.</FullMsg>
  if (state.kind === 'error')       return <FullMsg>Could not load: {state.message}</FullMsg>

  return (
    <Editor
      vehicleType={vehicleType}
      catalog={catalog}
      backHref={backHref}
      title={title}
      initialRates={state.rates}
      onReload={() => void reload()}
    />
  )
}

// ----------------------------------------------------------------------------
// Defensive sanitiser — same shape rules the API uses.
// ----------------------------------------------------------------------------
function sanitizeServiceRates(raw: unknown): ServiceRates {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: ServiceRates = {}
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!val || typeof val !== 'object') continue
    const ratesRaw = (val as { rates?: unknown }).rates
    if (!Array.isArray(ratesRaw)) continue
    const rates: RateRow[] = []
    for (const r of ratesRaw) {
      if (!r || typeof r !== 'object') continue
      const row = r as { label?: unknown; idr?: unknown; per?: unknown }
      const label = typeof row.label === 'string' ? row.label : ''
      const idr   = typeof row.idr === 'number' && Number.isFinite(row.idr) ? row.idr : 0
      if (!label || idr <= 0) continue
      const per = typeof row.per === 'string' && row.per.trim() ? row.per : undefined
      rates.push(per ? { label, idr, per } : { label, idr })
    }
    if (rates.length > 0) out[key] = { rates }
  }
  return out
}

// ============================================================================
// Editor — local edit state per-service; POST the whole map on save.
// ============================================================================
type DraftRow = { label: string; idr: string; per: string }
type DraftMap = Record<string, DraftRow[]>

function rowsToDraft(rows: readonly RateRow[]): DraftRow[] {
  return rows.map((r) => ({ label: r.label, idr: formatIdr(r.idr), per: r.per ?? '' }))
}
function draftToRows(rows: DraftRow[]): RateRow[] {
  const out: RateRow[] = []
  for (const r of rows) {
    const label = r.label.trim()
    const idr = parseIdr(r.idr)
    if (!label || idr <= 0) continue
    const per = r.per.trim()
    out.push(per ? { label, idr, per } : { label, idr })
  }
  return out
}

function Editor({
  vehicleType, catalog, backHref, title, initialRates, onReload,
}: {
  vehicleType:  'truck' | 'bus'
  catalog:      readonly ServiceCatalogEntry[]
  backHref:     string
  title:        string
  initialRates: ServiceRates
  onReload:     () => void
}) {
  // Build initial draft per-service: override rows if present, else catalog
  // defaults so the editor never reads "empty".
  const buildInitialDraft = useCallback((): DraftMap => {
    const out: DraftMap = {}
    for (const svc of catalog) {
      const override = initialRates[svc.id]?.rates
      const seed     = override && override.length > 0 ? override : svc.default_rates
      out[svc.id]    = rowsToDraft(seed)
    }
    return out
  }, [catalog, initialRates])

  const [drafts, setDrafts]   = useState<DraftMap>(() => buildInitialDraft())
  const [overrideMap, setOverrideMap] = useState<Record<string, boolean>>(() => {
    // Track which services the driver has actively overridden — drives what
    // we persist (only overridden services hit `drivers.service_rates`).
    const m: Record<string, boolean> = {}
    for (const svc of catalog) {
      if (initialRates[svc.id]?.rates && initialRates[svc.id].rates.length > 0) m[svc.id] = true
    }
    return m
  })
  const [savingAll,  setSavingAll]  = useState(false)
  const [savingId,   setSavingId]   = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  function patchRow(svcId: string, idx: number, patch: Partial<DraftRow>) {
    setDrafts((m) => {
      const copy = { ...m }
      const arr = copy[svcId].slice()
      arr[idx] = { ...arr[idx], ...patch }
      copy[svcId] = arr
      return copy
    })
    setOverrideMap((m) => ({ ...m, [svcId]: true }))
  }
  function addRow(svcId: string) {
    setDrafts((m) => {
      const copy = { ...m }
      copy[svcId] = [...copy[svcId], { label: '', idr: '', per: '' }]
      return copy
    })
    setOverrideMap((m) => ({ ...m, [svcId]: true }))
  }
  function removeRow(svcId: string, idx: number) {
    setDrafts((m) => {
      const copy = { ...m }
      copy[svcId] = copy[svcId].filter((_, i) => i !== idx)
      return copy
    })
    setOverrideMap((m) => ({ ...m, [svcId]: true }))
  }
  function resetService(svc: ServiceCatalogEntry) {
    setDrafts((m) => ({ ...m, [svc.id]: rowsToDraft(svc.default_rates) }))
    setOverrideMap((m) => {
      const copy = { ...m }
      delete copy[svc.id]
      return copy
    })
  }

  // Compose the full payload from the current draft state. Only services
  // flagged as overridden are persisted — others omit the key so the public
  // profile reads the catalog default.
  function composePayload(): ServiceRates {
    const out: ServiceRates = {}
    for (const svc of catalog) {
      if (!overrideMap[svc.id]) continue
      const rows = draftToRows(drafts[svc.id] ?? [])
      if (rows.length > 0) out[svc.id] = { rates: rows }
    }
    return out
  }

  async function postRates(payload: ServiceRates): Promise<boolean> {
    const r = await fetch('/api/drivers/me/service-rates', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ service_rates: payload }),
    })
    if (!r.ok) {
      const j = await r.json().catch(() => ({})) as { error?: string }
      alert(j.error ?? `Save failed (HTTP ${r.status})`)
      return false
    }
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1600)
    return true
  }

  async function saveService(svc: ServiceCatalogEntry) {
    if (savingId) return
    setSavingId(svc.id)
    const ok = await postRates(composePayload())
    setSavingId(null)
    if (ok) onReload()
  }
  async function saveAll() {
    if (savingAll) return
    setSavingAll(true)
    const ok = await postRates(composePayload())
    setSavingAll(false)
    if (ok) onReload()
  }
  async function resetAndSave(svc: ServiceCatalogEntry) {
    if (savingId) return
    resetService(svc)
    setSavingId(svc.id)
    // Build the payload from the post-reset state. We can't rely on the
    // setOverrideMap update being visible yet, so build it manually here.
    const payload: ServiceRates = {}
    for (const other of catalog) {
      if (other.id === svc.id) continue
      if (!overrideMap[other.id]) continue
      const rows = draftToRows(drafts[other.id] ?? [])
      if (rows.length > 0) payload[other.id] = { rates: rows }
    }
    const ok = await postRates(payload)
    setSavingId(null)
    if (ok) onReload()
  }

  const HeroIcon = vehicleType === 'truck' ? Truck : Bus

  return (
    <Shell>
      <div className="max-w-2xl mx-auto px-4 sm:px-5 pt-4 pb-32">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-black/55 hover:text-black mb-3 min-h-[44px]"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
          Back to dashboard
        </Link>

        {/* Hero strip */}
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
              <HeroIcon size={22} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-[20px] font-black leading-tight text-[#0A0A0A] truncate">{title}</h1>
                <span
                  className={`inline-flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-wider rounded-full px-2 py-0.5 border transition ${
                    savedFlash
                      ? 'text-emerald-700 bg-emerald-100 border-emerald-200'
                      : 'text-[#854D0E] bg-white/70 border-[#FACC15]'
                  }`}
                >
                  {savedFlash ? <><Check size={11} strokeWidth={3} /> Saved</> : 'Live'}
                </span>
              </div>
              <p className="text-[12.5px] text-[#0A0A0A]/75 leading-snug">
                Set <strong>your</strong> rates per service. Leave a card untouched and customers see the platform default for it.
              </p>
            </div>
          </div>
        </div>

        {/* Service cards */}
        {catalog.map((svc) => {
          const rows = drafts[svc.id] ?? []
          const isOverride = !!overrideMap[svc.id]
          const isSaving   = savingId === svc.id
          return (
            <section
              key={svc.id}
              className="rounded-3xl bg-white border border-gray-200 p-5 shadow-sm space-y-3 mb-4"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center"
                  style={{ background: '#FEF9C3', color: '#854D0E' }}
                >
                  <Layers size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[15px] font-black text-[#0A0A0A] leading-tight">
                    {svc.label_en} <span className="text-black/55 font-extrabold">({svc.label_id})</span>
                  </h2>
                  <p className="text-[12px] text-black/65 leading-snug mt-1">{svc.description}</p>
                </div>
                {isOverride && (
                  <span className="shrink-0 inline-flex items-center text-[10px] font-extrabold uppercase tracking-wider rounded-full px-2 py-0.5 bg-[#FEF9C3] text-[#854D0E] border border-[#FACC15]">
                    Override
                  </span>
                )}
              </div>

              {/* Rate rows */}
              <div className="space-y-2">
                {rows.length === 0 && (
                  <p className="text-[12px] italic text-black/55">No rate rows. Add one below.</p>
                )}
                {rows.map((row, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <label className="block col-span-5">
                      <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-black/65 mb-1 inline-block">
                        Label
                      </span>
                      <input
                        type="text"
                        value={row.label}
                        onChange={(e) => patchRow(svc.id, i, { label: e.target.value })}
                        placeholder="e.g. In-city"
                        className={inputCls}
                      />
                    </label>
                    <label className="block col-span-4">
                      <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-black/65 mb-1 inline-block">
                        Rp
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={row.idr}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '')
                          patchRow(svc.id, i, { idr: raw ? Number(raw).toLocaleString('id-ID') : '' })
                        }}
                        placeholder="325.000"
                        className={inputCls + ' tabular-nums'}
                      />
                    </label>
                    <label className="block col-span-2">
                      <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-black/65 mb-1 inline-block">
                        Unit
                      </span>
                      <input
                        type="text"
                        value={row.per}
                        onChange={(e) => patchRow(svc.id, i, { per: e.target.value })}
                        placeholder="/unit"
                        className={inputCls}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeRow(svc.id, i)}
                      aria-label="Remove row"
                      className="col-span-1 h-[44px] rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-black/55 active:scale-[0.97] transition"
                    >
                      <Minus className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add + reset + per-card save */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => addRow(svc.id)}
                  className="inline-flex items-center gap-1.5 text-[12px] font-extrabold rounded-xl border border-gray-300 bg-white px-3 py-2 active:scale-[0.98] transition min-h-[44px]"
                >
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                  Add row
                </button>
                <button
                  type="button"
                  onClick={() => resetAndSave(svc)}
                  disabled={isSaving || !isOverride}
                  className="inline-flex items-center gap-1.5 text-[12px] font-extrabold rounded-xl border border-gray-300 bg-white px-3 py-2 active:scale-[0.98] transition min-h-[44px] disabled:opacity-40"
                >
                  <RotateCcw className="w-4 h-4" strokeWidth={2.5} />
                  Reset to default
                </button>
                <button
                  type="button"
                  onClick={() => saveService(svc)}
                  disabled={isSaving || savingAll}
                  className="inline-flex items-center gap-1.5 text-[12px] font-extrabold rounded-xl px-3 py-2 active:scale-[0.98] transition min-h-[44px] disabled:opacity-60"
                  style={{ background: '#FACC15', color: '#0A0A0A', boxShadow: '0 2px 8px rgba(250,204,21,0.30)' }}
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" strokeWidth={2.5} />}
                  Save card
                </button>
              </div>
            </section>
          )
        })}

        {/* Sticky "Save all" footer */}
        <div className="sticky bottom-3 z-30 mt-4">
          <button
            type="button"
            onClick={saveAll}
            disabled={savingAll || !!savingId}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-[14px] font-extrabold active:scale-[0.99] transition disabled:opacity-70 min-h-[52px]"
            style={{ background: '#0A0A0A', color: '#FACC15', boxShadow: '0 10px 25px rgba(0,0,0,0.25)' }}
          >
            {savingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" strokeWidth={2.5} />}
            Save all rates
          </button>
        </div>
      </div>
    </Shell>
  )
}

// ============================================================================
// Building blocks
// ============================================================================
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
      <div className="rounded-3xl bg-gray-100 h-44 mb-4" />
      <div className="rounded-3xl bg-gray-100 h-44 mb-4" />
    </div>
  )
}

function FullMsg({
  children, cta,
}: {
  children: React.ReactNode
  cta?:     { href: string; label: string }
}) {
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

const inputCls =
  'w-full rounded-xl bg-white border border-gray-300 px-3 py-2.5 text-[13px] text-black placeholder:text-black/40 focus:outline-none focus:border-[#EAB308] focus:ring-2 focus:ring-yellow-100 min-h-[44px]'
