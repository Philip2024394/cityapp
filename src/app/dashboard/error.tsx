'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

// ============================================================================
// /dashboard error boundary. Catches client + render errors in any of the
// dashboard subtree (toggles, cards, share kit, subscription) so a single
// component crash doesn't blank the entire driver shell.
//
// Sends to Sentry via window.Sentry if available; otherwise logs.
// ============================================================================

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Best-effort report; Sentry's Next.js wrapper auto-catches errors
    // but this gives us a labeled trace under the dashboard scope.
    const w = typeof window !== 'undefined' ? (window as unknown as { Sentry?: { captureException?: (e: unknown) => void } }) : undefined
    w?.Sentry?.captureException?.(error)
  }, [error])

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-4" style={{ background: '#0A0A0A' }}>
      <div className="w-full max-w-sm text-center space-y-4">
        <div
          className="mx-auto w-16 h-16 rounded-full flex items-center justify-center"
          style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.35)',
          }}
        >
          <AlertTriangle className="w-8 h-8" style={{ color: '#EF4444' }} />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-ink">Something went wrong</h1>
          <p className="text-[14px] text-muted mt-1 leading-relaxed">
            The dashboard hit an unexpected error. Your account and listing are unaffected — just refresh below.
          </p>
        </div>
        {error.digest && (
          <p className="text-[11px] text-muted/50 font-mono">Ref: {error.digest}</p>
        )}
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={reset}
            className="rounded-2xl py-3 inline-flex items-center justify-center gap-2 font-extrabold text-[14px] text-bg bg-gradient-to-r from-brand to-brand2 active:scale-95 transition"
            style={{ minHeight: 48 }}
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          <Link
            href="/"
            className="rounded-2xl py-3 inline-flex items-center justify-center gap-2 font-extrabold text-[13px] transition"
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.70)',
              border: '1px solid rgba(255,255,255,0.10)',
              minHeight: 48,
            }}
          >
            <Home className="w-4 h-4" />
            Back to home
          </Link>
        </div>
      </div>
    </main>
  )
}
