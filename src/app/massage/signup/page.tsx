'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/supabase/client'
import AppNav from '@/components/layout/AppNav'
import ProfileImageUploader from '@/components/kyc/ProfileImageUploader'
import { MASSAGE_TYPE_GROUPS, type MassageType } from '@/lib/massage/types'

// Massage provider signup. Auth-gated like /partners/signup — must be
// signed in (or create an account) before claiming a provider row.

type AuthState =
  | { status: 'loading' }
  | { status: 'anon' }
  | { status: 'signedIn'; userId: string; email: string | null }
  | { status: 'alreadyProvider'; slug: string }

export default function MassageSignupPage() {
  const router = useRouter()
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) { setAuth({ status: 'anon' }); return }
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data?.session?.user
      if (!user) { setAuth({ status: 'anon' }); return }
      try {
        const r = await fetch('/api/massage/me', { cache: 'no-store' })
        if (r.ok) {
          const j = await r.json() as { provider?: { slug: string } | null }
          if (j.provider) {
            setAuth({ status: 'alreadyProvider', slug: j.provider.slug })
            setTimeout(() => router.replace('/dashboard/massage'), 400)
            return
          }
        }
      } catch { /* fall through */ }
      setAuth({ status: 'signedIn', userId: user.id, email: user.email ?? null })
    })
  }, [router])

  if (auth.status === 'loading')   return <Shell><Loading /></Shell>
  if (auth.status === 'alreadyProvider') return <Shell><AlreadyProvider /></Shell>
  if (auth.status === 'anon')      return <Shell><Gate /></Shell>
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

