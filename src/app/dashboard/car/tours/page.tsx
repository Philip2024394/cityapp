'use client'
// ============================================================================
// /dashboard/car/tours — Tour packages editor (car drivers)
// ----------------------------------------------------------------------------
// Drivers clone-from-template, edit, publish, and delete tour packages.
// Tour packages = pre-built itineraries the driver sells as packages
// (Borobudur Sunrise, Merapi Jeep, Yogya City Classic, etc.). Surface a
// 3rd revenue channel alongside Passenger / Parcel / Hourly Hire.
//
// Save model — save-on-blur for text/number, instant-save for the publish
// toggle. New rows insert with the template's full payload (title,
// description, duration, max_pax, includes/excludes, place_slugs,
// template_id, suggested_price as price_idr). Delete is hard-delete
// scoped to the current user_id.
//
// COMPLIANCE: IndoCity stays a software directory under PM 12/2019. We
// never set the final price — templates carry suggested prices (~10-20%
// below market floor) but the driver overrides freely. WhatsApp handoff
// is the contract; we just present the listing.
// ============================================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Loader2, Map as MapIcon, Plus, Trash2, CheckCircle2,
  X as XIcon, AlertTriangle,
} from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { tryLoadDevDriver } from '@/lib/dev/loadDriverSelf'
import {
  tourTemplatesForVehicle,
  type TourTemplate,
  type TourVehicleKind,
} from '@/lib/tours/templates'
import type { TourPackage } from '@/lib/tours/types'

const VEHICLE: TourVehicleKind = 'car'
const BACK_HREF = '/dashboard/car'

// ----------------------------------------------------------------------------
// IDR formatting helpers — display thousands with dots, parse digits-only.
// Same pattern as /dashboard/car/services.
// ----------------------------------------------------------------------------
function formatIdr(value: number | null | undefined | string): string {
  if (value === null || value === undefined || value === '') return ''
  const n = typeof value === 'number' ? value : Number(String(value).replace(/\D/g, ''))
  if (!Number.isFinite(n) || n <= 0) return ''
  return n.toLocaleString('id-ID')
}
function parseIdr(text: string): number | null {
  const digits = text.replace(/\D/g, '')
  if (!digits) return null
  const n = Number(digits)
  return Number.isFinite(n) ? n : null
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'unauth' }
  | { kind: 'no_supabase' }
  | { kind: 'no_driver' }
  | { kind: 'wrong_vehicle'; type: string }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; driverId: string; tours: TourPackage[] }

export default function CarToursPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  const reload = useCallback(async () => {
    const supabase = getBrowserSupabase()
    if (!supabase) { setState({ kind: 'no_supabase' }); return }

    // DEV BYPASS — localhost impersonation via cr-dev-uid cookie.
    let driverId: string | null = null
    let vehicleType: string | null = null
    const dev = await tryLoadDevDriver()
    if (dev) {
      driverId = (dev.driver as unknown as { user_id: string }).user_id
      vehicleType = (dev.driver as unknown as { vehicle_type: string | null }).vehicle_type
    } else {
      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      if (authErr || !user) { setState({ kind: 'unauth' }); return }
      const { data, error } = await supabase
        .from('drivers')
        .select('user_id, vehicle_type')
        .eq('user_id', user.id)
        .maybeSingle()
      if (error)     { setState({ kind: 'error', message: error.message }); return }
      if (!data)     { setState({ kind: 'no_driver' }); return }
      driverId = (data as { user_id: string }).user_id
      vehicleType = (data as { vehicle_type: string | null }).vehicle_type
    }

    if (vehicleType && vehicleType !== VEHICLE) {
      setState({ kind: 'wrong_vehicle', type: vehicleType })
      return
    }
    if (!driverId) { setState({ kind: 'no_driver' }); return }

    const { data, error } = await supabase
      .from('driver_tour_packages')
      .select('*')
      .eq('driver_id', driverId)
      .order('published', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) { setState({ kind: 'error', message: error.message }); return }
    setState({ kind: 'ready', driverId, tours: (data ?? []) as unknown as TourPackage[] })
  }, [])

  useEffect(() => { void reload() }, [reload])

  if (state.kind === 'loading')        return <FullPageMessage spinner>Loading tours…</FullPageMessage>
  if (state.kind === 'no_supabase')    return <FullPageMessage>Auth not configured. Refresh the page.</FullPageMessage>
  if (state.kind === 'unauth')         return <FullPageMessage cta={{ href: '/login?next=/dashboard/car/tours', label: 'Sign in' }}>Sign in to manage your tours.</FullPageMessage>
  if (state.kind === 'no_driver')      return <FullPageMessage cta={{ href: '/signup?role=driver&vehicle=car', label: 'Create driver profile' }}>No driver profile yet.</FullPageMessage>
  if (state.kind === 'wrong_vehicle')  return <FullPageMessage>Tour packages live on the car / bike dashboards. Your profile is {state.type}.</FullPageMessage>
  if (state.kind === 'error')          return <FullPageMessage>Could not load tours: {state.message}</FullPageMessage>

  return <ToursEditor driverId={state.driverId} tours={state.tours} onReload={() => void reload()} />
}

