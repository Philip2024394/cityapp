'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, User, KeyRound, Sparkles, ArrowRight, ArrowLeft, Briefcase, MapPin } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { MONTHLY_PRICE_LABEL, YEARLY_PRICE_LABEL, TRIAL_LABEL_EN } from '@/lib/pricing/constants'

type Role = 'customer' | 'driver'

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<'role' | 'phone' | 'otp'>('role')
  const [role, setRole] = useState<Role>('driver')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [agree, setAgree] = useState(false)
  const [age18, setAge18] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // OTP resend cooldown — Indonesian SMS routes drop OTPs constantly,
  // so we surface a clear countdown + Resend button (audit 2026-05).
  // Starts at 30s when the OTP is first sent and restarts after resend.
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0)
  const [resending, setResending] = useState(false)
  useEffect(() => {
    if (resendSecondsLeft <= 0) return
    const t = setTimeout(() => setResendSecondsLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearTimeout(t)
  }, [resendSecondsLeft])

  // Auto-advance once 6 digits typed — saves the "Verify & continue"
  // tap (activation audit cut D, ~3-5s + 1 tap saved). Guarded by
  // !pending so we don't fire twice.
  useEffect(() => {
    if (step !== 'otp') return
    if (otp.length !== 6 || pending) return
    void verifyOtp()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step])

  function continueFromRole(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setStep('phone')
  }

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!fullName.trim()) {
      setError('Please enter your full name')
      return
    }
    const cleaned = normalizePhone(phone)
    if (!cleaned) {
      setError('Please enter a valid Indonesian mobile number (e.g. 6281234567890)')
      return
    }
    if (role === 'driver' && !agree) {
      setError('You must confirm you are an independent rider business to continue')
      return
    }
    if (!age18) {
      setError('You must confirm you are 18 years or older to use City Rider')
      return
    }
    const supabase = getBrowserSupabase()
    if (!supabase) {
      setError('Auth not configured. Add Supabase keys to .env.local.')
      return
    }
    setPending(true)
    const { error } = await supabase.auth.signInWithOtp({
      phone: cleaned,
      options: {
        data: {
          full_name: fullName.trim(),
          role,
        },
        shouldCreateUser: true,
      },
    })
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
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: {
        data: { full_name: fullName.trim(), role },
        shouldCreateUser: true,
      },
    })
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
    // Post-verify routing:
    //   • ?next= URL param wins (used by /partners/signup gate to bring
    //     hotel/villa signups back into the partner form)
    //   • ?intent=partner → /partners/signup (canonical partner entry)
    //   • Drivers → onboarding (subscription + bike profile)
    //   • Customers → /cari (discovery)
    let dest: string
    try {
      const params = new URLSearchParams(window.location.search)
      const next = (params.get('next') || '').trim()
      const intent = (params.get('intent') || '').trim()
      if (next && next.startsWith('/')) dest = next
      else if (intent === 'partner')    dest = '/partners/signup'
      else                              dest = role === 'driver' ? '/onboarding' : '/cari'
    } catch {
      dest = role === 'driver' ? '/onboarding' : '/cari'
    }
    router.push(dest)
    router.refresh()
  }

  return (
    <>
      <AppNav />
      <main className="min-h-screen flex items-start justify-center pt-10 px-4 grid-bg">
        <div className="w-full max-w-md space-y-4 mt-2">
          <div className="card-dark p-6 space-y-5">
            {step === 'role' && (
              <>
                <div>
                  <div className="chip mb-3"><Sparkles className="w-3.5 h-3.5" /> {TRIAL_LABEL_EN} · No card needed</div>
                  <h1 className="text-2xl font-extrabold">Welcome to City Rider</h1>
                  <p className="text-muted text-[14px] mt-1">Pick what you want to do.</p>
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

                  <button type="submit" className="btn-primary w-full mt-2">
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </>
            )}

            {step === 'phone' && (
              <>
                <div>
                  <h1 className="text-2xl font-extrabold">
                    {role === 'driver' ? 'Set up your account' : 'Create your account'}
                  </h1>
                  <p className="text-muted text-[14px] mt-1">We will send a 6-digit code to verify your number.</p>
                </div>

                <form className="space-y-3" onSubmit={sendOtp}>
                  <Field label="Full name" icon={<User className="w-4 h-4 text-dim" />}>
                    <input
                      className="input pl-11"
                      placeholder="Wayan Kurniawan"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoComplete="name"
                    />
                  </Field>
                  <Field label="WhatsApp number" icon={<Phone className="w-4 h-4 text-dim" />} hint="Start with 62, e.g. 6281234567890">
                    <input
                      className="input pl-11 font-mono"
                      type="tel"
                      inputMode="numeric"
                      placeholder="6281234567890"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
                    />
                  </Field>

                  {role === 'driver' && (
                    <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={agree}
                        onChange={(e) => setAgree(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-[#FACC15] shrink-0 cursor-pointer"
                      />
                      <span className="text-[13px] text-muted leading-relaxed">
                        I confirm I am an <strong className="text-ink">independent rider business</strong>,
                        not an employee or contractor of City Rider. I am responsible for my own
                        licences (SIM C, STNK), vehicle, insurance, taxes, and conduct. I agree to the{' '}
                        <Link href="/terms" target="_blank" className="text-brand hover:underline">Terms</Link>{' '}
                        and{' '}
                        <Link href="/privacy" target="_blank" className="text-brand hover:underline">Privacy Policy</Link>.
                      </span>
                    </label>
                  )}

                  {/* 18+ age confirmation — required for BOTH roles. Play
                      Store policy requires explicit age gating for apps
                      that create accounts AND for apps related to motor-
                      vehicle operation. Customers must be 18 to enter
                      transport service contracts under KUH Perdata. */}
                  <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={age18}
                      onChange={(e) => setAge18(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-[#FACC15] shrink-0 cursor-pointer"
                    />
                    <span className="text-[13px] text-muted leading-relaxed">
                      I confirm I am <strong className="text-ink">18 years of age or older</strong>.
                      {role === 'driver' && (
                        <> Riders must hold a valid <strong className="text-ink">SIM C</strong> motorcycle licence.</>
                      )}
                    </span>
                  </label>

                  {error && <p className="text-[13px] text-red-400">{error}</p>}

                  <button type="submit" className="btn-primary w-full mt-2" disabled={pending}>
                    {pending ? 'Sending code…' : 'Send verification code'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('role')}
                    className="w-full text-[13px] text-muted hover:text-brand inline-flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                </form>
              </>
            )}

            {step === 'otp' && (
              <>
                <div>
                  <h1 className="text-2xl font-extrabold">Verify your phone</h1>
                  <p className="text-muted text-[14px] mt-1">
                    We sent a 6-digit code to +{phone}
                  </p>
                </div>

                <form className="space-y-3" onSubmit={verifyOtp}>
                  <Field label="6-digit code" icon={<KeyRound className="w-4 h-4 text-dim" />}>
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
                  </Field>
                  {error && <p className="text-[13px] text-red-400">{error}</p>}

                  <button type="submit" className="btn-primary w-full" disabled={pending || otp.length !== 6}>
                    {pending ? 'Verifying…' : 'Verify & continue'}
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {/* Resend button — Indonesian SMS drops happen often.
                      30s cooldown so we don't accidentally DoS the SMS gateway. */}
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
              </>
            )}

            <div className="text-center text-[13px] text-muted pt-2 border-t border-line">
              Already have an account?{' '}
              <Link href="/login" className="text-brand font-bold">Sign in</Link>
            </div>
          </div>

          {step === 'role' && role === 'driver' && (
            <div className="card p-4">
              <div className="text-[12px] text-dim uppercase tracking-wider font-bold mb-2">After trial</div>
              <div className="text-[14px]">
                <span className="font-extrabold text-brand">Rp 38.000/month</span> or <span className="font-extrabold text-brand">Rp 350.000/year</span> · paid directly to City Rider. Cancel anytime.
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  )
}

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
      className="w-full text-left p-3.5 rounded-2xl border transition flex items-start gap-3"
      style={{
        background: selected ? 'rgba(250,204,21,0.10)' : 'rgba(255,255,255,0.03)',
        borderColor: selected ? 'rgba(250,204,21,0.55)' : 'rgba(255,255,255,0.08)',
      }}
    >
      <div
        className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
        style={{
          background: selected ? '#FACC15' : 'rgba(255,255,255,0.06)',
          color: selected ? '#000' : 'rgba(255,255,255,0.6)',
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-[15px]">{title}</div>
        <div className="text-[13px] text-muted mt-0.5">{sub}</div>
      </div>
    </button>
  )
}

function Field({ label, icon, hint, children }: { label: string; icon?: React.ReactNode; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-4 top-1/2 -translate-y-1/2">{icon}</span>}
        {children}
      </div>
      {hint && <p className="text-[12px] text-dim mt-1.5">{hint}</p>}
    </div>
  )
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('0')) return '62' + digits.slice(1)
  if (digits.startsWith('62')) return digits
  return null
}
