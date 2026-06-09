'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import AppNav from '@/components/layout/AppNav'
import HandymanServicePhotosEditor, { type HandymanServicePhoto } from '@/components/dashboard/HandymanServicePhotosEditor'
import {
  ALL_SPECIALTIES, SPECIALTY_LABELS, MAX_TUTORING_SPECIALTIES,
  type TutoringProvider, type TutoringSpecialty,
} from '@/lib/tutoring/types'

// Mirrors /dashboard/florist/services. Single page for everything the
// tutor sells:
//   1. Mata pelajaran — max 3 they teach (matematika / fisika / kimia /
//      biologi / english / bahasa / mengaji / coding / music /
//      utbk_sbmptn / sat_toefl_ielts / cambridge_ib).
//   2. Pricing  — per-pertemuan starter price + optional package
//      bundle (paket 8x / 12x / monthly intensive). Indonesian tutoring
//      quotes PER-PERTEMUAN (per-session) with package discount tiers
//      for exam prep — clients buy COMMITMENT PACKAGES (UTBK / SAT)
//      and per-session for routine subjects. Floor is Rp 80k (SD math
//      / mengaji anak); SMA math/physics Rp 120-150k; UTBK Rp 200-300k.
//   3. Belajar Bareng (service_photos) with per-photo metadata (name,
//      description, per-pertemuan or paket price, optional before/after
//      pair) — drives the Belajar Bareng gallery + View Details popup
//      on /tutoring/[slug].

type Extras = {
  theme_color?:    string | null
  service_photos?: HandymanServicePhoto[] | null
}
type FullProvider = TutoringProvider & Extras

export default function TutoringServicesPage() {
  const [provider, setProvider] = useState<FullProvider | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [err,      setErr]      = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/tutoring/me', { cache: 'no-store' })
      if (r.status === 401) { setErr('not_signed_in'); return }
      const j = await r.json() as { provider: FullProvider | null }
      setProvider(j.provider)
    } catch { setErr('fetch_failed') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void reload() }, [reload])

  if (loading) return <Shell><div className="px-4 pt-6 text-gray-600 text-[14px]">Loading…</div></Shell>
  if (err === 'not_signed_in') {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black text-[#0A0A0A] mb-2">Sign in required</h1>
          <Link href="/login?next=/dashboard/tutoring/services" className="rounded-full bg-yellow-500 text-black px-6 py-3 text-[14px] font-extrabold inline-block">Sign in</Link>
        </div>
      </Shell>
    )
  }
  if (!provider) {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black text-[#0A0A0A] mb-2">Not a tutor yet</h1>
          <Link href="/tutoring/signup" className="rounded-full bg-yellow-500 text-black px-6 py-3 text-[14px] font-extrabold inline-block">Sign up</Link>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="px-4 pt-3 pb-32 max-w-lg mx-auto">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div>
            <Link href="/dashboard/tutoring" className="text-[12px] font-bold text-gray-500 hover:text-gray-900 inline-block">← Dashboard</Link>
            <h1 className="text-[24px] font-black text-[#0A0A0A] leading-tight">Package catalog &amp; portfolio</h1>
            <p className="text-[13px] text-gray-600 mt-1">Pick mata pelajaran, set per-pertemuan + paket bundle, and add Belajar Bareng photos that students browse.</p>
          </div>
        </header>
        <ServicesForm provider={provider} onSaved={reload} />
      </div>
    </Shell>
  )
}

type ServicesFormState = {
  specialties:     TutoringSpecialty[]
  hourly_rate:     number | string  // displayed in thousands (k)
  day_rate:        number | string  // displayed in thousands (k)
  travels_to_client: boolean
  service_photos:  HandymanServicePhoto[]
}

