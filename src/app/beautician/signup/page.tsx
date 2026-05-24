'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/supabase/client'
import AppNav from '@/components/layout/AppNav'

const BG_URL = 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2004_57_59%20AM.png?updatedAt=1779141503106'

type AuthState =
  | { status: 'loading' }
  | { status: 'anon' }
  | { status: 'signedIn'; email: string | null }
  | { status: 'alreadyProvider' }

export default function BeauticianSignupPage() {
  const router = useRouter()
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) { setAuth({ status: 'anon' }); return }
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data?.session?.user
      if (!user) { setAuth({ status: 'anon' }); return }
      try {
        const r = await fetch('/api/beautician/me', { cache: 'no-store' })
        if (r.ok) {
          const j = await r.json() as { provider?: unknown }
          if (j.provider) {
            setAuth({ status: 'alreadyProvider' })
            setTimeout(() => router.replace('/dashboard/beautician'), 400)
            return
          }
        }
      } catch { /* fall through */ }
      setAuth({ status: 'signedIn', email: user.email ?? null })
    })
  }, [router])

  if (auth.status === 'loading') return <Shell><Loading /></Shell>
  if (auth.status === 'alreadyProvider') return <Shell><AlreadyProvider /></Shell>
  if (auth.status === 'anon') return <Shell><Gate /></Shell>
  return <Shell><Form /></Shell>
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen text-ink overflow-hidden">
      <div aria-hidden className="absolute inset-0 -z-10 bg-cover bg-center bg-fixed" style={{ backgroundImage: `url(${BG_URL})` }} />
      <div aria-hidden className="absolute inset-0 -z-10 bg-black/80" />
      <AppNav />
      {children}
    </main>
  )
}

function Loading() {
  return <div className="flex items-center justify-center pt-32"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
}
function AlreadyProvider() {
  return <div className="px-4 pt-20 max-w-md mx-auto text-center"><h1 className="text-[20px] font-black mb-2">Opening your dashboard…</h1></div>
}
function Gate() {
  return (
    <div className="px-4 pt-12 max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="inline-block bg-brand text-bg text-[11px] font-extrabold uppercase tracking-[0.15em] px-3 py-1 rounded-full mb-4">
          Bike Beautician
        </div>
        <h1 className="text-[26px] font-black leading-tight mb-3">Sign up as a beautician</h1>
        <p className="text-[13px] text-ink/70 leading-relaxed">
          Create an account first — your beautician profile is linked to it. Already have a rider, therapist, or customer login? Use the same one.
        </p>
      </div>
      <div className="space-y-3">
        <Link href="/signup?intent=beautician&next=/beautician/signup" className="block w-full rounded-2xl bg-brand text-bg px-6 py-4 text-center text-[14px] font-extrabold uppercase tracking-wider hover:brightness-105">
          Create new account
        </Link>
        <Link href="/login?next=/beautician/signup" className="block w-full rounded-2xl bg-white/[0.06] border border-ink/15 text-ink px-6 py-4 text-center text-[14px] font-extrabold uppercase tracking-wider hover:bg-white/10">
          Sign in to existing account
        </Link>
      </div>
    </div>
  )
}

