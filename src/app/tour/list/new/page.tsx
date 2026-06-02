'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, MapPin, CheckCircle2, Loader2,
  User, Compass, Banknote, Languages as LanguagesIcon, Star,
} from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import PlaceAutocomplete from '@/components/inputs/PlaceAutocomplete'
import type { PlaceSuggestion } from '@/hooks/usePlaceSearch'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { useGeolocation } from '@/hooks/useGeolocation'
import { TOUR_SERVICES, MAX_TOUR_SERVICES, type TourServiceId } from '@/data/tourServices'
import { TOUR_LANGUAGES, type TourLanguageCode } from '@/data/tourLanguages'

// Same Indonesia city list as the rental form. Custom override via __other__.
const SUPPORTED_CITIES = [
  { slug: 'bali-ubud',   label: 'Bali — Ubud' },
  { slug: 'bali-kuta',   label: 'Bali — Kuta' },
  { slug: 'bali-sanur',  label: 'Bali — Sanur' },
  { slug: 'bali-seminyak', label: 'Bali — Seminyak' },
  { slug: 'bandung',     label: 'Bandung' },
  { slug: 'denpasar',    label: 'Bali — Denpasar' },
  { slug: 'jakarta',     label: 'Jakarta' },
  { slug: 'labuan-bajo', label: 'Labuan Bajo' },
  { slug: 'lombok',      label: 'Lombok' },
  { slug: 'makassar',    label: 'Makassar' },
  { slug: 'malang',      label: 'Malang' },
  { slug: 'medan',       label: 'Medan' },
  { slug: 'nusa-penida', label: 'Nusa Penida' },
  { slug: 'surabaya',    label: 'Surabaya' },
  { slug: 'yogyakarta',  label: 'Yogyakarta' },
  { slug: '__other__',   label: 'Lain (tulis sendiri)' },
] as const

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
}