function ServicesForm({ provider, onSaved }: { provider: FullProvider; onSaved: () => void }) {
  const theme = provider.theme_color || '#FACC15'
  const [f, setF] = useState<ServicesFormState>({
    specialties:    provider.specialties ?? [],
    hourly_rate:    provider.hourly_rate_idr ? provider.hourly_rate_idr / 1000 : '',
    day_rate:       provider.day_rate_idr    ? provider.day_rate_idr    / 1000 : '',
    travels_to_client: provider.has_own_tools,
    service_photos: provider.service_photos ?? [],
  })
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  function upd<K extends keyof ServicesFormState>(k: K, v: ServicesFormState[K]) {
    setF((prev) => ({ ...prev, [k]: v }))
  }

  function toggleSpecialty(sid: TutoringSpecialty) {
    const on = f.specialties.includes(sid)
    if (!on && f.specialties.length >= MAX_TUTORING_SPECIALTIES) return
    upd('specialties', on ? f.specialties.filter((x) => x !== sid) : [...f.specialties, sid])
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const r = await fetch('/api/tutoring/me/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specialties:     f.specialties,
          hourly_rate_idr: f.hourly_rate === '' ? null : Math.round(Number(f.hourly_rate) * 1000),
          day_rate_idr:    f.day_rate    === '' ? null : Math.round(Number(f.day_rate)    * 1000),
          has_own_tools:   f.travels_to_client,
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
      {/* 1. Mata pelajaran */}
      <Card title="Package catalog" hint={`Pick up to ${MAX_TUTORING_SPECIALTIES} mata pelajaran — these become the chips on your profile (${f.specialties.length}/${MAX_TUTORING_SPECIALTIES}).`}>
        <div className="flex flex-wrap gap-1.5">
          {ALL_SPECIALTIES.map((sid) => {
            const on    = f.specialties.includes(sid)
            const atCap = !on && f.specialties.length >= MAX_TUTORING_SPECIALTIES
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
                      ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 hover:border-yellow-400'
                }`}
              >
                {SPECIALTY_LABELS[sid]}
              </button>
            )
          })}
        </div>
      </Card>

      {/* 2. Pricing */}
      <Card title="Rates" hint="Shown on the public profile. Type thousands — e.g. 80 = Rp 80k mengaji/SD, 120 = Rp 120k SMA math per-pertemuan, 2200 = Rp 2.2jt paket UTBK 12x (max 9999).">
        <div className="grid grid-cols-2 gap-2">
          {([
            { k: 'hourly_rate', label: 'Per pertemuan from' },
            { k: 'day_rate',    label: 'Paket bundle'        },
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
                <span className="text-[12px] font-bold text-gray-600 mb-1 inline-block uppercase tracking-wide">{label}</span>
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
                <div className="text-[10px] font-bold text-gray-500 text-center mt-1 tabular-nums min-h-[14px]">
                  {preview ?? ' '}
                </div>
              </label>
            )
          })}
        </div>
        {/* Datang ke rumah (home-visit) toggle. Stored on has_own_tools
            for column reuse; the tutoring surface label (home-visit
            available vs online/studio only) is what matters to the
            student / parent. */}
        <label className="flex items-center gap-2 text-[13px] text-gray-700 cursor-pointer mt-2">
          <input
            type="checkbox"
            checked={f.travels_to_client}
            onChange={(e) => upd('travels_to_client', e.target.checked)}
            className="accent-yellow-400 w-4 h-4"
          />
          Datang ke rumah (home-visit available; selain online via Zoom + studio)
        </label>
      </Card>

      {/* 3. Portfolio */}
      <Card title="Belajar Bareng" hint="Up to 12 sesi belajar + qualifikasi photos per mata pelajaran with name, description, per-pertemuan / paket price, and optional before/after pair. These power the Belajar Bareng gallery + View Details popup on your profile — students/parents pilih tutor by visual.">
        {provider.user_id && (
          <HandymanServicePhotosEditor
            userId={provider.user_id}
            value={f.service_photos}
            onChange={(next) => upd('service_photos', next)}
          />
        )}
      </Card>

      {savedFlash && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-[14px] px-4 py-3 font-bold">
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
    <section className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm space-y-3">
      <div>
        <h2 className="text-[15px] font-black text-[#0A0A0A]">{title}</h2>
        {hint && <p className="text-[12px] text-gray-600 leading-snug mt-1">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] bg-white text-[#0A0A0A] overflow-hidden">
      <AppNav />
      {children}
    </main>
  )
}

const inputCls = 'w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-[14px] text-[#0A0A0A] placeholder:text-gray-400 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 min-h-[44px]'
