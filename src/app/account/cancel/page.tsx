'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'

// ============================================================================
// /account/cancel — signed-in subscription cancellation page.
// ----------------------------------------------------------------------------
// Linked from the side drawer "Cancel my app" button in AppDrawer.tsx.
// The marketing copy on / + /about + FAQ describes this exact flow:
//   "Open the side drawer in your dashboard and tap Cancel my app."
// POSTs to /api/account/cancel which flips subscription_status to
// 'inactive' and clears plan + period.
// ============================================================================

type Phase = 'loading' | 'unauthed' | 'ready' | 'confirming' | 'submitting' | 'done' | 'error'

type AccountSnapshot = {
  email: string
  subscription_status: 'inactive' | 'active' | 'expired' | null
  subscription_plan: 'monthly' | 'yearly' | null
  subscription_expires_at: string | null
}

export default function AccountCancelPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('loading')
  const [snapshot, setSnapshot] = useState<AccountSnapshot | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) {
      setPhase('unauthed')
      return
    }
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        setPhase('unauthed')
        return
      }
      const { data } = await supabase
        .from('user_accounts')
        .select('subscription_status, subscription_plan, subscription_expires_at')
        .eq('user_id', user.id)
        .maybeSingle()
      if (cancelled) return
      setSnapshot({
        email: user.email ?? '',
        subscription_status: (data?.subscription_status as AccountSnapshot['subscription_status']) ?? 'inactive',
        subscription_plan: (data?.subscription_plan as AccountSnapshot['subscription_plan']) ?? null,
        subscription_expires_at: (data?.subscription_expires_at as string | null) ?? null,
      })
      setPhase('ready')
    })()
    return () => { cancelled = true }
  }, [])

  async function handleConfirm() {
    setPhase('submitting')
    setErrorMessage('')
    try {
      const res = await fetch('/api/account/cancel', { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrorMessage(body?.error ?? 'Something went wrong. Please try again.')
        setPhase('error')
        return
      }
      setPhase('done')
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Network error')
      setPhase('error')
    }
  }

  return (
    <main className="min-h-[100dvh] pb-16">
      <header className="sticky top-0 z-40 glass-strong pt-safe">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center">
          <Link href="/dashboard" className="text-[13px] font-bold text-muted hover:text-ink flex items-center gap-1.5">
            <ChevronLeft className="w-4 h-4" />
            Back to dashboard
          </Link>
        </div>
      </header>

      <article className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        <div>
          <h1 className="text-3xl font-extrabold leading-tight">Cancel my app</h1>
          <p className="text-muted text-[14px] mt-2">
            One tap. No retention calls, no waiting period. Your data stays so you can pick up where you left off if you ever come back.
          </p>
        </div>

        {phase === 'loading' && (
          <section className="card p-5 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-muted" />
            <p className="text-[14px] text-muted">Loading your subscription…</p>
          </section>
        )}

        {phase === 'unauthed' && (
          <section
            className="rounded-2xl p-5 space-y-3"
            style={{ background: 'rgba(250,204,21,0.10)', border: '1px solid rgba(250,204,21,0.35)' }}
          >
            <h2 className="font-extrabold text-[16px]">Sign in to continue</h2>
            <p className="text-[13px] leading-relaxed text-ink/85">
              You need to be signed in to cancel your subscription. After signing in, return to this page from your dashboard side drawer.
            </p>
            <Link
              href="/login?next=/account/cancel"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-[14px] bg-brand text-[#0A0A0A] active:scale-95 transition"
              style={{ minHeight: 44 }}
            >
              Sign in
            </Link>
          </section>
        )}

        {(phase === 'ready' || phase === 'confirming' || phase === 'submitting' || phase === 'error') && snapshot && (
          <>
            <section className="card p-5 space-y-2.5">
              <h2 className="font-extrabold text-[16px]">Your current plan</h2>
              <dl className="text-[14px] leading-relaxed text-ink/90 space-y-1">
                <div className="flex gap-2">
                  <dt className="font-bold text-muted min-w-[120px]">Account</dt>
                  <dd className="truncate">{snapshot.email || '—'}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-bold text-muted min-w-[120px]">Status</dt>
                  <dd>{formatStatus(snapshot.subscription_status)}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-bold text-muted min-w-[120px]">Plan</dt>
                  <dd>{formatPlan(snapshot.subscription_plan)}</dd>
                </div>
                {snapshot.subscription_expires_at && (
                  <div className="flex gap-2">
                    <dt className="font-bold text-muted min-w-[120px]">Next renewal</dt>
                    <dd>{formatDate(snapshot.subscription_expires_at)}</dd>
                  </div>
                )}
              </dl>
            </section>

            <section
              className="rounded-2xl p-4 flex items-start gap-3"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
              <div className="text-[13px] leading-relaxed text-ink/90 space-y-1">
                <p>
                  <strong className="text-ink">Cancellation is immediate.</strong> Your subscription stops on confirmation. You will not be billed again.
                </p>
                <p>
                  Your account, profile, customer book, and saved pages stay on Kita2u. To remove your account entirely, use{' '}
                  <Link href="/account/delete" className="text-brand hover:underline">delete my account</Link>.
                </p>
              </div>
            </section>

            <section className="card p-5 space-y-3">
              <h2 className="font-extrabold text-[16px]">Confirm cancellation</h2>
              <p className="text-[13px] leading-relaxed text-ink/85">
                Tap below to cancel your subscription. We will not ask follow-up questions or attempt to retain your business — you can re-subscribe anytime from your dashboard if you change your mind.
              </p>
              {phase === 'error' && (
                <p className="text-[13px] font-bold" style={{ color: '#EF4444' }}>
                  {errorMessage || 'Something went wrong. Please try again.'}
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={phase === 'submitting'}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-[14px] text-white active:scale-95 transition disabled:opacity-60"
                  style={{ background: '#DC2626', minHeight: 44 }}
                >
                  {phase === 'submitting' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cancelling…
                    </>
                  ) : (
                    <>Cancel my app</>
                  )}
                </button>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-[14px] active:scale-95 transition"
                  style={{
                    background: 'rgba(0,0,0,0.04)',
                    border: '1px solid rgba(0,0,0,0.10)',
                    color: '#0A0A0A',
                    minHeight: 44,
                  }}
                >
                  Keep my subscription
                </Link>
              </div>
            </section>
          </>
        )}

        {phase === 'done' && (
          <>
            <section
              className="rounded-2xl p-5 flex items-start gap-3"
              style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.35)' }}
            >
              <CheckCircle2 className="w-6 h-6 shrink-0 mt-0.5" style={{ color: '#16A34A' }} />
              <div className="text-[14px] leading-relaxed text-ink/90 space-y-1">
                <p className="font-extrabold text-ink text-[16px]">Cancelled.</p>
                <p>
                  Your subscription has been cancelled. You will not be billed again. Your account remains accessible — you can sign in and re-subscribe whenever you are ready.
                </p>
              </div>
            </section>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-[14px] bg-brand text-[#0A0A0A] active:scale-95 transition"
                style={{ minHeight: 44 }}
              >
                Back to home
              </button>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-[14px] active:scale-95 transition"
                style={{
                  background: 'rgba(0,0,0,0.04)',
                  border: '1px solid rgba(0,0,0,0.10)',
                  color: '#0A0A0A',
                  minHeight: 44,
                }}
              >
                Open dashboard
              </Link>
            </div>
          </>
        )}
      </article>
    </main>
  )
}

function formatStatus(status: AccountSnapshot['subscription_status']): string {
  if (status === 'active') return 'Active'
  if (status === 'expired') return 'Expired'
  return 'Inactive'
}

function formatPlan(plan: AccountSnapshot['subscription_plan']): string {
  if (plan === 'monthly') return 'Monthly'
  if (plan === 'yearly') return 'Yearly'
  return 'No active plan'
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}
