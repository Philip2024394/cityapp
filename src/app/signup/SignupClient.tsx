'use client'
// ============================================================================
// SignupClient — client island for /signup. The server wrapper at
// /signup/page.tsx reads the host header and passes `defaultBrand` so
// bare `/signup` (no ?vertical=) on kita2u.com renders the Kita2u form
// without flashing the CityDrivers role-picker.
// ----------------------------------------------------------------------------
// 2-step account creation (phone + password, 2026-06 simplified)
// ----------------------------------------------------------------------------
// Founder decision 2026-06: drivers complained that Indonesian SMS OTP
// flows drop constantly. Replaced phone-OTP signup with phone + password.
// Trade-off + mitigation analysis kept in
// feedback_cityriders_no_dispatch_ever and the signup squatting brief.
//
// Steps:
//   1. role     — Customer / Driver pick (skipped when ?role= URL param)
//   2. register — Full name + WhatsApp + password + Terms/age-18 consent
//
// Submit calls supabase.auth.signUp({ phone, password, options.data }) so
// Supabase creates the auth.users row + applies our metadata in one round
// trip. We DO NOT use signInWithOtp — that path is reserved for the
// admin-driven password-reset flow that will land later.
//
// Prerequisite (Supabase config, NOT code):
//   Supabase Dashboard → Authentication → Providers → Phone →
//   "Confirm phone number" = OFF
// With that toggle ON, signUp() returns 'phone not confirmed' and the
// driver cannot sign in until SMS OTP succeeds — which is the exact
// failure mode we're removing.
//
// Post-signup routing preserved 1:1 from the OTP-era flow:
//   • ?next= URL param wins (used by /partners/signup gate)
//   • ?intent=partner → /partners/signup
//   • ?vertical=… → /dashboard/<mapped-route>
//   • Drivers → /onboarding (subscription + bike profile)
//   • Customers → /cari (discovery)
// ============================================================================
import Link from 'next/link'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Phone, User, KeyRound, Eye, EyeOff, Sparkles, ArrowRight, ArrowLeft,
  Briefcase, MapPin,
} from 'lucide-react'
import AuthShell from '@/components/auth/AuthShell'
import PhoneInput, { normalizeE164 } from '@/components/auth/PhoneInput'
import { MONTHLY_PRICE_LABEL, YEARLY_PRICE_LABEL, TRIAL_LABEL_EN } from '@/lib/pricing/constants'

type Role = 'customer' | 'driver'
type Step = 'role' | 'register'

// Driver-side verticals — these belong to CityDrivers, NOT Kita2u. When
// `?vertical=` matches one of these we render the legacy CityDrivers
// role-picker (driver/customer) signup. Anything else is treated as a
// Kita2u creator flow and the role picker is skipped entirely (Kita2u
// has NO driver concept — it's a template marketplace for creators
// selling their own apps).
const DRIVER_VERTICALS = new Set(['rider', 'car', 'truck', 'bus', 'jeep', 'driver'])
function isKita2uVertical(v: string): boolean {
  return !!v && !DRIVER_VERTICALS.has(v)
}

// Maps the canonical vertical id passed via ?vertical= to the actual
// /dashboard route. Driver verticals split off into rider/car/truck
// dashboards; everything else lands on /dashboard/<vertical>.
function dashboardPathFor(vertical: string): string {
  switch (vertical) {
    case 'bike-driver':  return '/dashboard/rider'
    case 'car-driver':   return '/dashboard/car'
    case 'truck-driver': return '/dashboard/truck'
    default:             return `/dashboard/${vertical}`
  }
}

export default function SignupClient({
  defaultBrand,
}: {
  defaultBrand: 'kita2u' | 'citydrivers'
}) {
  // useSearchParams() requires a Suspense boundary in Next 15 so SSR can
  // stream the URL-aware shell. Without this wrapper the Kita2u flow
  // briefly flashes the CityDrivers driver-picker before client JS reads
  // the vertical and corrects the step.
  return (
    <Suspense fallback={null}>
      <SignupInner defaultBrand={defaultBrand} />
    </Suspense>
  )
}

