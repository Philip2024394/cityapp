'use client'
// ============================================================================
// /dashboard/rider/vehicle — Bike details (rider mirror of car/vehicle)
// ----------------------------------------------------------------------------
// Riders edit their bike's identity here: make/model/year, colour/plate/
// engine cc, bike type (matic/sport/manual), delivery-box flag, and up
// to 6 photo URLs. Photos are pasted URLs in Phase 1 — the real upload
// flow lands in v2 alongside the banner uploader.
//
// Save model — save-on-blur for text fields, immediate writes for the
// segmented control + toggle, explicit add/remove for the photo list.
// Each commit patches the drivers row scoped to user_id.
//
// COMPLIANCE: IndoCity is a software directory under PM 12/2019. Photos and
// bike data are self-published — we display them as the rider provides
// them. No verification, no order-matching.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Bike, Image as ImageIcon, X, Plus, CheckCircle2, Package } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { tryLoadDevDriver } from '@/lib/dev/loadDriverSelf'
import type { BikeType } from '@/types/database'

const MAX_PHOTOS = 6
const CURRENT_YEAR = new Date().getFullYear()

type BikeVehicleRow = {
  user_id: string
  vehicle_type: string | null
  bike_make: string | null
  bike_model: string | null
  bike_year: number | null
  bike_color: string | null
  bike_plate: string | null
  bike_cc: number | null
  bike_type: BikeType | null
  has_box: boolean | null
  vehicle_photos: string[] | null
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'unauth' }
  | { kind: 'no_supabase' }
  | { kind: 'no_driver' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; row: BikeVehicleRow }

// ============================================================================
// Page shell
// ============================================================================
export default function RiderVehicleDetailsPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  const reload = useCallback(async () => {
    // DEV BYPASS — localhost impersonation via cr-dev-uid cookie.
    const dev = await tryLoadDevDriver()
    if (dev) { setState({ kind: 'ready', row: dev.driver as unknown as BikeVehicleRow }); return }

    const supabase = getBrowserSupabase()
    if (!supabase) { setState({ kind: 'no_supabase' }); return }
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) { setState({ kind: 'unauth' }); return }
    const { data, error } = await supabase
      .from('drivers')
      .select(
        'user_id, vehicle_type, bike_make, bike_model, bike_year, ' +
        'bike_color, bike_plate, bike_cc, bike_type, has_box, vehicle_photos',
      )
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) { setState({ kind: 'error', message: error.message }); return }
    if (!data) { setState({ kind: 'no_driver' }); return }
    setState({ kind: 'ready', row: data as unknown as BikeVehicleRow })
  }, [])

  useEffect(() => { void reload() }, [reload])

  if (state.kind === 'loading')     return <FullPageMessage spinner>Loading bike…</FullPageMessage>
  if (state.kind === 'no_supabase') return <FullPageMessage>Auth not configured. Refresh the page.</FullPageMessage>
  if (state.kind === 'unauth')      return <FullPageMessage cta={{ href: '/login?next=/dashboard/rider/vehicle', label: 'Sign in' }}>Sign in to edit your bike.</FullPageMessage>
  if (state.kind === 'no_driver')   return <FullPageMessage cta={{ href: '/signup?role=driver&vehicle=bike', label: 'Create rider profile' }}>No rider profile yet.</FullPageMessage>
  if (state.kind === 'error')       return <FullPageMessage>Could not load bike: {state.message}</FullPageMessage>

  return <VehicleEditor row={state.row} onReload={() => void reload()} />
}

