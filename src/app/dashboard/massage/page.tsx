'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import AppNav from '@/components/layout/AppNav'
import PWAInstallCard from '@/components/dashboard/PWAInstallCard'
import AvailabilityDot from '@/components/massage/AvailabilityDot'
import ProviderRenewBanner from '@/components/upgrade/ProviderRenewBanner'
import ProfileImageUploader from '@/components/kyc/ProfileImageUploader'
import UniversalProfileExtrasEditor from '@/components/dashboard/UniversalProfileExtrasEditor'
import CountryPicker from '@/components/dashboard/CountryPicker'
import { countryByCode } from '@/lib/data/countries'
import {
  MASSAGE_TYPE_GROUPS,
  MASSAGE_TYPE_LABELS,
  type MassageProvider,
  type MassageAvailability,
  type MassageGender,
  type MassageType,
} from '@/lib/massage/types'


export default function MassageDashboardPage() {
  const [provider, setProvider] = useState<MassageProvider | null>(null)
  const [loading, setLoading]   = useState(true)
  const [err, setErr]           = useState<string | null>(null)
  const [editing, setEditing]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/massage/me', { cache: 'no-store' })
      if (r.status === 401) { setErr('not_signed_in'); return }
      const j = await r.json() as { provider: MassageProvider | null }
      setProvider(j.provider)
    } catch { setErr('fetch_failed') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { reload() }, [reload])

  async function setAvailability(next: MassageAvailability) {
    if (!provider) return
    const prev = provider.availability
    setProvider({ ...provider, availability: next })
    try {
      const r = await fetch('/api/massage/me/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: next }),
      })
      const j = await r.json() as { ok?: boolean; error?: string }
      if (!j.ok) {
        setProvider({ ...provider, availability: prev })
        alert('Could not update availability.')
      }
    } catch {
      setProvider({ ...provider, availability: prev })
    }
  }

  if (loading) return <Shell><div className="px-4 pt-6 text-black/50 text-[13px]">Loading…</div></Shell>
  if (err === 'not_signed_in') {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black mb-2">Sign in required</h1>
          <Link href="/login?next=/dashboard/massage" className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block">Sign in</Link>
        </div>
      </Shell>
    )
  }
  if (!provider) {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black mb-2">Not a therapist yet</h1>
          <p className="text-[13px] text-black/70 mb-6">Register to start receiving WhatsApp bookings.</p>
          <Link href="/massage/signup" className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block">Register as therapist</Link>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="px-4 pt-6 pb-24 max-w-3xl mx-auto space-y-4">
        <PWAInstallCard />
        <ProviderRenewBanner provider={provider} upgradeHref="/massage/upgrade" />
        {/* Header card */}
        <section className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            {provider.profile_image_url
              ? <img src={provider.profile_image_url} alt={provider.display_name} className="w-14 h-14 rounded-full object-cover bg-white/5" />
              : <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-black/40 text-[20px] font-black">{provider.display_name[0]}</div>}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-[20px] font-black truncate">{provider.display_name}</h1>
                <AvailabilityDot availability={provider.availability} />
              </div>
              <div className="text-[12px] text-black/60 font-mono truncate">{provider.slug}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(['online','busy','offline'] as const).map((a) => {
              const active = provider.availability === a
              return (
                <button
                  key={a}
                  onClick={() => setAvailability(a)}
                  className={`rounded-xl px-3 py-3 text-[12px] font-extrabold uppercase tracking-wider transition border ${
                    active
                      ? 'bg-brand text-bg border-brand'
                      : 'bg-gray-100 text-black/80 border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  {a === 'online' ? 'Online' : a === 'busy' ? 'Busy' : 'Offline'}
                </button>
              )
            })}
          </div>
          <p className="text-[11px] text-black/50 mt-2">
            Online = listed top of marketplace with a pulsing green dot. Busy = listed but greyed.
            Offline = hidden from search.
          </p>
        </section>

        {/* Profile + pricing */}
        <section className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-extrabold uppercase tracking-wider">Profile</h2>
            <button onClick={() => setEditing((v) => !v)} className="text-[12px] font-bold text-brand hover:underline">
              {editing ? 'Close' : 'Edit'}
            </button>
          </div>

          {!editing ? (
            <ReadOnly provider={provider} />
          ) : (
            <EditForm
              provider={provider}
              saving={saving}
              savedFlash={savedFlash}
              onSave={async (patch) => {
                setSaving(true)
                try {
                  const r = await fetch('/api/massage/me/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(patch),
                  })
                  const j = await r.json() as { ok?: boolean; error?: string }
                  if (!r.ok || !j.ok) { alert(j.error || 'update_failed'); return }
                  setSavedFlash(true)
                  setTimeout(() => setSavedFlash(false), 2000)
                  reload()
                } finally { setSaving(false) }
              }}
            />
          )}
        </section>

        <p className="text-[12px] text-black/60 text-center">
          Public profile: <a href={`/massage/${provider.slug}`} target="_blank" rel="noopener" className="text-brand hover:underline">/massage/{provider.slug}</a>
        </p>
      </div>
    </Shell>
  )
}

function ReadOnly({ provider }: { provider: MassageProvider }) {
  return (
    <div className="space-y-3 text-[13px]">
      <KV k="Gender" v={provider.gender === 'woman' ? 'Wanita' : 'Pria'} />
      <KV k="Years experience" v={String(provider.years_experience)} />
      <KV k="Massage type" v={MASSAGE_TYPE_LABELS[provider.massage_type] ?? provider.massage_type} />
      <KV k="Bio" v={provider.bio} multiline />
      <div className="grid grid-cols-3 gap-2 pt-2">
        <Price min={60}  v={provider.price_60min_idr} />
        <Price min={90}  v={provider.price_90min_idr} />
        <Price min={120} v={provider.price_120min_idr} />
      </div>
      <KV k="WhatsApp" v={provider.whatsapp_e164} />
      <KV k="City" v={provider.city ?? '—'} />
      <KV k="Service area" v={provider.service_area_notes ?? '—'} multiline />
    </div>
  )
}

function KV({ k, v, multiline = false }: { k: string; v: string; multiline?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider font-bold text-black/55">{k}</div>
      <div className={`text-[13px] text-black ${multiline ? 'whitespace-pre-wrap' : 'truncate'}`}>{v}</div>
    </div>
  )
}

function Price({ min, v }: { min: number; v: number }) {
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 text-center">
      <div className="text-[11px] text-black/60 uppercase tracking-wider font-bold">{min} min</div>
      <div className="text-[14px] font-black text-brand">Rp {v.toLocaleString('id-ID')}</div>
    </div>
  )
}

type Patch = Partial<{
  display_name: string
  gender: MassageGender
  years_experience: number
  bio: string
  massage_type: MassageType
  price_60min_idr: number
  price_90min_idr: number
  price_120min_idr: number
  whatsapp_e164: string
  city: string
  service_area_notes: string
  profile_image_url: string
  cover_image_url: string | null
  gallery_image_urls: string[]
  instagram_url: string | null
  tiktok_url: string | null
  facebook_url: string | null
  x_url: string | null
  snapchat_url: string | null
  website_url: string | null
  operating_hours: Record<string, string> | null
  certifications: string[]
  languages: string[]
  service_locations:     Array<'home' | 'hotel' | 'villa'>
  has_physical_location: boolean
  latitude:              number | null
  longitude:             number | null
  country_code:          string
  contact_form_enabled:  boolean
  contact_email:         string | null
}>

function EditForm({
  provider, saving, savedFlash, onSave,
}: {
  provider: MassageProvider
  saving: boolean
  savedFlash: boolean
  onSave: (patch: Patch) => void
}) {
  const p = provider as MassageProvider & {
    cover_image_url?:    string | null
    gallery_image_urls?: string[] | null
    instagram_url?:      string | null
    tiktok_url?:         string | null
    facebook_url?:       string | null
    x_url?:              string | null
    snapchat_url?:       string | null
    website_url?:        string | null
    operating_hours?:    Record<string, string> | null
    certifications?:     string[] | null
    languages?:          string[] | null
    // mig 0088
    service_locations?:     Array<'home' | 'hotel' | 'villa'> | null
    has_physical_location?: boolean | null
    latitude?:              number | null
    longitude?:             number | null
    contact_form_enabled?:  boolean | null
    contact_email?:         string | null
  }
  const [f, setF] = useState<{
    display_name: string
    gender: MassageGender
    years_experience: number
    bio: string
    massage_type: MassageType
    price_60min_idr: number
    price_90min_idr: number
    price_120min_idr: number
    whatsapp_e164: string
    city: string
    service_area_notes: string
    profile_image_url: string
    cover_image_url:    string | null
    gallery_image_urls: string[]
    instagram_url:      string | null
    tiktok_url:         string | null
    facebook_url:       string | null
    x_url:              string | null
    snapchat_url:       string | null
    website_url:        string | null
    operating_hours:    Record<string, string> | null
    certifications:     string[]
    languages:          string[]
    service_locations:     Array<'home' | 'hotel' | 'villa'>
    has_physical_location: boolean
    latitude:              number | null
    longitude:             number | null
    country_code:          string
    contact_form_enabled:  boolean
    contact_email:         string | null
  }>({
    display_name: provider.display_name,
    gender: provider.gender,
    years_experience: provider.years_experience,
    bio: provider.bio,
    massage_type: provider.massage_type,
    price_60min_idr: provider.price_60min_idr,
    price_90min_idr: provider.price_90min_idr,
    price_120min_idr: provider.price_120min_idr,
    whatsapp_e164: provider.whatsapp_e164,
    city: provider.city ?? '',
    service_area_notes: provider.service_area_notes ?? '',
    profile_image_url: provider.profile_image_url ?? '',
    cover_image_url:    p.cover_image_url ?? null,
    gallery_image_urls: p.gallery_image_urls ?? [],
    instagram_url:      p.instagram_url ?? null,
    tiktok_url:         p.tiktok_url ?? null,
    facebook_url:       p.facebook_url ?? null,
    x_url:              p.x_url ?? null,
    snapchat_url:       p.snapchat_url ?? null,
    website_url:        p.website_url ?? null,
    operating_hours:    p.operating_hours ?? null,
    certifications:     p.certifications ?? [],
    languages:          p.languages ?? [],
    service_locations:     (p.service_locations ?? ['home','hotel','villa']) as Array<'home'|'hotel'|'villa'>,
    has_physical_location: Boolean(p.has_physical_location),
    latitude:              p.latitude ?? null,
    longitude:             p.longitude ?? null,
    country_code:          (p as { country_code?: string | null }).country_code ?? 'ID',
    contact_form_enabled:  Boolean(p.contact_form_enabled),
    contact_email:         p.contact_email ?? null,
  })

  function upd<K extends keyof typeof f>(k: K, v: typeof f[K]) {
    setF((prev) => ({ ...prev, [k]: v }))
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSave(f) }}
      className="space-y-3"
    >
      <input type="text" value={f.display_name} onChange={(e) => upd('display_name', e.target.value)} placeholder="Display name" className={inputCls} />
      <div className="grid grid-cols-2 gap-2">
        {(['woman','man'] as const).map((g) => (
          <label key={g} className={`flex items-center justify-center gap-2 rounded-xl p-2.5 cursor-pointer border ${f.gender === g ? 'bg-brand/15 border-brand/50' : 'bg-gray-100 border-gray-200'}`}>
            <input type="radio" name="gender" value={g} checked={f.gender === g} onChange={() => upd('gender', g)} className="accent-brand" />
            <span className="text-[13px] font-extrabold">{g === 'woman' ? 'Wanita' : 'Pria'}</span>
          </label>
        ))}
      </div>
      <input type="number" min={0} max={60} value={f.years_experience} onChange={(e) => upd('years_experience', Number(e.target.value))} placeholder="Years experience" className={inputCls} />
      <select
        value={f.massage_type}
        onChange={(e) => upd('massage_type', e.target.value as MassageType)}
        className={inputCls}
      >
        {MASSAGE_TYPE_GROUPS.map((g) => (
          <optgroup key={g.group} label={g.group}>
            {g.items.map((it) => (
              <option key={it.value} value={it.value}>{it.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
      <textarea maxLength={300} rows={3} value={f.bio} onChange={(e) => upd('bio', e.target.value)} placeholder="Bio (max 300 chars)" className={inputCls + ' resize-none'} />
      <div className="grid grid-cols-3 gap-2">
        <input type="number" min={0} value={f.price_60min_idr}  onChange={(e) => upd('price_60min_idr',  Number(e.target.value))} placeholder="60 min" className={inputCls + ' text-[13px]'} />
        <input type="number" min={0} value={f.price_90min_idr}  onChange={(e) => upd('price_90min_idr',  Number(e.target.value))} placeholder="90 min" className={inputCls + ' text-[13px]'} />
        <input type="number" min={0} value={f.price_120min_idr} onChange={(e) => upd('price_120min_idr', Number(e.target.value))} placeholder="120 min" className={inputCls + ' text-[13px]'} />
      </div>
      <CountryPicker value={f.country_code} onChange={(code) => upd('country_code', code)} />
      <input type="tel" value={f.whatsapp_e164} onChange={(e) => upd('whatsapp_e164', e.target.value)} placeholder={`+${countryByCode(f.country_code).dial_code} 812 …`} className={inputCls} />
      <input type="text" value={f.city} onChange={(e) => upd('city', e.target.value)} placeholder="City" className={inputCls} />
      <input type="text" value={f.service_area_notes} onChange={(e) => upd('service_area_notes', e.target.value)} placeholder="Service area notes" className={inputCls} />

      {/* Service modes — four independent toggles. Mirrors the
          beautician /info screen. spa → has_physical_location,
          others → service_locations[]. */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-2">
        <div className="text-[13px] font-extrabold text-black">Service modes — where customers meet you</div>
        <p className="text-[11px] text-black/60 leading-snug">Tick every mode you offer. Unticked modes are hidden from your marketplace card + profile.</p>
        <div className="grid grid-cols-2 gap-2 pt-1">
          {([
            { id: 'spa',   label: 'Therapist Spa Place', hint: 'Customers visit my spa' },
            { id: 'home',  label: 'Home service',        hint: 'I visit customer homes' },
            { id: 'hotel', label: 'Hotel service',       hint: 'I visit hotels' },
            { id: 'villa', label: 'Villa service',       hint: 'I visit villas' },
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
                    ? 'bg-yellow-400 border-yellow-300 text-yellow-900 shadow-md shadow-yellow-400/30'
                    : 'bg-gray-100 border-gray-200 text-black/80 hover:bg-gray-200'
                }`}
              >
                <span className="text-[13px] font-extrabold leading-tight">{opt.label}</span>
                <span className={`text-[10.5px] leading-tight ${on ? 'text-yellow-900/70' : 'text-black/55'}`}>
                  {opt.hint}
                </span>
              </button>
            )
          })}
        </div>
        {!f.has_physical_location && f.service_locations.length === 0 && (
          <p className="text-[11px] text-amber-700 leading-snug pt-1">
            ⚠ With none selected, your card and profile won&apos;t show any service icons.
          </p>
        )}
      </div>
      {provider.user_id && <ProfileImageUploader value={f.profile_image_url || null} onChange={(v) => upd('profile_image_url', v ?? '')} userId={provider.user_id} />}
      {provider.user_id && (
        <UniversalProfileExtrasEditor
          userId={provider.user_id}
          value={{
            cover_image_url:    f.cover_image_url,
            gallery_image_urls: f.gallery_image_urls,
            instagram_url:      f.instagram_url,
            tiktok_url:         f.tiktok_url,
            facebook_url:       f.facebook_url,
            x_url:              f.x_url,
            snapchat_url:       f.snapchat_url,
            website_url:        f.website_url,
            operating_hours:    f.operating_hours,
            certifications:     f.certifications,
            languages:          f.languages,
            contact_form_enabled: f.contact_form_enabled,
            contact_email:        f.contact_email,
          }}
          onChange={(patch) => setF((prev) => ({ ...prev, ...patch }))}
        />
      )}

      {savedFlash && (
        <div className="rounded-lg border border-green-500/40 bg-green-500/10 text-green-200 text-[13px] px-3 py-2">
          Saved.
        </div>
      )}

      <button type="submit" disabled={saving} className="w-full rounded-full bg-brand text-bg px-6 py-3 text-[14px] font-extrabold uppercase tracking-wider disabled:opacity-60">
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </form>
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

const inputCls = 'w-full rounded-xl bg-white border border-gray-300 px-4 py-3 text-[14px] text-black placeholder:text-black/40 focus:outline-none focus:border-brand'
