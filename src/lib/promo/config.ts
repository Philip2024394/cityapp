// Promo-page tier limits + slug helpers. Centralised so the API
// route + dashboard cap chip + public page all agree on the numbers.
//
// Tier mapping today is simple:
//   subscription_status = 'active'   → 'pro' tier
//   subscription_status = 'trial'    → 'pro' tier (trial gets pro
//                                       limits to lower upgrade friction)
//   anything else                    → 'free' tier
//
// Pro+ isn't wired in v1 — when a paid Pro+ tier exists it'll be
// `subscription_tier = 'pro_plus'` (new column) and a 100/month cap.

export type PromoTier = 'free' | 'pro' | 'pro_plus'

export const PROMO_LIMITS: Record<PromoTier, {
  /** Max AI-generated promo pages per calendar month. */
  monthlyCap: number
  /** Daily speed bump — prevents burst spam. */
  dailyCap:   number
  /** Max active (non-archived, non-expired) promo pages at one time. */
  activeCap:  number
}> = {
  free:     { monthlyCap: 0,   dailyCap: 0,   activeCap: 0   },
  pro:      { monthlyCap: 20,  dailyCap: 5,   activeCap: 50  },
  pro_plus: { monthlyCap: 100, dailyCap: 10,  activeCap: 200 },
}

/** Map a provider's subscription_status to a PromoTier. */
export function resolveTier(subscription_status: string | null | undefined): PromoTier {
  if (subscription_status === 'active' || subscription_status === 'trial') return 'pro'
  return 'free'
}

/** ISO 'YYYY-MM' bucket key in Asia/Jakarta time (the founder's reference TZ). */
export function currentYearMonth(d: Date = new Date()): string {
  const jakarta = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${jakarta.getFullYear()}-${pad(jakarta.getMonth() + 1)}`
}

/** URL-safe random slug — 10 chars, base32-friendly. Used as the
 *  /p/{slug} suffix so two promos can't collide even at high volume. */
export function newPromoSlug(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  const arr = new Uint8Array(10)
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    crypto.getRandomValues(arr)
  } else {
    for (let i = 0; i < 10; i++) arr[i] = Math.floor(Math.random() * 256)
  }
  for (let i = 0; i < 10; i++) out += alphabet[arr[i] % alphabet.length]
  return out
}
