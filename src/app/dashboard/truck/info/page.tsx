'use client'
// ============================================================================
// /dashboard/truck/info — Profile info (Phase 1B real implementation)
// ----------------------------------------------------------------------------
// Mirrors /dashboard/car/info. Truck drivers edit their business identity
// here: business name, short bio, WhatsApp number, city/area, and
// availability (online / busy / offline).
//
// Save model — save-on-blur (matches the car/info pattern). Each field
// commits to the drivers table as soon as the input loses focus, flashing
// an inline "Saved" toast on success. Availability uses a dedicated
// three-button selector that writes immediately on tap.
//
// COMPLIANCE: CityDrivers is a software directory under PM 12/2019. No fares
// are computed here — pricing lives on /dashboard/truck/services and the
// rental rates on /dashboard/truck/vehicle. This page is identity +
// reachability only.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, User, Phone, MapPin, Radio, CheckCircle2, Languages as LanguagesIcon } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { tryLoadDevDriver } from '@/lib/dev/loadDriverSelf'
import { LANGUAGES } from '@/lib/languages'
import PartnerProgramSection from '@/components/dashboard/PartnerProgramSection'

type Availability = 'online' | 'busy' | 'offline'

type TruckDriverInfoRow = {
  user_id: string
  vehicle_type: string | null
  business_name: string | null
  bio: string | null
  whatsapp_e164: string | null
  city: string | null
  area: string | null
  availability: Availability | null
  languages: string[] | null
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'unauth' }
  | { kind: 'no_supabase' }
  | { kind: 'no_driver' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; row: TruckDriverInfoRow }

// ============================================================================
// Page shell
// ============================================================================
export default function TruckDriverInfoPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  const reload = useCallback(async () => {
    // DEV BYPASS — localhost impersonation via cr-dev-uid cookie.
    const dev = await tryLoadDevDriver()
    if (dev) { setState({ kind: 'ready', row: dev.driver as unknown as TruckDriverInfoRow }); return }

    const supabase = getBrowserSupabase()
    if (!supabase) { setState({ kind: 'no_supabase' }); return }
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) { setState({ kind: 'unauth' }); return }
    const { data, error } = await supabase
      .from('drivers')
      .select('user_id, vehicle_type, business_name, bio, whatsapp_e164, city, area, availability, languages')
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) { setState({ kind: 'error', message: error.message }); return }
    if (!data) { setState({ kind: 'no_driver' }); return }
    setState({ kind: 'ready', row: data as unknown as TruckDriverInfoRow })
  }, [])

  useEffect(() => { void reload() }, [reload])

  if (state.kind === 'loading')     return <FullPageMessage spinner>Loading profile…</FullPageMessage>
  if (state.kind === 'no_supabase') return <FullPageMessage>Auth not configured. Refresh the page.</FullPageMessage>
  if (state.kind === 'unauth')      return <FullPageMessage cta={{ href: '/login?next=/dashboard/truck/info', label: 'Sign in' }}>Sign in to edit your profile info.</FullPageMessage>
  if (state.kind === 'no_driver')   return <FullPageMessage cta={{ href: '/signup/truck', label: 'Create driver profile' }}>No driver profile yet.</FullPageMessage>
  if (state.kind === 'error')       return <FullPageMessage>Could not load profile: {state.message}</FullPageMessage>

  return <InfoEditor row={state.row} onReload={() => void reload()} />
}

