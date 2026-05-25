'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import AppNav from '@/components/layout/AppNav'
import ProviderRenewBanner from '@/components/upgrade/ProviderRenewBanner'
import KtpUploader from '@/components/kyc/KtpUploader'
import ProfileImageUploader from '@/components/kyc/ProfileImageUploader'
import UniversalProfileExtrasEditor from '@/components/dashboard/UniversalProfileExtrasEditor'
import BeauticianServicePhotosEditor from '@/components/dashboard/BeauticianServicePhotosEditor'
import {
  BEAUTICIAN_SERVICES_OFFERED,
  type BeauticianProvider,
  type BeauticianAvailability,
  type BeauticianServiceOffered,
} from '@/lib/beautician/types'

// mig 0072 — universal extras live on the row but aren't in the
// BeauticianProvider TS type (it predates the migration). Cast through this
// shape when seeding the EditForm so the dashboard can read them safely.
type UniversalExtras = {
  cover_image_url?:    string | null
  gallery_image_urls?: string[] | null
  instagram_url?:      string | null
  tiktok_url?:         string | null
  facebook_url?:       string | null
  operating_hours?:    Record<string, string> | null
  certifications?:     string[] | null
  languages?:          string[] | null
  // mig 0073 services offered catalog
  services_offered?:   BeauticianServiceOffered[] | null
  // mig 0074 per-service photos
  service_photos?:     Partial<Record<BeauticianServiceOffered, string[]>> | null
}

const BG_URL = 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2004_57_59%20AM.png?updatedAt=1779141503106'

