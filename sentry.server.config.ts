// Sentry — server runtime (Node.js routes, route handlers, server components).
// ----------------------------------------------------------------------------
// Uses SENTRY_DSN (server-only env var). NEXT_PUBLIC_SENTRY_DSN is for
// the client bundle; we accept either here so a single value can be
// configured at the Vercel level if preferred.
import * as Sentry from '@sentry/nextjs'

const DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || ''

if (DSN) {
  Sentry.init({
    dsn: DSN,
    tracesSampleRate: 0.1,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
  })
}