// ============================================================================
// Editor — list + add-from-template modal + edit cards.
// ============================================================================
function ToursEditor({
  driverId, tours, onReload,
}: {
  driverId: string
  tours:    TourPackage[]
  onReload: () => void
}) {
  const [templateOpen, setTemplateOpen] = useState(false)
  const [savedFlash, setSavedFlash]     = useState<string | null>(null)
  const [errorFlash, setErrorFlash]     = useState<string | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showSaved(label: string) {
    setSavedFlash(label); setErrorFlash(null)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setSavedFlash(null), 1800)
  }
  function showError(msg: string) {
    setErrorFlash(msg); setSavedFlash(null)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setErrorFlash(null), 3200)
  }

  const cloneFromTemplate = useCallback(async (tpl: TourTemplate) => {
    const supabase = getBrowserSupabase()
    if (!supabase) { showError('Supabase not configured.'); return }
    const { error } = await supabase.from('driver_tour_packages').insert({
      driver_id:      driverId,
      template_id:    tpl.id,
      title:          tpl.title,
      description:    tpl.description,
      duration_hours: tpl.duration_hours,
      max_pax:        tpl.max_pax,
      price_idr:      tpl.suggested_price,
      includes:       [...tpl.includes],
      excludes:       [...tpl.excludes],
      place_slugs:    [...tpl.place_slugs],
      published:      false,
    })
    if (error) { showError(error.message); return }
    showSaved(`Added "${tpl.title}" as draft`)
    setTemplateOpen(false)
    onReload()
  }, [driverId, onReload])

  return (
    <Shell>
      <BackLink />

      {/* Brand hero */}
      <div
        className="rounded-3xl border p-5 shadow-sm mb-4"
        style={{
          background: 'linear-gradient(135deg, #FFFBEA 0%, #FFFFFF 100%)',
          borderColor: 'rgba(250,204,21,0.45)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl text-[#0A0A0A] flex items-center justify-center shadow-sm shrink-0"
            style={{ background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)' }}
          >
            <MapIcon size={22} strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[20px] font-black leading-tight text-[#0A0A0A] truncate">Tour packages</h1>
            <p className="text-[12.5px] text-black/70 leading-snug mt-0.5">
              Pre-built itineraries you sell as packages. Customer books the tour, you confirm date on WhatsApp.
            </p>
          </div>
        </div>
      </div>

      {/* Flash banner */}
      {(savedFlash || errorFlash) && (
        <div
          role="status"
          className={`rounded-2xl border text-[13px] font-extrabold px-4 py-3 mb-4 flex items-center gap-2 shadow-sm ${
            errorFlash
              ? 'border-red-300 bg-red-50 text-red-800'
              : 'border-emerald-300 bg-emerald-50 text-emerald-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden />
          <span className="truncate">{errorFlash ?? savedFlash}</span>
        </div>
      )}

      {/* Add-from-template CTA */}
      <button
        type="button"
        onClick={() => setTemplateOpen(true)}
        className="w-full inline-flex items-center justify-center gap-2 rounded-2xl font-extrabold text-[14px] uppercase tracking-wider mb-4 transition active:scale-[0.99]"
        style={{
          minHeight: 52,
          background: '#FACC15',
          color: '#0A0A0A',
          border: '1px solid #FACC15',
          boxShadow: '0 8px 18px rgba(250,204,21,0.35)',
        }}
      >
        <Plus className="w-4 h-4" strokeWidth={2.75} />
        Add from template
      </button>

      {/* Tour list */}
      {tours.length === 0 ? (
        <div
          className="rounded-3xl bg-white border border-black/10 p-6 text-center shadow-sm"
        >
          <p className="text-[13px] font-extrabold text-[#0A0A0A]">No tours yet.</p>
          <p className="text-[13px] text-black/55 leading-snug mt-1">
            Tap &quot;Add from template&quot; above to clone one of the canonical Yogya tours.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tours.map((t) => (
            <TourCard
              key={t.id}
              driverId={driverId}
              tour={t}
              onSaved={(label) => { showSaved(label); onReload() }}
              onError={showError}
              onDeleted={() => { showSaved('Tour deleted'); onReload() }}
            />
          ))}
        </div>
      )}

      <p className="text-[11.5px] text-black/45 leading-snug px-1 mt-4">
        Tour packages are draft until you flip the publish toggle. Published
        tours appear under the &quot;Tours&quot; tab on your public profile.
      </p>

      {templateOpen && (
        <TemplatePickerSheet
          vehicle={VEHICLE}
          onClose={() => setTemplateOpen(false)}
          onPick={(tpl) => void cloneFromTemplate(tpl)}
        />
      )}
    </Shell>
  )
}

// ============================================================================
// Single tour card — editable text/number fields with save-on-blur, plus
// the publish toggle (instant-save) and delete (confirm).
// ============================================================================
function TourCard({
  driverId, tour, onSaved, onError, onDeleted,
}: {
  driverId:  string
  tour:      TourPackage
  onSaved:   (label: string) => void
  onError:   (msg: string) => void
  onDeleted: () => void
}) {
  const [title,       setTitle]       = useState(tour.title)
  const [description, setDescription] = useState(tour.description ?? '')
  const [duration,    setDuration]    = useState<string>(String(tour.duration_hours))
  const [maxPax,      setMaxPax]      = useState<string>(tour.max_pax != null ? String(tour.max_pax) : '')
  const [priceIdr,    setPriceIdr]    = useState<string>(formatIdr(tour.price_idr))
  const [includes,    setIncludes]    = useState<string>(tour.includes.join(', '))
  const [excludes,    setExcludes]    = useState<string>(tour.excludes.join(', '))
  const [photoUrl,    setPhotoUrl]    = useState(tour.photo_url ?? '')
  const [published,   setPublished]   = useState(tour.published)
  const [busyField,   setBusyField]   = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Re-hydrate when the parent reloads. Saves are scoped per-field so
  // typing in another card during a reload shouldn't clobber edits in
  // progress, but a fresh parent row should be authoritative on mount.
  useEffect(() => { setTitle(tour.title) }, [tour.title])
  useEffect(() => { setDescription(tour.description ?? '') }, [tour.description])
  useEffect(() => { setDuration(String(tour.duration_hours)) }, [tour.duration_hours])
  useEffect(() => { setMaxPax(tour.max_pax != null ? String(tour.max_pax) : '') }, [tour.max_pax])
  useEffect(() => { setPriceIdr(formatIdr(tour.price_idr)) }, [tour.price_idr])
  useEffect(() => { setIncludes(tour.includes.join(', ')) }, [tour.includes])
  useEffect(() => { setExcludes(tour.excludes.join(', ')) }, [tour.excludes])
  useEffect(() => { setPhotoUrl(tour.photo_url ?? '') }, [tour.photo_url])
  useEffect(() => { setPublished(tour.published) }, [tour.published])

  async function save(field: string, patch: Record<string, unknown>, label: string) {
    const supabase = getBrowserSupabase()
    if (!supabase) { onError('Supabase not configured.'); return false }
    setBusyField(field)
    const { error } = await supabase
      .from('driver_tour_packages')
      .update(patch)
      .eq('id', tour.id)
      .eq('driver_id', driverId)
    setBusyField(null)
    if (error) { onError(error.message); return false }
    onSaved(label)
    return true
  }

  function commitTitle() {
    const next = title.trim().slice(0, 120)
    if (!next || next === tour.title) return
    void save('title', { title: next }, 'Title saved')
  }
  function commitDescription() {
    const next = description.trim().slice(0, 800) || null
    if (next === (tour.description ?? null)) return
    void save('description', { description: next }, 'Description saved')
  }
  function commitDuration() {
    const next = Number(duration.replace(',', '.'))
    if (!Number.isFinite(next) || next <= 0 || next > 24) return
    if (next === tour.duration_hours) return
    void save('duration_hours', { duration_hours: next }, 'Duration saved')
  }
  function commitMaxPax() {
    if (maxPax.trim() === '') {
      if (tour.max_pax == null) return
      void save('max_pax', { max_pax: null }, 'Max pax cleared')
      return
    }
    const next = parseInt(maxPax.replace(/\D/g, ''), 10)
    if (!Number.isFinite(next) || next < 1 || next > 60) return
    if (next === tour.max_pax) return
    void save('max_pax', { max_pax: next }, 'Max pax saved')
  }
  function commitPrice() {
    const next = parseIdr(priceIdr)
    if (next == null || next === tour.price_idr) return
    void save('price_idr', { price_idr: next }, 'Price saved')
  }
  function commitIncludes() {
    const next = parseCsv(includes)
    if (csvSame(next, tour.includes)) return
    void save('includes', { includes: next }, 'Includes saved')
  }
  function commitExcludes() {
    const next = parseCsv(excludes)
    if (csvSame(next, tour.excludes)) return
    void save('excludes', { excludes: next }, 'Excludes saved')
  }
  function commitPhoto() {
    const next = photoUrl.trim() || null
    if (next === (tour.photo_url ?? null)) return
    void save('photo_url', { photo_url: next }, 'Photo URL saved')
  }
  async function togglePublished() {
    const next = !published
    setPublished(next)
    const ok = await save('published', { published: next }, next ? 'Published' : 'Unpublished')
    if (!ok) setPublished(!next)
  }
  async function deleteTour() {
    const supabase = getBrowserSupabase()
    if (!supabase) { onError('Supabase not configured.'); return }
    setBusyField('delete')
    const { error } = await supabase
      .from('driver_tour_packages')
      .delete()
      .eq('id', tour.id)
      .eq('driver_id', driverId)
    setBusyField(null)
    if (error) { onError(error.message); return }
    onDeleted()
  }

  return (
    <section className="rounded-3xl bg-white border border-black/10 p-5 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 120))}
          onBlur={commitTitle}
          maxLength={120}
          className="flex-1 text-[15px] font-black text-[#0A0A0A] leading-tight bg-transparent border-b border-transparent focus:border-[#FACC15] focus:outline-none px-0 py-1"
        />
        {/* Publish toggle */}
        <button
          type="button"
          onClick={() => void togglePublished()}
          disabled={busyField === 'published'}
          aria-pressed={published}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider transition active:scale-[0.97]"
          style={{
            background: published ? '#FACC15' : '#F4F4F5',
            color: published ? '#0A0A0A' : 'rgba(10,10,10,0.65)',
            border: `1px solid ${published ? '#FACC15' : '#E4E4E7'}`,
            minHeight: 32,
          }}
        >
          {busyField === 'published' && <Loader2 className="w-3 h-3 animate-spin" />}
          {published ? 'Published' : 'Draft'}
        </button>
      </div>

      <Field label="Description" saving={busyField === 'description'}>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 800))}
          onBlur={commitDescription}
          maxLength={800}
          rows={4}
          className={inputCls + ' resize-y leading-relaxed'}
          placeholder="What the customer can expect from this tour."
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Duration (hours)" saving={busyField === 'duration_hours'}>
          <input
            type="number"
            step="0.5"
            min="0.5"
            max="24"
            inputMode="decimal"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            onBlur={commitDuration}
            className={inputCls}
          />
        </Field>
        <Field label="Max pax" saving={busyField === 'max_pax'}>
          <input
            type="number"
            min="1"
            max="60"
            inputMode="numeric"
            value={maxPax}
            onChange={(e) => setMaxPax(e.target.value)}
            onBlur={commitMaxPax}
            className={inputCls}
            placeholder="optional"
          />
        </Field>
      </div>

      <Field label="Price (IDR)" hint="Customer-facing total for this package." saving={busyField === 'price_idr'}>
        <input
          type="text"
          inputMode="numeric"
          value={priceIdr}
          onChange={(e) => setPriceIdr(formatIdr(e.target.value))}
          onBlur={commitPrice}
          className={inputCls}
        />
      </Field>

      <Field label="Includes (comma-separated)" saving={busyField === 'includes'}>
        <input
          type="text"
          value={includes}
          onChange={(e) => setIncludes(e.target.value)}
          onBlur={commitIncludes}
          className={inputCls}
          placeholder="driver, fuel, mineral water"
        />
      </Field>
      {tour.includes.length > 0 && (
        <ChipList chips={tour.includes} tone="positive" />
      )}

      <Field label="Excludes (comma-separated)" saving={busyField === 'excludes'}>
        <input
          type="text"
          value={excludes}
          onChange={(e) => setExcludes(e.target.value)}
          onBlur={commitExcludes}
          className={inputCls}
          placeholder="entrance fees, meals"
        />
      </Field>
      {tour.excludes.length > 0 && (
        <ChipList chips={tour.excludes} tone="muted" />
      )}

      {tour.place_slugs.length > 0 && (
        <div>
          <div className="text-[13px] font-bold text-black/85 mb-1.5">Places (from template)</div>
          <ChipList chips={tour.place_slugs.map((s) => `#${s}`)} tone="neutral" />
        </div>
      )}

      <Field label="Photo URL" saving={busyField === 'photo_url'}>
        <input
          type="url"
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
          onBlur={commitPhoto}
          className={inputCls}
          placeholder="https://…"
        />
      </Field>

      {/* Delete with confirm */}
      <div className="pt-1">
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-1.5 text-[13px] font-extrabold text-red-700 active:scale-[0.97] transition"
            style={{ minHeight: 44 }}
          >
            <Trash2 className="w-4 h-4" strokeWidth={2.5} />
            Delete tour
          </button>
        ) : (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 text-red-700 shrink-0" strokeWidth={2.5} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-extrabold text-red-800 leading-tight">Delete this tour?</p>
              <p className="text-[12.5px] text-red-700/80 leading-snug mt-0.5">Permanent — cannot be undone.</p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => void deleteTour()}
                  disabled={busyField === 'delete'}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-extrabold bg-red-700 text-white active:scale-[0.97] transition"
                  style={{ minHeight: 44 }}
                >
                  {busyField === 'delete' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Yes, delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-extrabold bg-white border border-red-300 text-red-800 active:scale-[0.97] transition"
                  style={{ minHeight: 44 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function parseCsv(raw: string): string[] {
  return raw.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 30)
}
function csvSame(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

function ChipList({ chips, tone }: { chips: string[]; tone: 'positive' | 'muted' | 'neutral' }) {
  const styles = tone === 'positive'
    ? { background: '#DCFCE7', border: '1px solid #86EFAC', color: '#166534' }
    : tone === 'muted'
    ? { background: '#F4F4F5', border: '1px solid #E4E4E7', color: '#52525B' }
    : { background: '#FFFFFF', border: '1px solid #E4E4E7', color: '#0A0A0A' }
  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((c, i) => (
        <span
          key={`${c}-${i}`}
          className="text-[11px] font-extrabold rounded-full px-2 py-0.5"
          style={styles}
        >
          {c}
        </span>
      ))}
    </div>
  )
}

// ============================================================================
// Template picker sheet — modal listing TOUR_TEMPLATES for the vehicle.
// ============================================================================
function TemplatePickerSheet({
  vehicle, onClose, onPick,
}: {
  vehicle: TourVehicleKind
  onClose: () => void
  onPick:  (tpl: TourTemplate) => void
}) {
  const templates = useMemo(() => tourTemplatesForVehicle(vehicle), [vehicle])
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
        style={{ borderTop: '4px solid #FACC15' }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-white/95 backdrop-blur border-b border-gray-100">
          <h2 className="text-[15px] font-black text-[#0A0A0A]">Pick a tour template</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center"
          >
            <XIcon className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {templates.map((tpl) => (
            <article
              key={tpl.id}
              className="rounded-2xl border border-black/10 p-3 flex flex-col gap-2"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center"
                  style={{ background: '#FFFBEA', color: '#EAB308', border: '1px solid rgba(250,204,21,0.45)' }}
                >
                  <MapIcon className="w-5 h-5" strokeWidth={2.25} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[14px] font-black text-[#0A0A0A] leading-tight">{tpl.title}</h3>
                  <p className="text-[12px] text-black/65 leading-snug mt-1">
                    {tpl.duration_hours}h · up to {tpl.max_pax} pax
                  </p>
                  <p className="text-[12px] text-black/55 mt-1">
                    Suggested <span className="font-extrabold text-[#0A0A0A]">Rp {tpl.suggested_price.toLocaleString('id-ID')}</span>
                    {' · '}market avg <span className="font-extrabold">Rp {tpl.market_floor.toLocaleString('id-ID')}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onPick(tpl)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl font-extrabold text-[13px] active:scale-[0.98] transition"
                style={{
                  minHeight: 44,
                  background: '#FACC15',
                  color: '#0A0A0A',
                  border: '1px solid #FACC15',
                  boxShadow: '0 4px 12px rgba(250,204,21,0.30)',
                }}
              >
                Use this template
              </button>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Visual primitives (mirrors /dashboard/car/info patterns)
// ============================================================================
function Field({ label, hint, saving, children }: {
  label:  string
  hint?:  string
  saving?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-bold text-black/85">{label}</span>
        {saving && (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#EAB308] uppercase tracking-wider">
            <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
            Saving
          </span>
        )}
      </span>
      {children}
      {hint && <span className="text-[12px] text-black/55 leading-snug block">{hint}</span>}
    </label>
  )
}

function BackLink() {
  return (
    <Link
      href={BACK_HREF}
      className="inline-flex items-center gap-1.5 text-[12.5px] font-extrabold text-black/55 hover:text-black mb-4 min-h-[44px]"
    >
      <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
      Back to dashboard
    </Link>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] bg-[#F5F5F4] text-[#0A0A0A]">
      <AppNav />
      <div className="max-w-2xl mx-auto px-4 sm:px-5 pt-4 pb-32">
        {children}
      </div>
    </main>
  )
}

function FullPageMessage({
  children, cta, spinner,
}: {
  children: React.ReactNode
  cta?: { href: string; label: string }
  spinner?: boolean
}) {
  return (
    <main className="relative min-h-[100dvh] bg-[#F5F5F4] text-[#0A0A0A]">
      <AppNav />
      <div className="max-w-md mx-auto px-4 pt-24 text-center">
        {spinner && (
          <Loader2 className="w-7 h-7 mx-auto text-[#EAB308] animate-spin mb-3" strokeWidth={2.5} />
        )}
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
    </main>
  )
}

const inputCls = 'w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-[14px] text-[#0A0A0A] placeholder:text-black/35 focus:outline-none focus:border-[#FACC15] focus:ring-2 focus:ring-[#FACC15]/30 min-h-[44px]'
