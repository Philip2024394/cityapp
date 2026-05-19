// Next.js 15 instrumentation hook — invoked once per server runtime
// (Node + Edge). Loads the appropriate Sentry init module so server
// route errors and middleware crashes are captured.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// Captures uncaught request errors (App Router) so they reach Sentry
// even when the page renders an error.tsx boundary. The export name
// `onRequestError` is what Next.js calls; `captureRequestError` is the
// @sentry/nextjs implementation.
export { captureRequestError as onRequestError } from '@sentry/nextjs'