// ============================================================================
// Editor — save-on-blur form
// ============================================================================
function InfoEditor({ row, onReload }: { row: TruckDriverInfoRow; onReload: () => void }) {
  // Local form state mirrors the row so the inputs stay controlled.
  const [businessName, setBusinessName] = useState(row.business_name ?? '')
  const [bio,           setBio]          = useState(row.bio ?? '')
  const [whatsapp,      setWhatsapp]     = useState(row.whatsapp_e164 ?? '')
  const [city,          setCity]         = useState(row.city ?? '')
  const [area,          setArea]         = useState(row.area ?? '')
  const [availability,  setAvailability] = useState<Availability>(row.availability ?? 'offline')
  // Indonesian is the always-on default.
  const [languages,     setLanguages]    = useState<string[]>(() => {
    const init = Array.isArray(row.languages) ? row.languages : []
    return init.includes('id') ? init : ['id', ...init]
  })

  // Track which fields are currently saving + transient flash state.
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

  // Shared writer — patches the drivers row scoped to the current user.
  // Preserves the canonical save signature used by the legacy dashboard.
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

  // Per-field blur handlers — only fire if the value actually changed.
  function commitBusinessName() {
    const next = businessName.trim().slice(0, 80) || null
    if (next === (row.business_name ?? null)) return
    void save('business_name', { business_name: next }, 'Business name saved')
  }
  function commitBio() {
    const next = bio.trim().slice(0, 500) || null
    if (next === (row.bio ?? null)) return
    void save('bio', { bio: next }, 'Bio saved')
  }
  function commitWhatsapp() {
    const next = whatsapp.trim() || null
    if (next === (row.whatsapp_e164 ?? null)) return
    void save('whatsapp_e164', { whatsapp_e164: next }, 'WhatsApp saved')
  }
  function commitCity() {
    const next = city.trim() || null
    if (next === (row.city ?? null)) return
    void save('city', { city: next }, 'City saved')
  }
  function commitArea() {
    const next = area.trim() || null
    if (next === (row.area ?? null)) return
    void save('area', { area: next }, 'Area saved')
  }
  async function setAvailabilityImmediate(next: Availability) {
    if (next === availability) return
    setAvailability(next)
    const ok = await save('availability', { availability: next }, `Availability: ${next}`)
    if (!ok) {
      // Revert UI if the write failed.
      setAvailability(row.availability ?? 'offline')
    }
  }
  async function toggleLanguage(id: string) {
    if (id === 'id') return
    const has = languages.includes(id)
    const next = has ? languages.filter((l) => l !== id) : [...languages, id]
    if (!next.includes('id')) next.unshift('id')
    setLanguages(next)
    const ok = await save('languages', { languages: next }, has ? 'Language removed' : 'Language added')
    if (!ok) setLanguages(languages)
  }

  return (
    <Shell>
      <BackLink />

      {/* Brand hero — mirrors the car/info gradient strip in brand yellow. */}
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
            <User size={22} strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[20px] font-black leading-tight text-[#0A0A0A] truncate">Profile info</h1>
            <p className="text-[12.5px] text-black/70 leading-snug mt-0.5">
              Name, bio, contact, and availability — what customers see first.
            </p>
          </div>
        </div>
      </div>

      {/* Toast feedback band */}
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

      {/* Availability — three big toggles, write immediately on tap. */}
      <Card title="Availability" hint="Tap to switch. Customers see this on your public profile." icon={<Radio size={18} />}>
        <div className="grid grid-cols-3 gap-2">
          {(['online', 'busy', 'offline'] as const).map((a) => {
            const active = availability === a
            const saving = savingField === 'availability' && active
            return (
              <button
                key={a}
                type="button"
                disabled={savingField === 'availability'}
                onClick={() => void setAvailabilityImmediate(a)}
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
                {a === 'online' ? 'Online' : a === 'busy' ? 'Busy' : 'Offline'}
              </button>
            )
          })}
        </div>
      </Card>

      {/* Name & bio */}
      <Card title="Your name & bio" hint="The first thing customers read on your profile." icon={<User size={18} />}>
        <Field
          label="Business / truck driver name"
          hint={`${businessName.length}/80`}
          saving={savingField === 'business_name'}
        >
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value.slice(0, 80))}
            onBlur={commitBusinessName}
            maxLength={80}
            placeholder="e.g. Budi Truck Yogya"
            className={inputCls}
          />
        </Field>
        <Field
          label="Short bio"
          hint={`${bio.length}/500 — your specialty, experience, cargo types you carry`}
          saving={savingField === 'bio'}
        >
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 500))}
            onBlur={commitBio}
            maxLength={500}
            rows={5}
            placeholder="Pengalaman 5 tahun pindahan rumah & distribusi barang seputar Yogya. Box van + tenaga angkut tersedia."
            className={inputCls + ' resize-y leading-relaxed max-h-[280px] overflow-y-auto'}
          />
        </Field>
      </Card>

      {/* Contact */}
      <Card title="WhatsApp contact" hint="Customers tap-to-chat from your public profile." icon={<Phone size={18} />}>
        <Field
          label="WhatsApp number (E.164)"
          hint="Start with +country code, e.g. +6281234567890"
          saving={savingField === 'whatsapp_e164'}
        >
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            onBlur={commitWhatsapp}
            placeholder="+6281234567890"
            inputMode="tel"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className={inputCls}
          />
        </Field>
      </Card>

      {/* Service area */}
      <Card title="Service area" hint="Where you're based — helps customers find you in their city." icon={<MapPin size={18} />}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="City" saving={savingField === 'city'}>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onBlur={commitCity}
              placeholder="Yogyakarta"
              className={inputCls}
            />
          </Field>
          <Field label="Area / district" saving={savingField === 'area'}>
            <input
              type="text"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              onBlur={commitArea}
              placeholder="Sleman"
              className={inputCls}
            />
          </Field>
        </div>
      </Card>

      {/* Languages — tourist-market signal. Indonesian is locked-on. */}
      <Card title="Languages you speak" hint="Tourists pick drivers who speak their language. Add every language you can hold a basic conversation in." icon={<LanguagesIcon size={18} />}>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {LANGUAGES.map((l) => {
            const active = languages.includes(l.id)
            const locked = l.id === 'id'
            const saving = savingField === 'languages'
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => void toggleLanguage(l.id)}
                disabled={saving || locked}
                aria-pressed={active}
                aria-label={locked ? `${l.label} — always selected (every Indonesian driver speaks Bahasa)` : `${active ? 'Remove' : 'Add'} ${l.label}`}
                className={`rounded-2xl border px-2 py-2 flex flex-col items-center justify-center gap-0.5 min-h-[64px] transition active:scale-[0.98] ${locked ? 'cursor-default opacity-100' : ''}`}
                style={{
                  background: active ? '#FACC15' : '#FFFFFF',
                  borderColor: active ? '#FACC15' : '#E4E4E7',
                  color: active ? '#0A0A0A' : 'rgba(10,10,10,0.80)',
                  boxShadow: active ? '0 2px 8px rgba(250,204,21,0.30)' : 'none',
                }}
              >
                <span aria-hidden className="text-[20px] leading-none">{l.flag}</span>
                <span className="text-[13px] font-extrabold leading-tight">{l.label}</span>
                <span className="text-[10px] opacity-70 leading-tight">{l.native}</span>
              </button>
            )
          })}
        </div>
        <p className="text-[13px] text-black/55 leading-snug mt-2">
          Tip → drivers speaking 3+ languages land more tourist bookings.
        </p>
      </Card>

      <p className="text-[11.5px] text-black/45 leading-snug px-1 mt-2">
        Changes save automatically when you tap out of a field. CityDrivers is a
        software directory — your profile reflects exactly what you publish.
      </p>
      <PartnerProgramSection />
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
      href="/dashboard/truck"
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
