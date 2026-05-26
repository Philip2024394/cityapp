import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { withSentryConfig } from '@sentry/nextjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ============================================================================
// Security headers — applied to every response.
// ----------------------------------------------------------------------------
// CSP allowlist covers everything the app actually loads:
//   • Supabase (auth + DB)            — *.supabase.co
//   • Midtrans Snap (payment)         — app.midtrans.com + app.sandbox
//   • Map tiles                       — tiles.openfreemap.org, demotiles.maplibre.org
//   • Geocoder                        — nominatim.openstreetmap.org
//   • Image hosts                     — ik.imagekit.io, *.unsplash.com, i.pravatar.cc
//   • FCM (push send is server-side)  — fcm.googleapis.com, oauth2.googleapis.com
//   • Sentry                          — *.ingest.sentry.io
//   • Self                            — for our own API + assets
//
// 'unsafe-inline' on style-src is required by Next.js + Tailwind JIT.
// 'unsafe-inline' on script-src is required by Next.js bootstrap + the
// Midtrans Snap widget. Both are unavoidable today without nonce-based CSP
// (which Next 15 still doesn't natively support per-request).
// ============================================================================
// frame-ancestors allow-list — origins that may embed cityrider in an
// iframe. Used by the StreetLocal selling page's "View marketplace"
// demo modal. X-Frame-Options is intentionally omitted (it has no
// multi-origin syntax; modern browsers prefer frame-ancestors when
// both are present, so this list is the actual gate).
const FRAME_ANCESTORS = [
  "'self'",
  'https://streetlocal.live',
  'https://www.streetlocal.live',
  // Vite dev ports — Vite hops upward when 5173 is occupied.
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5178',
].join(' ')

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://app.midtrans.com https://app.sandbox.midtrans.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://app.midtrans.com https://app.sandbox.midtrans.com https://api.midtrans.com https://api.sandbox.midtrans.com https://tiles.openfreemap.org https://*.r2.dev https://protomaps.github.io https://demotiles.maplibre.org https://nominatim.openstreetmap.org https://ik.imagekit.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io https://fcm.googleapis.com https://oauth2.googleapis.com",
  "frame-src 'self' https://app.midtrans.com https://app.sandbox.midtrans.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  `frame-ancestors ${FRAME_ANCESTORS}`,
  "upgrade-insecure-requests",
].join('; ')

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // geolocation=self  : we use it for marketplace search + driver pings
  // camera=()         : never used
  // microphone=()     : never used
  // payment=()        : Midtrans Snap is iframe-based, not Payment Request API
  // interest-cohort=(): no FLoC / Topics
  {
    key: 'Permissions-Policy',
    value: 'geolocation=(self), camera=(), microphone=(), payment=(), interest-cohort=()',
  },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  // Hide the floating "N" build-status indicator Next.js shows on the
  // bottom-left in `next dev`. The badge competes with our profile-page
  // chrome (back button, accent bar, social row) for the same corner.
  devIndicators: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'krbewsrfxjswkoosohyc.supabase.co' },
      { protocol: 'https', hostname: 'ik.imagekit.io' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
    ],
  },
  async headers() {
    return [
      {
        // Apply to every route.
        source: '/:path*',
        headers: SECURITY_HEADERS,
      },
      {
        // Android App Links verification needs JSON content-type and
        // permissive CORS so Google's verifier can fetch the file.
        // Public deeplink contract — cache for 1 hour.
        source: '/.well-known/assetlinks.json',
        headers: [
          { key: 'Content-Type',                 value: 'application/json' },
          { key: 'Access-Control-Allow-Origin',  value: '*' },
          { key: 'Cache-Control',                value: 'public, max-age=3600' },
        ],
      },
    ]
  },
}

// Sentry wrapping is opt-in via env. When SENTRY_DSN is unset (local
// dev, preview deploys without monitoring) we export the bare config so
// the build doesn't try to upload source maps. When set on Vercel
// Production the wrapper kicks in and:
//   - uploads source maps to Sentry (needs SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT)
//   - hides source-map URLs from the production bundle
//   - widens the client error feedback
const sentryEnabled = !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG || undefined,
      project: process.env.SENTRY_PROJECT || undefined,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      hideSourceMaps: true,
      disableLogger: true,
      // Skip the auth-token requirement when running outside CI — local
      // builds still work, just without source-map upload.
      authToken: process.env.SENTRY_AUTH_TOKEN || undefined,
    })
  : nextConfig
