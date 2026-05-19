import 'server-only'

// Cross-origin allowlist for the affiliate proxy routes.
// The landing app (Vite SPA hosting Affiliate.jsx) lives on a different
// origin from cityrider.id, so the API needs explicit CORS allow-origin
// values. We never use the wildcard because that would expose the API
// to any site embedding it.
const ALLOWED_ORIGINS = [
  'https://streetlocal.live',
  'https://www.streetlocal.live',
  'https://imoutnow.vercel.app',
  'http://localhost:5173',
  'http://localhost:5186',
]
const VERCEL_PREVIEW_RE = /^https:\/\/[a-z0-9-]+\.vercel\.app$/

export function corsHeadersFor(origin: string | null): Record<string, string> {
  const allow =
    origin && (ALLOWED_ORIGINS.includes(origin) || VERCEL_PREVIEW_RE.test(origin))
      ? origin
      : 'https://streetlocal.live'
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
  }
}
