'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/supabase/client'
import AppNav from '@/components/layout/AppNav'
import KtpUploader from '@/components/kyc/KtpUploader'
import ProfileImageUploader from '@/components/kyc/ProfileImageUploader'

const BG_URL = 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2004_57_59%20AM.png?updatedAt=1779141503106'

type AuthState =
  | { status: 'loading' } | { status: 'anon' }
  | { status: 'signedIn'; userId: string } | { status: 'alreadyProvider' }

export default function HomeCleanSignupPage() {
  const router = useRouter()
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) { setAuth({ status: 'anon' }); return }
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data?.session?.user
      if (!user) { setAuth({ status: 'anon' }); return }
      try {
        const r = await fetch('/api/home-clean/me', { cache: 'no-store' })
        if (r.ok) {
          const j = await r.json() as { provider?: unknown }
          if (j.provider) { setAuth({ status: 'alreadyProvider' }); setTimeout(() => router.replace('/dashboard/home-clean'), 400); return }
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
    <main className="relative min-h-screen text-ink overflow-hidden">
      <div aria-hidden className="absolute inset-0 -z-10 bg-cover bg-center bg-fixed" style={{ backgroundImage: `url(${BG_URL})` }} />
      <div aria-hidden className="absolute inset-0 -z-10 bg-black/80" />
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
        <div className="inline-block bg-brand text-bg text-[11px] font-extrabold uppercase tracking-[0.15em] px-3 py-1 rounded-full mb-4">Bike Home Clean</div>
        <h1 className="text-[26px] font-black leading-tight mb-3">Daftar sebagai cleaner</h1>
        <p className="text-[13px] text-ink/70 leading-relaxed">Buat akun dulu — sudah punya akun? Login pakai yang sama.</p>
      </div>
      <div className="space-y-3">
        <Link href="/signup?intent=home-clean&next=/home-clean/signup" className="block w-full rounded-2xl bg-brand text-bg px-6 py-4 text-center text-[14px] font-extrabold uppercase tracking-wider hover:brightness-105">
          Buat akun baru
        </Link>
        <Link href="/login?next=/home-clean/signup" className="block w-full rounded-2xl bg-white/[0.06] border border-ink/15 text-ink px-6 py-4 text-center text-[14px] font-extrabold uppercase tracking-wider hover:bg-white/10">
          Login akun yang ada
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
    hourly_rate: '',
    day_rate: '',
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

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const h = f.hourly_rate.trim()
    const d = f.day_rate.trim()
    if (h === '' && d === '') { setErr('Isi minimal hour rate atau day rate.'); return }
    setSubmitting(true); setErr(null)
    try {
      const r = await fetch('/api/home-clean/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: f.display_name,
          years_experience: f.years_experience,
          bio: f.bio,
          hourly_rate_idr: h === '' ? null : Number(h),
          day_rate_idr:    d === '' ? null : Number(d),
          whatsapp_e164: f.whatsapp_e164,
          city: f.city,
          service_area_notes: f.service_area_notes,
          profile_image_url: f.profile_image_url,
          ktp_image_url: f.ktp_image_url,
        }),
      })
      const j = await r.json() as { ok?: boolean; error?: string }
      if (!r.ok || !j.ok) { setErr(humaniseError(j.error)); return }
      setDone(true); setTimeout(() => router.push('/dashboard/home-clean'), 1200)
    } catch { setErr('Tidak bisa terhubung.') }
    finally { setSubmitting(false) }
  }

  if (done) return (
    <div className="px-4 pt-20 max-w-md mx-auto text-center">
      <h1 className="text-[22px] font-black mb-2">Profile created</h1>
      <p className="text-[13px] text-ink/70">Menunggu verifikasi KTP — buka dashboard…</p>
    </div>
  )

  return (
    <div className="px-4 pt-6 pb-20 max-w-md mx-auto">
      <Link href="/" className="text-[12px] text-ink/70 hover:text-ink inline-block mb-4">← Back</Link>
      <h1 className="text-[26px] font-black leading-tight mb-2">Home Clean signup</h1>
      <p className="text-[13px] text-ink/70 mb-6">Pasang tarif per jam dan/atau per hari (day = 8 jam kerja). Rp 38.000/bulan setelah trial 7 hari.</p>

      <form onSubmit={submit} className="space-y-4">
        <Field label="Nama *">
          <input required maxLength={80} value={f.display_name} onChange={(e) => upd('display_name', e.target.value)} placeholder="Bu Siti" className={inputCls} />
        </Field>
        <Field label="Tahun pengalaman">
          <input type="number" min={0} max={60} value={f.years_experience} onChange={(e) => upd('years_experience', Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Bio singkat (max 300) *">
          <textarea required maxLength={300} rows={3} value={f.bio} onChange={(e) => upd('bio', e.target.value)} placeholder="Layanan + area kerja + peralatan yang dibawa." className={inputCls + ' resize-none'} />
        </Field>

        <div className="rounded-2xl bg-black/85 border border-white/10 p-4">
          <div className="text-[13px] font-extrabold mb-1 uppercase tracking-wider text-ink">Tarif (Rp)</div>
          <p className="text-[11px] text-ink/55 mb-3">Isi minimal satu — hour rate atau day rate (day = 8 jam).</p>
          <div className="grid grid-cols-2 gap-2">
            <PriceField label="Hour"     v={f.hourly_rate} set={(v) => upd('hourly_rate', v)} />
            <PriceField label="Day · 8h" v={f.day_rate}    set={(v) => upd('day_rate', v)} />
          </div>
        </div>

        <Field label="WhatsApp (e164) *"><input type="tel" required value={f.whatsapp_e164} onChange={(e) => upd('whatsapp_e164', e.target.value)} placeholder="+62 812 3456 7890" className={inputCls} /></Field>
        <Field label="Kota"><input value={f.city} onChange={(e) => upd('city', e.target.value)} placeholder="Yogyakarta" className={inputCls} /></Field>
        <Field label="Area kerja"><input value={f.service_area_notes} onChange={(e) => upd('service_area_notes', e.target.value)} placeholder="Yogya · Sleman · Bantul" className={inputCls} /></Field>
        <ProfileImageUploader value={f.profile_image_url || null} onChange={(v) => upd('profile_image_url', v ?? '')} userId={userId} />
        <KtpUploader value={f.ktp_image_url || null} onChange={(v) => upd('ktp_image_url', v ?? '')} userId={userId} />

        {err && <div className="rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-[13px] px-3 py-2">{err}</div>}

        <button type="submit" disabled={submitting} className="w-full rounded-full bg-brand text-bg px-6 py-3.5 text-[14px] font-extrabold uppercase tracking-wider disabled:opacity-60">
          {submitting ? 'Mendaftarkan…' : 'Create cleaner profile'}
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
    case 'name_required':         return 'Nama wajib.'
    case 'bio_required':          return 'Bio wajib.'
    case 'whatsapp_required':     return 'WhatsApp wajib + valid.'
    case 'invalid_years':         return 'Tahun pengalaman 0-60.'
    case 'at_least_one_price':    return 'Isi minimal hour rate atau day rate.'
    case 'slug_collision':        return 'Nama sudah dipakai — coba variasi.'
    case 'already_registered':    return 'Sudah ada profil cleaner.'
    default:                      return 'Gagal mendaftar. Coba lagi.'
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
