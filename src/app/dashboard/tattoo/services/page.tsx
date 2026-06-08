'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import AppNav from '@/components/layout/AppNav'
import HandymanServicePhotosEditor, { type HandymanServicePhoto } from '@/components/dashboard/HandymanServicePhotosEditor'
import {
  ALL_SPECIALTIES, SPECIALTY_LABELS, MAX_TATTOO_SPECIALTIES,
  type TattooProvider, type TattooSpecialty,
} from '@/lib/tattoo/types'

// Mirrors /dashboard/beautician/services. Single page for everything
// the tattoo artist sells:
//   1. Specialties — max 3 trades they cover
//   2. Pricing      — hourly + day rate (tattoo doesn't have makeup/nail/hair
//      legacy slots; this is the canonical two-tier shape)
//   3. Portfolio photos with per-photo metadata (name, description, price,
//      optional before/after pair) — drives the carousel + View Details
//      popup on /tattoo/[slug].

type Extras = {
  theme_color?:    string | null
  service_photos?: HandymanServicePhoto[] | null
}
type FullProvider = TattooProvider & Extras

export default function TattooServicesPage() {
  const [provider, setProvider] = useState<FullProvider | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [err,      setErr]      = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/tattoo/me', { cache: 'no-store' })
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
          <Link href="/login?next=/dashboard/tattoo/services" className="rounded-full bg-yellow-500 text-black px-6 py-3 text-[14px] font-extrabold inline-block">Sign in</Link>
        </div>
      </Shell>
    )
  }
  if (!provider) {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black text-white mb-2">Not a tattoo artist yet</h1>
          <Link href="/tattoo/signup" className="rounded-full bg-yellow-500 text-black px-6 py-3 text-[14px] font-extrabold inline-block">Sign up</Link>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="px-4 pt-3 pb-32 max-w-lg mx-auto">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div>
            <Link href="/dashboard/tattoo" className="text-[12px] font-bold text-white/60 hover:text-white inline-block">← Dashboard</Link>
            <h1 className="text-[24px] font-black text-white leading-tight">Services &amp; prices</h1>
            <p className="text-[13px] text-white/70 mt-1">Pick your trades, set hourly + day rates, and add portfolio photos.</p>
          </div>
        </header>
        <ServicesForm provider={provider} onSaved={reload} />
      </div>
    </Shell>
  )
}

type ServicesFormState = {
  specialties:     TattooSpecialty[]
  hourly_rate:     number | string  // displayed in thousands (k)
  day_rate:        number | string  // displayed in thousands (k)
  has_own_tools:   boolean
  service_photos:  HandymanServicePhoto[]
}

