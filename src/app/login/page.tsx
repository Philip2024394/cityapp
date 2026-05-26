'use client'
import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Phone, KeyRound, LogIn, ArrowLeft } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
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

  return (
    <>
      <AppNav />
      <main className="min-h-screen flex items-start justify-center pt-12 px-4 grid-bg">
        <div className="w-full max-w-md card-dark p-6 space-y-5 mt-4">
          <div>
            <img
              src="https://ik.imagekit.io/nepgaxllc/Untitleddasdasdasasd-removebg-preview.png?updatedAt=1779015947714"
              alt="IndoCity"
              className="h-12 w-auto mb-3"
              loading="eager"
            />
            <h1 className="text-2xl font-extrabold">
              {step === 'phone' ? 'Sign in' : 'Verify your phone'}
            </h1>
            <p className="text-muted text-[14px] mt-1">
              {step === 'phone'
                ? 'Welcome back. Use the phone number you signed up with.'
                : `We sent a 6-digit code to +${phone}`}
            </p>
          </div>

          {step === 'phone' && (
            <form className="space-y-3" onSubmit={sendOtp}>
              <div>
                <label className="label">WhatsApp number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-dim absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    className="input pl-11 font-mono"
                    type="tel"
                    inputMode="numeric"
                    placeholder="6281234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                  />
                </div>
                <p className="text-[12px] text-dim mt-1.5">Indonesian number, start with 62 (no +)</p>
              </div>
              {error && <p className="text-[13px] text-red-400">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={pending}>
                <LogIn className="w-4 h-4" />
                {pending ? 'Sending code…' : 'Send code'}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form className="space-y-3" onSubmit={verifyOtp}>
              <div>
                <label className="label">6-digit code</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-dim absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    className="input pl-11 font-mono tracking-[0.4em] text-center text-[18px]"
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
              {error && <p className="text-[13px] text-red-400">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={pending || otp.length !== 6}>
                <LogIn className="w-4 h-4" />
                {pending ? 'Verifying…' : 'Verify & sign in'}
              </button>
              <button
                type="button"
                onClick={resendOtp}
                disabled={resendSecondsLeft > 0 || resending}
                className="w-full text-[13px] text-brand font-bold inline-flex items-center justify-center gap-1.5 disabled:text-muted disabled:font-normal"
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
                className="w-full text-[13px] text-muted hover:text-brand inline-flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Use a different number
              </button>
            </form>
          )}

          <div className="text-center text-[13px] text-muted">
            New here?{' '}
            <Link href="/signup" className="text-brand font-bold">Create an account</Link>
          </div>
        </div>
      </main>
    </>
  )
}

// Normalize a user-typed phone number to E.164 without the leading +.
// Accepts: "081234...", "+6281234...", "6281234..." → returns "6281234..."
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('0')) return '62' + digits.slice(1)
  if (digits.startsWith('62')) return digits
  return null
}
