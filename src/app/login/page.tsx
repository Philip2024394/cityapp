'use client'
// ============================================================================
// /login — Phone + OTP sign-in (light-theme redesign, 2026-05)
// ----------------------------------------------------------------------------
// Wraps the form in <AuthShell> for the brand header + footer chrome.
// Inputs/buttons match the /dashboard/rider/info form pattern (white bg,
// gray #E4E4E7 borders, yellow #FACC15 focus ring + primary button).
//
// Behaviour preserved 1:1 from the dark-theme version:
//   • Phone normalisation to E.164-without-plus
//   • OTP send via supabase.auth.signInWithOtp
//   • 30s resend cooldown countdown
//   • Auto-advance verify once 6 digits typed (activation cut D)
//   • Redirect to ?next= param after successful verify
// ============================================================================
import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Phone, KeyRound, LogIn, ArrowLeft } from 'lucide-react'
import AuthShell from '@/components/auth/AuthShell'
import DevAccessPanel from '@/components/dev/DevAccessPanel'
import { getBrowserSupabase } from '@/lib/supabase/client'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  )
}

function LoginInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const next = sp.get('next') || '/dashboard'

  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (resendSecondsLeft <= 0) return
    const t = setTimeout(() => setResendSecondsLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearTimeout(t)
  }, [resendSecondsLeft])

  // Auto-advance once 6 digits typed (activation cut D — saves a tap)
  useEffect(() => {
    if (step !== 'otp') return
    if (otp.length !== 6 || pending) return
    void verifyOtp()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step])

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const cleaned = normalizePhone(phone)
    if (!cleaned) {
      setError('Please enter a valid Indonesian mobile number (e.g. 6281234567890)')
      return
    }
    const supabase = getBrowserSupabase()
    if (!supabase) {
      setError('Auth not configured. Add Supabase keys to .env.local.')
      return
    }
    setPending(true)
    const { error } = await supabase.auth.signInWithOtp({ phone: cleaned })
    setPending(false)
    if (error) {
      setError(error.message)
      return
    }
    setPhone(cleaned)
    setStep('otp')
    setResendSecondsLeft(30)
  }

  async function resendOtp() {
    if (resendSecondsLeft > 0 || resending) return
    setError(null)
    const supabase = getBrowserSupabase()
    if (!supabase) { setError('Auth not configured.'); return }
    setResending(true)
    const { error } = await supabase.auth.signInWithOtp({ phone })
    setResending(false)
    if (error) { setError(error.message); return }
    setResendSecondsLeft(30)
  }

  async function verifyOtp(e?: React.FormEvent) {
    e?.preventDefault()
    setError(null)
    const supabase = getBrowserSupabase()
    if (!supabase) {
      setError('Auth not configured.')
      return
    }
    setPending(true)
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: otp.trim(),
      type: 'sms',
    })
    setPending(false)
    if (error) {
      setError(error.message)
      return
    }
    router.push(next)
    router.refresh()
  }

  const heroIcon = step === 'phone' ? <LogIn className="w-6 h-6" /> : <KeyRound className="w-6 h-6" />
  const heroTitle = step === 'phone' ? 'Welcome back' : 'Verify your phone'
  const heroSub = step === 'phone'
    ? 'Sign in with the WhatsApp number you signed up with.'
    : `We sent a 6-digit code to +${phone}`

  return (
    <AuthShell>
      {/* Hero — yellow icon chip + title + subtitle. Mirrors the
          /dashboard/rider/info hero pattern. */}
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

      {step === 'phone' && (
        <form className="space-y-4" onSubmit={sendOtp}>
          <div>
            <label className="block text-[13px] font-bold text-[#0A0A0A] mb-1.5">
              WhatsApp number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#71717A] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                className={inputCls + ' pl-11 tabular-nums font-mono'}
                type="tel"
                inputMode="numeric"
                placeholder="6281234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>
            <p className="text-[12px] text-[#71717A] mt-1.5 leading-snug">
              Indonesian number, start with 62 (no +)
            </p>
          </div>
          {error && <p className="text-[13px] text-red-600 font-semibold">{error}</p>}
          <button type="submit" className={primaryBtnCls} disabled={pending}>
            <LogIn className="w-4 h-4" />
            {pending ? 'Sending code…' : 'Send code'}
          </button>
        </form>
      )}

      {step === 'otp' && (
        <form className="space-y-4" onSubmit={verifyOtp}>
          <div>
            <label className="block text-[13px] font-bold text-[#0A0A0A] mb-1.5">
              6-digit code
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-[#71717A] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                className={inputCls + ' pl-11 tabular-nums font-mono tracking-[0.4em] text-center text-[18px]'}
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                autoComplete="one-time-code"
                autoFocus
              />
            </div>
          </div>
          {error && <p className="text-[13px] text-red-600 font-semibold">{error}</p>}
          <button type="submit" className={primaryBtnCls} disabled={pending || otp.length !== 6}>
            <LogIn className="w-4 h-4" />
            {pending ? 'Verifying…' : 'Verify & sign in'}
          </button>
          <button
            type="button"
            onClick={resendOtp}
            disabled={resendSecondsLeft > 0 || resending}
            className="w-full min-h-[44px] text-[13px] font-bold text-[#EAB308] inline-flex items-center justify-center gap-1.5 disabled:text-[#A1A1AA] disabled:font-normal"
          >
            {resending
              ? 'Mengirim ulang…'
              : resendSecondsLeft > 0
                ? `Kirim ulang kode dalam ${resendSecondsLeft}s`
                : 'Kirim ulang kode'}
          </button>
          <button
            type="button"
            onClick={() => { setStep('phone'); setOtp(''); setError(null) }}
            className="w-full min-h-[44px] text-[13px] text-[#71717A] hover:text-[#0A0A0A] inline-flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Use a different number
          </button>
        </form>
      )}

      <div
        className="text-center text-[13px] text-[#71717A] mt-5 pt-4"
        style={{ borderTop: '1px solid #E4E4E7' }}
      >
        New here?{' '}
        <Link href="/signup" className="text-[#EAB308] font-bold hover:underline">
          Create an account
        </Link>
      </div>
      <DevAccessPanel />
    </AuthShell>
  )
}

// ----------------------------------------------------------------------------
// Shared input / button styles — kept in sync with /dashboard/rider/info
// so the auth flow visually matches the dashboards on entry.
// ----------------------------------------------------------------------------
const inputCls =
  'w-full rounded-xl bg-white border border-[#E4E4E7] px-4 py-3 text-[14px] text-[#0A0A0A] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#FACC15] focus:ring-2 focus:ring-[#FACC15]/30 min-h-[44px]'

const primaryBtnCls =
  'w-full min-h-[48px] rounded-2xl bg-[#FACC15] text-[#0A0A0A] text-[14px] font-extrabold inline-flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(250,204,21,0.35)] hover:bg-[#EAB308] active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed'

// Normalize a user-typed phone number to E.164 without the leading +.
// Accepts: "081234...", "+6281234...", "6281234..." → returns "6281234..."
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('0')) return '62' + digits.slice(1)
  if (digits.startsWith('62')) return digits
  return null
}
