'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import AppNav from '@/components/layout/AppNav'
import PWAInstallCard from '@/components/dashboard/PWAInstallCard'
import ProfileViewsChart from '@/components/dashboard/ProfileViewsChart'
import ProviderRenewBanner from '@/components/upgrade/ProviderRenewBanner'
import ProfileImageUploader from '@/components/kyc/ProfileImageUploader'
import UniversalProfileExtrasEditor from '@/components/dashboard/UniversalProfileExtrasEditor'
import BannerLibraryPicker from '@/components/dashboard/BannerLibraryPicker'
import CountryPicker from '@/components/dashboard/CountryPicker'
import {
  ALL_SPECIALTIES, SPECIALTY_LABELS, MAX_YOGA_SPECIALTIES,
  type YogaProvider, type YogaAvailability, type YogaSpecialty,
} from '@/lib/yoga/types'
import {
  YOGA_BANNER_LIBRARY,
  YOGA_BANNER_CATEGORIES,
} from '@/lib/yoga/banners'


export default function YogaDashboardPage() {
  const [p, setP] = useState<YogaProvider | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/yoga/me', { cache: 'no-store' })
      if (r.status === 401) { setErr('not_signed_in'); return }
      const j = await r.json() as { provider: YogaProvider | null }
      setP(j.provider)
    } catch { setErr('fetch_failed') } finally { setLoading(false) }
  }, [])
  useEffect(() => { reload() }, [reload])

  // Task 12/12 — plan-gated profile-view analytics (Free=28d, Pro/Studio=365d).
  const [analytics, setAnalytics] = useState<{
    plan: 'free' | 'pro' | 'studio'
    retentionDays: number
    series: Array<{ day: string; views: number }>
    totalViews: number
  } | null>(null)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch('/api/yoga/me/analytics', { cache: 'no-store' })
        if (!r.ok) return
        const j = await r.json() as {
          plan: 'free' | 'pro' | 'studio'
          retentionDays: number
          series: Array<{ day: string; views: number }>
          totalViews: number
        }
        if (!cancelled) setAnalytics(j)
      } catch { /* analytics is best-effort */ }
    })()
    return () => { cancelled = true }
  }, [])

  async function setAvailability(next: YogaAvailability) {
    if (!p) return
    const prev = p.availability
    setP({ ...p, availability: next })
    try {
      const r = await fetch('/api/yoga/me/availability', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: next }),
      })
      const j = await r.json() as { ok?: boolean; error?: string }
      if (!j.ok) { setP({ ...p, availability: prev }); alert(j.error === 'not_verified' ? 'Awaiting verification.' : 'Update failed.') }
    } catch { setP({ ...p, availability: prev }) }
  }

  if (loading) return <Shell><div className="px-4 pt-6 text-black/50 text-[13px]">Loading…</div></Shell>
  if (err === 'not_signed_in') return (
    <Shell><div className="px-4 pt-20 max-w-md mx-auto text-center">
      <h1 className="text-[20px] font-black mb-2">Sign in required</h1>
      <Link href="/login?next=/dashboard/yoga" className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block">Sign in</Link>
    </div></Shell>
  )
  if (!p) return (
    <Shell><div className="px-4 pt-20 max-w-md mx-auto text-center">
      <h1 className="text-[20px] font-black mb-2">No yoga teacher profile yet</h1>
      <Link href="/yoga/signup" className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block">Register as yoga teacher</Link>
    </div></Shell>
  )

  return (
    <Shell>
      <div className="px-4 pt-6 pb-24 max-w-3xl mx-auto space-y-4">
        <PWAInstallCard />
        {analytics && (
          <ProfileViewsChart
            series={analytics.series}
            retentionDays={analytics.retentionDays}
            plan={analytics.plan}
            totalViews={analytics.totalViews}
          />
        )}
        <ProviderRenewBanner provider={p} upgradeHref="/yoga/upgrade" />
        <section className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
          <h1 className="text-[20px] font-black mb-1 truncate">{p.display_name}</h1>
          <div className="text-[12px] text-black/60 font-mono mb-3">{p.slug}</div>
          {p.status !== 'active' && (
            <div className="rounded-xl border border-yellow-400/40 bg-yellow-400/10 text-yellow-200 text-[12px] px-3 py-2 mb-3">
              <strong>Awaiting verification.</strong> Profile not yet listed on marketplace.
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            {(['online','busy','offline'] as const).map((a) => {
              const active = p.availability === a
              return (
                <button key={a} onClick={() => setAvailability(a)}
                  className={`rounded-xl px-3 py-3 text-[12px] font-extrabold uppercase tracking-wider transition border ${
                    active ? 'bg-brand text-bg border-brand' : 'bg-gray-100 text-black/80 border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  {a === 'online' ? 'Online' : a === 'busy' ? 'Busy' : 'Offline'}
                </button>
              )
            })}
          </div>
        </section>

        <section className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-extrabold uppercase tracking-wider">Profile + prices</h2>
            <button onClick={() => setEditing((v) => !v)} className="text-[12px] font-bold text-brand hover:underline">
              {editing ? 'Close' : 'Edit'}
            </button>
          </div>
          {!editing ? <ReadOnly p={p} /> : <EditForm p={p} onSaved={reload} />}
        </section>

        {/* Quick-link to the dedicated Package catalog & portfolio editor. */}
        <Link
          href="/dashboard/yoga/services"
          className="block rounded-2xl bg-white border border-gray-200 p-5 shadow-sm hover:border-brand/60 transition active:scale-[0.995]"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[14px] font-extrabold uppercase tracking-wider text-brand">Package catalog &amp; portfolio →</div>
              <div className="text-[13px] text-black mt-1">Pick training types (strength / HIIT / yoga / fat loss / muscle gain), set drop-in + monthly bundle, and add training snapshots that drive the gallery.</div>
            </div>
            <span className="text-brand text-[22px]">→</span>
          </div>
        </Link>

        <a
          href="/api/yoga/me/flyer"
          download="kita2u-flyer.png"
          className="block w-full text-center rounded-2xl bg-yellow-400 hover:bg-yellow-500 text-[#0A0A0A] px-4 py-3 text-[13px] font-extrabold transition"
        >
          Download flyer for WhatsApp Status
        </a>
        <p className="text-[11px] text-black/55 text-center -mt-2">1080×1920 PNG. Share to WhatsApp Status, TikTok, IG Stories.</p>
        <p className="text-[12px] text-black/60 text-center">
          Public profile: <a href={`/yoga/${p.slug}`} target="_blank" rel="noopener" className="text-brand hover:underline">/yoga/{p.slug}</a>
        </p>
      </div>
    </Shell>
  )
}

function ReadOnly({ p }: { p: YogaProvider }) {
  return (
    <div className="space-y-3 text-[13px]">
      <KV k="Years" v={String(p.years_experience)} />
      <KV k="Bio" v={p.bio} multiline />
      <div>
        <div className="text-[11px] uppercase tracking-wider font-bold text-black/55 mb-1">Training types</div>
        <div className="flex flex-wrap gap-1.5">
          {p.specialties.map((s) => (
            <span key={s} className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold"
              style={{ background: 'rgba(250,204,21,0.15)', color: '#FACC15', border: '1px solid rgba(250,204,21,0.30)' }}>
              {SPECIALTY_LABELS[s]}
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-2">
        {p.hourly_rate_idr != null && <PriceBox label="drop-in from"      v={p.hourly_rate_idr} />}
        {p.day_rate_idr    != null && <PriceBox label="monthly unlimited" v={p.day_rate_idr}    />}
      </div>
      <KV k="Mat & props provided" v={p.has_own_tools ? 'Yes' : 'No'} />
      <KV k="WhatsApp" v={p.whatsapp_e164} />
      <KV k="City" v={p.city ?? '—'} />
      <KV k="Coverage area" v={p.service_area_notes ?? '—'} multiline />
    </div>
  )
}
function PriceBox({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 text-center">
      <div className="text-[11px] text-black/60 uppercase tracking-wider font-bold">{label}</div>
      <div className="text-[14px] font-black text-brand">Rp {v.toLocaleString('id-ID')}</div>
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

function EditForm({ p, onSaved }: { p: YogaProvider; onSaved: () => void }) {
  const pe = p as YogaProvider & {
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
    country_code?:       string | null
    contact_form_enabled?: boolean | null
    contact_email?:        string | null
  }
  const [f, setF] = useState<{
    display_name: string
    years_experience: number
    bio: string
    specialties: YogaSpecialty[]
    hourly_rate: string
    day_rate: string
    has_own_tools: boolean
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
    country_code:       string
    contact_form_enabled: boolean
    contact_email:        string | null
  }>({
    display_name: p.display_name,
    years_experience: p.years_experience,
    bio: p.bio,
    specialties: p.specialties.slice(),
    hourly_rate: p.hourly_rate_idr != null ? String(p.hourly_rate_idr) : '',
    day_rate:    p.day_rate_idr    != null ? String(p.day_rate_idr)    : '',
    has_own_tools: p.has_own_tools,
    whatsapp_e164: p.whatsapp_e164,
    city: p.city ?? '',
    service_area_notes: p.service_area_notes ?? '',
    profile_image_url: p.profile_image_url ?? '',
    cover_image_url:    pe.cover_image_url ?? null,
    gallery_image_urls: pe.gallery_image_urls ?? [],
    instagram_url:      pe.instagram_url ?? null,
    tiktok_url:         pe.tiktok_url ?? null,
    facebook_url:       pe.facebook_url ?? null,
    x_url:              pe.x_url ?? null,
    snapchat_url:       pe.snapchat_url ?? null,
    website_url:        pe.website_url ?? null,
    operating_hours:    pe.operating_hours ?? null,
    certifications:     pe.certifications ?? [],
    languages:          pe.languages ?? [],
    country_code:       pe.country_code ?? 'ID',
    contact_form_enabled: Boolean(pe.contact_form_enabled),
    contact_email:        pe.contact_email ?? null,
  })
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState(false)

  function upd<K extends keyof typeof f>(k: K, v: typeof f[K]) { setF((p) => ({ ...p, [k]: v })) }
  function toggle(s: YogaSpecialty) {
    setF((p) => {
      if (p.specialties.includes(s)) return { ...p, specialties: p.specialties.filter((x) => x !== s) }
      if (p.specialties.length >= MAX_YOGA_SPECIALTIES) return p
      return { ...p, specialties: [...p.specialties, s] }
    })
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const r = await fetch('/api/yoga/me/profile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: f.display_name,
          years_experience: f.years_experience,
          bio: f.bio,
          specialties: f.specialties,
          hourly_rate_idr: f.hourly_rate === '' ? null : Number(f.hourly_rate),
          day_rate_idr:    f.day_rate    === '' ? null : Number(f.day_rate),
          has_own_tools: f.has_own_tools,
          whatsapp_e164: f.whatsapp_e164,
          city: f.city,
          service_area_notes: f.service_area_notes,
          profile_image_url: f.profile_image_url,
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
          country_code:       f.country_code,
          contact_form_enabled: f.contact_form_enabled,
          contact_email:        f.contact_email,
        }),
      })
      const j = await r.json() as { ok?: boolean; error?: string }
      if (!r.ok || !j.ok) { alert(j.error || 'failed'); return }
      setFlash(true); setTimeout(() => setFlash(false), 1800)
      onSaved()
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <input type="text" value={f.display_name} onChange={(e) => upd('display_name', e.target.value)} className={inputCls} />
      <input type="number" min={0} max={60} value={f.years_experience} onChange={(e) => upd('years_experience', Number(e.target.value))} placeholder="Years" className={inputCls} />
      <textarea maxLength={300} rows={3} value={f.bio} onChange={(e) => upd('bio', e.target.value)} placeholder="Bio (max 300)" className={inputCls + ' resize-none'} />
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <div className="text-[11px] uppercase tracking-wider font-bold text-black/55">Training types</div>
          <div className="text-[11px] text-black/55">{f.specialties.length}/{MAX_YOGA_SPECIALTIES}</div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ALL_SPECIALTIES.map((s) => {
            const on = f.specialties.includes(s)
            const atLimit = !on && f.specialties.length >= MAX_YOGA_SPECIALTIES
            return (
              <button key={s} type="button" disabled={atLimit} onClick={() => toggle(s)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider border transition ${
                  on ? 'bg-brand text-bg border-brand'
                     : atLimit ? 'bg-gray-50 text-black/30 border-gray-100 cursor-not-allowed'
                               : 'bg-gray-100 text-black/80 border-gray-200 hover:bg-gray-200'
                }`}
              >{SPECIALTY_LABELS[s]}</button>
            )
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <PriceInput label="drop-in from"      v={f.hourly_rate} set={(v) => upd('hourly_rate', v)} />
        <PriceInput label="monthly unlimited" v={f.day_rate}    set={(v) => upd('day_rate', v)} />
      </div>
      <label className="flex items-center gap-2 text-[12px] text-black/85 cursor-pointer">
        <input type="checkbox" checked={f.has_own_tools} onChange={(e) => upd('has_own_tools', e.target.checked)} className="accent-brand w-4 h-4" />
        Mat &amp; props disediakan
      </label>
      <CountryPicker value={f.country_code} onChange={(code) => upd('country_code', code)} />
      <input type="tel"  value={f.whatsapp_e164} onChange={(e) => upd('whatsapp_e164', e.target.value)} className={inputCls} />
      <input type="text" value={f.city} onChange={(e) => upd('city', e.target.value)} placeholder="City" className={inputCls} />
      <input type="text" value={f.service_area_notes} onChange={(e) => upd('service_area_notes', e.target.value)} placeholder="Coverage area" className={inputCls} />
      {p.user_id && <ProfileImageUploader value={f.profile_image_url || null} onChange={(v) => upd('profile_image_url', v ?? '')} userId={p.user_id} />}
      {p.user_id && (
        <BannerLibraryPicker
          themeHex={'#FACC15'}
          selected={f.cover_image_url}
          onChange={(url) => upd('cover_image_url', url)}
          userId={p.user_id}
          library={YOGA_BANNER_LIBRARY}
          categories={YOGA_BANNER_CATEGORIES}
          defaultThemeHex="#FACC15"
          selectedAccentHex="#FACC15"
        />
      )}
      {p.user_id && (
        <UniversalProfileExtrasEditor
          userId={p.user_id}
          hideCover
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
      {flash && <div className="rounded-lg border border-green-500/40 bg-green-500/10 text-green-200 text-[13px] px-3 py-2">Saved.</div>}
      <button type="submit" disabled={saving} className="w-full rounded-full bg-brand text-bg px-6 py-3 text-[14px] font-extrabold uppercase tracking-wider disabled:opacity-60">
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}

function PriceInput({ label, v, set }: { label: string; v: string; set: (s: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-black/70 mb-1 inline-block uppercase">{label}</span>
      <input type="number" min={0} value={v} onChange={(e) => set(e.target.value)} placeholder="—" className={inputCls + ' text-[13px]'} />
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

const inputCls = 'w-full rounded-xl bg-white border border-gray-300 px-4 py-3 text-[14px] text-black placeholder:text-black/40 focus:outline-none focus:border-brand'
