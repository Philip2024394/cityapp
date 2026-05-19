// Sentry — client (browser) bundle config.
// ----------------------------------------------------------------------------
// If NEXT_PUBLIC_SENTRY_DSN is unset, Sentry initialises with no DSN and
// silently drops all events. That keeps local dev and review previews
// quiet without crashing on a missing env var.
import * as Sentry from '@sentry/nextjs'

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || ''

if (DSN) {
  Sentry.init({
    dsn: DSN,
    // Sample rates — start conservative; raise once we see actual volume.
    // 0.1 = 10% of transactions captured. Errors are always captured.
    tracesSampleRate: 0.1,
    // Session replay disabled by default — turn on if needed for a
    // specific bug hunt.
    replaysOnErrorSampleRate: 0,
    replaysSessionSampleRate: 0,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',
  })
}
