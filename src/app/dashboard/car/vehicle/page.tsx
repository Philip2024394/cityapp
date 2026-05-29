'use client'
// ============================================================================
// /dashboard/car/vehicle — Vehicle details (Phase 1B real implementation)
// ----------------------------------------------------------------------------
// Drivers edit their vehicle's identity here: make/model/year, colour/plate/
// seats, and up to 6 photo URLs. Photos are pasted URLs in Phase 1 — the
// real upload flow lands in v2 alongside the banner uploader.
//
// Save model — save-on-blur for text fields, explicit add/remove for the
// photo list. Each commit patches the drivers row scoped to user_id.
//
// COMPLIANCE: IndoCity is a software directory under PM 12/2019. Photos and
// vehicle data are self-published — we display them as the driver provides
// them. No verification, no order-matching.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Car, Image as ImageIcon, X, Plus, CheckCircle2 } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { getBrowserSupabase } from '@/lib/supabase/client'

const MAX_PHOTOS = 6

type CarVehicleRow = {
  user_id: string
  vehicle_type: string | null
  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_year: number | null
  vehicle_color: string | null
  vehicle_plate: string | null
  vehicle_seats: number | null
  vehicle_photos: string[] | null
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'unauth' }
  | { kind: 'no_supabase' }
  | { kind: 'no_driver' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; row: CarVehicleRow }

// ============================================================================
// Page shell
// ============================================================================
export default function CarVehicleDetailsPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  const reload = useCallback(async () => {
    const supabase = getBrowserSupabase()
    if (!supabase) { setState({ kind: 'no_supabase' }); return }
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) { setState({ kind: 'unauth' }); return }
    const { data, error } = await supabase
      .from('drivers')
      .select(
        'user_id, vehicle_type, vehicle_make, vehicle_model, vehicle_year, ' +
        'vehicle_color, vehicle_plate, vehicle_seats, vehicle_photos',
      )
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) { setState({ kind: 'error', message: error.message }); return }
    if (!data) { setState({ kind: 'no_driver' }); return }
    setState({ kind: 'ready', row: data as unknown as CarVehicleRow })
  }, [])

  useEffect(() => { void reload() }, [reload])

  if (state.kind === 'loading')     return <FullPageMessage spinner>Loading vehicle…</FullPageMessage>
  if (state.kind === 'no_supabase') return <FullPageMessage>Auth not configured. Refresh the page.</FullPageMessage>
  if (state.kind === 'unauth')      return <FullPageMessage cta={{ href: '/login?next=/dashboard/car/vehicle', label: 'Sign in' }}>Sign in to edit your vehicle.</FullPageMessage>
  if (state.kind === 'no_driver')   return <FullPageMessage cta={{ href: '/signup?role=driver&vehicle=car', label: 'Create driver profile' }}>No driver profile yet.</FullPageMessage>
  if (state.kind === 'error')       return <FullPageMessage>Could not load vehicle: {state.message}</FullPageMessage>

  return <VehicleEditor row={state.row} onReload={() => void reload()} />
}

// ============================================================================
// Editor
// ============================================================================
function VehicleEditor({ row, onReload }: { row: CarVehicleRow; onReload: () => void }) {
  const [make,  setMake]  = useState(row.vehicle_make  ?? '')
  const [model, setModel] = useState(row.vehicle_model ?? '')
  const [year,  setYear]  = useState<string>(row.vehicle_year != null ? String(row.vehicle_year) : '')
  const [color, setColor] = useState(row.vehicle_color ?? '')
  const [plate, setPlate] = useState(row.vehicle_plate ?? '')
  const [seats, setSeats] = useState<string>(row.vehicle_seats != null ? String(row.vehicle_seats) : '')

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
    if (next === (row.vehicle_make ?? null)) return
    void save('vehicle_make', { vehicle_make: next }, 'Make saved')
  }
  function commitModel() {
    const next = model.trim() || null
    if (next === (row.vehicle_model ?? null)) return
    void save('vehicle_model', { vehicle_model: next }, 'Model saved')
  }
  function commitYear() {
    const next = year === '' ? null : Number(year)
    if (next === (row.vehicle_year ?? null)) return
    if (next != null && (!Number.isFinite(next) || next < 1980 || next > 2100)) {
      showError('Year must be between 1980 and 2100.')
      return
    }
    void save('vehicle_year', { vehicle_year: next }, 'Year saved')
  }
  function commitColor() {
    const next = color.trim() || null
    if (next === (row.vehicle_color ?? null)) return
    void save('vehicle_color', { vehicle_color: next }, 'Colour saved')
  }
  function commitPlate() {
    const next = plate.trim().toUpperCase() || null
    if (next !== plate) setPlate(next ?? '')
    if (next === (row.vehicle_plate ?? null)) return
    void save('vehicle_plate', { vehicle_plate: next }, 'Plate saved')
  }
  function commitSeats() {
    const next = seats === '' ? null : Number(seats)
    if (next === (row.vehicle_seats ?? null)) return
    if (next != null && (!Number.isFinite(next) || next < 1 || next > 20)) {
      showError('Seats must be between 1 and 20.')
      return
    }
    void save('vehicle_seats', { vehicle_seats: next }, 'Seats saved')
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
            <Car size={22} strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[20px] font-black leading-tight text-[#0A0A0A] truncate">Vehicle details</h1>
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
      <Card title="Make, model & year" hint="Help customers know what they're booking." icon={<Car size={18} />}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Make" saving={savingField === 'vehicle_make'}>
            <input
              type="text"
              value={make}
              onChange={(e) => setMake(e.target.value)}
              onBlur={commitMake}
              placeholder="Toyota"
              className={inputCls}
            />
          </Field>
          <Field label="Model" saving={savingField === 'vehicle_model'}>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              onBlur={commitModel}
              placeholder="Avanza"
              className={inputCls}
            />
          </Field>
          <Field label="Year" saving={savingField === 'vehicle_year'}>
            <input
              type="number"
              min={1980}
              max={2100}
              inputMode="numeric"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              onBlur={commitYear}
              placeholder="2020"
              className={inputCls}
            />
          </Field>
        </div>
      </Card>

      {/* Colour / Plate / Seats */}
      <Card title="Colour, plate & seats" hint="The quick details riders check before boarding." icon={<Car size={18} />}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Colour" saving={savingField === 'vehicle_color'}>
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              onBlur={commitColor}
              placeholder="Silver"
              className={inputCls}
            />
          </Field>
          <Field label="Plate" saving={savingField === 'vehicle_plate'}>
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
          <Field label="Seats" saving={savingField === 'vehicle_seats'}>
            <input
              type="number"
              min={1}
              max={20}
              inputMode="numeric"
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              onBlur={commitSeats}
              placeholder="4"
              className={inputCls}
            />
          </Field>
        </div>
      </Card>

      {/* Photos */}
      <Card
        title="Vehicle photos"
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
                  alt={`Vehicle photo ${i + 1}`}
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
          Tip — bright daylight, the full vehicle in frame, plate visible. Customers
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
      href="/dashboard/car"
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
