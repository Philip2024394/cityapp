'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/supabase/client'
import AppNav from '@/components/layout/AppNav'
import KtpUploader from '@/components/kyc/KtpUploader'

const BG_URL = 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2004_57_59%20AM.png?updatedAt=1779141503106'

type AuthState =
  | { status: 'loading' }
  | { status: 'anon' }
  | { status: 'signedIn'; userId: string; email: string | null }
  | { status: 'alreadyProvider' }

export default function LaundrySignupPage() {
  const router = useRouter()
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) { setAuth({ status: 'anon' }); return }
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data?.session?.user
      if (!user) { setAuth({ status: 'anon' }); return }
      try {
        const r = await fetch('/api/laundry/me', { cache: 'no-store' })
        if (r.ok) {
          const j = await r.json() as { provider?: unknown }
          if (j.provider) { setAuth({ status: 'alreadyProvider' }); setTimeout(() => router.replace('/dashboard/laundry'), 400); return }
        }
      } catch { /* fall through */ }
      setAuth({ status: 'signedIn', userId: user.id, email: user.email ?? null })
    })
  }, [router])

  if (auth.status === 'loading') return <Shell><div className="flex items-center justify-center pt-32"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div></Shell>
  if (auth.status === 'alreadyProvider') return <Shell><div className="px-4 pt-20 text-center"><h1 className="text-[20px] font-black">Opening your dashboard…</h1></div></Shell>
  if (auth.status === 'anon') return <Shell><Gate /></Shell>
  return <Shell><Form userId={auth.userId} /></Shell>
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

