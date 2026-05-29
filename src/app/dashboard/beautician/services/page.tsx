'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, Star, Plus, X as XIcon, DollarSign, Camera, Tag, Crown } from 'lucide-react'
import { countryByCode } from '@/lib/data/countries'
import AppNav from '@/components/layout/AppNav'
import BeauticianServicePhotosEditor from '@/components/dashboard/BeauticianServicePhotosEditor'
import {
  BEAUTICIAN_SERVICES_OFFERED,
  SERVICE_OFFERED_LABELS,
  type BeauticianProvider,
  type BeauticianServiceOffered,
  type BeauticianServicePhoto,
} from '@/lib/beautician/types'

// Services Management — the SINGLE place a beautician edits everything
// about what they sell:
//   1. Layanan yang saya tawarkan — which categories they cover
//   2. Harga dasar              — legacy 3 prices (Makeup / Nail / Hair)
//   3. Foto & detail per layanan — uploads, name, description, start price
//   4. Foto utama per kategori   — promote any photo to position 0 (MAIN)
//   5. Kategori utama marketplace — max 3 highlighted in marketplace filters
//
// Soft white-card design on the same blush gradient as the hub + /info,
// so the whole dashboard feels like one coherent app for first-time users.

type Extras = {
  theme_color?: string | null
  service_photos?: Partial<Record<BeauticianServiceOffered, BeauticianServicePhoto[]>> | null
  services_offered?: BeauticianServiceOffered[] | null
  marketplace_categories?: BeauticianServiceOffered[] | null
}
type FullProvider = BeauticianProvider & Extras

export default function BeauticianServicesPage() {
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
          <Link href="/login?next=/dashboard/beautician/services" className="rounded-full bg-pink-500 text-white px-6 py-3 text-[14px] font-extrabold inline-block">Sign in</Link>
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
      <div className="px-4 pt-4 pb-32 max-w-lg mx-auto">
        {/* Brand header — matches the Design Studio pattern on /edit. */}
        <div className="rounded-3xl border border-pink-200/70 bg-gradient-to-br from-pink-50 to-white p-5 shadow-sm mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <Sparkles size={22} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-[20px] font-black leading-tight text-black truncate">Services & prices</h1>
              </div>
              <p className="text-[12.5px] text-black/70 leading-snug">
                Pick your services, set prices, and add portfolio photos.
              </p>
            </div>
          </div>
        </div>

        <ServicesForm provider={provider} onSaved={reload} />
      </div>
    </Shell>
  )
}

type ServicesFormState = {
  services_offered: BeauticianServiceOffered[]
  marketplace_categories: BeauticianServiceOffered[]
  service_photos: Partial<Record<BeauticianServiceOffered, BeauticianServicePhoto[]>>
  custom_services_offered: string[]
  price_makeup_idr: number | string
  price_nail_idr:   number | string
  price_hair_idr:   number | string
}

