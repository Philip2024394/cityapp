'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Locate, Camera, User, Phone, MapPin, ShieldCheck } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import KtpUploader from '@/components/kyc/KtpUploader'
import ProfileImageUploader from '@/components/kyc/ProfileImageUploader'
import PlaceAutocomplete from '@/components/inputs/PlaceAutocomplete'
import { INDONESIAN_CITIES } from '@/data/indonesianCities'
import { type BeauticianProvider } from '@/lib/beautician/types'

// Profile Info — basic personal details only. Theme/banner/photos live
// on /dashboard/beautician/edit. Services + prices live on
// /dashboard/beautician/services. This page is intentionally narrow so
// a first-time user can complete it in one sitting without scrolling
// past anything that isn't "who am I".

type Extras = {
  has_physical_location?: boolean
  latitude?:  number | null
  longitude?: number | null
  instagram_url?: string | null
  tiktok_url?:    string | null
  facebook_url?:  string | null
  service_locations?: Array<'home' | 'hotel' | 'villa'> | null
}
type FullProvider = BeauticianProvider & Extras

export default function BeauticianInfoPage() {
  const [provider, setProvider] = useState<FullProvider | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [err,      setErr]      = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/beautician/me', { cache: 'no-store' })
      if (r.status === 401) { setErr('not_signed_in'); return }
      const j = await r.json() as { provider: FullProvider | null }
      setProvider(j.provider)
    } catch { setErr('fetch_failed') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void reload() }, [reload])

  if (loading) return <Shell><div className="px-4 pt-6 text-white/70 text-[14px]">Loading…</div></Shell>
  if (err === 'not_signed_in') {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black text-white mb-2">Sign in required</h1>
          <Link href="/login?next=/dashboard/beautician/info" className="rounded-full bg-pink-500 text-white px-6 py-3 text-[14px] font-extrabold inline-block">Sign in</Link>
        </div>
      </Shell>
    )
  }
  if (!provider) {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black text-white mb-2">Not a beautician yet</h1>
          <Link href="/beautician/signup" className="rounded-full bg-pink-500 text-white px-6 py-3 text-[14px] font-extrabold inline-block">Sign up</Link>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="px-4 pt-3 pb-28 max-w-lg mx-auto">
        <header className="mb-5">
          <h1 className="text-[24px] font-black text-white leading-tight">Profile info</h1>
          <p className="text-[13px] text-white/70 mt-1">What customers see first — name, photo, contact, and service area.</p>
        </header>

        <InfoForm provider={provider} onSaved={reload} />
      </div>
    </Shell>
  )
}

