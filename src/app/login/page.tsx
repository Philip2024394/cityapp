'use client'
export const dynamic = 'force-dynamic'
// ============================================================================
// /login — Phone + password sign-in (2026-06 simplified flow)
// ----------------------------------------------------------------------------
// Founder decision 2026-06: drivers complained that Indonesian SMS OTPs drop
// constantly. Replaced phone-OTP login with phone + password. The trade-off
// + mitigation analysis is captured in
// feedback_cityriders_no_dispatch_ever and the signup squatting note.
//
// Single form: WhatsApp number + password → supabase.auth.signInWithPassword.
// On success, redirect to ?next= or /dashboard. No OTP, no resend cooldown,
// no second screen. Forgot-password is currently handled out-of-band
// (contact streetlocallive@gmail.com) — admin will add a self-serve reset
// once volume justifies the WA-send infra.
//
// Prerequisite: Supabase Dashboard → Authentication → Providers → Phone →
// "Confirm phone number" = OFF. Otherwise the signup flow can't create
// accounts without an SMS OTP (login itself works either way).
// ============================================================================
import Link from 'next/link'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { KeyRound, LogIn, Eye, EyeOff } from 'lucide-react'
import AuthShell from '@/components/auth/AuthShell'
import DevAccessPanel from '@/components/dev/DevAccessPanel'
import PhoneInput, { normalizeE164 } from '@/components/auth/PhoneInput'
import { getBrowserSupabase } from '@/lib/supabase/client'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  )
}

// Validate redirect destination — only same-origin absolute paths allowed.
// Prevents the open-redirect class of attack where /login?next=https://evil
// would post-authenticate the user into a third-party domain. Matches the
// pattern already used in /signup/page.tsx submitRegister().
function safeNext(raw: string | null): string {
  if (!raw) return '/dashboard'
  // Must start with a single slash (not //, not /\, not protocol)
  if (!raw.startsWith('/')) return '/dashboard'
  if (raw.startsWith('//') || raw.startsWith('/\\')) return '/dashboard'
  return raw
}

function LoginInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const next = safeNext(sp.get('next'))

  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const cleaned = normalizeE164(phone)
    if (!cleaned) {
      setError('Please enter a valid mobile number with country code')
      return
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    const supabase = getBrowserSupabase()
    if (!supabase) {
      setError('Auth not configured. Add Supabase keys to .env.local.')
      return
    }

    setPending(true)
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      phone: cleaned,
      password,
    })
    setPending(false)

    if (signInErr) {
      // Common cases:
      //   - "Invalid login credentials" → wrong password OR account doesn't exist
      //   - "Phone not confirmed" → Supabase phone-confirm setting still ON
      setError(humanError(signInErr.message))
      return
    }
    router.push(next)
    router.refresh()
  }

  return (
    <AuthShell>
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm text-[#0A0A0A]"
          style={{ background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)' }}
        >
          <LogIn className="w-6 h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-black leading-tight text-[#0A0A0A]">Welcome back</h1>
          <p className="text-[13px] text-[#71717A] leading-snug mt-1">
            Sign in with your WhatsApp number and password.
          </p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={submit}>
        <div>
          <label className="block text-[13px] font-bold text-[#0A0A0A] mb-1.5">
            WhatsApp number
          </label>
          <PhoneInput
            value={phone}
            onChange={setPhone}
            autoFocus
            countryAriaLabel="Pick your country code"
          />
          <p className="text-[12px] text-[#71717A] mt-1.5 leading-snug">
            Same number you used to create your account.
          </p>
        </div>

        <div>
          <label className="block text-[13px] font-bold text-[#0A0A0A] mb-1.5">
            Password
          </label>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-[#71717A] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              className={inputCls + ' pl-11 pr-11'}
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
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
          </div>
        </div>

        {error && <p className="text-[13px] text-red-600 font-semibold">{error}</p>}

        <button type="submit" className={primaryBtnCls} disabled={pending}>
          <LogIn className="w-4 h-4" />
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-[12px] text-[#71717A] mt-4 text-center">
        Forgot your password? Message <a href="https://wa.me/6285225058028" target="_blank" rel="noopener noreferrer" className="text-[#EAB308] font-bold hover:underline">+62 852 2505 8028</a> to reset.
      </p>

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

// Convert Supabase's auth error messages into something a driver can act on.
function humanError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login credentials')) {
    return 'Wrong number or password. Check both and try again.'
  }
  if (m.includes('phone not confirmed') || m.includes('phone_not_confirmed')) {
    return 'Your number is not confirmed. Contact support to reset.'
  }
  if (m.includes('rate limit') || m.includes('too many requests')) {
    return 'Too many attempts. Wait a minute and try again.'
  }
  return msg
}
