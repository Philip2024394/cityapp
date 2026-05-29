'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/supabase/client'

// Partner signup page. Behaviour depends on auth state:
//   • NOT signed in → show "Sign In or Create Account" gate (user must
//     have a Supabase auth account before claiming a partner row, so the
//     partner_program dashboard can identify them via auth.uid()).
//   • SIGNED IN + no partner row → show the partner registration form.
//   • SIGNED IN + already a partner → redirect to /dashboard/partner.
//
// Language: mirrors the streetlocal landing-page toggle by reading
// `sl_locale` from localStorage (set by PremiumHome's EN/ID picker).
// Falls back to ID since the original copy was Bahasa-first.

const PARTNER_TYPES = [
  { value: 'hotel',          label: { id: 'Hotel',                          en: 'Hotel' } },
  { value: 'villa',          label: { id: 'Villa',                          en: 'Villa' } },
  { value: 'restaurant',     label: { id: 'Restoran',                       en: 'Restaurant' } },
  { value: 'cafe',           label: { id: 'Kafe',                           en: 'Cafe' } },
  { value: 'spa',            label: { id: 'Spa',                            en: 'Spa' } },
  { value: 'tour_operator',  label: { id: 'Tour Operator',                  en: 'Tour Operator' } },
  { value: 'private_seller', label: { id: 'Perorangan / Penjual pribadi',   en: 'Individual / Private seller' } },
  { value: 'other',          label: { id: 'Lainnya',                        en: 'Other' } },
] as const

type Locale = 'id' | 'en'

const STRINGS = {
  id: {
    eyebrow: 'Program Mitra',
    gateTitle: 'Bergabung sebagai mitra',
    gateLede: 'Daftar atau masuk dulu untuk membuka dashboard mitra Anda. Hotel, villa, restoran, kafe, atau perorangan — gratis tanpa kontrak.',
    createAccount: 'Buat akun baru',
    or: 'atau',
    signIn: 'Masuk dengan akun yang ada',
    gateFootnote: 'Sudah punya akun rider atau pelanggan? Gunakan login yang sama — profil mitra Anda akan dikaitkan dengan akun yang sudah ada.',
    openingDashboard: 'Membuka dashboard mitra…',
    back: '← Kembali',
    formTitle: 'Daftarkan mitra Anda',
    formLede: 'Lengkapi data berikut. Setelah ini Anda akan masuk ke dashboard mitra dengan QR code dan link Anda.',
    fieldName: 'Nama mitra *',
    fieldNamePlaceholder: 'Hotel, villa, restoran, atau nama pribadi Anda',
    fieldType: 'Jenis mitra',
    fieldEmail: 'Email *',
    fieldEmailPlaceholder: 'kontak@email.com',
    fieldWhatsapp: 'WhatsApp',
    fieldWhatsappPlaceholder: '+62 812 3456 7890',
    fieldCity: 'Kota',
    fieldCityPlaceholder: 'Denpasar',
    fieldAddress: 'Alamat',
    fieldAddressPlaceholder: 'Alamat lengkap (opsional)',
    submitting: 'Mendaftarkan…',
    submit: 'Daftarkan mitra',
    smallprint: 'Dengan mendaftar, Anda menyetujui komisi 8% per booking dan settlement mingguan langsung dari driver. IndoCity tidak menahan dana.',
    successTitle: 'Mitra terdaftar!',
    successSub: 'Membuka dashboard mitra Anda…',
    slugLabel: 'Slug:',
    errors: {
      name_required: 'Nama mitra wajib diisi.',
      valid_email_required: 'Email tidak valid.',
      slug_collision: 'Nama ini sudah dipakai mitra lain. Coba beda sedikit.',
      service_role_not_configured: 'Server belum siap. Coba lagi nanti.',
      insert_failed: 'Database menolak pendaftaran. Hubungi admin.',
      default: 'Gagal mendaftar. Coba lagi.',
      network: 'Tidak bisa terhubung. Coba lagi.',
    },
  },
  en: {
    eyebrow: 'Partner Program',
    gateTitle: 'Join as a partner',
    gateLede: 'Sign up or log in first to open your partner dashboard. Hotels, villas, restaurants, cafés, or individuals — free, no contract.',
    createAccount: 'Create a new account',
    or: 'or',
    signIn: 'Sign in with existing account',
    gateFootnote: 'Already have a rider or customer account? Use the same login — your partner profile will be linked to your existing account.',
    openingDashboard: 'Opening your partner dashboard…',
    back: '← Back',
    formTitle: 'Register your partner profile',
    formLede: 'Fill in the details below. After this you go straight to your partner dashboard with your QR code and link.',
    fieldName: 'Partner name *',
    fieldNamePlaceholder: 'Hotel, villa, restaurant, or your own name',
    fieldType: 'Partner type',
    fieldEmail: 'Email *',
    fieldEmailPlaceholder: 'contact@email.com',
    fieldWhatsapp: 'WhatsApp',
    fieldWhatsappPlaceholder: '+62 812 3456 7890',
    fieldCity: 'City',
    fieldCityPlaceholder: 'Denpasar',
    fieldAddress: 'Address',
    fieldAddressPlaceholder: 'Full address (optional)',
    submitting: 'Registering…',
    submit: 'Register partner',
    smallprint: 'By registering you agree to an 8% commission per booking, settled weekly by the driver directly to you. IndoCity never holds funds.',
    successTitle: 'Partner registered!',
    successSub: 'Opening your partner dashboard…',
    slugLabel: 'Slug:',
    errors: {
      name_required: 'Partner name is required.',
      valid_email_required: 'Email is invalid.',
      slug_collision: 'That name is taken — try a slight variation.',
      service_role_not_configured: 'Server is not ready. Try again later.',
      insert_failed: 'Database refused the registration. Please contact admin.',
      default: 'Registration failed. Please try again.',
      network: "Couldn't connect. Please try again.",
    },
  },
} as const