function ServicesForm({ provider, onSaved }: { provider: FullProvider; onSaved: () => void }) {
  const theme = provider.theme_color || '#EC4899'
  // Currency comes from the country picked on /info (mig 0131). Falls
  // back to Indonesia → Rp when the row hasn't picked one yet.
  const country = countryByCode((provider as Extras & { country_code?: string | null }).country_code ?? 'ID')
  const sym = country.currency_symbol
  const [f, setF] = useState<ServicesFormState>({
    services_offered:       provider.services_offered ?? [],
    marketplace_categories: provider.marketplace_categories ?? [],
    service_photos:         provider.service_photos ?? {},
    custom_services_offered:
      (provider as Extras & { custom_services_offered?: string[] | null }).custom_services_offered ?? [],
    // Stored as full IDR (legacy column name) but UI shows + accepts thousands.
    price_makeup_idr: provider.price_makeup_idr ? provider.price_makeup_idr / 1000 : '',
    price_nail_idr:   provider.price_nail_idr   ? provider.price_nail_idr   / 1000 : '',
    price_hair_idr:   provider.price_hair_idr   ? provider.price_hair_idr   / 1000 : '',
  })
  const [customDraft, setCustomDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  function addCustomService() {
    const v = customDraft.trim()
    if (!v) return
    if (v.length > 60) return
    const lower = v.toLowerCase()
    if (f.custom_services_offered.some((s) => s.toLowerCase() === lower)) {
      setCustomDraft('')
      return
    }
    upd('custom_services_offered', [...f.custom_services_offered, v])
    setCustomDraft('')
  }

  function removeCustomService(idx: number) {
    upd('custom_services_offered', f.custom_services_offered.filter((_, i) => i !== idx))
  }

  function upd<K extends keyof ServicesFormState>(k: K, v: ServicesFormState[K]) {
    setF((prev) => ({ ...prev, [k]: v }))
  }

  function toggleService(sid: BeauticianServiceOffered) {
    const on = f.services_offered.includes(sid)
    const nextOffered = on
      ? f.services_offered.filter((x) => x !== sid)
      : [...f.services_offered, sid]
    // When de-selecting, also drop from marketplace_categories (it must be a subset).
    const nextMarket = on
      ? f.marketplace_categories.filter((x) => x !== sid)
      : f.marketplace_categories
    setF((prev) => ({
      ...prev,
      services_offered: nextOffered,
      marketplace_categories: nextMarket,
    }))
  }

  function toggleMarket(sid: BeauticianServiceOffered) {
    const on    = f.marketplace_categories.includes(sid)
    const atCap = !on && f.marketplace_categories.length >= 3
    if (atCap) return
    upd(
      'marketplace_categories',
      on ? f.marketplace_categories.filter((x) => x !== sid)
         : [...f.marketplace_categories, sid],
    )
  }

  function promoteToMain(sid: BeauticianServiceOffered, idx: number) {
    const arr = f.service_photos[sid] ?? []
    if (idx <= 0 || idx >= arr.length) return
    const reordered = [arr[idx], ...arr.filter((_, i) => i !== idx)]
    upd('service_photos', { ...f.service_photos, [sid]: reordered })
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const r = await fetch('/api/beautician/me/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          services_offered:       f.services_offered,
          marketplace_categories: f.marketplace_categories,
          service_photos:         f.service_photos,
          custom_services_offered: f.custom_services_offered,
          price_makeup_idr: f.price_makeup_idr === '' ? null : Math.round(Number(f.price_makeup_idr) * 1000),
          price_nail_idr:   f.price_nail_idr   === '' ? null : Math.round(Number(f.price_nail_idr)   * 1000),
          price_hair_idr:   f.price_hair_idr   === '' ? null : Math.round(Number(f.price_hair_idr)   * 1000),
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
      {/* 1. Services offered */}
      <Card title="Services I offer" hint="Tick every service you provide. Need a service that isn't here? Add your own below." icon={<Sparkles size={18} />}>
        <div className="flex flex-wrap gap-1.5">
          {BEAUTICIAN_SERVICES_OFFERED.map((s) => {
            const on = f.services_offered.includes(s.id)
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleService(s.id)}
                className={`text-[13px] font-extrabold px-3.5 py-2 rounded-full border transition min-h-[44px] ${
                  on
                    ? 'bg-pink-500 text-white border-pink-500 shadow-sm shadow-pink-400/30'
                    : 'bg-gray-50 text-black/80 border-gray-200 hover:bg-gray-100 hover:border-pink-300'
                }`}
              >
                {s.label}
              </button>
            )
          })}
          {f.custom_services_offered.map((name, i) => (
            <span
              key={`custom-${i}`}
              className="inline-flex items-center gap-1 text-[13px] font-extrabold px-3.5 py-2 rounded-full border bg-pink-500 text-white border-pink-500 shadow-sm shadow-pink-400/30 min-h-[44px]"
            >
              {name}
              <button
                type="button"
                onClick={() => removeCustomService(i)}
                aria-label={`Remove ${name}`}
                className="w-5 h-5 -mr-1 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center transition"
              >
                <XIcon className="w-3 h-3" strokeWidth={3} />
              </button>
            </span>
          ))}
        </div>

        {/* Add my service — free-form input. Trimmed, deduped, max 20. */}
        <div className="mt-2 flex items-center gap-2">
          <div className="relative flex-1">
            <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-500" strokeWidth={2.5} />
            <input
              type="text"
              maxLength={60}
              value={customDraft}
              onChange={(e) => setCustomDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomService() } }}
              placeholder="Add my service — e.g. Eyelash extensions"
              className="w-full rounded-xl bg-gray-50 border border-gray-200 pl-9 pr-3 py-2.5 text-[13px] text-black placeholder:text-black/35 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 min-h-[44px]"
              disabled={f.custom_services_offered.length >= 20}
            />
          </div>
          <button
            type="button"
            onClick={addCustomService}
            disabled={!customDraft.trim() || f.custom_services_offered.length >= 20}
            className="rounded-xl bg-pink-500 hover:bg-pink-600 text-white px-4 py-2.5 text-[12px] font-extrabold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] transition"
          >
            Add
          </button>
        </div>
        {f.custom_services_offered.length >= 20 && (
          <p className="text-[12px] text-amber-700 leading-snug">Max 20 custom services. Remove one to add another.</p>
        )}
      </Card>

      {/* 2. Base prices (legacy 3) */}
      <Card title="Base prices" hint={`Shown on the public profile. Type thousands — e.g. 235 = ${sym} 235k, 1200 = ${sym} 1.2M (max 9999).`} icon={<DollarSign size={18} />}>
        <div className="grid grid-cols-3 gap-2">
          {(['makeup','nail','hair'] as const).map((k) => {
            const raw = f[`price_${k}_idr` as const]
            const n   = raw === '' ? null : Number(raw)
            const isJt = n !== null && Number.isFinite(n) && n >= 1000
            const suffix = isJt ? 'M' : 'k'
            const preview =
              n === null || !Number.isFinite(n) || n <= 0 ? null
              : isJt
                ? `${sym} ${(n / 1000) % 1 === 0 ? (n / 1000).toFixed(0) : (n / 1000).toFixed(1)}M`
                : `${sym} ${n}k`
            return (
              <label key={k} className="block">
                <span className="text-[12px] font-bold text-black/70 mb-1 inline-block uppercase tracking-wide">{k}</span>
                <div className="relative">
                  <input
                    type="number" min={0} max={9999}
                    value={raw as string | number}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v === '') { upd(`price_${k}_idr` as const, ''); return }
                      const next = Number(v)
                      if (Number.isFinite(next) && next <= 9999) upd(`price_${k}_idr` as const, v)
                    }}
                    placeholder="—"
                    className={inputCls + ' pr-9 text-center font-bold'}
                  />
                  <span aria-hidden className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-extrabold text-pink-500 pointer-events-none select-none">
                    {suffix}
                  </span>
                </div>
                <div className="text-[12px] font-bold text-black/55 text-center mt-1 tabular-nums min-h-[14px]">
                  {preview ?? ' '}
                </div>
              </label>
            )
          })}
        </div>
      </Card>

      {/* 3. Photos & details per service */}
      <Card title="Photos & details per service" hint="Up to 4 photos per service with name, description, starting price, and an optional promo badge." icon={<Camera size={18} />}>
        {provider.user_id && (
          <BeauticianServicePhotosEditor
            userId={provider.user_id}
            servicesOffered={f.services_offered}
            value={f.service_photos}
            currencySymbol={sym}
            onChange={(next) => upd('service_photos', next)}
          />
        )}
      </Card>

      {/* 4. Set MAIN image — only relevant when at least one service has 2+ photos */}
      {someHasMultiple(f.service_photos) && (
        <Card title="Main photo per category" hint="The first photo in each category (MAIN) appears in the public carousel. Tap another photo to make it MAIN." icon={<Star size={18} />}>
          {Object.entries(f.service_photos).map(([sidStr, photos]) => {
            const sid = sidStr as BeauticianServiceOffered
            if (!photos || photos.length < 2) return null
            return (
              <div key={sid} className="space-y-2 pt-1 first:pt-0">
                <div className="text-[13px] font-extrabold text-black/85">{SERVICE_OFFERED_LABELS[sid]}</div>
                <div className="grid grid-cols-4 gap-2">
                  {photos.map((p, i) => {
                    const isMain = i === 0
                    return (
                      <button
                        key={p.url + i}
                        type="button"
                        onClick={() => promoteToMain(sid, i)}
                        aria-pressed={isMain}
                        disabled={isMain}
                        className={`relative rounded-lg overflow-hidden border-2 transition aspect-square ${
                          isMain
                            ? 'border-pink-500 cursor-default'
                            : 'border-gray-200 hover:border-pink-300 active:scale-95'
                        }`}
                      >
                        <img src={p.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        {isMain && (
                          <div className="absolute top-1 left-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider text-white shadow" style={{ background: theme }}>
                            <Star className="w-2.5 h-2.5" strokeWidth={0} fill="white" />
                            Main
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </Card>
      )}

      {/* 5. Marketplace categories */}
      {f.services_offered.length > 0 && (
        <Card title="Primary marketplace categories" hint={`Pick max 3 — your profile shows when customers filter these categories. (${f.marketplace_categories.length}/3)`} icon={<Crown size={18} />}>
          <div className="flex flex-wrap gap-1.5">
            {f.services_offered.map((sid) => {
              const on    = f.marketplace_categories.includes(sid)
              const atCap = !on && f.marketplace_categories.length >= 3
              const label = SERVICE_OFFERED_LABELS[sid]
              return (
                <button
                  key={sid}
                  type="button"
                  disabled={atCap}
                  onClick={() => toggleMarket(sid)}
                  className={`text-[13px] font-extrabold px-3.5 py-2 rounded-full border transition min-h-[44px] ${
                    on
                      ? 'bg-pink-500 text-white border-pink-500 shadow-sm shadow-pink-400/30'
                      : atCap
                        ? 'bg-gray-50 text-black/30 border-gray-200 cursor-not-allowed'
                        : 'bg-gray-50 text-black/80 border-gray-200 hover:bg-gray-100 hover:border-pink-300'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </Card>
      )}

      {savedFlash && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-[14px] px-4 py-3 font-bold">
          ✓ Saved
        </div>
      )}

      <div className="sticky bottom-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-full bg-pink-500 hover:bg-pink-600 text-white px-6 py-4 text-[15px] font-extrabold uppercase tracking-wider disabled:opacity-60 shadow-lg shadow-pink-500/20 min-h-[44px]"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

function someHasMultiple(sp: Partial<Record<BeauticianServiceOffered, BeauticianServicePhoto[]>>): boolean {
  return Object.values(sp).some((arr) => Array.isArray(arr) && arr.length >= 2)
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

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] bg-white text-black">
      <AppNav />
      {children}
    </main>
  )
}

const inputCls = 'w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-[14px] text-black placeholder:text-black/35 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 min-h-[44px]'
