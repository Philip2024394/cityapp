'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, MapPin, CheckCircle2, Loader2,
  User, Compass, Banknote, Languages as LanguagesIcon, Star,
} from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import PlaceAutocomplete from '@/components/inputs/PlaceAutocomplete'
import type { PlaceSuggestion } from '@/hooks/usePlaceSearch'
import { useGeolocation } from '@/hooks/useGeolocation'
import { TOUR_SERVICES, MAX_TOUR_SERVICES, type TourServiceId } from '@/data/tourServices'
import { TOUR_LANGUAGES, MAIN_LANGUAGE_CODE, type TourLanguageCode } from '@/data/tourLanguages'
import UniversalProfileExtrasEditor, { type UniversalProfileExtras } from '@/components/dashboard/UniversalProfileExtrasEditor'
import { getBrowserSupabase } from '@/lib/supabase/client'

// Same city list as the create form. Pre-fills from the existing city
// value below; if the value isn't in the list (custom slug) we fall
// back to '__other__' + show the custom input.
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

type Row = {
  id: string
  name: string
  whatsapp_e164: string
  city: string
  address: string | null
  lat: number | null
  lng: number | null
  services: string[]
  languages: string[]
  day_rate_idr: number | null
  notes: string | null
  // mig 0072 universal profile fields
  cover_image_url: string | null
  gallery_image_urls: string[] | null
  instagram_url: string | null
  tiktok_url: string | null
  facebook_url: string | null
  operating_hours: Record<string, string> | null
  certifications: string[] | null
  user_id: string | null
}