function InfoForm({ provider, onSaved }: { provider: FullProvider; onSaved: () => void }) {
  type FormState = {
    display_name: string
    bio: string
    whatsapp_e164: string
    city: string
    service_area_notes: string
    profile_image_url: string
    ktp_image_url: string
    has_physical_location: boolean
    latitude:  number | null
    longitude: number | null
    instagram_url: string
    tiktok_url:    string
    facebook_url:  string
    service_locations: Array<'home' | 'hotel' | 'villa'>
  }
  const [f, setF] = useState<FormState>({
    display_name:        provider.display_name,
    bio:                 provider.bio,
    whatsapp_e164:       provider.whatsapp_e164,
    city:                provider.city ?? '',
    service_area_notes:  provider.service_area_notes ?? '',
    profile_image_url:   provider.profile_image_url ?? '',
    ktp_image_url:       provider.ktp_image_url ?? '',
    has_physical_location: provider.has_physical_location ?? false,
    latitude:            provider.latitude  ?? null,
    longitude:           provider.longitude ?? null,
    instagram_url:       provider.instagram_url ?? '',
    tiktok_url:          provider.tiktok_url    ?? '',
    facebook_url:        provider.facebook_url  ?? '',
    service_locations:   provider.service_locations ?? ['home','hotel','villa'],
  })
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [locationQuery, setLocationQuery] = useState('')
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError,   setGpsError]   = useState<string | null>(null)

  function upd<K extends keyof FormState>(k: K, v: FormState[K]) {
    setF((prev) => ({ ...prev, [k]: v }))
  }

  function useMyGps() {
    if (!('geolocation' in navigator)) {
      setGpsError('GPS not supported on this device.')
      return
    }
    setGpsError(null)
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        // Reverse-geocode to a readable label. Falls back to raw coords
        // if Nominatim is unavailable so the pin still works.
        try {
          const r = await fetch(`/api/geo/reverse?lat=${lat}&lng=${lng}`, { cache: 'no-store' })
          const j = await r.json().catch(() => ({}))
          const label = (r.ok && j?.display_name) ? j.display_name : `${lat.toFixed(4)}, ${lng.toFixed(4)}`
          setLocationQuery(label)
        } catch {
          setLocationQuery(`${lat.toFixed(4)}, ${lng.toFixed(4)}`)
        }
        upd('latitude',  lat)
        upd('longitude', lng)
        setGpsLoading(false)
      },
      (err) => {
        setGpsLoading(false)
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. Enable it in your browser settings.'
            : err.code === err.POSITION_UNAVAILABLE
              ? 'Could not determine your location.'
              : 'Location request timed out.'
        )
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    )
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const r = await fetch('/api/beautician/me/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name:          f.display_name,
          bio:                   f.bio,
          whatsapp_e164:         f.whatsapp_e164,
          city:                  f.city,
          service_area_notes:    f.service_area_notes,
          profile_image_url:     f.profile_image_url,
          ktp_image_url:         f.ktp_image_url,
          has_physical_location: f.has_physical_location,
          latitude:              f.latitude,
          longitude:             f.longitude,
          instagram_url:         f.instagram_url.trim() || null,
          tiktok_url:            f.tiktok_url.trim()    || null,
          facebook_url:          f.facebook_url.trim()  || null,
          service_locations:     f.service_locations,
        }),
      })
      const j = await r.json() as { ok?: boolean; error?: string }
      if (!r.ok || !j.ok) { alert(j.error || 'Save failed'); return }
      setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1800)
      onSaved()
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      {/* Photo */}
      <Card title="Profile photo" hint="A bright face photo with a plain background. Customers trust profiles with photos." icon={<Camera size={18} />}>
        {provider.user_id && (
          <ProfileImageUploader
            value={f.profile_image_url || null}
            onChange={(v) => upd('profile_image_url', v ?? '')}
            userId={provider.user_id}
            previewShape="circle"
          />
        )}
      </Card>

      {/* Name & bio */}
      <Card title="Your name & bio" icon={<User size={18} />}>
        <Field label="Display name">
          <input type="text" value={f.display_name} onChange={(e) => upd('display_name', e.target.value)} className={inputCls} placeholder="e.g. Dewi Lestari" />
        </Field>
        <Field label="Short bio" hint={`${f.bio.length}/300 — tell customers about your specialty and style`}>
          <textarea
            maxLength={300} rows={5}
            value={f.bio}
            onChange={(e) => upd('bio', e.target.value)}
            placeholder="Hi! I'm a beautician with 5 years of experience, specializing in bridal makeup."
            className={inputCls + ' resize-y leading-relaxed max-h-[260px] overflow-y-auto'}
          />
        </Field>
      </Card>

      {/* Contact & area */}
      <Card title="Contact & service area" hint="Customers contact you directly via WhatsApp." icon={<Phone size={18} />}>
        <Field label="WhatsApp number" hint="The +62 country code is added automatically — type the number that follows.">
          <div className="relative">
            <span
              aria-hidden
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] font-extrabold text-white/55 pointer-events-none select-none"
            >
              +62
            </span>
            <input
              type="tel"
              value={f.whatsapp_e164.startsWith('+62') ? f.whatsapp_e164.slice(3) : f.whatsapp_e164.replace(/^\+/, '')}
              onChange={(e) => {
                const rest = e.target.value.replace(/\D/g, '')
                upd('whatsapp_e164', rest ? `+62${rest}` : '')
              }}
              className={inputCls + ' pl-12'}
              placeholder="81234567890"
              inputMode="numeric"
            />
          </div>
        </Field>
        <Field label="City">
          <input
            type="text"
            list="cr-city-list-info"
            value={f.city}
            onChange={(e) => upd('city', e.target.value)}
            placeholder="Type a city — suggestions appear"
            autoComplete="off"
            className={inputCls}
          />
          <datalist id="cr-city-list-info">
            {INDONESIAN_CITIES.map((c) => (<option key={c} value={c} />))}
          </datalist>
        </Field>
        <Field label="Service area" hint="Province or neighborhood — e.g. South Bandung">
          <input type="text" value={f.service_area_notes} onChange={(e) => upd('service_area_notes', e.target.value)} className={inputCls} placeholder="e.g. South Bandung" />
        </Field>
      </Card>

      {/* Social media — optional. Buttons only show on the public
          profile when a URL is set, so empty fields stay invisible. */}
      <Card title="Social media (optional)" hint="Paste full URLs. Each link adds a small icon button on your public profile." icon={<User size={18} />}>
        <Field label="Instagram URL">
          <input
            type="url"
            value={f.instagram_url}
            onChange={(e) => upd('instagram_url', e.target.value)}
            className={inputCls}
            placeholder="https://instagram.com/yourhandle"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </Field>
        <Field label="TikTok URL">
          <input
            type="url"
            value={f.tiktok_url}
            onChange={(e) => upd('tiktok_url', e.target.value)}
            className={inputCls}
            placeholder="https://tiktok.com/@yourhandle"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </Field>
        <Field label="Facebook URL">
          <input
            type="url"
            value={f.facebook_url}
            onChange={(e) => upd('facebook_url', e.target.value)}
            className={inputCls}
            placeholder="https://facebook.com/yourpage"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </Field>
      </Card>

      {/* Physical location */}
      {/* Where I travel to — drives the Home / Hotel / Villa icon row
          on both the public profile hero and the marketplace card.
          Customers only see the icons you tick here. */}
      <Card title="Where I travel to" hint="Tick the locations you accept bookings at. Unchecked locations are hidden from your marketplace card and profile." icon={<MapPin size={18} />}>
        <div className="grid grid-cols-3 gap-2">
          {([
            { id: 'home',  label: 'Home',  hint: 'Customer house' },
            { id: 'hotel', label: 'Hotel', hint: 'Hotel rooms' },
            { id: 'villa', label: 'Villa', hint: 'Villa stays' },
          ] as const).map((opt) => {
            const on = f.service_locations.includes(opt.id)
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => upd(
                  'service_locations',
                  on ? f.service_locations.filter((x) => x !== opt.id)
                     : [...f.service_locations, opt.id],
                )}
                aria-pressed={on}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl p-3 border transition min-h-[68px] ${
                  on
                    ? 'bg-yellow-400 border-yellow-300 text-yellow-900 shadow-md shadow-yellow-400/30'
                    : 'bg-white/10 border-white/15 text-white/70 hover:bg-white/15'
                }`}
              >
                <span className="text-[13px] font-extrabold leading-none">{opt.label}</span>
                <span className={`text-[10px] leading-tight ${on ? 'text-yellow-900/70' : 'text-white/50'}`}>
                  {opt.hint}
                </span>
              </button>
            )
          })}
        </div>
        {f.service_locations.length === 0 && (
          <p className="text-[11px] text-amber-200 leading-snug">
            ⚠ With none selected, your card and profile won&apos;t show any travel-location icons.
          </p>
        )}
      </Card>

      <Card title="Physical location (optional)" hint="Enable if you have a salon or studio customers can visit. Don't publish your home address unless you want walk-ins." icon={<MapPin size={18} />}>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={f.has_physical_location}
            onChange={(e) => upd('has_physical_location', e.target.checked)}
            className="w-5 h-5 accent-yellow-400"
          />
          <span className="text-[14px] font-extrabold text-white">
            I have a physical location
          </span>
        </label>
        {f.has_physical_location && (
          <div className="pt-3 space-y-2">
            <span className="text-[13px] font-bold text-white/85 inline-block">Pick a location</span>
            <button
              type="button"
              onClick={useMyGps}
              disabled={gpsLoading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-yellow-900 px-3 py-3 text-[13px] font-extrabold min-h-[44px] transition disabled:opacity-60 shadow-md shadow-yellow-400/20"
            >
              <Locate size={16} className={gpsLoading ? 'animate-pulse' : ''} />
              {gpsLoading
                ? 'Getting GPS…'
                : (f.latitude != null && f.longitude != null)
                  ? 'Location set'
                  : 'Use my current location'}
            </button>
            {gpsError && (
              <div className="rounded-lg border border-rose-400/40 bg-rose-500/15 text-rose-100 text-[12px] px-3 py-2">
                {gpsError}
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[11px] text-white/40 uppercase tracking-wider font-bold">or type address</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <PlaceAutocomplete
              value={locationQuery}
              onChange={setLocationQuery}
              onSelect={(s) => {
                setLocationQuery(s.label)
                upd('latitude',  s.lat)
                upd('longitude', s.lng)
              }}
              countryCodes={['id']}
              placeholder="Type address or place name…"
              ariaLabel="Search location"
              className="w-full rounded-xl bg-white/10 border border-white/15 px-3 py-3 text-[14px] text-white placeholder:text-white/40 focus:outline-none focus:border-pink-400"
            />
            {f.latitude != null && f.longitude != null ? (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-500/15 border border-emerald-400/40 px-3 py-2">
                <div className="text-[13px] text-emerald-100 leading-snug min-w-0 flex-1 truncate">
                  ✓ Pinned at <span className="font-mono text-[12px] text-emerald-200">{f.latitude.toFixed(4)}, {f.longitude.toFixed(4)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLocationQuery('')
                    upd('latitude', null)
                    upd('longitude', null)
                  }}
                  className="text-[12px] font-bold text-white/70 hover:text-white"
                >
                  Change
                </button>
              </div>
            ) : (
              <p className="text-[12px] text-white/60 leading-snug">
                Type a place name (e.g. "Malioboro Yogyakarta") — pick a suggestion to drop a pin.
              </p>
            )}
          </div>
        )}
      </Card>

      {/* KTP */}
      <Card title="ID verification (KTP)" hint="Admin reviews within 24 hours. Your profile appears on the marketplace once verified." icon={<ShieldCheck size={18} />}>
        {provider.user_id && (
          <KtpUploader
            value={f.ktp_image_url || null}
            onChange={(v) => upd('ktp_image_url', v ?? '')}
            userId={provider.user_id}
          />
        )}
      </Card>

      {savedFlash && (
        <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 text-emerald-100 text-[14px] px-4 py-3 font-bold">
          ✓ Saved
        </div>
      )}

      {/* Sticky save bar */}
      <div className="sticky bottom-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-full bg-yellow-400 hover:bg-yellow-300 text-yellow-900 px-6 py-4 text-[15px] font-extrabold uppercase tracking-wider disabled:opacity-60 shadow-lg shadow-yellow-400/30"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

function Card({ title, hint, icon, children }: {
  title: string
  hint?: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl bg-black/55 backdrop-blur-md border border-white/10 p-5 shadow-lg shadow-black/20 space-y-3">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-yellow-400 text-yellow-900 shadow-md shadow-yellow-400/20">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-black text-white leading-tight">{title}</h2>
          {hint && <p className="text-[12px] text-white/65 leading-snug mt-1">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[13px] font-bold text-white/85 block">{label}</span>
      {children}
      {hint && <span className="text-[12px] text-white/55 leading-snug block">{hint}</span>}
    </label>
  )
}

const BG_URL = 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2004_57_59%20AM.png?updatedAt=1779141503106'

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen text-white overflow-hidden">
      <div aria-hidden className="fixed inset-0 -z-10 bg-cover bg-center bg-fixed" style={{ backgroundImage: `url(${BG_URL})` }} />
      <div aria-hidden className="fixed inset-0 -z-10 bg-black/55" />
      <AppNav />
      {children}
    </main>
  )
}

const inputCls = 'w-full rounded-xl bg-white/10 border border-white/15 px-4 py-3 text-[14px] text-white placeholder:text-white/40 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-400/30 min-h-[44px]'