function Gate() {
  return (
    <div className="px-4 pt-12 max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="inline-block bg-brand text-bg text-[11px] font-extrabold uppercase tracking-[0.15em] px-3 py-1 rounded-full mb-4">Bike Laundry</div>
        <h1 className="text-[26px] font-black leading-tight mb-3">List your laundry shop</h1>
        <p className="text-[13px] text-ink/70 leading-relaxed">
          Create an account first. Already have a rider/therapist login? Use the same one.
        </p>
      </div>
      <div className="space-y-3">
        <Link href="/signup?intent=laundry&next=/laundry/signup" className="block w-full rounded-2xl bg-brand text-bg px-6 py-4 text-center text-[14px] font-extrabold uppercase tracking-wider hover:brightness-105">
          Create new account
        </Link>
        <Link href="/login?next=/laundry/signup" className="block w-full rounded-2xl bg-white/[0.06] border border-ink/15 text-ink px-6 py-4 text-center text-[14px] font-extrabold uppercase tracking-wider hover:bg-white/10">
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
    years_experience: 0,
    bio: '',
    price_wash: '' as string,
    price_wash_dry: '' as string,
    price_wash_iron: '' as string,
    min_kg: '' as string,
    turnaround_hours: '' as string,
    whatsapp_e164: '',
    city: '',
    service_area_notes: '',
    profile_image_url: '',
    ktp_image_url: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function upd<K extends keyof typeof f>(k: K, v: typeof f[K]) { setF((p) => ({ ...p, [k]: v })); setErr(null) }
  function num(s: string): number | null { const n = Number(s); return Number.isFinite(n) && n >= 0 ? n : null }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const pW = f.price_wash       === '' ? null : num(f.price_wash)
    const pD = f.price_wash_dry   === '' ? null : num(f.price_wash_dry)
    const pI = f.price_wash_iron  === '' ? null : num(f.price_wash_iron)
    if (pW === null && pD === null && pI === null) { setErr('Set at least one per-kg package price.'); return }
    setSubmitting(true); setErr(null)
    try {
      const r = await fetch('/api/laundry/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: f.display_name,
          years_experience: f.years_experience,
          bio: f.bio,
          price_wash_per_kg_idr:      pW,
          price_wash_dry_per_kg_idr:  pD,
          price_wash_iron_per_kg_idr: pI,
          min_kg:           f.min_kg            === '' ? null : Number(f.min_kg),
          turnaround_hours: f.turnaround_hours  === '' ? null : Number(f.turnaround_hours),
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
      setTimeout(() => router.push('/dashboard/laundry'), 1200)
    } catch { setErr('Tidak bisa terhubung.') }
    finally { setSubmitting(false) }
  }

  if (done) return (
    <div className="px-4 pt-20 max-w-md mx-auto text-center">
      <h1 className="text-[22px] font-black mb-2">Profile created</h1>
      <p className="text-[13px] text-ink/70">Awaiting verification — opening dashboard…</p>
    </div>
  )

  return (
    <div className="px-4 pt-6 pb-20 max-w-md mx-auto">
      <Link href="/" className="text-[12px] text-ink/70 hover:text-ink inline-block mb-4">← Back</Link>
      <h1 className="text-[26px] font-black leading-tight mb-2">Laundry signup</h1>
      <p className="text-[13px] text-ink/70 mb-6">
        Set your per-kg prices. Pickup &amp; dropoff is always included. Rp 38.000/month after a 7-day trial.
      </p>

      <form onSubmit={submit} className="space-y-4">
        <Field label="Shop name *">
          <input required maxLength={80} value={f.display_name} onChange={(e) => upd('display_name', e.target.value)} placeholder="e.g. Laundry Bersih Kuta" className={inputCls} />
        </Field>
        <Field label="Years of operation">
          <input type="number" min={0} max={60} value={f.years_experience} onChange={(e) => upd('years_experience', Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Short bio (max 300 chars) *">
          <textarea required maxLength={300} rows={3} value={f.bio} onChange={(e) => upd('bio', e.target.value)} placeholder="What you specialize in, pickup zones, turnaround times." className={inputCls + ' resize-none'} />
        </Field>

        <div className="rounded-2xl bg-black/85 border border-white/10 p-4">
          <div className="text-[13px] font-extrabold mb-1 uppercase tracking-wider text-ink">Per-kg prices (Rp)</div>
          <p className="text-[11px] text-ink/55 mb-3">Leave blank for any package you don&apos;t offer. Set at least one. Pickup &amp; dropoff is always included.</p>
          <div className="grid grid-cols-3 gap-2">
            <PriceField label="Wash"        v={f.price_wash}       set={(v) => upd('price_wash', v)} />
            <PriceField label="Wash + Dry"  v={f.price_wash_dry}   set={(v) => upd('price_wash_dry', v)} />
            <PriceField label="Wash + Iron" v={f.price_wash_iron}  set={(v) => upd('price_wash_iron', v)} />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <label className="block">
              <span className="text-[11px] font-bold text-ink/70 mb-1 inline-block uppercase">Min order (kg)</span>
              <input type="number" step="0.1" min="0" value={f.min_kg} onChange={(e) => upd('min_kg', e.target.value)} placeholder="optional" className={inputCls + ' text-[13px]'} />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold text-ink/70 mb-1 inline-block uppercase">Turnaround (hours)</span>
              <input type="number" min="1" max="168" value={f.turnaround_hours} onChange={(e) => upd('turnaround_hours', e.target.value)} placeholder="e.g. 24" className={inputCls + ' text-[13px]'} />
            </label>
          </div>
        </div>

        <Field label="WhatsApp (e164) *"><input type="tel" required value={f.whatsapp_e164} onChange={(e) => upd('whatsapp_e164', e.target.value)} placeholder="+62 812 3456 7890" className={inputCls} /></Field>
        <Field label="City"><input value={f.city} onChange={(e) => upd('city', e.target.value)} placeholder="Denpasar" className={inputCls} /></Field>
        <Field label="Service area"><input value={f.service_area_notes} onChange={(e) => upd('service_area_notes', e.target.value)} placeholder="Kuta · Seminyak · Canggu" className={inputCls} /></Field>
        <Field label="Profile image URL"><input type="url" value={f.profile_image_url} onChange={(e) => upd('profile_image_url', e.target.value)} placeholder="https://… (hosted image URL)" className={inputCls} /></Field>
        <KtpUploader value={f.ktp_image_url || null} onChange={(v) => upd('ktp_image_url', v ?? '')} userId={userId} />

        {err && <div className="rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-[13px] px-3 py-2">{err}</div>}

        <button type="submit" disabled={submitting} className="w-full rounded-full bg-brand text-bg px-6 py-3.5 text-[14px] font-extrabold uppercase tracking-wider disabled:opacity-60">
          {submitting ? 'Mendaftarkan…' : 'Create laundry profile'}
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
    case 'name_required':       return 'Shop name is required.'
    case 'bio_required':        return 'Please add a short bio.'
    case 'bio_too_long':        return 'Bio must be 300 characters or fewer.'
    case 'whatsapp_required':   return 'Valid WhatsApp number is required.'
    case 'invalid_years':       return 'Years must be 0–60.'
    case 'at_least_one_package':return 'Set at least one per-kg package price.'
    case 'slug_collision':      return 'That shop name is taken — try a variation.'
    case 'already_registered':  return 'You already have a laundry profile.'
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