function useLocale(): [Locale, (next: Locale) => void] {
  const [locale, setLocale] = useState<Locale>('id')
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('sl_locale')
      if (stored === 'en' || stored === 'id') setLocale(stored)
    } catch { /* ignore */ }
  }, [])
  function pick(next: Locale) {
    setLocale(next)
    try { window.localStorage.setItem('sl_locale', next) } catch { /* ignore */ }
  }
  return [locale, pick]
}

type FormState = {
  name: string
  partner_type: string
  contact_email: string
  contact_phone: string
  contact_whatsapp: string
  address: string
  city: string
}

type AuthState =
  | { status: 'loading' }
  | { status: 'anon' }
  | { status: 'signedIn'; userEmail: string | null }
  | { status: 'alreadyPartner' }

export default function PartnerSignupPage() {
  const router = useRouter()
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' })
  const [locale, setLocale] = useLocale()
  const t = STRINGS[locale]

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) {
      setAuth({ status: 'anon' })
      return
    }
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data?.session?.user
      if (!user) {
        setAuth({ status: 'anon' })
        return
      }
      try {
        const r = await fetch('/api/partners/me/bookings', { cache: 'no-store' })
        if (r.ok) {
          const j = await r.json() as { partners?: unknown[] }
          if (Array.isArray(j.partners) && j.partners.length > 0) {
            setAuth({ status: 'alreadyPartner' })
            setTimeout(() => router.replace('/dashboard/partner'), 400)
            return
          }
        }
      } catch { /* fall through to form */ }
      setAuth({ status: 'signedIn', userEmail: user.email ?? null })
    })
  }, [router])

  if (auth.status === 'loading') return <Shell><Loading /></Shell>
  if (auth.status === 'alreadyPartner') return <Shell><AlreadyPartner t={t} /></Shell>
  if (auth.status === 'anon') return <Shell><AuthGate t={t} locale={locale} setLocale={setLocale} /></Shell>
  return (
    <Shell>
      <RegistrationForm
        initialEmail={auth.userEmail ?? ''}
        t={t}
        locale={locale}
        setLocale={setLocale}
      />
    </Shell>
  )
}

// Shared shell.
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] text-ink overflow-hidden">
      {children}
    </main>
  )
}