function SignupInner({ defaultBrand }: { defaultBrand: 'kita2u' | 'citydrivers' }) {
  const router = useRouter()
  const sp = useSearchParams()

  // URL params parsed synchronously so SSR and the first client render
  // both see the same Kita2u-or-CityDrivers branching. No useEffect, no
  // FOUC. claimedHandle / claimedVertical are derived constants rather
  // than state — they only ever come from the URL anyway.
  const urlVertical  = (sp?.get('vertical') || '').trim().toLowerCase()
  const urlHandle    = (sp?.get('handle')   || '').trim().toLowerCase()
  const urlRoleParam = sp?.get('role') || ''
  // Kita2u flow when:
  //   • ?vertical= names a Kita2u (non-driver) vertical, OR
  //   • no ?vertical= AND host defaults to Kita2u (server-resolved)
  // Driver verticals always force CityDrivers regardless of host.
  const isKita2uFlow =
    isKita2uVertical(urlVertical) ||
    (!urlVertical && !urlHandle && urlRoleParam !== 'driver' && urlRoleParam !== 'customer' && defaultBrand === 'kita2u')
  const claimedVertical = urlVertical || null
  const claimedHandle   = urlHandle   || null

  // Step initial: Kita2u → straight to register (no role picker, ever).
  // CityDrivers → role picker unless URL forces otherwise.
  const [step, setStep] = useState<Step>(() => {
    if (isKita2uFlow) return 'register'
    if (urlRoleParam === 'driver' || urlRoleParam === 'customer') return 'register'
    if (urlHandle) return 'register'
    return 'role'
  })
  // Role initial: Kita2u creators are stored as profile.role='customer'
  // (the profiles table check constraint only allows customer/driver/admin
  // — adding 'creator' would need a migration; deferred). The vertical
  // metadata distinguishes them from actual ride-booking customers.
  const [role, setRole] = useState<Role>(() => {
    if (isKita2uFlow) return 'customer'
    if (urlRoleParam === 'driver')   return 'driver'
    if (urlRoleParam === 'customer') return 'customer'
    return 'driver'
  })
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [agree, setAgree] = useState(false)
  const [age18, setAge18] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function continueFromRole(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setStep('register')
  }

  async function submitRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!fullName.trim()) {
      setError('Please enter your full name')
      return
    }
    const cleaned = normalizeE164(phone)
    if (!cleaned) {
      setError('Please enter a valid mobile number with country code')
      return
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (role === 'driver' && !agree) {
      setError('You must confirm you are an independent rider business to continue')
      return
    }
    if (!age18) {
      setError('You must confirm you are 18 years or older to use Kita2u')
      return
    }

    setPending(true)
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: cleaned,
        password,
        metadata: {
          full_name: fullName.trim(),
          role,
          claimed_handle: claimedHandle ?? undefined,
          claimed_vertical: claimedVertical ?? undefined,
        },
      }),
    })
    const data = await res.json().catch(() => ({}))
    setPending(false)

    if (!res.ok) {
      setError(humanError(typeof data?.error === 'string' ? data.error : 'Could not create account'))
      return
    }

    // Post-signup routing matches the legacy OTP flow exactly:
    //   • ?next= URL param wins
    //   • ?intent=partner → /partners/signup
    //   • ?vertical=… → /dashboard/<mapped-route>
    //   • Drivers → /onboarding
    //   • Customers → /cari
    let dest: string
    try {
      const params = new URLSearchParams(window.location.search)
      const next = (params.get('next') || '').trim()
      const intent = (params.get('intent') || '').trim()
      const vertical = (params.get('vertical') || '').trim().toLowerCase()
      if (next && next.startsWith('/')) dest = next
      else if (intent === 'partner')    dest = '/partners/signup'
      else if (vertical)                dest = dashboardPathFor(vertical)
      else                              dest = role === 'driver' ? '/onboarding' : '/cari'
    } catch {
      dest = role === 'driver' ? '/onboarding' : '/cari'
    }
    router.push(dest)
    router.refresh()
  }

  // (isKita2uFlow is declared once at the top of the component now —
  // both the URL parser block and the JSX read it from there.)

  // Hero per step — yellow icon chip + title + subtitle.
  const heroIcon =
    step === 'role' ? <User className="w-6 h-6" /> :
                      <Phone className="w-6 h-6" />
  const heroTitle =
    step === 'role'
      ? 'Create your account'
      : (isKita2uFlow
          ? 'Buat akun kamu'
          : (role === 'driver' ? 'Set up your account' : 'Tell us about you'))
  const heroSub =
    step === 'role'
      ? 'Pick what you want to do on CityDrivers.'
      : (isKita2uFlow
          ? 'Pakai nomor WhatsApp dan password. Tanpa kode SMS.'
          : 'Use your WhatsApp number and a password. No SMS code needed.')

  return (
    <AuthShell
      solidWhite
      hideHeader
      brand={isKita2uFlow ? 'kita2u' : 'citydrivers'}
    >
      {/* Brand block — host/vertical-aware. Kita2u marketplace verticals
          (beautician, handyman, food, etc.) get the Kita2u wordmark and
          a back-link to the marketplace home. Driver verticals keep the
          existing CityDrivers logo and /cityriders deep-link. */}
      {isKita2uFlow ? (
        <Link
          href="/explore"
          className="flex items-center justify-center mb-4 active:scale-[0.97] transition"
          aria-label="Kita2u home"
        >
          <span
            className="font-black tracking-tight leading-none text-[26px]"
            style={{ color: '#0A0A0A', letterSpacing: '-0.02em' }}
          >
            Kita
          </span>
          <span
            className="font-black tracking-tight leading-none text-[26px]"
            style={{ color: '#FACC15', letterSpacing: '-0.02em' }}
          >
            2u
          </span>
        </Link>
      ) : (
        <Link
          href="/cityriders"
          className="flex items-center justify-center gap-2 mb-4 active:scale-[0.97] transition"
          aria-label="CityDrivers home"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://ik.imagekit.io/nepgaxllc/Untitledasdasdaasssdasdasd-removebg-preview.png?updatedAt=1780193517351"
            alt=""
            className="h-11 w-auto rounded-xl object-contain"
          />
          <span
            className="font-black text-[20px] tracking-tight leading-none"
            style={{ color: '#0A0A0A' }}
          >
            CityDrivers
          </span>
        </Link>
      )}
      {/* StepDots only on the 2-step CityDrivers flow. Kita2u creators
          have a single-step register form so the stepper would be a lie. */}
      {!isKita2uFlow && <StepDots active={step} />}

      {/* Hero */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm text-[#0A0A0A]"
          style={{ background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)' }}
        >
          {heroIcon}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-black leading-tight text-[#0A0A0A]">{heroTitle}</h1>
          <p className="text-[13px] text-[#71717A] leading-snug mt-1">{heroSub}</p>
        </div>
      </div>

      {claimedHandle && (
        <div
          className="mb-5 rounded-2xl p-3.5"
          style={{ background: '#FFFBEA', border: '1px solid rgba(250,204,21,0.55)' }}
        >
          <div className="text-[11px] uppercase tracking-wider font-bold text-[#71717A] mb-0.5">
            You&apos;re claiming
          </div>
          <div className="text-[14px] font-extrabold text-[#0A0A0A] tabular-nums break-all">
            kita2u.com/{claimedHandle}
          </div>
        </div>
      )}

      {step === 'role' && (
        <>
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 mb-4 text-[12px] font-bold text-[#0A0A0A]"
            style={{ background: '#FFFBEA', border: '1px solid rgba(250,204,21,0.55)' }}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#EAB308]" /> {TRIAL_LABEL_EN} · No card needed
          </div>

          <form className="space-y-3" onSubmit={continueFromRole}>
            <RoleOption
              selected={role === 'driver'}
              onClick={() => setRole('driver')}
              icon={<Briefcase className="w-5 h-5" />}
              title="Become an independent rider"
              sub={`Run your own booking business. ${MONTHLY_PRICE_LABEL}/month or ${YEARLY_PRICE_LABEL}/year.`}
            />
            <RoleOption
              selected={role === 'customer'}
              onClick={() => setRole('customer')}
              icon={<MapPin className="w-5 h-5" />}
              title="Book rides & deliveries"
              sub="Find an independent rider near you."
            />

            <button type="submit" className={primaryBtnCls + ' mt-2'}>
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {role === 'driver' && (
            <div
              className="mt-4 rounded-2xl p-4"
              style={{ background: '#FFFBEA', border: '1px solid rgba(250,204,21,0.45)' }}
            >
              <div className="text-[11px] uppercase tracking-wider font-bold text-[#71717A] mb-1">
                After trial
              </div>
              <div className="text-[13px] text-[#0A0A0A] leading-snug">
                <span className="font-extrabold">Rp 38.000/month</span> or{' '}
                <span className="font-extrabold">Rp 350.000/year</span> — paid directly to Kita2u. Cancel anytime.
              </div>
            </div>
          )}
        </>
      )}

      {step === 'register' && (
        <form className="space-y-4" onSubmit={submitRegister}>
          <div
            className="rounded-2xl p-3.5 flex items-start gap-2.5"
            style={{ background: '#FFFBEA', border: '1px solid rgba(250,204,21,0.55)' }}
          >
            <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-[#EAB308]" />
            <div className="text-[12px] leading-snug text-[#0A0A0A]">
              {isKita2uFlow ? (
                <>
                  <strong>Satu nomor WhatsApp, banyak app.</strong>{' '}
                  Mau buka usaha kedua? Pakai nomor yang sama dengan{' '}
                  <strong>password berbeda</strong> — tiap password = app terpisah.
                </>
              ) : (
                <>
                  <strong>One number, many apps.</strong>{' '}
                  Adding another business? Re-use this WhatsApp number with a{' '}
                  <strong>different password</strong> — each password is a separate account.
                </>
              )}
            </div>
          </div>
          <Field label="Full name" icon={<User className="w-4 h-4 text-[#71717A]" />}>
            <input
              className={inputCls + ' pl-11'}
              placeholder="Wayan Kurniawan"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
          </Field>
          <Field
            label="WhatsApp number"
            hint="Pick your country, then type your mobile number."
          >
            <PhoneInput
              value={phone}
              onChange={setPhone}
              countryAriaLabel="Pick your country code"
            />
          </Field>
          <Field
            label="Password"
            icon={<KeyRound className="w-4 h-4 text-[#71717A]" />}
            hint={
              isKita2uFlow
                ? "Minimal 6 karakter. Catat ya — kami tidak kirim kode. Sudah punya akun di nomor ini? Pakai password berbeda untuk buka app baru."
                : "At least 6 characters. Write it down — we don't send codes. Already have an account on this number? Use a different password to open a new app."
            }
          >
            <input
              className={inputCls + ' pl-11 pr-11'}
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off" data-lpignore="true" data-1p-ignore data-form-type="other"
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 inline-flex items-center justify-center text-[#71717A] hover:text-[#0A0A0A]"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </Field>

          {role === 'driver' && (
            <label className="flex items-start gap-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="signup-check"
              />
              <span className="text-[13px] text-[#52525B] leading-relaxed">
                I confirm I am an{' '}
                <strong className="text-[#0A0A0A]">independent rider business</strong>, not an
                employee or contractor of Kita2u. I am responsible for my own licences (SIM C,
                STNK), vehicle, insurance, taxes, and conduct. I agree to the{' '}
                <Link href="/terms" target="_blank" className="text-[#EAB308] font-bold hover:underline">Terms</Link>
                {' '}and{' '}
                <Link href="/privacy" target="_blank" className="text-[#EAB308] font-bold hover:underline">Privacy Policy</Link>.
              </span>
            </label>
          )}

          {/* 18+ age confirmation — required for BOTH roles. Play Store
              policy requires explicit age gating for apps that create
              accounts AND for apps related to motor-vehicle operation.
              Customers must be 18 to enter transport service contracts
              under KUH Perdata. */}
          <label className="flex items-start gap-2.5 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={age18}
              onChange={(e) => setAge18(e.target.checked)}
              className="signup-check"
            />
            <span className="text-[13px] text-[#52525B] leading-relaxed">
              I confirm I am <strong className="text-[#0A0A0A]">18 years of age or older</strong>.
              {role === 'driver' && (
                <> Riders must hold a valid <strong className="text-[#0A0A0A]">SIM C</strong> motorcycle licence.</>
              )}
            </span>
          </label>

          {error && <p className="text-[13px] text-red-600 font-semibold">{error}</p>}

          <button type="submit" className={primaryBtnCls + ' mt-2'} disabled={pending}>
            {pending ? 'Creating account…' : 'Create account'}
            <ArrowRight className="w-4 h-4" />
          </button>
          {/* Back returns to the role picker — only meaningful on the
              CityDrivers 2-step flow. Kita2u creators arrive here
              directly from /<vertical> with no prior step to return to. */}
          {!isKita2uFlow && (
            <button
              type="button"
              onClick={() => setStep('role')}
              className="w-full min-h-[44px] text-[13px] text-[#71717A] hover:text-[#0A0A0A] inline-flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          )}
        </form>
      )}

      <div
        className="text-center text-[13px] text-[#71717A] mt-5 pt-4"
        style={{ borderTop: '1px solid #E4E4E7' }}
      >
        Already have an account?{' '}
        <Link href="/login" className="text-[#EAB308] font-bold hover:underline">Sign in</Link>
      </div>
    </AuthShell>
  )
}

// ----------------------------------------------------------------------------
// StepDots — 2-dot stepper now (role → register). Active dot is yellow and
// slightly wider for "you-are-here" emphasis; inactive dots stay neutral.
// ----------------------------------------------------------------------------
function StepDots({ active }: { active: Step }) {
  const steps: Array<{ id: Step; label: string }> = [
    { id: 'role',     label: 'Role' },
    { id: 'register', label: 'Account' },
  ]
  return (
    <div className="flex items-center justify-center gap-2 mb-5" aria-label="Sign-up progress">
      {steps.map((s) => {
        const isActive = s.id === active
        return (
          <span
            key={s.id}
            className="rounded-full transition-all"
            style={{
              width: isActive ? 28 : 8,
              height: 8,
              background: isActive ? '#FACC15' : '#E4E4E7',
            }}
            aria-label={s.label}
            aria-current={isActive ? 'step' : undefined}
          />
        )
      })}
    </div>
  )
}

// ----------------------------------------------------------------------------
// RoleOption — selectable big-tap-target card. Yellow border + tint when
// active; otherwise a plain white card with neutral border. Mirrors the
// /dashboard/rider/info selection card aesthetic so the design language
// stays consistent end-to-end.
// ----------------------------------------------------------------------------
function RoleOption({
  selected, onClick, icon, title, sub,
}: {
  selected: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  sub: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-3.5 rounded-2xl border transition flex items-start gap-3 active:scale-[0.99]"
      style={{
        background: selected ? '#FFFBEA' : '#FFFFFF',
        borderColor: selected ? '#FACC15' : '#E4E4E7',
        boxShadow: selected ? '0 6px 16px rgba(250,204,21,0.18)' : 'none',
      }}
    >
      <div
        className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
        style={{
          background: selected ? '#FACC15' : '#F5F5F4',
          color: selected ? '#0A0A0A' : '#71717A',
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-[15px] text-[#0A0A0A]">{title}</div>
        <div className="text-[13px] text-[#71717A] mt-0.5 leading-snug">{sub}</div>
      </div>
    </button>
  )
}

// ----------------------------------------------------------------------------
// Field — input wrapper with icon slot + hint. Light-theme match for the
// pattern used in /dashboard/rider/info.
// ----------------------------------------------------------------------------
function Field({
  label, icon, hint, children,
}: {
  label: string
  icon?: React.ReactNode
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[13px] font-bold text-[#0A0A0A] mb-1.5">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-4 top-1/2 -translate-y-1/2">{icon}</span>}
        {children}
      </div>
      {hint && <p className="text-[12px] text-[#71717A] mt-1.5 leading-snug">{hint}</p>}
    </div>
  )
}

// ----------------------------------------------------------------------------
// Shared input / button styles — kept in sync with /login + the dashboard
// pages so the design language matches end-to-end.
// ----------------------------------------------------------------------------
const inputCls =
  'w-full rounded-xl bg-white border border-[#E4E4E7] px-4 py-3 text-[14px] text-[#0A0A0A] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#FACC15] focus:ring-2 focus:ring-[#FACC15]/30 min-h-[44px]'

const primaryBtnCls =
  'w-full min-h-[48px] rounded-2xl bg-[#FACC15] text-[#0A0A0A] text-[14px] font-extrabold inline-flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(250,204,21,0.35)] hover:bg-[#EAB308] active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed'

// Server-side /api/auth/signup returns user-actionable copy already
// (including the same-phone+same-password collision). We only need to
// soften Supabase's rate-limit phrasing if it leaks through.
function humanError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('rate limit') || m.includes('too many requests')) {
    return 'Too many attempts. Wait a minute and try again.'
  }
  return msg
}
