'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Locate, Camera, User, Phone, MapPin, Sparkles, Globe2 } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import ProfileImageUploader from '@/components/kyc/ProfileImageUploader'
import PlaceAutocomplete from '@/components/inputs/PlaceAutocomplete'
import { INDONESIAN_CITIES } from '@/data/indonesianCities'
import { type BeauticianProvider } from '@/lib/beautician/types'
import { countryByCode } from '@/lib/data/countries'
import CountryPicker from '@/components/dashboard/CountryPicker'

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
  x_url?:         string | null
  snapchat_url?:  string | null
  website_url?:   string | null
  // mig 0131
  country_code?:            string | null
  custom_services_offered?: string[] | null
  // mig 0132 — chat handles
  telegram_handle?: string | null
  wechat_id?:       string | null
  line_id?:         string | null
  kakaotalk_id?:    string | null
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

  if (loading) return <Shell><div className="px-4 pt-6 text-black/70 text-[14px]">Loading…</div></Shell>
  if (err === 'not_signed_in') {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black text-black mb-2">Sign in required</h1>
          <Link href="/login?next=/dashboard/beautician/info" className="rounded-full bg-pink-500 text-white px-6 py-3 text-[14px] font-extrabold inline-block">Sign in</Link>
        </div>
      </Shell>
    )
  }
  if (!provider) {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black text-black mb-2">Not a beautician yet</h1>
          <Link href="/beautician/signup" className="rounded-full bg-pink-500 text-white px-6 py-3 text-[14px] font-extrabold inline-block">Sign up</Link>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="px-4 pt-4 pb-28 max-w-lg mx-auto">
        {/* Brand header — matches the Design Studio pattern on /edit. */}
        <div className="rounded-3xl border border-pink-200/70 bg-gradient-to-br from-pink-50 to-white p-5 shadow-sm mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <Sparkles size={22} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-[20px] font-black leading-tight text-black truncate">Profile info</h1>
              </div>
              <p className="text-[12.5px] text-black/70 leading-snug">
                What customers see first — name, photo, contact, and service area.
              </p>
            </div>
          </div>
        </div>

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
    has_physical_location: boolean
    latitude:  number | null
    longitude: number | null
    instagram_url: string
    tiktok_url:    string
    facebook_url:  string
    x_url:         string
    snapchat_url:  string
    website_url:   string
    country_code:  string
    telegram_handle: string
    wechat_id:       string
    line_id:         string
    kakaotalk_id:    string
    service_locations: Array<'home' | 'hotel' | 'villa'>
  }
  const [f, setF] = useState<FormState>({
    display_name:        provider.display_name,
    bio:                 provider.bio,
    whatsapp_e164:       provider.whatsapp_e164,
    city:                provider.city ?? '',
    service_area_notes:  provider.service_area_notes ?? '',
    profile_image_url:   provider.profile_image_url ?? '',
    has_physical_location: provider.has_physical_location ?? false,
    latitude:            provider.latitude  ?? null,
    longitude:           provider.longitude ?? null,
    instagram_url:       provider.instagram_url ?? '',
    tiktok_url:          provider.tiktok_url    ?? '',
    facebook_url:        provider.facebook_url  ?? '',
    x_url:               (provider as Extras & { x_url?: string | null }).x_url               ?? '',
    snapchat_url:        (provider as Extras & { snapchat_url?: string | null }).snapchat_url ?? '',
    website_url:         (provider as Extras & { website_url?: string | null }).website_url   ?? '',
    country_code:        (provider as Extras).country_code ?? 'ID',
    telegram_handle:     (provider as Extras).telegram_handle ?? '',
    wechat_id:           (provider as Extras).wechat_id       ?? '',
    line_id:             (provider as Extras).line_id         ?? '',
    kakaotalk_id:        (provider as Extras).kakaotalk_id    ?? '',
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
          has_physical_location: f.has_physical_location,
          latitude:              f.latitude,
          longitude:             f.longitude,
          instagram_url:         f.instagram_url.trim() || null,
          tiktok_url:            f.tiktok_url.trim()    || null,
          facebook_url:          f.facebook_url.trim()  || null,
          x_url:                 f.x_url.trim()         || null,
          snapchat_url:          f.snapchat_url.trim()  || null,
          website_url:           f.website_url.trim()   || null,
          country_code:          f.country_code,
          telegram_handle:       f.telegram_handle.trim() || null,
          wechat_id:             f.wechat_id.trim()       || null,
          line_id:               f.line_id.trim()         || null,
          kakaotalk_id:          f.kakaotalk_id.trim()    || null,
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
        <Field label="Country" hint="Drives your WhatsApp prefix + currency symbol everywhere on the dashboard.">
          <CountryPicker
            value={f.country_code}
            onChange={(code) => {
              const prev = countryByCode(f.country_code)
              const next = countryByCode(code)
              upd('country_code', next.code)
              // Re-stitch the WA number when the dial code changes.
              const digits = f.whatsapp_e164.replace(/^\+/, '').replace(/\D/g, '')
              const trimmed = digits.startsWith(prev.dial_code) ? digits.slice(prev.dial_code.length) : digits
              upd('whatsapp_e164', trimmed ? `+${next.dial_code}${trimmed}` : '')
            }}
          />
        </Field>
        <Field label="WhatsApp number" hint={`The +${countryByCode(f.country_code).dial_code} country code is added automatically — type the number that follows.`}>
          <div className="relative">
            <span
              aria-hidden
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] font-extrabold text-black/55 pointer-events-none select-none"
            >
              +{countryByCode(f.country_code).dial_code}
            </span>
            <input
              type="tel"
              value={(() => {
                const dial = countryByCode(f.country_code).dial_code
                const digits = f.whatsapp_e164.replace(/^\+/, '')
                return digits.startsWith(dial) ? digits.slice(dial.length) : digits.replace(/\D/g, '')
              })()}
              onChange={(e) => {
                const rest = e.target.value.replace(/\D/g, '')
                const dial = countryByCode(f.country_code).dial_code
                upd('whatsapp_e164', rest ? `+${dial}${rest}` : '')
              }}
              className={inputCls}
              style={{ paddingLeft: `${(countryByCode(f.country_code).dial_code.length + 1) * 9 + 18}px` }}
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
        <Field label="X (Twitter) URL">
          <input
            type="url"
            value={f.x_url}
            onChange={(e) => upd('x_url', e.target.value)}
            className={inputCls}
            placeholder="https://x.com/yourhandle"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </Field>
        <Field label="Snapchat URL">
          <input
            type="url"
            value={f.snapchat_url}
            onChange={(e) => upd('snapchat_url', e.target.value)}
            className={inputCls}
            placeholder="https://snapchat.com/add/yourhandle"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </Field>
        <Field label="Website / custom domain">
          <input
            type="url"
            value={f.website_url}
            onChange={(e) => upd('website_url', e.target.value)}
            className={inputCls}
            placeholder="https://your-domain.com"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </Field>
      </Card>

      {/* Chat handles — WhatsApp is the primary number above. These four
          give Chinese / Korean / Japanese / Western tourists their own
          app. Each shows a button on the public profile only when set. */}
      <Card title="Chat handles (optional)" hint="Add any chat apps you use beyond WhatsApp. Public profile shows each as its own button." icon={<Phone size={18} />}>
        <Field label="Telegram" hint="@handle, t.me URL, or +phone">
          <input
            type="text"
            value={f.telegram_handle}
            onChange={(e) => upd('telegram_handle', e.target.value)}
            className={inputCls}
            placeholder="@mybeauty"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </Field>
        <Field label="WeChat ID">
          <input
            type="text"
            value={f.wechat_id}
            onChange={(e) => upd('wechat_id', e.target.value)}
            className={inputCls}
            placeholder="wxid_xxx"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </Field>
        <Field label="Line ID">
          <input
            type="text"
            value={f.line_id}
            onChange={(e) => upd('line_id', e.target.value)}
            className={inputCls}
            placeholder="lineid"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </Field>
        <Field label="KakaoTalk ID">
          <input
            type="text"
            value={f.kakaotalk_id}
            onChange={(e) => upd('kakaotalk_id', e.target.value)}
            className={inputCls}
            placeholder="kakao-id"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </Field>
      </Card>

      {/* Service modes — unified four-toggle group.
          Customer-facing card + profile show whichever of these four
          modes the beautician ticks. Each toggle maps to one DB field:
            • Beautician Spa Place → has_physical_location
            • Home / Hotel / Villa → entries in service_locations[]
          When "Beautician Spa Place" is on, the location-pin editor
          below the grid becomes visible. */}
      <Card title="Service modes — where customers meet you" hint="Tick every mode you offer. Unticked modes are hidden from your marketplace card and profile." icon={<MapPin size={18} />}>
        <div className="grid grid-cols-2 gap-2">
          {([
            { id: 'spa',   label: 'Beautician Spa Place', hint: 'Customers visit my salon' },
            { id: 'home',  label: 'Home service',          hint: 'I visit customer homes' },
            { id: 'hotel', label: 'Hotel service',         hint: 'I visit hotels' },
            { id: 'villa', label: 'Villa service',         hint: 'I visit villas' },
          ] as const).map((opt) => {
            const on = opt.id === 'spa'
              ? f.has_physical_location
              : f.service_locations.includes(opt.id as 'home' | 'hotel' | 'villa')
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  if (opt.id === 'spa') {
                    upd('has_physical_location', !on)
                  } else {
                    const lid = opt.id as 'home' | 'hotel' | 'villa'
                    upd(
                      'service_locations',
                      on ? f.service_locations.filter((x) => x !== lid)
                         : [...f.service_locations, lid],
                    )
                  }
                }}
                aria-pressed={on}
                className={`flex flex-col items-start justify-center gap-1 rounded-xl p-3 border transition min-h-[68px] text-left ${
                  on
                    ? 'bg-pink-500 border-pink-500 text-white shadow-md shadow-pink-500/25'
                    : 'bg-gray-50 border-gray-200 text-black/80 hover:bg-gray-100'
                }`}
              >
                <span className="text-[13px] font-extrabold leading-tight">{opt.label}</span>
                <span className={`text-[12px] leading-tight ${on ? 'text-white/80' : 'text-black/55'}`}>
                  {opt.hint}
                </span>
              </button>
            )
          })}
        </div>
        {!f.has_physical_location && f.service_locations.length === 0 && (
          <p className="text-[12px] text-amber-700 leading-snug">
            ⚠ With none selected, your card and profile won&apos;t show any service icons.
          </p>
        )}

        {f.has_physical_location && (
          <div className="pt-3 space-y-2">
            <span className="text-[13px] font-bold text-black/85 inline-block">Pick a location</span>
            <button
              type="button"
              onClick={useMyGps}
              disabled={gpsLoading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white px-3 py-3 text-[13px] font-extrabold min-h-[44px] transition disabled:opacity-60 shadow-md shadow-pink-500/25"
            >
              <Locate size={16} className={gpsLoading ? 'animate-pulse' : ''} />
              {gpsLoading
                ? 'Getting GPS…'
                : (f.latitude != null && f.longitude != null)
                  ? 'Location set'
                  : 'Use my current location'}
            </button>
            {gpsError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-[12px] px-3 py-2">
                {gpsError}
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[12px] text-black/45 uppercase tracking-wider font-bold">or type address</span>
              <div className="flex-1 h-px bg-gray-200" />
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
              className="w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-3 text-[14px] text-black placeholder:text-black/35 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
            />
            {f.latitude != null && f.longitude != null ? (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                <div className="text-[13px] text-emerald-700 leading-snug min-w-0 flex-1 truncate">
                  ✓ Pinned at <span className="font-mono text-[12px] text-emerald-800">{f.latitude.toFixed(4)}, {f.longitude.toFixed(4)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLocationQuery('')
                    upd('latitude', null)
                    upd('longitude', null)
                  }}
                  className="text-[12px] font-bold text-black/70 hover:text-black"
                >
                  Change
                </button>
              </div>
            ) : (
              <p className="text-[12px] text-black/60 leading-snug">
                Type a place name (e.g. &quot;Malioboro Yogyakarta&quot;) — pick a suggestion to drop a pin.
              </p>
            )}
          </div>
        )}
      </Card>

      {savedFlash && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-[14px] px-4 py-3 font-bold">
          ✓ Saved
        </div>
      )}

      {/* Sticky save bar */}
      <div className="sticky bottom-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-full bg-pink-500 hover:bg-pink-600 text-white px-6 py-4 text-[15px] font-extrabold uppercase tracking-wider disabled:opacity-60 shadow-lg shadow-pink-500/25 min-h-[44px]"
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
    <section className="rounded-3xl bg-white border border-gray-200 p-5 shadow-sm space-y-3">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-pink-100 text-pink-600">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-black text-black leading-tight">{title}</h2>
          {hint && <p className="text-[12px] text-black/65 leading-snug mt-1">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[13px] font-bold text-black/85 block">{label}</span>
      {children}
      {hint && <span className="text-[12px] text-black/55 leading-snug block">{hint}</span>}
    </label>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] bg-white text-black">
      <AppNav />
      {children}
    </main>
  )
}

const inputCls = 'w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-[14px] text-black placeholder:text-black/35 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 min-h-[44px]'