// ============================================================================
// Editor
// ============================================================================
function VehicleEditor({ row, onReload }: { row: BikeVehicleRow; onReload: () => void }) {
  const [make,  setMake]  = useState(row.bike_make  ?? '')
  const [model, setModel] = useState(row.bike_model ?? '')
  const [year,  setYear]  = useState<string>(row.bike_year != null ? String(row.bike_year) : '')
  const [color, setColor] = useState(row.bike_color ?? '')
  const [plate, setPlate] = useState(row.bike_plate ?? '')
  const [cc,    setCc]    = useState<string>(row.bike_cc != null ? String(row.bike_cc) : '')
  const [bikeType, setBikeType] = useState<BikeType | null>(row.bike_type ?? null)
  const [hasBox,   setHasBox]   = useState<boolean>(row.has_box ?? false)

  // Photo state — held locally so add/remove are immediate without
  // round-tripping a single URL change to the DB on every keystroke.
  const initialPhotos = Array.isArray(row.vehicle_photos)
    ? row.vehicle_photos.filter((u): u is string => typeof u === 'string')
    : []
  const [photos, setPhotos] = useState<string[]>(initialPhotos)
  const [photoDraft, setPhotoDraft] = useState('')

  const [savingField, setSavingField] = useState<string | null>(null)
  const [savedFlash,  setSavedFlash]  = useState<string | null>(null)
  const [errorFlash,  setErrorFlash]  = useState<string | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showSaved(label: string) {
    setSavedFlash(label)
    setErrorFlash(null)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setSavedFlash(null), 1800)
  }
  function showError(msg: string) {
    setErrorFlash(msg)
    setSavedFlash(null)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setErrorFlash(null), 3200)
  }

  // Canonical writer — preserves the legacy dashboard's save signature:
  //   getBrowserSupabase().from('drivers').update(patch).eq('user_id', user.id)
  const save = useCallback(async (
    field: string,
    patch: Record<string, unknown>,
    label: string,
  ): Promise<boolean> => {
    const supabase = getBrowserSupabase()
    if (!supabase) { showError('Supabase not configured.'); return false }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { showError('Not signed in.'); return false }
    setSavingField(field)
    const { error } = await supabase.from('drivers').update(patch).eq('user_id', user.id)
    setSavingField(null)
    if (error) { showError(error.message); return false }
    showSaved(label)
    onReload()
    return true
  }, [onReload])

  // ── Save-on-blur commits ──────────────────────────────────────────
  function commitMake() {
    const next = make.trim() || null
    if (next === (row.bike_make ?? null)) return
    void save('bike_make', { bike_make: next }, 'Make saved')
  }
  function commitModel() {
    const next = model.trim() || null
    if (next === (row.bike_model ?? null)) return
    void save('bike_model', { bike_model: next }, 'Model saved')
  }
  function commitYear() {
    const next = year === '' ? null : Number(year)
    if (next === (row.bike_year ?? null)) return
    if (next != null && (!Number.isFinite(next) || next < 1990 || next > CURRENT_YEAR)) {
      showError(`Year must be between 1990 and ${CURRENT_YEAR}.`)
      return
    }
    void save('bike_year', { bike_year: next }, 'Year saved')
  }
  function commitColor() {
    const next = color.trim() || null
    if (next === (row.bike_color ?? null)) return
    void save('bike_color', { bike_color: next }, 'Colour saved')
  }
  function commitPlate() {
    const next = plate.trim().toUpperCase() || null
    if (next !== plate) setPlate(next ?? '')
    if (next === (row.bike_plate ?? null)) return
    void save('bike_plate', { bike_plate: next }, 'Plate saved')
  }
  function commitCc() {
    const next = cc === '' ? null : Number(cc)
    if (next === (row.bike_cc ?? null)) return
    if (next != null && (!Number.isFinite(next) || next < 50 || next > 1500)) {
      showError('Engine cc must be between 50 and 1500.')
      return
    }
    void save('bike_cc', { bike_cc: next }, 'Engine saved')
  }
  async function setBikeTypeImmediate(next: BikeType) {
    if (next === bikeType) return
    const previous = bikeType
    setBikeType(next)
    const ok = await save('bike_type', { bike_type: next }, `Type: ${next}`)
    if (!ok) setBikeType(previous)
  }
  async function setHasBoxImmediate(next: boolean) {
    if (next === hasBox) return
    const previous = hasBox
    setHasBox(next)
    const ok = await save('has_box', { has_box: next }, next ? 'Delivery box on' : 'Delivery box off')
    if (!ok) setHasBox(previous)
  }

  // ── Photo list ────────────────────────────────────────────────────
  async function addPhoto() {
    const url = photoDraft.trim()
    if (!url) return
    if (!/^https?:\/\//i.test(url)) {
      showError('Photo URL must start with http:// or https://')
      return
    }
    if (photos.length >= MAX_PHOTOS) {
      showError(`Max ${MAX_PHOTOS} photos.`)
      return
    }
    if (photos.includes(url)) {
      showError('That photo is already in your list.')
      return
    }
    const next = [...photos, url]
    setPhotos(next)
    setPhotoDraft('')
    const ok = await save('vehicle_photos', { vehicle_photos: next }, 'Photo added')
    if (!ok) {
      // Revert on failure.
      setPhotos(photos)
    }
  }
  async function removePhoto(idx: number) {
    const next = photos.filter((_, i) => i !== idx)
    setPhotos(next)
    const ok = await save('vehicle_photos', { vehicle_photos: next }, 'Photo removed')
    if (!ok) setPhotos(photos)
  }

  return (
    <Shell>
      <BackLink />

      {/* Brand hero — matches /info, in brand yellow. */}
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
            <Bike size={22} strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[20px] font-black leading-tight text-[#0A0A0A] truncate">Bike details</h1>
            <p className="text-[12.5px] text-black/70 leading-snug mt-0.5">
              Make, model, plate, and photos — what customers see when they pick a ride.
            </p>
          </div>
        </div>
      </div>

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

      {/* Make / Model / Year */}
      <Card title="Make, model & year" hint="Help customers know what they're booking." icon={<Bike size={18} />}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Make" saving={savingField === 'bike_make'}>
            <input
              type="text"
              value={make}
              onChange={(e) => setMake(e.target.value)}
              onBlur={commitMake}
              placeholder="Honda"
              className={inputCls}
            />
          </Field>
          <Field label="Model" saving={savingField === 'bike_model'}>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              onBlur={commitModel}
              placeholder="Vario"
              className={inputCls}
            />
          </Field>
          <Field label="Year" saving={savingField === 'bike_year'}>
            <input
              type="number"
              min={1990}
              max={CURRENT_YEAR}
              inputMode="numeric"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              onBlur={commitYear}
              placeholder="2022"
              className={inputCls}
            />
          </Field>
        </div>
      </Card>

      {/* Colour / Plate / Engine cc */}
      <Card title="Colour, plate & engine" hint="The quick details riders check before boarding." icon={<Bike size={18} />}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Colour" saving={savingField === 'bike_color'}>
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              onBlur={commitColor}
              placeholder="Black"
              className={inputCls}
            />
          </Field>
          <Field label="Plate" saving={savingField === 'bike_plate'}>
            <input
              type="text"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              onBlur={commitPlate}
              placeholder="AB 1234 XX"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className={inputCls + ' uppercase tracking-wider'}
            />
          </Field>
          <Field label="Engine (cc)" saving={savingField === 'bike_cc'}>
            <input
              type="number"
              min={50}
              max={1500}
              inputMode="numeric"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              onBlur={commitCc}
              placeholder="150"
              className={inputCls}
            />
          </Field>
        </div>
      </Card>

      {/* Bike type — segmented control */}
      <Card title="Bike type" hint="What kind of motorbike — matic, sport, or manual." icon={<Bike size={18} />}>
        <div className="grid grid-cols-3 gap-2">
          {(['matic', 'sport', 'manual'] as const).map((t) => {
            const active = bikeType === t
            const saving = savingField === 'bike_type' && active
            return (
              <button
                key={t}
                type="button"
                disabled={savingField === 'bike_type'}
                onClick={() => void setBikeTypeImmediate(t)}
                aria-pressed={active}
                className="rounded-2xl px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider transition border min-h-[52px] flex items-center justify-center gap-1.5 active:scale-[0.98]"
                style={{
                  background: active ? '#FACC15' : '#FFFFFF',
                  borderColor: active ? '#FACC15' : '#E4E4E7',
                  color: active ? '#0A0A0A' : 'rgba(10,10,10,0.75)',
                  boxShadow: active ? '0 4px 12px rgba(250,204,21,0.30)' : 'none',
                }}
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
                {t === 'matic' ? 'Matic' : t === 'sport' ? 'Sport' : 'Manual'}
              </button>
            )
          })}
        </div>
      </Card>

      {/* Delivery box toggle */}
      <Card title="Delivery box" hint="A rear delivery box helps customers know you can carry parcels." icon={<Package size={18} />}>
        <button
          type="button"
          disabled={savingField === 'has_box'}
          onClick={() => void setHasBoxImmediate(!hasBox)}
          aria-pressed={hasBox}
          className="w-full flex items-center justify-between gap-3 rounded-2xl px-4 py-3 border transition active:scale-[0.99]"
          style={{
            background: hasBox ? '#FACC15' : '#FFFFFF',
            borderColor: hasBox ? '#FACC15' : '#E4E4E7',
            color: hasBox ? '#0A0A0A' : 'rgba(10,10,10,0.85)',
            boxShadow: hasBox ? '0 4px 12px rgba(250,204,21,0.30)' : 'none',
            minHeight: 56,
          }}
        >
          <span className="flex items-center gap-2 text-[14px] font-extrabold">
            {savingField === 'has_box' && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
            Has delivery box
          </span>
          <span
            className="inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider"
            style={{
              background: hasBox ? '#0A0A0A' : '#F4F4F5',
              color: hasBox ? '#FACC15' : 'rgba(10,10,10,0.65)',
            }}
          >
            {hasBox ? 'Yes' : 'No'}
          </span>
        </button>
      </Card>

      {/* Photos */}
      <Card
        title="Bike photos"
        hint={`Paste public image URLs (max ${MAX_PHOTOS}). File upload is coming in v2.`}
        icon={<ImageIcon size={18} />}
      >
        {/* Thumbnails grid */}
        {photos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {photos.map((url, i) => (
              <div
                key={`${url}-${i}`}
                className="relative aspect-[4/3] rounded-xl overflow-hidden border border-gray-200 bg-gray-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Bike photo ${i + 1}`}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement
                    img.style.display = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => void removePhoto(i)}
                  disabled={savingField === 'vehicle_photos'}
                  aria-label={`Remove photo ${i + 1}`}
                  className="absolute top-1.5 right-1.5 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-[#0A0A0A] ring-1 ring-black/15 flex items-center justify-center transition active:scale-[0.96] disabled:opacity-50"
                  style={{ minHeight: 32 }}
                >
                  <X className="w-4 h-4" strokeWidth={2.5} />
                </button>
                <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-white/85 text-[#0A0A0A]">
                  {i + 1}/{photos.length}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Add URL row */}
        {photos.length < MAX_PHOTOS ? (
          <div className="flex items-stretch gap-2">
            <input
              type="url"
              value={photoDraft}
              onChange={(e) => setPhotoDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void addPhoto()
                }
              }}
              placeholder="https://… (paste image URL)"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className={inputCls + ' flex-1 min-w-0'}
            />
            <button
              type="button"
              onClick={() => void addPhoto()}
              disabled={!photoDraft.trim() || savingField === 'vehicle_photos'}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl px-4 text-[13px] font-extrabold uppercase tracking-wider transition active:scale-[0.98] disabled:opacity-50"
              style={{
                background: '#FACC15',
                color: '#0A0A0A',
                minHeight: 44,
                boxShadow: '0 4px 12px rgba(250,204,21,0.30)',
              }}
            >
              {savingField === 'vehicle_photos'
                ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                : <Plus className="w-4 h-4" strokeWidth={2.5} aria-hidden />}
              Add
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 text-[12.5px] font-bold text-black/55 px-3 py-3 text-center">
            Maximum {MAX_PHOTOS} photos reached. Remove one to add another.
          </div>
        )}

        <p className="text-[11.5px] text-black/50 leading-snug">
          Tip — bright daylight, the full bike in frame, plate visible. Customers
          trust profiles with at least 3 photos.
        </p>
      </Card>

      <p className="text-[11.5px] text-black/45 leading-snug px-1 mt-2">
        Changes save automatically when you tap out of a field. Photos save as
        you add or remove them.
      </p>
    </Shell>
  )
}

// ============================================================================
// Visual primitives — Card, Field, BackLink, Shell, FullPageMessage
// ============================================================================
function Card({ title, hint, icon, children }: {
  title: string
  hint?: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-3xl bg-white border border-black/10 p-5 shadow-sm space-y-3 mb-4">
      <div className="flex items-start gap-3">
        {icon && (
          <div
            className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center"
            style={{ background: '#FFFBEA', color: '#EAB308', border: '1px solid rgba(250,204,21,0.45)' }}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-black text-[#0A0A0A] leading-tight">{title}</h2>
          {hint && <p className="text-[12px] text-black/65 leading-snug mt-1">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function Field({ label, hint, saving, children }: {
  label: string
  hint?: string
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
      href="/dashboard/rider"
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
