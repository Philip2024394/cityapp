'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/supabase/client'
import AppNav from '@/components/layout/AppNav'
import ProfileImageUploader from '@/components/kyc/ProfileImageUploader'
import { ALL_SPECIALTIES, SPECIALTY_LABELS, MAX_FITNESS_SPECIALTIES, type FitnessSpecialty } from '@/lib/fitness/types'

type AuthState =
  | { status: 'loading' } | { status: 'anon' }
  | { status: 'signedIn'; userId: string } | { status: 'alreadyProvider' }

export default function FitnessSignupPage() {
  const router = useRouter()
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) { setAuth({ status: 'anon' }); return }
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data?.session?.user
      if (!user) { setAuth({ status: 'anon' }); return }
      try {
        const r = await fetch('/api/fitness/me', { cache: 'no-store' })
        if (r.ok) {
          const j = await r.json() as { provider?: unknown }
          if (j.provider) { setAuth({ status: 'alreadyProvider' }); setTimeout(() => router.replace('/dashboard/fitness'), 400); return }
        }
      } catch { /* fall through */ }
      setAuth({ status: 'signedIn', userId: user.id })
    })
  }, [router])

  if (auth.status === 'loading') return <Shell><Loading /></Shell>
  if (auth.status === 'alreadyProvider') return <Shell><div className="px-4 pt-20 text-center"><h1 className="text-[20px] font-black">Opening dashboard…</h1></div></Shell>
  if (auth.status === 'anon') return <Shell><Gate /></Shell>
  return <Shell><Form userId={auth.userId} /></Shell>
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] text-ink overflow-hidden">
      <AppNav />
      {children}
    </main>
  )
}
function Loading() { return <div className="flex items-center justify-center pt-32"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div> }

function Gate() {
  return (
    <div className="px-4 pt-12 max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="inline-block bg-brand text-bg text-[11px] font-extrabold uppercase tracking-[0.15em] px-3 py-1 rounded-full mb-4">Personal trainer</div>
        <h1 className="text-[26px] font-black leading-tight mb-3">List as a personal trainer</h1>
        <p className="text-[13px] text-ink/70 leading-relaxed">Create an account first — already have one? Login with the same.</p>
      </div>
      <div className="space-y-3">
        <Link href="/signup?intent=fitness&next=/fitness/signup" className="block w-full rounded-2xl bg-brand text-bg px-6 py-4 text-center text-[14px] font-extrabold uppercase tracking-wider hover:brightness-105">
          Create new account
        </Link>
        <Link href="/login?next=/fitness/signup" className="block w-full rounded-2xl bg-white/[0.06] border border-ink/15 text-ink px-6 py-4 text-center text-[14px] font-extrabold uppercase tracking-wider hover:bg-white/10">
          Login to existing account
        </Link>
      </div>
    </div>
  )
}