function Form() {
  const router = useRouter()
  const [f, setF] = useState({
    display_name: '',
    gender: 'woman' as 'woman' | 'man',
    years_experience: 0,
    bio: '',
    price_makeup_idr: '' as string,
    price_nail_idr: '' as string,
    price_hair_idr: '' as string,
    whatsapp_e164: '',
    city: '',
    service_area_notes: '',
    profile_image_url: '',
    ktp_image_url: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function upd<K extends keyof typeof f>(k: K, v: typeof f[K]) {
    setF((prev) => ({ ...prev, [k]: v })); setErr(null)
  }
  function priceNum(v: string): number | null {
    const s = v.trim()
    if (!s) return null
    const n = Number(s)
    return Number.isFinite(n) && n >= 0 ? n : null
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const pM = priceNum(f.price_makeup_idr)
    const pN = priceNum(f.price_nail_idr)
    const pH = priceNum(f.price_hair_idr)
    if (pM === null && pN === null && pH === null) {
      setErr('Set at least one service price (makeup, nail, or hair).')
      return
    }
    setSubmitting(true); setErr(null)
    try {
      const r = await fetch('/api/beautician/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: f.display_name,
          gender: f.gender,
          years_experience: f.years_experience,
          bio: f.bio,
          price_makeup_idr: pM,
          price_nail_idr:   pN,
          price_hair_idr:   pH,
          whatsapp_e164: f.whatsapp_e164,
          city: f.city,
          service_area_notes: f.service_area_notes,
          profile_image_url: f.profile_image_url,
          ktp_image_url: f.ktp_image_url,
        }),
      })
      const j = await r.json() as { ok?: boolean; error?: string }
      if (!r.ok || !j.ok) { setErr(humaniseError(j.error)); return }
      setDone(true)
      setTimeout(() => router.push('/dashboard/beautician'), 1200)
    } catch { setErr('Tidak bisa terhubung.') }
    finally { setSubmitting(false) }
  }

  if (done) return (
    <div className="px-4 pt-20 max-w-md mx-auto text-center">
      <h1 className="text-[22px] font-black mb-2">Profile created</h1>
      <p className="text-[13px] text-ink/70">Awaiting KTP verification — opening dashboard…</p>
    </div>
  )

  return (
    <div className="px-4 pt-6 pb-20 max-w-md mx-auto">
      <Link href="/" className="text-[12px] text-ink/70 hover:text-ink inline-block mb-4">← Back</Link>
      <h1 className="text-[26px] font-black leading-tight mb-2">Beautician signup</h1>
      <p className="text-[13px] text-ink/70 mb-6">
        Set your services + package prices. Profile activates after admin verifies your KTP.
        Rp 38.000/month, 7-day free trial.
      </p>

      <form onSubmit={submit} className="space-y-4">
        <Field label="Display name *">
          <input required maxLength={80} value={f.display_name} onChange={(e) => upd('display_name', e.target.value)} placeholder="e.g. Ayu · Bridal Makeup" className={inputCls} />
        </Field>

        <Field label="Gender *">
          <div className="grid grid-cols-2 gap-2">
            {(['woman','man'] as const).map((g) => (
              <label key={g} className={`flex items-center justify-center gap-2 rounded-xl p-3 cursor-pointer border transition ${
                f.gender === g ? 'bg-brand/15 border-brand/50' : 'bg-black/85 border-white/10 hover:border-white/20'
              }`}>
                <input type="radio" name="gender" value={g} checked={f.gender === g} onChange={() => upd('gender', g)} className="accent-brand" />
                <span className="text-[14px] font-extrabold">{g === 'woman' ? 'Wanita' : 'Pria'}</span>
              </label>
            ))}
          </div>
        </Field>

        <Field label="Years of experience *">
          <input type="number" min={0} max={60} required value={f.years_experience} onChange={(e) => upd('years_experience', Number(e.target.value))} className={inputCls} />
        </Field>

        <Field label="Short bio (max 300 chars) *">
          <textarea required maxLength={300} rows={3} value={f.bio} onChange={(e) => upd('bio', e.target.value)} placeholder="3 lines: your style, training, what clients can expect." className={inputCls + ' resize-none'} />
        </Field>

        <div className="rounded-2xl bg-black/85 border border-white/10 p-4">
          <div className="text-[13px] font-extrabold mb-1 uppercase tracking-wider text-ink">Service package prices (Rp)</div>
          <p className="text-[11px] text-ink/55 mb-3">Leave blank for any service you don&apos;t offer. Set at least one.</p>
          <div className="grid grid-cols-3 gap-2">
            {(['makeup','nail','hair'] as const).map((k) => (
              <label key={k} className="block">
                <span className="text-[11px] font-bold text-ink/70 mb-1 inline-block uppercase">{k}</span>
                <input
                  type="number" min={0}
                  value={f[`price_${k}_idr` as const]}
                  onChange={(e) => upd(`price_${k}_idr` as const, e.target.value)}
                  placeholder="—"
                  className={inputCls + ' text-[13px]'}
                />
              </label>
            ))}
          </div>
        </div>

        <Field label="WhatsApp (e164) *">
          <input type="tel" required value={f.whatsapp_e164} onChange={(e) => upd('whatsapp_e164', e.target.value)} placeholder="+62 812 3456 7890" className={inputCls} />
        </Field>
        <Field label="City"><input value={f.city} onChange={(e) => upd('city', e.target.value)} placeholder="Denpasar" className={inputCls} /></Field>
        <Field label="Service area"><input value={f.service_area_notes} onChange={(e) => upd('service_area_notes', e.target.value)} placeholder="Hotel Kuta · Seminyak · Canggu" className={inputCls} /></Field>
        <Field label="Profile image URL"><input type="url" value={f.profile_image_url} onChange={(e) => upd('profile_image_url', e.target.value)} placeholder="https://… (hosted image URL)" className={inputCls} /></Field>
        <Field label="KTP image URL (private — admin verification)"><input type="url" value={f.ktp_image_url} onChange={(e) => upd('ktp_image_url', e.target.value)} placeholder="https://… (KTP image URL)" className={inputCls} /></Field>

        {err && <div className="rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-[13px] px-3 py-2">{err}</div>}

        <button type="submit" disabled={submitting} className="w-full rounded-full bg-brand text-bg px-6 py-3.5 text-[14px] font-extrabold uppercase tracking-wider disabled:opacity-60">
          {submitting ? 'Mendaftarkan…' : 'Create beautician profile'}
        </button>
      </form>
    </div>
  )
}

function humaniseError(code?: string): string {
  switch (code) {
    case 'name_required':       return 'Display name is required.'
    case 'gender_required':     return 'Please pick a gender.'
    case 'bio_required':        return 'Please add a short bio.'
    case 'bio_too_long':        return 'Bio must be 300 characters or fewer.'
    case 'whatsapp_required':   return 'Valid WhatsApp number is required.'
    case 'invalid_years':       return 'Years of experience must be 0–60.'
    case 'at_least_one_service':return 'Set at least one service price.'
    case 'slug_collision':      return 'That display name is taken — try a variation.'
    case 'already_registered':  return 'You already have a beautician profile.'
    default:                    return 'Could not register. Please try again.'
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