export default function TourGuideEditForm({ row }: { row: Row }) {
  const router = useRouter()
  const geo = useGeolocation(false)

  const knownCity = SUPPORTED_CITIES.some((c) => c.slug === row.city)
  const [city, setCity] = useState<string>(knownCity ? row.city : '__other__')
  const [customCity, setCustomCity] = useState<string>(knownCity ? '' : row.city.replace(/-/g, ' '))

  const [name, setName]         = useState(row.name)
  const [whatsapp, setWhatsApp] = useState(row.whatsapp_e164 || '')
  const [services, setServices] = useState<TourServiceId[]>((row.services ?? []) as TourServiceId[])
  // Indonesian is the platform's main language — always present in the
  // stored array even if the row was somehow saved without it.
  const [languages, setLanguages] = useState<TourLanguageCode[]>(() => {
    const fromRow = (row.languages ?? []) as TourLanguageCode[]
    return fromRow.includes(MAIN_LANGUAGE_CODE) ? fromRow : [MAIN_LANGUAGE_CODE, ...fromRow]
  })
  const [dayRate, setDayRate]   = useState<string>(row.day_rate_idr != null ? String(row.day_rate_idr) : '')
  const [notes, setNotes]       = useState<string>(row.notes ?? '')
  const [address, setAddress]   = useState<string>(row.address ?? '')
  const [lat, setLat]           = useState<string>(row.lat != null ? String(row.lat) : '')
  const [lng, setLng]           = useState<string>(row.lng != null ? String(row.lng) : '')

  // mig 0072 universal profile extras — shared editor for cover, gallery,
  // socials, hours, certifications. Languages are tour-guide-specific
  // (TourLanguageCode union) so we deliberately don't pass `languages` to
  // the editor; it treats undefined as empty/no toggle.
  const [extras, setExtras] = useState<UniversalProfileExtras>({
    cover_image_url:    row.cover_image_url,
    gallery_image_urls: row.gallery_image_urls ?? [],
    instagram_url:      row.instagram_url,
    tiktok_url:         row.tiktok_url,
    facebook_url:       row.facebook_url,
    operating_hours:    row.operating_hours,
    certifications:     row.certifications ?? [],
  })

  // The owner's user id is needed by the gallery/cover uploaders so they can
  // namespace storage paths. Prefer the row's owner_user_id (aliased as
  // user_id by the server SELECT); fall back to auth.getUser() — RLS
  // guarantees the signed-in user IS the owner anyway.
  const [ownerUserId, setOwnerUserId] = useState<string | null>(row.user_id)
  useEffect(() => {
    if (ownerUserId) return
    const sb = getBrowserSupabase()
    if (!sb) return
    sb.auth.getUser().then(({ data }) => {
      if (data.user?.id) setOwnerUserId(data.user.id)
    }).catch(() => { /* offline */ })
  }, [ownerUserId])

  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  function toggleService(id: TourServiceId) {
    setServices((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id)
      if (prev.length >= MAX_TOUR_SERVICES) return prev
      return [...prev, id]
    })
  }

  function toggleLanguage(code: TourLanguageCode) {
    // Indonesian is non-removable — it's the platform's main language.
    // Clicking the locked pill is a no-op.
    if (code === MAIN_LANGUAGE_CODE) return
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
    } catch { /* offline */ }
  }

  function onAddressPick(s: PlaceSuggestion) {
    setAddress(s.label && s.detail ? `${s.label}, ${s.detail}` : s.detail || s.label)
    setLat(s.lat.toFixed(6))
    setLng(s.lng.toFixed(6))
  }

  const cityForDb = useMemo(
    () => city === '__other__' ? (slugify(customCity) || row.city) : city,
    [city, customCity, row.city],
  )

  async function handleSave() {
    setErr(null)
    if (!name.trim() || !whatsapp.trim()) { setErr('Lengkapi nama dan WhatsApp.'); return }
    if (services.length === 0) { setErr('Pilih minimal 1 service (max 3).'); return }
    if (city === '__other__' && !customCity.trim()) { setErr('Tulis nama kota / area kamu.'); return }

    setSaving(true)
    try {
      const num = (s: string) => parseInt(s.replace(/[^\d]/g, ''), 10) || 0
      const body: Record<string, unknown> = {
        name: name.trim(),
        whatsapp_e164: whatsapp,
        services,
        languages,
        day_rate_idr: dayRate ? num(dayRate) : null,
        notes: notes.trim() || null,
        city: cityForDb,
        address: address.trim() || null,
      }
      if (lat && lng) {
        body.lat = parseFloat(lat)
        body.lng = parseFloat(lng)
      }
      // Merge mig 0072 universal extras. Server validates via
      // validateUniversalProfile() and rejects malformed payloads with 400.
      Object.assign(body, {
        cover_image_url:    extras.cover_image_url ?? null,
        gallery_image_urls: extras.gallery_image_urls ?? [],
        instagram_url:      extras.instagram_url ?? null,
        tiktok_url:         extras.tiktok_url ?? null,
        facebook_url:       extras.facebook_url ?? null,
        operating_hours:    extras.operating_hours ?? null,
        certifications:     extras.certifications ?? [],
      })
      const res = await fetch(`/api/tour-guide/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await res.json().catch(() => ({})) as { ok?: boolean; error?: string }
      if (!res.ok || !j.ok) throw new Error(j?.error || `Save failed (${res.status})`)
      setSavedAt(Date.now())
      // After a short pause go back to the dashboard so user sees their saved state.
      setTimeout(() => router.push('/dashboard/tour-guide'), 800)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 pt-3 pb-24">
        <Link href="/dashboard/tour-guide" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-ink mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <header className="mb-5">
          <h1 className="text-[24px] sm:text-[28px] font-extrabold tracking-tight leading-tight">
            Edit <span className="gradient-text">Tour Guide</span>
          </h1>
          <p className="mt-1 text-[13px] text-muted leading-snug">
            Update profil, services, harga, atau lokasi. Perubahan tayang langsung tanpa moderasi.
          </p>
        </header>

        <div className="space-y-4">
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
            <p className="text-[11px] text-muted leading-snug">{services.length}/{MAX_TOUR_SERVICES} selected</p>
          </SectionCard>

          <SectionCard Icon={LanguagesIcon} title="Bahasa">
            <p className="text-[12px] text-muted mb-2 leading-snug">
              Bahasa Indonesia selalu aktif (wajib). Tambah bahasa lain yang kamu kuasai supaya
              wisatawan internasional bisa menemukanmu lebih mudah.
            </p>
            <div className="flex flex-wrap gap-2">
              {TOUR_LANGUAGES.map((l) => {
                const active = languages.includes(l.code)
                const locked = l.code === MAIN_LANGUAGE_CODE
                return (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => toggleLanguage(l.code)}
                    disabled={locked}
                    aria-pressed={active}
                    title={locked ? 'Bahasa utama — selalu aktif' : undefined}
                    className="px-3 py-1.5 rounded-full text-[12px] font-extrabold transition border disabled:cursor-not-allowed"
                    style={{
                      background: active ? '#FACC15' : 'rgba(255,255,255,0.04)',
                      color: active ? '#0A0A0A' : '#fff',
                      borderColor: active ? '#FACC15' : 'rgba(255,255,255,0.10)',
                      opacity: locked ? 0.95 : 1,
                    }}
                  >
                    <span className="mr-1.5" aria-hidden>{l.flag}</span>{l.labelId}
                    {locked && (
                      <span className="ml-1.5 inline-flex items-center text-[9px] uppercase tracking-wider opacity-70">★</span>
                    )}
                  </button>
                )
              })}
            </div>
          </SectionCard>

          <SectionCard Icon={Banknote} title="Harga & deskripsi (opsional)">
            <Field label="Tarif harian (Rp)">
              <input type="number" min="0" value={dayRate} onChange={(e) => setDayRate(e.target.value)} placeholder="500000" className={inputClass} />
            </Field>
            <Field label="Catatan singkat (max 240 char)">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 240))} rows={3} className={`${inputClass} resize-none`} />
            </Field>
          </SectionCard>

          <SectionCard Icon={MapPin} title="Lokasi">
            <Field label="Kota *">
              <select value={city} onChange={(e) => setCity(e.target.value)} className={inputClass}>
                {SUPPORTED_CITIES.map((c) => (<option key={c.slug} value={c.slug}>{c.label}</option>))}
              </select>
            </Field>
            {city === '__other__' && (
              <Field label="Tulis kota / area *">
                <input type="text" value={customCity} onChange={(e) => setCustomCity(e.target.value)} className={inputClass} required />
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
            <Field label="Alamat / area base">
              <PlaceAutocomplete
                value={address}
                onChange={setAddress}
                onSelect={onAddressPick}
                placeholder="Ketik alamat — pilih dari saran"
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

          {ownerUserId && (
            <section className="card p-4 space-y-3">
              <UniversalProfileExtrasEditor
                userId={ownerUserId}
                value={extras}
                onChange={(patch) => setExtras((prev) => ({ ...prev, ...patch }))}
              />
            </section>
          )}

          {err && (
            <div className="rounded-xl p-3 bg-red-900/30 border border-red-500/40 text-[13px] text-red-200 font-bold">{err}</div>
          )}
          {savedAt && !err && (
            <div className="rounded-xl p-3 text-[13px] text-green-200 font-bold" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.40)' }}>
              Saved! Redirecting…
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-brand to-brand2 text-bg font-extrabold text-[14px] uppercase tracking-wider border border-black/85 shadow-[0_8px_22px_rgba(250,204,21,0.30)] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><CheckCircle2 className="w-4 h-4" /> Save changes</>}
          </button>
        </div>
      </main>
    </>
  )
}

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