export default function TourGuideListNewPage() {
  const router = useRouter()
  const supabase = getBrowserSupabase()
  const geo = useGeolocation(false)
  const submissionIdRef = useRef<string>(crypto.randomUUID())

  // Auth gate
  const [authedUserId, setAuthedUserId] = useState<string | null>(null)
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/tour/list/auth')
        return
      }
      setAuthedUserId(user.id)
    })
  }, [router, supabase])

  // ── form state ─────────────────────────────────────────────────────
  const [name, setName]         = useState('')
  const [whatsapp, setWhatsApp] = useState('')
  const [services, setServices] = useState<TourServiceId[]>([])
  const [languages, setLanguages] = useState<TourLanguageCode[]>(['id'])
  const [dayRate, setDayRate]   = useState('')
  const [notes, setNotes]       = useState('')
  const [city, setCity]         = useState('yogyakarta')
  const [customCity, setCustomCity] = useState('')
  const [address, setAddress]   = useState('')
  const [lat, setLat]           = useState('')
  const [lng, setLng]           = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function toggleService(id: TourServiceId) {
    setServices((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id)
      if (prev.length >= MAX_TOUR_SERVICES) return prev
      return [...prev, id]
    })
  }

  function toggleLanguage(code: TourLanguageCode) {
    setLanguages((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]))
  }

  async function useMyGps() {
    const coords = await geo.request()
    if (!coords) return
    setLat(coords.lat.toFixed(6))
    setLng(coords.lng.toFixed(6))
    try {
      const res = await fetch(`/api/geo/reverse?lat=${coords.lat}&lng=${coords.lng}`, { cache: 'no-store' })
      if (res.ok) {
        const j = await res.json() as { display_name?: string | null }
        if (j.display_name) setAddress(j.display_name)
      }
    } catch { /* offline / blocked */ }
  }

  function onAddressPick(s: PlaceSuggestion) {
    setAddress(s.label && s.detail ? `${s.label}, ${s.detail}` : s.detail || s.label)
    setLat(s.lat.toFixed(6))
    setLng(s.lng.toFixed(6))
  }

  const cityForDb = useMemo(
    () => city === '__other__' ? (slugify(customCity) || 'lainnya') : city,
    [city, customCity],
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    if (!supabase) { setSubmitError('Supabase not configured.'); return }
    if (!authedUserId) {
      setSubmitError('Sesi habis — silakan login ulang.')
      router.replace('/login?next=/tour/list/new')
      return
    }
    if (!name.trim() || !whatsapp.trim()) {
      setSubmitError('Lengkapi nama dan WhatsApp.')
      return
    }
    if (services.length === 0) {
      setSubmitError('Pilih minimal 1 service (max 3).')
      return
    }
    if (city === '__other__' && !customCity.trim()) {
      setSubmitError('Tulis nama kota / area kamu.')
      return
    }
    const latN = parseFloat(lat); const lngN = parseFloat(lng)
    if (!Number.isFinite(latN) || !Number.isFinite(lngN)) {
      setSubmitError('Set lokasi GPS atau pilih alamat dari saran.')
      return
    }

    // ── Entitlement gate: driver sub OR tour_guide sub ──────────────
    setSubmitting(true)
    try {
      const res = await fetch('/api/me/account', { cache: 'no-store' })
      const j = res.ok ? await res.json() as { account?: { tour_guide_status?: string; user_id?: string } | null } : null
      const tgActive = j?.account?.tour_guide_status === 'active'

      // Driver-sub check piggybacks on subscriptions read (RLS allows owner read).
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status, current_period_end')
        .eq('driver_id', authedUserId)
        .maybeSingle()
      const driverSubActive = !!sub
        && (sub.status === 'active' || sub.status === 'trial')
        && (!sub.current_period_end
            || new Date(sub.current_period_end as string).getTime() > Date.now())

      if (!tgActive && !driverSubActive) {
        setSubmitting(false)
        setSubmitError('TOUR_GUIDE_PAYMENT_REQUIRED')
        return
      }

      // Quota: 1 active listing per owner. Unique index in DB enforces too.
      const { count: ownedCount } = await supabase
        .from('tour_guide_listings')
        .select('id', { count: 'exact', head: true })
        .eq('owner_user_id', authedUserId)
        .in('status', ['pending', 'approved', 'paused'])
      if ((ownedCount ?? 0) >= 1) {
        setSubmitting(false)
        setSubmitError('TOUR_GUIDE_ALREADY_HAVE_LISTING')
        return
      }
    } catch { /* fail-open */ }

    try {
      const num = (s: string) => parseInt(s.replace(/[^\d]/g, ''), 10) || 0
      const slug = `${slugify(name)}-${submissionIdRef.current.slice(0, 8)}`
      const { error } = await supabase.from('tour_guide_listings').insert({
        slug,
        owner_user_id: authedUserId,
        name: name.trim(),
        whatsapp_e164: whatsapp,
        services,
        languages,
        day_rate_idr: dayRate ? num(dayRate) : null,
        notes: notes.trim() || null,
        city: cityForDb,
        address: address.trim() || null,
        location: `SRID=4326;POINT(${parseFloat(lng)} ${parseFloat(lat)})`,
        lat: parseFloat(lat), lng: parseFloat(lng),
        status: 'pending',
      })
      if (error) throw error
      router.push('/dashboard?tour=pending')
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Submit gagal.')
      setSubmitting(false)
    }
  }

  return (
    <>
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 pt-3 pb-24">
        <Link href="/tour" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-ink mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <header className="mb-5">
          <h1 className="text-[26px] sm:text-[32px] font-extrabold tracking-tight leading-tight">
            List as <span className="gradient-text">Tour Guide</span>
          </h1>
          <p className="mt-2 text-[13px] text-muted leading-snug">
            Isi profil tour guide kamu — pilih max 3 specialties supaya wisatawan tahu apa yang kamu kuasai.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* IDENTITY */}
          <SectionCard Icon={User} title="Identitas">
            <Field label="Nama tour guide *">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
            </Field>
            <Field label="WhatsApp *">
              <div className="flex items-stretch">
                <span aria-hidden className="inline-flex items-center px-3 text-bg font-extrabold text-[14px] border border-r-0 border-black/85 rounded-l-xl" style={{ background: 'rgba(250,204,21,0.18)' }}>+62</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={whatsapp.replace(/^\+?62/, '').replace(/^0+/, '')}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/[^\d]/g, '').replace(/^0+/, '')
                    setWhatsApp(digits ? `+62${digits}` : '')
                  }}
                  placeholder="81234567890"
                  className="flex-1 bg-bg text-ink placeholder:text-white/40 border border-black/85 rounded-r-xl px-3 py-2.5 text-[14px] font-bold focus:outline-none focus:ring-2 focus:ring-bg/40 transition"
                  required
                />
              </div>
            </Field>
          </SectionCard>

          {/* SERVICES — max 3 */}
          <SectionCard Icon={Compass} title={`Services (pilih max ${MAX_TOUR_SERVICES})`}>
            <div className="grid grid-cols-2 gap-2">
              {TOUR_SERVICES.map((s) => {
                const active = services.includes(s.id)
                const atMax = services.length >= MAX_TOUR_SERVICES && !active
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleService(s.id)}
                    disabled={atMax}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-extrabold transition active:scale-95 disabled:opacity-40"
                    style={{
                      background: active ? '#FACC15' : 'rgba(255,255,255,0.04)',
                      color: active ? '#0A0A0A' : '#fff',
                      border: active ? '1px solid #FACC15' : '1px solid rgba(255,255,255,0.10)',
                    }}
                    aria-pressed={active}
                  >
                    <span className="text-[16px]" aria-hidden>{s.emoji}</span>
                    <span className="flex-1 text-left">{s.label}</span>
                    {active && <Star className="w-3.5 h-3.5 fill-current" strokeWidth={0} />}
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-muted leading-snug">
              {services.length}/{MAX_TOUR_SERVICES} selected
            </p>
          </SectionCard>

          {/* LANGUAGES */}
          <SectionCard Icon={LanguagesIcon} title="Bahasa yang kamu kuasai">
            <div className="flex flex-wrap gap-2">
              {TOUR_LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => toggleLanguage(l.code)}
                  className="px-3 py-1.5 rounded-full text-[12px] font-extrabold transition border"
                  style={{
                    background: languages.includes(l.code) ? '#FACC15' : 'rgba(255,255,255,0.04)',
                    color: languages.includes(l.code) ? '#0A0A0A' : '#fff',
                    borderColor: languages.includes(l.code) ? '#FACC15' : 'rgba(255,255,255,0.10)',
                  }}
                >
                  <span className="mr-1.5" aria-hidden>{l.flag}</span>{l.labelId}
                </button>
              ))}
            </div>
          </SectionCard>

          {/* PRICE + NOTES */}
          <SectionCard Icon={Banknote} title="Harga & deskripsi (opsional)">
            <Field label="Tarif harian (Rp) — kosongkan kalau negotiable">
              <input type="number" min="0" value={dayRate} onChange={(e) => setDayRate(e.target.value)} placeholder="500000" className={inputClass} />
            </Field>
            <Field label="Catatan singkat (max 240 char)">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 240))} rows={3} placeholder="Spesialis temple Yogya, sudah 8 tahun, fluent English…" className={`${inputClass} resize-none`} />
            </Field>
          </SectionCard>

          {/* LOCATION */}
          <SectionCard Icon={MapPin} title="Lokasi">
            <Field label="Kota *">
              <select value={city} onChange={(e) => setCity(e.target.value)} className={inputClass}>
                {SUPPORTED_CITIES.map((c) => (<option key={c.slug} value={c.slug}>{c.label}</option>))}
              </select>
            </Field>
            {city === '__other__' && (
              <Field label="Tulis kota / area *">
                <input type="text" value={customCity} onChange={(e) => setCustomCity(e.target.value)} placeholder="Mis: Karimunjawa, Pulau Weh, Sumba…" className={inputClass} required />
              </Field>
            )}

            <button
              type="button"
              onClick={useMyGps}
              disabled={geo.status === 'requesting'}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-bg font-extrabold text-[14px] uppercase tracking-wider border border-black/85 active:scale-[0.99] disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #FACC15, #EAB308)', minHeight: 48 }}
            >
              {geo.status === 'requesting'
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Mencari lokasi…</>
                : <><MapPin className="w-5 h-5" /> Set lokasi dari GPS</>}
            </button>

            <Field label="Alamat / area base kamu">
              <PlaceAutocomplete
                value={address}
                onChange={setAddress}
                onSelect={onAddressPick}
                placeholder="Ketik alamat / area — pilih dari saran"
                className={inputClass}
                countryCodes={['id']}
                maxResults={3}
                ariaLabel="Alamat tour guide"
              />
            </Field>

            {(lat || lng) && (
              <div className="text-[11px] text-bg/70 font-bold leading-tight">
                Koordinat: {lat || '—'}, {lng || '—'}
              </div>
            )}
          </SectionCard>

          {submitError === 'TOUR_GUIDE_PAYMENT_REQUIRED' && (
            <div className="rounded-xl p-4 bg-yellow-900/20 border border-yellow-500/50 space-y-2">
              <div className="text-[14px] font-extrabold text-brand">Akun kamu belum aktif untuk listing tour guide</div>
              <p className="text-[12px] text-bg/80 leading-snug">
                Kalau kamu sudah Kita2u driver dengan subscription aktif, listing tour guide gratis. Kalau bukan, upgrade ke akun Tour Guide — mulai Rp 38.000/bulan.
              </p>
              <Link href="/tour/upgrade" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-brand to-brand2 text-bg font-extrabold text-[13px] uppercase tracking-wider border border-black/85 shadow-[0_4px_12px_rgba(250,204,21,0.30)] active:scale-[0.99]">
                Upgrade akun
              </Link>
            </div>
          )}
          {submitError === 'TOUR_GUIDE_ALREADY_HAVE_LISTING' && (
            <div className="rounded-xl p-3 bg-yellow-900/20 border border-yellow-500/40 text-[13px] text-brand font-bold">
              Kamu sudah punya 1 listing tour guide. Edit listing yang ada lewat /dashboard.
            </div>
          )}
          {submitError && submitError !== 'TOUR_GUIDE_PAYMENT_REQUIRED' && submitError !== 'TOUR_GUIDE_ALREADY_HAVE_LISTING' && (
            <div className="rounded-xl p-3 bg-red-900/30 border border-red-500/40 text-[13px] text-red-200 font-bold">{submitError}</div>
          )}

          <button type="submit" disabled={submitting} className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-brand to-brand2 text-bg font-extrabold text-[14px] uppercase tracking-wider border border-black/85 shadow-[0_8px_22px_rgba(250,204,21,0.30)] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <><CheckCircle2 className="w-4 h-4" /> Submit listing</>}
          </button>
          <p className="text-[12px] text-muted leading-snug text-center">
            Listing kamu masuk antrian admin (24–48 jam) sebelum tayang publik di /tour.
          </p>
        </form>
      </main>
    </>
  )
}

// ── shared form helpers (same shapes as the rental form) ─────────────
const inputClass =
  'w-full bg-bg text-ink placeholder:text-white/40 border border-black/85 rounded-xl px-3 py-2.5 text-[14px] font-bold focus:outline-none focus:ring-2 focus:ring-bg/40 transition'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[12px] font-extrabold text-bg uppercase tracking-wider">{label}</span>
      {children}
    </label>
  )
}

function SectionCard({ Icon, title, children }: { Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; title: string; children: React.ReactNode }) {
  return (
    <section className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FACC15, #EAB308)', border: '1px solid rgba(0,0,0,0.85)' }}>
          <Icon className="w-4 h-4 text-bg" strokeWidth={2.5} />
        </div>
        <h2 className="text-[15px] font-extrabold text-ink leading-tight">{title}</h2>
      </div>
      {children}
    </section>
  )
}