function Form({ userId }: { userId: string }) {
  const router = useRouter()
  const [f, setF] = useState({
    display_name: '',
    years_experience: 0,
    bio: '',
    specialties: [] as FitnessSpecialty[],
    hourly_rate: '',
    day_rate: '',
    has_own_tools: true,
    whatsapp_e164: '',
    city: '',
    service_area_notes: '',
    profile_image_url: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function upd<K extends keyof typeof f>(k: K, v: typeof f[K]) { setF((p) => ({ ...p, [k]: v })); setErr(null) }
  function toggleSpecialty(s: FitnessSpecialty) {
    setF((p) => {
      if (p.specialties.includes(s)) {
        return { ...p, specialties: p.specialties.filter((x) => x !== s) }
      }
      if (p.specialties.length >= MAX_FITNESS_SPECIALTIES) return p // cap at 3
      return { ...p, specialties: [...p.specialties, s] }
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (f.specialties.length === 0) { setErr(`Pick min 1, max ${MAX_FITNESS_SPECIALTIES} kategori training.`); return }
    const h = f.hourly_rate.trim()
    const d = f.day_rate.trim()
    if (h === '' && d === '') { setErr('Enter at least one rate — drop-in or monthly coaching.'); return }
    setSubmitting(true); setErr(null)
    try {
      const r = await fetch('/api/fitness/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: f.display_name,
          years_experience: f.years_experience,
          bio: f.bio,
          specialties: f.specialties,
          hourly_rate_idr: h === '' ? null : Number(h),
          day_rate_idr:    d === '' ? null : Number(d),
          has_own_tools: f.has_own_tools,
          whatsapp_e164: f.whatsapp_e164,
          city: f.city,
          service_area_notes: f.service_area_notes,
          profile_image_url: f.profile_image_url,
        }),
      })
      const j = await r.json() as { ok?: boolean; error?: string }
      if (!r.ok || !j.ok) { setErr(humaniseError(j.error)); return }
      setDone(true); setTimeout(() => router.push('/dashboard/fitness'), 1200)
    } catch { setErr('Connection failed.') }
    finally { setSubmitting(false) }
  }

  if (done) return (
    <div className="px-4 pt-20 max-w-md mx-auto text-center">
      <h1 className="text-[22px] font-black mb-2">Profile created</h1>
      <p className="text-[13px] text-ink/70">Opening dashboard…</p>
    </div>
  )

  return (
    <div className="px-4 pt-6 pb-20 max-w-md mx-auto">
      <Link href="/" className="text-[12px] text-ink/70 hover:text-ink inline-block mb-4">← Back</Link>
      <h1 className="text-[26px] font-black leading-tight mb-2">Personal trainer signup</h1>
      <p className="text-[13px] text-ink/70 mb-6">Pick max 3 spesialisasi. Set drop-in price dan/atau monthly coaching bundle. Rp 38,000/month after a 7-day trial.</p>

      <form onSubmit={submit} className="space-y-4">
        <Field label="Trainer name *">
          <input required maxLength={80} value={f.display_name} onChange={(e) => upd('display_name', e.target.value)} placeholder="Coach Galih" className={inputCls} />
        </Field>
        <Field label="Years of experience">
          <input type="number" min={0} max={60} value={f.years_experience} onChange={(e) => upd('years_experience', Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Bio (max 300) *">
          <textarea required maxLength={300} rows={3} value={f.bio} onChange={(e) => upd('bio', e.target.value)} placeholder="Sertifikat (ACE-CPT / NASM-CPT / ISSA / SKKNI), spesialisasi (fat-loss / muscle-gain / strength), lokasi sesi (gym / rumah / outdoor / online), package discount, free konsultasi nutrisi." className={inputCls + ' resize-none'} />
        </Field>

        <div className="rounded-2xl bg-black/85 border border-white/10 p-4">
          <div className="flex items-baseline justify-between mb-1">
            <div className="text-[13px] font-extrabold uppercase tracking-wider text-ink">Training types *</div>
            <div className="text-[11px] text-ink/55">{f.specialties.length}/{MAX_FITNESS_SPECIALTIES}</div>
          </div>
          <p className="text-[11px] text-ink/55 mb-3">Pick max {MAX_FITNESS_SPECIALTIES} kategori training andalan.</p>
          <div className="flex flex-wrap gap-1.5">
            {ALL_SPECIALTIES.map((s) => {
              const on = f.specialties.includes(s)
              const atLimit = !on && f.specialties.length >= MAX_FITNESS_SPECIALTIES
              return (
                <button
                  key={s} type="button"
                  disabled={atLimit}
                  onClick={() => toggleSpecialty(s)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider border transition ${
                    on ? 'bg-brand text-bg border-brand'
                       : atLimit
                         ? 'bg-black/40 text-ink/30 border-white/10 cursor-not-allowed'
                         : 'bg-black/40 text-ink/80 border-white/15 hover:bg-white/5'
                  }`}
                >
                  {SPECIALTY_LABELS[s]}
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-black/85 border border-white/10 p-4">
          <div className="text-[13px] font-extrabold mb-1 uppercase tracking-wider text-ink">Rates (Rp)</div>
          <p className="text-[11px] text-ink/55 mb-3">Enter at least one — drop-in per sesi (60 menit) atau monthly coaching bundle (12 sesi + nutrition + WA check-in).</p>
          <div className="grid grid-cols-2 gap-2">
            <PriceField label="Drop-in from"      v={f.hourly_rate} set={(v) => upd('hourly_rate', v)} />
            <PriceField label="Monthly coaching"  v={f.day_rate}    set={(v) => upd('day_rate', v)} />
          </div>
          <label className="flex items-center gap-2 mt-3 text-[12px] text-ink/85 cursor-pointer">
            <input type="checkbox" checked={f.has_own_tools} onChange={(e) => upd('has_own_tools', e.target.checked)} className="accent-brand w-4 h-4" />
            <span>Trainer bawa equipment (resistance band, kettlebell, jump rope, suspension trainer)</span>
          </label>
        </div>

        <Field label="WhatsApp (e164) *"><input type="tel" required value={f.whatsapp_e164} onChange={(e) => upd('whatsapp_e164', e.target.value)} placeholder="+62 812 3456 7890" className={inputCls} /></Field>
        <Field label="City"><input value={f.city} onChange={(e) => upd('city', e.target.value)} placeholder="Yogyakarta" className={inputCls} /></Field>
        <Field label="Service area / catatan jangkauan"><input value={f.service_area_notes} onChange={(e) => upd('service_area_notes', e.target.value)} placeholder="Yogya · Sleman · Bantul · gym/rumah/outdoor · online via Zoom OK" className={inputCls} /></Field>
        <ProfileImageUploader value={f.profile_image_url || null} onChange={(v) => upd('profile_image_url', v ?? '')} userId={userId} />

        {err && <div className="rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-[13px] px-3 py-2">{err}</div>}

        <button type="submit" disabled={submitting} className="w-full rounded-full bg-brand text-bg px-6 py-3.5 text-[14px] font-extrabold uppercase tracking-wider disabled:opacity-60">
          {submitting ? 'Registering…' : 'Create personal trainer profile'}
        </button>
      </form>
    </div>
  )
}

function PriceField({ label, v, set }: { label: string; v: string; set: (s: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-ink/70 mb-1 inline-block uppercase">{label}</span>
      <input type="number" min={0} value={v} onChange={(e) => set(e.target.value)} placeholder="—" className={inputCls + ' text-[13px]'} />
    </label>
  )
}

function humaniseError(code?: string): string {
  switch (code) {
    case 'name_required':         return 'Name required.'
    case 'bio_required':          return 'Bio required.'
    case 'whatsapp_required':     return 'WhatsApp required + valid.'
    case 'invalid_years':         return 'Years of experience 0-60.'
    case 'at_least_one_specialty':return `Pick min 1, max ${MAX_FITNESS_SPECIALTIES} kategori training.`
    case 'at_least_one_price':    return 'Enter at least one rate — drop-in or monthly coaching.'
    case 'slug_collision':        return 'Name already taken — try a variation.'
    case 'already_registered':    return 'You already have a personal trainer profile.'
    default:                      return 'Could not register. Try again.'
  }
}

const inputCls = 'w-full rounded-xl bg-black/85 border border-white/15 px-4 py-3 text-[14px] text-ink placeholder:text-ink/40 focus:outline-none focus:border-brand'
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[13px] font-bold text-ink/85 mb-1.5 inline-block">{label}</span>
      {children}
    </label>
  )
}
