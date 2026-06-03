// ============================================================================
// Geo → currency resolver
// ----------------------------------------------------------------------------
// Server-side helper that picks the best currency to display alongside an
// IDR price, based on the request's geo headers.
//
// Resolution order:
//   1. Vercel edge geo headers (x-vercel-ip-country) — most reliable in
//      production. Vercel sets this for every request hitting the deploy.
//   2. Cloudflare CF-IPCountry — set if traffic is proxied through CF
//      Workers (legacy from the pre-Vercel days, kept defensively).
//   3. Accept-Language locale region (e.g. en-US → US) — fallback when
//      neither geo header is set (preview deploys, localhost dev).
//   4. Default 'US' so non-Indonesian visitors at least see a USD
//      equivalent on the marketing page instead of nothing.
//
// Indonesian visitors (country 'ID') get the canonical IDR display only —
// the formatLocalEquivalent helper returns null for IDR and the price tile
// renders just "Rp 38.000" without the approximate parenthetical.
// ============================================================================

import { COUNTRIES } from '@/lib/data/countries'

const COUNTRY_TO_CURRENCY: Record<string, string> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c.currency_code]),
)

export function detectCountryFromHeaders(h: Headers): string {
  const vercelGeo = h.get('x-vercel-ip-country')
  if (vercelGeo) return vercelGeo.toUpperCase()
  const cfGeo = h.get('cf-ipcountry')
  if (cfGeo) return cfGeo.toUpperCase()
  const al = h.get('accept-language') ?? ''
  const m = al.match(/^[a-z]{2,3}[-_]([A-Z]{2})/i)
  if (m) return m[1].toUpperCase()
  return 'US'
}

export function currencyForCountry(country: string): string {
  return COUNTRY_TO_CURRENCY[country.toUpperCase()] ?? 'USD'
}

export function detectCurrencyFromHeaders(h: Headers): string {
  return currencyForCountry(detectCountryFromHeaders(h))
}
