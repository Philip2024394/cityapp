'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import AppNav from '@/components/layout/AppNav'
import PWAInstallCard from '@/components/dashboard/PWAInstallCard'
import ProfileViewsChart from '@/components/dashboard/ProfileViewsChart'
import ProviderRenewBanner from '@/components/upgrade/ProviderRenewBanner'
import ProfileImageUploader from '@/components/kyc/ProfileImageUploader'
import UniversalProfileExtrasEditor from '@/components/dashboard/UniversalProfileExtrasEditor'
import CountryPicker from '@/components/dashboard/CountryPicker'
import type { LaundryProvider, LaundryAvailability } from '@/lib/laundry/types'


export default function LaundryDashboardPage() {
  const [provider, setProvider] = useState<LaundryProvider | null>(null)
  const [loading, setLoading]   = useState(true)
  const [err, setErr]           = useState<string | null>(null)
  const [editing, setEditing]   = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/laundry/me', { cache: 'no-store' })
      if (r.status === 401) { setErr('not_signed_in'); return }
      const j = await r.json() as { provider: LaundryProvider | null }
      setProvider(j.provider)
    } catch { setErr('fetch_failed') }
    finally { setLoading(false) }
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
        const r = await fetch('/api/laundry/me/analytics', { cache: 'no-store' })
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

  async function setAvailability(next: LaundryAvailability) {
    if (!provider) return
    const prev = provider.availability
    setProvider({ ...provider, availability: next })
    try {
      const r = await fetch('/api/laundry/me/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: next }),
      })
      const j = await r.json() as { ok?: boolean; error?: string }
      if (!j.ok) {
        setProvider({ ...provider, availability: prev })
        alert('Could not update availability.')
      }
    } catch { setProvider({ ...provider, availability: prev }) }
  }

  if (loading) return <Shell><div className="px-4 pt-6 text-black/50 text-[13px]">Loading…</div></Shell>
  if (err === 'not_signed_in') {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black mb-2">Sign in required</h1>
          <Link href="/login?next=/dashboard/laundry" className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block">Sign in</Link>
        </div>
      </Shell>
    )
  }
  if (!provider) {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black mb-2">No laundry profile yet</h1>
          <Link href="/laundry/signup" className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block">Register laundry shop</Link>
        </div>
      </Shell>
    )
  }

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
        <ProviderRenewBanner provider={provider} upgradeHref="/laundry/upgrade" />
        <section className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
          <h1 className="text-[20px] font-black mb-1 truncate">{provider.display_name}</h1>
          <div className="text-[12px] text-black/60 font-mono mb-3">{provider.slug}</div>

          <div className="grid grid-cols-3 gap-2">
            {(['online','busy','offline'] as const).map((a) => {
              const active = provider.availability === a
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
          {!editing ? <ReadOnly provider={provider} /> : <EditForm provider={provider} onSaved={reload} />}
        </section>

        <a
          href="/api/laundry/me/flyer"
          download="kita2u-flyer.png"
          className="block w-full text-center rounded-2xl bg-black hover:bg-gray-800 text-white px-4 py-3 text-[13px] font-extrabold transition"
        >
          Download flyer for WhatsApp Status
        </a>
        <p className="text-[11px] text-black/55 text-center -mt-2">1080×1920 PNG. Share to WhatsApp Status, TikTok, IG Stories.</p>
        <p className="text-[12px] text-black/60 text-center">
          Public profile: <a href={`/laundry/${provider.slug}`} target="_blank" rel="noopener" className="text-brand hover:underline">/laundry/{provider.slug}</a>
        </p>
      </div>
    </Shell>
  )
}

function ReadOnly({ provider }: { provider: LaundryProvider }) {
  const pkgs = [
    provider.price_wash_per_kg_idr      != null ? { l: 'Wash',        v: provider.price_wash_per_kg_idr }      : null,
    provider.price_wash_dry_per_kg_idr  != null ? { l: 'Wash + Dry',  v: provider.price_wash_dry_per_kg_idr }  : null,
    provider.price_wash_iron_per_kg_idr != null ? { l: 'Wash + Iron', v: provider.price_wash_iron_per_kg_idr } : null,
  ].filter((s): s is { l: string; v: number } => s !== null)
  return (
    <div className="space-y-3 text-[13px]">
      <KV k="Years" v={String(provider.years_experience)} />
      <KV k="Bio" v={provider.bio} multiline />
      <div className="grid grid-cols-3 gap-2 pt-2">
        {pkgs.map((s) => (
          <div key={s.l} className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 text-center">
            <div className="text-[11px] text-black/60 uppercase tracking-wider font-bold">{s.l}</div>
            <div className="text-[14px] font-black text-brand">
              Rp {s.v.toLocaleString('id-ID')}<span className="text-[10px] text-black/55">/kg</span>
            </div>
          </div>
        ))}
      </div>
      <KV k="Min order" v={provider.min_kg ? `${provider.min_kg} kg` : '—'} />
      <KV k="Turnaround" v={provider.turnaround_hours ? `${provider.turnaround_hours} hours` : '—'} />
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

function EditForm({ provider, onSaved }: { provider: LaundryProvider; onSaved: () => void }) {
  const p = provider as LaundryProvider & {
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
  const [f, setF] = useState({
    display_name: provider.display_name,
    years_experience: provider.years_experience,
    bio: provider.bio,
    price_wash:      provider.price_wash_per_kg_idr ?? '' as string | number,
    price_wash_dry:  provider.price_wash_dry_per_kg_idr ?? '' as string | number,
    price_wash_iron: provider.price_wash_iron_per_kg_idr ?? '' as string | number,
    min_kg:           provider.min_kg ?? '' as string | number,
    turnaround_hours: provider.turnaround_hours ?? '' as string | number,
    whatsapp_e164: provider.whatsapp_e164,
    city: provider.city ?? '',
    service_area_notes: provider.service_area_notes ?? '',
    profile_image_url: provider.profile_image_url ?? '',
    cover_image_url:    (p.cover_image_url ?? '') as string | null,
    gallery_image_urls: p.gallery_image_urls ?? [],
    instagram_url:      (p.instagram_url ?? '') as string | null,
    tiktok_url:         (p.tiktok_url ?? '')    as string | null,
    facebook_url:       (p.facebook_url ?? '')  as string | null,
    x_url:              (p.x_url ?? '')         as string | null,
    snapchat_url:       (p.snapchat_url ?? '')  as string | null,
    website_url:        (p.website_url ?? '')   as string | null,
    operating_hours:    (p.operating_hours ?? null) as Record<string, string> | null,
    certifications:     p.certifications ?? [],
    languages:          p.languages ?? [],
    country_code:       p.country_code ?? 'ID',
    contact_form_enabled: Boolean(p.contact_form_enabled),
    contact_email:        (p.contact_email ?? null) as string | null,
  })
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState(false)

  function upd<K extends keyof typeof f>(k: K, v: typeof f[K]) { setF((p) => ({ ...p, [k]: v })) }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const r = await fetch('/api/laundry/me/profile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: f.display_name,
          years_experience: f.years_experience,
          bio: f.bio,
          price_wash_per_kg_idr:      f.price_wash       === '' ? null : Number(f.price_wash),
          price_wash_dry_per_kg_idr:  f.price_wash_dry   === '' ? null : Number(f.price_wash_dry),
          price_wash_iron_per_kg_idr: f.price_wash_iron  === '' ? null : Number(f.price_wash_iron),
          min_kg:                     f.min_kg            === '' ? null : Number(f.min_kg),
          turnaround_hours:           f.turnaround_hours  === '' ? null : Number(f.turnaround_hours),
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
      <div className="grid grid-cols-3 gap-2">
        <PriceInput label="Wash" v={f.price_wash}      onChange={(v) => upd('price_wash', v)} />
        <PriceInput label="W+Dry" v={f.price_wash_dry}  onChange={(v) => upd('price_wash_dry', v)} />
        <PriceInput label="W+Iron" v={f.price_wash_iron} onChange={(v) => upd('price_wash_iron', v)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input type="number" step="0.1" min="0" value={f.min_kg as string | number} onChange={(e) => upd('min_kg', e.target.value)} placeholder="Min kg" className={inputCls} />
        <input type="number" min="1" max="168" value={f.turnaround_hours as string | number} onChange={(e) => upd('turnaround_hours', e.target.value)} placeholder="Turnaround (h)" className={inputCls} />
      </div>
      <CountryPicker value={f.country_code} onChange={(code) => upd('country_code', code)} />
      <input type="tel" value={f.whatsapp_e164} onChange={(e) => upd('whatsapp_e164', e.target.value)} className={inputCls} />
      <input type="text" value={f.city} onChange={(e) => upd('city', e.target.value)} placeholder="City" className={inputCls} />
      <input type="text" value={f.service_area_notes} onChange={(e) => upd('service_area_notes', e.target.value)} placeholder="Service area" className={inputCls} />
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
      {flash && <div className="rounded-lg border border-green-500/40 bg-green-500/10 text-green-200 text-[13px] px-3 py-2">Saved.</div>}
      <button type="submit" disabled={saving} className="w-full rounded-full bg-brand text-bg px-6 py-3 text-[14px] font-extrabold uppercase tracking-wider disabled:opacity-60">
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}

function PriceInput({ label, v, onChange }: { label: string; v: string | number; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-black/70 mb-1 inline-block uppercase">{label}</span>
      <input type="number" min={0} value={v as string | number} onChange={(e) => onChange(e.target.value)} placeholder="—" className={inputCls + ' text-[13px]'} />
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
