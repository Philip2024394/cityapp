// ============================================================================
// FX rate fetcher — IDR-base, cached for 24h.
// ----------------------------------------------------------------------------
// Public free endpoint: https://open.er-api.com/v6/latest/IDR
// - No API key, no signup, no rate limit for low-volume marketing reads.
// - Returns IDR-base rates against ~150 currencies.
// - We let Next.js's fetch cache handle the 24h TTL (revalidate: 86400)
//   so this resolves once per day per Vercel region.
//
// Used by the /pricing page to render "(≈ US$2.40)" alongside the
// canonical IDR price the founder publishes. We never compute a fare or
// charge in foreign currency — this is a display-only conversion to make
// the price legible to a non-Indonesian shopper. Charges still settle in
// IDR via QRIS (or Stripe when wired in Phase 2).
// ============================================================================

export type FxRates = {
  base:        'IDR'
  /** Map of currency code → rate (1 IDR = N currency). */
  rates:       Record<string, number>
  /** ISO date the upstream feed published. */
  asOf:        string
}

const ENDPOINT = 'https://open.er-api.com/v6/latest/IDR'
const FALLBACK_RATES: FxRates = {
  base: 'IDR',
  // Hardcoded snapshot from 2026-06-02 as a fallback if the upstream
  // call fails (network blip, endpoint down). Conservative undershoot
  // so we never display a price that's *cheaper* than reality.
  rates: {
    USD: 0.0000615,
    EUR: 0.0000570,
    GBP: 0.0000485,
    AUD: 0.0000940,
    SGD: 0.0000835,
    MYR: 0.000289,
    THB: 0.00226,
    VND: 1.575,
    PHP: 0.00357,
    JPY: 0.00968,
    KRW: 0.0850,
    CNY: 0.000447,
    HKD: 0.000482,
    TWD: 0.00197,
    INR: 0.00514,
    CAD: 0.0000844,
    NZD: 0.0001020,
    CHF: 0.0000550,
    AED: 0.000226,
    SAR: 0.000231,
    NOK: 0.000667,
    SEK: 0.000656,
    DKK: 0.000425,
  },
  asOf: '2026-06-02',
}

export async function fetchFxRates(): Promise<FxRates> {
  try {
    const r = await fetch(ENDPOINT, {
      next: { revalidate: 86_400 }, // 24h
    })
    if (!r.ok) return FALLBACK_RATES
    const j = (await r.json()) as {
      result?:      string
      base_code?:   string
      time_last_update_utc?: string
      rates?:       Record<string, number>
    }
    if (j.result !== 'success' || j.base_code !== 'IDR' || !j.rates) {
      return FALLBACK_RATES
    }
    return {
      base:  'IDR',
      rates: j.rates,
      asOf:  j.time_last_update_utc ?? new Date().toISOString(),
    }
  } catch {
    return FALLBACK_RATES
  }
}