function Loading() {
  return (
    <div className="flex items-center justify-center pt-32">
      <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function AlreadyProvider() {
  return (
    <div className="px-4 pt-20 max-w-md mx-auto text-center">
      <h1 className="text-[20px] font-black mb-2">Opening your dashboard…</h1>
    </div>
  )
}

function Gate() {
  return (
    <div className="px-4 pt-12 max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="inline-block bg-brand text-bg text-[11px] font-extrabold uppercase tracking-[0.15em] px-3 py-1 rounded-full mb-4">
          Massage Provider
        </div>
        <h1 className="text-[26px] font-black leading-tight mb-3">Sign up as a therapist</h1>
        <p className="text-[13px] text-ink/70 leading-relaxed">
          Create an account first — your massage profile is linked to it.
          Already have a rider or customer login? Use the same one.
        </p>
      </div>
      <div className="space-y-3">
        <Link
          href="/signup?intent=massage&next=/massage/signup"
          className="block w-full rounded-2xl bg-brand text-bg px-6 py-4 text-center text-[14px] font-extrabold uppercase tracking-wider hover:brightness-105"
        >
          Create new account
        </Link>
        <Link
          href="/login?next=/massage/signup"
          className="block w-full rounded-2xl bg-white/[0.06] border border-ink/15 text-ink px-6 py-4 text-center text-[14px] font-extrabold uppercase tracking-wider hover:bg-white/10"
        >
          Sign in to existing account
        </Link>
      </div>
    </div>
  )
}

function Form({ userId }: { userId: string }) {
  const router = useRouter()
  const [f, setF] = useState({
    display_name: '',
    gender: 'woman' as 'woman' | 'man',
    years_experience: 0,
    bio: '',
    massage_type: 'balinese' as MassageType,
    price_60min_idr: 150_000,
    price_90min_idr: 220_000,
    price_120min_idr: 290_000,
    whatsapp_e164: '',
    city: '',
    service_area_notes: '',
    profile_image_url: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function upd<K extends keyof typeof f>(k: K, v: typeof f[K]) {
    setF((prev) => ({ ...prev, [k]: v })); setErr(null)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true); setErr(null)
    try {
      const r = await fetch('/api/massage/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      })
      const j = await r.json() as { ok?: boolean; error?: string }
      if (!r.ok || !j.ok) { setErr(humaniseError(j.error)); return }
      setDone(true)
      setTimeout(() => router.push('/dashboard/massage'), 1200)
    } catch { setErr('Tidak bisa terhubung.') }
    finally { setSubmitting(false) }
  }

  if (done) {
    return (
      <div className="px-4 pt-20 max-w-md mx-auto text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-brand flex items-center justify-center mb-5">
          <svg className="w-8 h-8 text-bg" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-[22px] font-black mb-2">Profile created</h1>
        <p className="text-[13px] text-ink/70">Opening dashboard…</p>
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-20 max-w-md mx-auto">
      <Link href="/" className="text-[12px] text-ink/70 hover:text-ink inline-block mb-4">← Back</Link>
      <h1 className="text-[26px] font-black leading-tight mb-2">Therapist signup</h1>
      <p className="text-[13px] text-ink/70 mb-6">
        Set your prices and profile. Subscription Rp 38.000/month, 7-day free trial.
      </p>

      <form onSubmit={submit} className="space-y-4">
        <Field label="Display name *">
          <input type="text" required maxLength={80} value={f.display_name} onChange={(e) => upd('display_name', e.target.value)} placeholder="e.g. Sari · Bali Tradisional" className={inputCls} />
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

        <Field label="Massage type *">
          <select
            value={f.massage_type}
            onChange={(e) => upd('massage_type', e.target.value as MassageType)}
            className={inputCls}
            required
          >
            {MASSAGE_TYPE_GROUPS.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.items.map((it) => (
                  <option key={it.value} value={it.value}>{it.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <p className="text-[11px] text-ink/50 mt-1">Pick the single specialty you lead with. Add more in your bio.</p>
        </Field>

        <Field label="Short bio (max 300 chars) *">
          <textarea required maxLength={300} rows={3} value={f.bio} onChange={(e) => upd('bio', e.target.value)} placeholder="3 lines about your style, training, and what guests can expect." className={inputCls + ' resize-none'} />
          <div className="text-[11px] text-ink/50 mt-1">{f.bio.length}/300</div>
        </Field>

        <div className="rounded-2xl bg-black/85 border border-white/10 p-4">
          <div className="text-[13px] font-extrabold mb-3 uppercase tracking-wider text-ink">Pricing (Rp)</div>
          <div className="grid grid-cols-3 gap-2">
            {(['60','90','120'] as const).map((min) => {
              const key = `price_${min}min_idr` as const
              return (
                <label key={min} className="block">
                  <span className="text-[11px] font-bold text-ink/70 mb-1 inline-block">{min} min</span>
                  <input type="number" min={0} value={f[key]} onChange={(e) => upd(key, Number(e.target.value))} className={inputCls + ' text-[13px]'} />
                </label>
              )
            })}
          </div>
        </div>

        <Field label="WhatsApp (e164, e.g. +6281234567890) *">
          <input type="tel" required value={f.whatsapp_e164} onChange={(e) => upd('whatsapp_e164', e.target.value)} placeholder="+62 812 3456 7890" className={inputCls} />
        </Field>

        <Field label="City">
          <input type="text" value={f.city} onChange={(e) => upd('city', e.target.value)} placeholder="Denpasar" className={inputCls} />
        </Field>

        <Field label="Service area notes">
          <input type="text" value={f.service_area_notes} onChange={(e) => upd('service_area_notes', e.target.value)} placeholder="e.g. Hotel Kuta · Seminyak · Canggu" className={inputCls} />
        </Field>

        <ProfileImageUploader value={f.profile_image_url || null} onChange={(v) => upd('profile_image_url', v ?? '')} userId={userId} />

        {err && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-[13px] px-3 py-2">{err}</div>
        )}

        <button type="submit" disabled={submitting} className="w-full rounded-full bg-brand text-bg px-6 py-3.5 text-[14px] font-extrabold uppercase tracking-wider disabled:opacity-60">
          {submitting ? 'Mendaftarkan…' : 'Create therapist profile'}
        </button>

        <p className="text-[12px] text-ink/60 text-center pt-2">
          Rp 38.000/bulan setelah trial 7 hari. 0% commission. Cancel kapan saja.
        </p>
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
    case 'invalid_price':       return 'Prices must be 0 or higher.'
    case 'slug_collision':      return 'That display name is taken — try a variation.'
    case 'already_registered':  return 'You already have a therapist profile on this account.'
    case 'service_role_not_configured': return 'Server not ready. Try again.'
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
