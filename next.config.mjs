import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { withSentryConfig } from '@sentry/nextjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'fjvafjkzvygkhiwjuvla.supabase.co' },
      { protocol: 'https', hostname: 'ik.imagekit.io' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
    ],
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