function LocaleToggle({ locale, setLocale }: { locale: Locale; setLocale: (l: Locale) => void }) {
  return (
    <div className="inline-flex rounded-full border border-ink/20 bg-black/40 backdrop-blur p-0.5 text-[11px] font-extrabold tracking-wider">
      {(['id','en'] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={`min-w-[44px] min-h-[32px] px-3 rounded-full transition ${
            locale === code ? 'bg-brand text-bg' : 'text-ink/60 hover:text-ink'
          }`}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Anonymous gate
// ─────────────────────────────────────────────────────────────────────
// Use the UNION of both locales so STRINGS[locale] (id | en) is
// assignable to T. Previously this was narrowed to STRINGS['id']
// which made it impossible to pass the English variant — produced
// 3 long-standing typecheck errors at the page's variant dispatch.
type T = typeof STRINGS[Locale]

function AuthGate({ t, locale, setLocale }: { t: T; locale: Locale; setLocale: (l: Locale) => void }) {
  return (
    <div className="flex items-center justify-center min-h-[100dvh] p-6">
      <div className="max-w-md w-full">
        <div className="flex justify-end mb-4"><LocaleToggle locale={locale} setLocale={setLocale} /></div>
        <div className="text-center mb-8">
          <div className="inline-block bg-brand text-bg text-[11px] font-extrabold uppercase tracking-[0.15em] px-3 py-1 rounded-full mb-4">
            {t.eyebrow}
          </div>
          <h1 className="text-[26px] font-black leading-tight mb-3">{t.gateTitle}</h1>
          <p className="text-[13px] text-ink/70 leading-relaxed">{t.gateLede}</p>
        </div>

        <div className="space-y-3">
          <Link
            href="/signup?intent=partner&next=/partners/signup"
            className="block w-full rounded-2xl bg-brand text-bg px-6 py-4 text-center text-[14px] font-extrabold uppercase tracking-wider hover:brightness-105"
          >
            {t.createAccount}
          </Link>

          <div className="flex items-center gap-3 text-[11px] text-ink/40 my-3">
            <span className="flex-1 h-px bg-ink/15" />
            <span>{t.or}</span>
            <span className="flex-1 h-px bg-ink/15" />
          </div>

          <Link
            href="/login?next=/partners/signup"
            className="block w-full rounded-2xl bg-white/[0.06] border border-ink/15 text-ink px-6 py-4 text-center text-[14px] font-extrabold uppercase tracking-wider hover:bg-white/10"
          >
            {t.signIn}
          </Link>
        </div>

        <p className="text-[12px] text-ink/50 text-center mt-6">{t.gateFootnote}</p>
      </div>
    </div>
  )
}

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[100dvh]">
      <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function AlreadyPartner({ t }: { t: T }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] p-6 text-center">
      <div className="w-14 h-14 rounded-full bg-brand flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-bg" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-[18px] font-extrabold">{t.openingDashboard}</h1>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Registration form
// ─────────────────────────────────────────────────────────────────────
function RegistrationForm({
  initialEmail, t, locale, setLocale,
}: {
  initialEmail: string; t: T; locale: Locale; setLocale: (l: Locale) => void
}) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>({
    name: '', partner_type: 'hotel',
    contact_email: initialEmail, contact_phone: '', contact_whatsapp: '',
    address: '', city: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ slug: string; status: string } | null>(null)

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
    setError(null)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true); setError(null)
    try {
      const r = await fetch('/api/partners/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const j = await r.json() as { ok?: boolean; partner?: { slug: string; status: string }; error?: string }
      if (!r.ok || !j.ok || !j.partner) {
        setError(humaniseError(j.error, t))
        return
      }
      setDone(j.partner)
      setTimeout(() => router.push('/dashboard/partner'), 1200)
    } catch {
      setError(t.errors.network)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-brand flex items-center justify-center mb-5">
            <svg className="w-8 h-8 text-bg" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-[22px] font-black mb-2">{t.successTitle}</h1>
          <p className="text-[13px] text-ink/70 mb-4">{t.successSub}</p>
          <p className="text-[11px] text-ink/40">{t.slugLabel} <code className="font-mono">{done.slug}</code></p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-5 pt-10 pb-20">
      <div className="flex items-center justify-between mb-4">
        <Link href="/" className="text-[12px] text-ink/70 hover:text-ink inline-block">{t.back}</Link>
        <LocaleToggle locale={locale} setLocale={setLocale} />
      </div>
      <h1 className="text-[26px] font-black leading-tight mb-2">{t.formTitle}</h1>
      <p className="text-[13px] text-ink/70 mb-6">{t.formLede}</p>

      <form onSubmit={submit} className="space-y-4">
        <Field label={t.fieldName} required>
          <input
            type="text" required maxLength={120}
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder={t.fieldNamePlaceholder}
            className={inputCls}
          />
        </Field>

        <Field label={t.fieldType}>
          <select
            value={form.partner_type}
            onChange={(e) => update('partner_type', e.target.value)}
            className={inputCls}
          >
            {PARTNER_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label[locale]}</option>
            ))}
          </select>
        </Field>

        <Field label={t.fieldEmail} required>
          <input
            type="email" required maxLength={120}
            value={form.contact_email}
            onChange={(e) => update('contact_email', e.target.value)}
            placeholder={t.fieldEmailPlaceholder}
            className={inputCls}
          />
        </Field>

        <Field label={t.fieldWhatsapp}>
          <input
            type="tel" maxLength={20}
            value={form.contact_whatsapp}
            onChange={(e) => update('contact_whatsapp', e.target.value)}
            placeholder={t.fieldWhatsappPlaceholder}
            className={inputCls}
          />
        </Field>

        <Field label={t.fieldCity}>
          <input
            type="text" maxLength={80}
            value={form.city}
            onChange={(e) => update('city', e.target.value)}
            placeholder={t.fieldCityPlaceholder}
            className={inputCls}
          />
        </Field>

        <Field label={t.fieldAddress}>
          <textarea
            maxLength={400} rows={2}
            value={form.address}
            onChange={(e) => update('address', e.target.value)}
            placeholder={t.fieldAddressPlaceholder}
            className={inputCls + ' resize-none'}
          />
        </Field>

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-[13px] px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-brand text-bg px-6 py-3.5 text-[14px] font-extrabold uppercase tracking-wider disabled:opacity-60"
        >
          {submitting ? t.submitting : t.submit}
        </button>

        <p className="text-[12px] text-ink/60 text-center pt-2">{t.smallprint}</p>
      </form>
    </div>
  )
}

const inputCls =
  'w-full rounded-xl bg-black/50 border border-ink/25 px-4 py-3 text-[14px] text-ink placeholder:text-ink/40 focus:outline-none focus:border-brand backdrop-blur'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[13px] font-bold text-ink/80 mb-1.5 inline-block">
        {label}{required && <span className="text-brand"> *</span>}
      </span>
      {children}
    </label>
  )
}

function humaniseError(code: string | undefined, t: T): string {
  if (code && code in t.errors) return (t.errors as Record<string, string>)[code]
  return t.errors.default
}