function ServicesForm({ provider, onSaved }: { provider: FullProvider; onSaved: () => void }) {
  const theme = provider.theme_color || '#FACC15'
  const [f, setF] = useState<ServicesFormState>({
    specialties:    provider.specialties ?? [],
    hourly_rate:    provider.hourly_rate_idr ? provider.hourly_rate_idr / 1000 : '',
    day_rate:       provider.day_rate_idr    ? provider.day_rate_idr    / 1000 : '',
    has_own_tools:  provider.has_own_tools,
    service_photos: provider.service_photos ?? [],
  })
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  function upd<K extends keyof ServicesFormState>(k: K, v: ServicesFormState[K]) {
    setF((prev) => ({ ...prev, [k]: v }))
  }

  function toggleSpecialty(sid: TattooSpecialty) {
    const on = f.specialties.includes(sid)
    if (!on && f.specialties.length >= MAX_TATTOO_SPECIALTIES) return
    upd('specialties', on ? f.specialties.filter((x) => x !== sid) : [...f.specialties, sid])
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const r = await fetch('/api/tattoo/me/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specialties:     f.specialties,
          hourly_rate_idr: f.hourly_rate === '' ? null : Math.round(Number(f.hourly_rate) * 1000),
          day_rate_idr:    f.day_rate    === '' ? null : Math.round(Number(f.day_rate)    * 1000),
          has_own_tools:   f.has_own_tools,
          service_photos:  f.service_photos,
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
      {/* 1. Specialties */}
      <Card title="Styles I work in" hint={`Pick up to ${MAX_TATTOO_SPECIALTIES} — these become the Styles chips on your profile (${f.specialties.length}/${MAX_TATTOO_SPECIALTIES}).`}>
        <div className="flex flex-wrap gap-1.5">
          {ALL_SPECIALTIES.map((sid) => {
            const on    = f.specialties.includes(sid)
            const atCap = !on && f.specialties.length >= MAX_TATTOO_SPECIALTIES
            return (
              <button
                key={sid}
                type="button"
                disabled={atCap}
                onClick={() => toggleSpecialty(sid)}
                className={`text-[13px] font-extrabold px-3.5 py-2 rounded-full border transition min-h-[40px] ${
                  on
                    ? 'bg-yellow-400 text-stone-900 border-yellow-400 shadow-sm shadow-yellow-300/40'
                    : atCap
                      ? 'bg-white/5 text-white/30 border-white/10 cursor-not-allowed'
                      : 'bg-white/10 text-white/80 border-white/15 hover:bg-white/15 hover:border-yellow-300'
                }`}
              >
                {SPECIALTY_LABELS[sid]}
              </button>
            )
          })}
        </div>
      </Card>

      {/* 2. Pricing */}
      <Card title="Rates" hint="Shown on the public profile. Type thousands — e.g. 75 = Rp 75k/hr, 600 = Rp 600k/day (max 9999).">
        <div className="grid grid-cols-2 gap-2">
          {([
            { k: 'hourly_rate', label: 'Per hour' },
            { k: 'day_rate',    label: 'Per day · 8h' },
          ] as const).map(({ k, label }) => {
            const raw = f[k]
            const n   = raw === '' ? null : Number(raw)
            const isJt = n !== null && Number.isFinite(n) && n >= 1000
            const suffix = isJt ? 'jt' : 'k'
            const preview =
              n === null || !Number.isFinite(n) || n <= 0 ? null
              : isJt
                ? `Rp ${(n / 1000) % 1 === 0 ? (n / 1000).toFixed(0) : (n / 1000).toFixed(1)}jt`
                : `Rp ${n}k`
            return (
              <label key={k} className="block">
                <span className="text-[12px] font-bold text-white/70 mb-1 inline-block uppercase tracking-wide">{label}</span>
                <div className="relative">
                  <input
                    type="number" min={0} max={9999}
                    value={raw as string | number}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v === '') { upd(k, ''); return }
                      const next = Number(v)
                      if (Number.isFinite(next) && next <= 9999) upd(k, v)
                    }}
                    placeholder="—"
                    className={inputCls + ' pr-9 text-center font-bold'}
                  />
                  <span aria-hidden className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-extrabold text-yellow-300 pointer-events-none select-none">
                    {suffix}
                  </span>
                </div>
                <div className="text-[10px] font-bold text-white/55 text-center mt-1 tabular-nums min-h-[14px]">
                  {preview ?? ' '}
                </div>
              </label>
            )
          })}
        </div>
        <label className="flex items-center gap-2 text-[13px] text-white/85 cursor-pointer mt-2">
          <input
            type="checkbox"
            checked={f.has_own_tools}
            onChange={(e) => upd('has_own_tools', e.target.checked)}
            className="accent-yellow-400 w-4 h-4"
          />
          I have my own kit (machine, single-use needles, sterilised setup)
        </label>
      </Card>

      {/* 3. Portfolio / flash designs */}
      <Card title="Portfolio &amp; flash designs" hint="Up to 12 healed pieces or flash sheets with name, description, starting price, and optional cover-up before/after. These power the carousel + View Details popup on your profile.">
        {provider.user_id && (
          <HandymanServicePhotosEditor
            userId={provider.user_id}
            value={f.service_photos}
            onChange={(next) => upd('service_photos', next)}
          />
        )}
      </Card>

      {savedFlash && (
        <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 text-emerald-100 text-[14px] px-4 py-3 font-bold">
          ✓ Saved
        </div>
      )}

      <div className="sticky bottom-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-full text-stone-900 px-6 py-4 text-[15px] font-extrabold uppercase tracking-wider disabled:opacity-60 shadow-lg"
          style={{ background: theme, boxShadow: `0 10px 24px ${theme}55` }}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-black/55 backdrop-blur-md border border-white/10 p-5 shadow-lg shadow-black/20 space-y-3">
      <div>
        <h2 className="text-[15px] font-black text-white">{title}</h2>
        {hint && <p className="text-[12px] text-white/65 leading-snug mt-1">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] text-white overflow-hidden">
      <AppNav />
      {children}
    </main>
  )
}

const inputCls = 'w-full rounded-xl bg-white/10 border border-white/15 px-4 py-3 text-[14px] text-white placeholder:text-white/40 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30 min-h-[44px]'
