'use client'
// Root error boundary for the App Router. Captures any uncaught render
// or runtime error before it reaches the browser default error page,
// forwards it to Sentry, then renders a minimal recovery UI.
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            background: '#0A0A0A',
            color: '#FAFAFA',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div style={{ maxWidth: 420, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
              Ada masalah teknis
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', marginBottom: 20, lineHeight: 1.5 }}>
              Tim kami sudah mendapat notifikasi otomatis. Coba ulangi halaman
              ini atau kembali ke marketplace.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={reset}
                style={{
                  background: 'linear-gradient(135deg, #FACC15, #EAB308)',
                  color: '#0A0A0A',
                  fontWeight: 800,
                  fontSize: 14,
                  padding: '12px 24px',
                  borderRadius: 12,
                  border: '1px solid rgba(0,0,0,0.85)',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  minHeight: 48,
                }}
              >
                Coba lagi
              </button>
              <a
                href="/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.75)',
                  fontWeight: 700,
                  fontSize: 13,
                  padding: '10px 24px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.12)',
                  textDecoration: 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  minHeight: 44,
                }}
              >
                Buka marketplace
              </a>
            </div>
            {error.digest && (
              <p style={{ fontSize: 11, marginTop: 16, fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)' }}>
                ref: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  )
}