export default function BeauticianDashboardPage() {
  const [provider, setProvider] = useState<BeauticianProvider | null>(null)
  const [loading, setLoading]   = useState(true)
  const [err, setErr]           = useState<string | null>(null)
  const [editing, setEditing]   = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/beautician/me', { cache: 'no-store' })
      if (r.status === 401) { setErr('not_signed_in'); return }
      const j = await r.json() as { provider: BeauticianProvider | null }
      setProvider(j.provider)
    } catch { setErr('fetch_failed') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { reload() }, [reload])

  async function setAvailability(next: BeauticianAvailability) {
    if (!provider) return
    const prev = provider.availability
    setProvider({ ...provider, availability: next })
    try {
      const r = await fetch('/api/beautician/me/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: next }),
      })
      const j = await r.json() as { ok?: boolean; error?: string }
      if (!j.ok) {
        setProvider({ ...provider, availability: prev })
        alert(j.error === 'not_verified'
          ? 'Awaiting admin verification — Online unlocks once KTP review is complete.'
          : 'Could not update availability.')
      }
    } catch {
      setProvider({ ...provider, availability: prev })
    }
  }

  if (loading) return <Shell><div className="px-4 pt-6 text-ink/50 text-[13px]">Loading…</div></Shell>
  if (err === 'not_signed_in') {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black mb-2">Sign in required</h1>
          <Link href="/login?next=/dashboard/beautician" className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block">Sign in</Link>
        </div>
      </Shell>
    )
  }
  if (!provider) {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black mb-2">Not a beautician yet</h1>
          <p className="text-[13px] text-ink/70 mb-6">Register to start receiving WhatsApp bookings.</p>
          <Link href="/beautician/signup" className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block">Register as beautician</Link>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="px-4 pt-6 pb-24 max-w-3xl mx-auto space-y-4">
        <ProviderRenewBanner provider={provider} upgradeHref="/beautician/upgrade" />
        {/* Header card */}
        <section className="rounded-2xl bg-black/85 border border-white/10 p-5 shadow-card">
          <div className="flex items-center gap-3 mb-4">
            {provider.profile_image_url
              ? <img src={provider.profile_image_url} alt={provider.display_name} className="w-14 h-14 rounded-full object-cover bg-white/5" />
              : <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center text-ink/40 text-[20px] font-black">{provider.display_name[0]}</div>}
            <div className="min-w-0 flex-1">
              <h1 className="text-[20px] font-black truncate">{provider.display_name}</h1>
              <div className="text-[12px] text-ink/60 font-mono truncate">{provider.slug}</div>
            </div>
          </div>

          {provider.status !== 'active' && (
            <div className="rounded-xl border border-yellow-400/40 bg-yellow-400/10 text-yellow-200 text-[12px] px-3 py-2 mb-3">
              <strong>Awaiting verification.</strong> Your profile is not listed on the marketplace yet — admin reviews KTP within 24h.
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {(['online','busy','offline'] as const).map((a) => {
              const active = provider.availability === a
              return (
                <button
                  key={a}
                  onClick={() => setAvailability(a)}
                  className={`rounded-xl px-3 py-3 text-[12px] font-extrabold uppercase tracking-wider transition border ${
                    active ? 'bg-brand text-bg border-brand' : 'bg-black/40 text-ink/80 border-white/15 hover:bg-white/5'
                  }`}
                >
                  {a === 'online' ? 'Online' : a === 'busy' ? 'Busy' : 'Offline'}
                </button>
              )
            })}
          </div>
        </section>

        {/* Profile + pricing */}
        <section className="rounded-2xl bg-black/85 border border-white/10 p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-extrabold uppercase tracking-wider">Profile + prices</h2>
            <button onClick={() => setEditing((v) => !v)} className="text-[12px] font-bold text-brand hover:underline">
              {editing ? 'Close' : 'Edit'}
            </button>
          </div>
          {!editing ? <ReadOnly provider={provider} /> : <EditForm provider={provider} onSaved={reload} />}
        </section>

        <p className="text-[12px] text-ink/60 text-center">
          Public profile: <a href={`/beautician/${provider.slug}`} target="_blank" rel="noopener" className="text-brand hover:underline">/beautician/{provider.slug}</a>
        </p>
      </div>
    </Shell>
  )
}

function ReadOnly({ provider }: { provider: BeauticianProvider }) {
  const services = [
    provider.price_makeup_idr != null ? { l: 'Makeup', v: provider.price_makeup_idr } : null,
    provider.price_nail_idr   != null ? { l: 'Nail',   v: provider.price_nail_idr }   : null,
    provider.price_hair_idr   != null ? { l: 'Hair',   v: provider.price_hair_idr }   : null,
  ].filter((s): s is { l: string; v: number } => s !== null)
  return (
    <div className="space-y-3 text-[13px]">
      <KV k="Gender" v={provider.gender === 'woman' ? 'Wanita' : 'Pria'} />
      <KV k="Years experience" v={String(provider.years_experience)} />
      <KV k="Bio" v={provider.bio} multiline />
      <div className="grid grid-cols-3 gap-2 pt-2">
        {services.map((s) => (
          <div key={s.l} className="rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-center">
            <div className="text-[11px] text-ink/60 uppercase tracking-wider font-bold">{s.l}</div>
            <div className="text-[14px] font-black text-brand">Rp {s.v.toLocaleString('id-ID')}</div>
          </div>
        ))}
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
      <div className="text-[11px] uppercase tracking-wider font-bold text-ink/55">{k}</div>
      <div className={`text-[13px] text-ink ${multiline ? 'whitespace-pre-wrap' : 'truncate'}`}>{v}</div>
    </div>
  )
}

function EditForm({ provider, onSaved }: { provider: BeauticianProvider; onSaved: () => void }) {
  const px = provider as BeauticianProvider & UniversalExtras
  type FormState = {
    display_name: string
    gender: BeauticianProvider['gender']
    years_experience: number
    bio: string
    price_makeup_idr: number | string
    price_nail_idr:   number | string
    price_hair_idr:   number | string
    whatsapp_e164: string
    city: string
    service_area_notes: string
    profile_image_url: string
    ktp_image_url: string
    cover_image_url:    string | null
    gallery_image_urls: string[]
    instagram_url:      string | null
    tiktok_url:         string | null
    facebook_url:       string | null
    operating_hours:    Record<string, string> | null
    certifications:     string[]
    languages:          string[]
    services_offered:   BeauticianServiceOffered[]
    service_photos:     Partial<Record<BeauticianServiceOffered, string[]>>
  }
  const [f, setF] = useState<FormState>({
    display_name: provider.display_name,
    gender: provider.gender,
    years_experience: provider.years_experience,
    bio: provider.bio,
    price_makeup_idr: provider.price_makeup_idr ?? '',
    price_nail_idr:   provider.price_nail_idr ?? '',
    price_hair_idr:   provider.price_hair_idr ?? '',
    whatsapp_e164: provider.whatsapp_e164,
    city: provider.city ?? '',
    service_area_notes: provider.service_area_notes ?? '',
    profile_image_url: provider.profile_image_url ?? '',
    ktp_image_url: provider.ktp_image_url ?? '',
    // mig 0072 — universal profile extras
    cover_image_url:    px.cover_image_url ?? '',
    gallery_image_urls: px.gallery_image_urls ?? [],
    instagram_url:      px.instagram_url ?? '',
    tiktok_url:         px.tiktok_url ?? '',
    facebook_url:       px.facebook_url ?? '',
    operating_hours:    px.operating_hours ?? null,
    certifications:     px.certifications ?? [],
    languages:          px.languages ?? [],
    services_offered:   px.services_offered ?? [],
    service_photos:     px.service_photos ?? {},
  })
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  function upd<K extends keyof typeof f>(k: K, v: typeof f[K]) {
    setF((prev) => ({ ...prev, [k]: v }))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const r = await fetch('/api/beautician/me/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: f.display_name,
          gender: f.gender,
          years_experience: f.years_experience,
          bio: f.bio,
          price_makeup_idr: f.price_makeup_idr === '' ? null : Number(f.price_makeup_idr),
          price_nail_idr:   f.price_nail_idr   === '' ? null : Number(f.price_nail_idr),
          price_hair_idr:   f.price_hair_idr   === '' ? null : Number(f.price_hair_idr),
          whatsapp_e164: f.whatsapp_e164,
          city: f.city,
          service_area_notes: f.service_area_notes,
          profile_image_url: f.profile_image_url,
          ktp_image_url: f.ktp_image_url,
          cover_image_url:    f.cover_image_url,
          gallery_image_urls: f.gallery_image_urls,
          instagram_url:      f.instagram_url,
          tiktok_url:         f.tiktok_url,
          facebook_url:       f.facebook_url,
          operating_hours:    f.operating_hours,
          certifications:     f.certifications,
          languages:          f.languages,
          services_offered:   f.services_offered,
          service_photos:     f.service_photos,
        }),
      })
      const j = await r.json() as { ok?: boolean; error?: string }
      if (!r.ok || !j.ok) { alert(j.error || 'failed'); return }
      setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1800)
      onSaved()
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <input type="text" value={f.display_name} onChange={(e) => upd('display_name', e.target.value)} className={inputCls} />
      <div className="grid grid-cols-2 gap-2">
        {(['woman','man'] as const).map((g) => (
          <label key={g} className={`flex items-center justify-center gap-2 rounded-xl p-2.5 cursor-pointer border ${f.gender === g ? 'bg-brand/15 border-brand/50' : 'bg-black/85 border-white/10'}`}>
            <input type="radio" name="gender" value={g} checked={f.gender === g} onChange={() => upd('gender', g)} className="accent-brand" />
            <span className="text-[13px] font-extrabold">{g === 'woman' ? 'Wanita' : 'Pria'}</span>
          </label>
        ))}
      </div>
      <input type="number" min={0} max={60} value={f.years_experience} onChange={(e) => upd('years_experience', Number(e.target.value))} placeholder="Years experience" className={inputCls} />
      <textarea maxLength={300} rows={3} value={f.bio} onChange={(e) => upd('bio', e.target.value)} placeholder="Bio (max 300)" className={inputCls + ' resize-none'} />
      <div className="grid grid-cols-3 gap-2">
        {(['makeup','nail','hair'] as const).map((k) => (
          <label key={k} className="block">
            <span className="text-[11px] font-bold text-ink/70 mb-1 inline-block uppercase">{k}</span>
            <input
              type="number" min={0}
              value={f[`price_${k}_idr` as const] as string | number}
              onChange={(e) => upd(`price_${k}_idr` as const, e.target.value)}
              placeholder="—"
              className={inputCls + ' text-[13px]'}
            />
          </label>
        ))}
      </div>
      <input type="tel" value={f.whatsapp_e164} onChange={(e) => upd('whatsapp_e164', e.target.value)} className={inputCls} />
      <input type="text" value={f.city} onChange={(e) => upd('city', e.target.value)} placeholder="City" className={inputCls} />
      <input type="text" value={f.service_area_notes} onChange={(e) => upd('service_area_notes', e.target.value)} placeholder="Service area" className={inputCls} />
      {/* Services Provided — multi-select. Mig 0073 DB CHECK
          enforces the same allowlist, so the catalog is the single
          source of truth. */}
      <div className="rounded-xl bg-black/85 border border-white/15 p-4 space-y-2">
        <div className="text-[12px] font-extrabold uppercase tracking-wider text-ink">
          Services Provided
        </div>
        <p className="text-[11px] text-ink/55 leading-snug">
          Pilih layanan yang Anda tawarkan — muncul sebagai badge di profil publik.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {BEAUTICIAN_SERVICES_OFFERED.map((s) => {
            const on = f.services_offered.includes(s.id)
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => upd(
                  'services_offered',
                  on ? f.services_offered.filter((x) => x !== s.id)
                     : [...f.services_offered, s.id],
                )}
                className={`text-[12px] font-extrabold px-3 py-1.5 rounded-full border transition ${
                  on
                    ? 'bg-pink-500 text-white border-pink-500'
                    : 'bg-black/40 text-ink/80 border-white/15 hover:bg-white/5'
                }`}
              >
                {s.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Per-service photo gallery — 4 slots per selected service. */}
      {provider.user_id && (
        <BeauticianServicePhotosEditor
          userId={provider.user_id}
          servicesOffered={f.services_offered}
          value={f.service_photos}
          onChange={(next) => upd('service_photos', next)}
        />
      )}

      {provider.user_id && <ProfileImageUploader value={f.profile_image_url || null} onChange={(v) => upd('profile_image_url', v ?? '')} userId={provider.user_id} />}
      {provider.user_id && <KtpUploader value={f.ktp_image_url || null} onChange={(v) => upd('ktp_image_url', v ?? '')} userId={provider.user_id} />}
      {provider.user_id && (
        <UniversalProfileExtrasEditor
          userId={provider.user_id}
          value={{
            cover_image_url:    f.cover_image_url,
            gallery_image_urls: f.gallery_image_urls,
            instagram_url:      f.instagram_url,
            tiktok_url:         f.tiktok_url,
            facebook_url:       f.facebook_url,
            operating_hours:    f.operating_hours,
            certifications:     f.certifications,
            languages:          f.languages,
          }}
          onChange={(patch) => setF((prev) => ({ ...prev, ...patch }))}
        />
      )}
      {savedFlash && <div className="rounded-lg border border-green-500/40 bg-green-500/10 text-green-200 text-[13px] px-3 py-2">Saved.</div>}
      <button type="submit" disabled={saving} className="w-full rounded-full bg-brand text-bg px-6 py-3 text-[14px] font-extrabold uppercase tracking-wider disabled:opacity-60">
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen text-ink overflow-hidden">
      <div aria-hidden className="absolute inset-0 -z-10 bg-cover bg-center bg-fixed" style={{ backgroundImage: `url(${BG_URL})` }} />
      <div aria-hidden className="absolute inset-0 -z-10 bg-black/75" />
      <AppNav />
      {children}
    </main>
  )
}

const inputCls = 'w-full rounded-xl bg-black/85 border border-white/15 px-4 py-3 text-[14px] text-ink placeholder:text-ink/40 focus:outline-none focus:border-brand'
