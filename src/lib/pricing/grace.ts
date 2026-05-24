// ============================================================================
// Subscription grace period — central constant.
// ----------------------------------------------------------------------------
// Audit (2026-05) flagged that the system snapped 'active' → 'past_due'
// (and 'active' → 'expired' for providers) the second paid_until passed.
// Real-world Indonesian banking + e-wallet flows can be slow:
//   - bank-transfer settlement: 1-3 hours weekdays, overnight weekends
//   - QRIS receipt review backlog: up to 24 hours
//   - user forgot, paid late: human reality
//
// A 3-day cushion before deactivation matches Gojek / Grab driver
// experience and avoids "I paid yesterday but I'm still suspended"
// support tickets.
//
// Where it's applied:
//   • src/app/api/admin/subscriptions/expire/route.ts — only flip to
//     expired when paid_until < now() - GRACE_DAYS
//   • src/components/upgrade/ProviderRenewBanner.tsx — show "Grace: X
//     days" badge between paid_until and effective deactivation
// ============================================================================

export const SUBSCRIPTION_GRACE_DAYS = 3
export const SUBSCRIPTION_GRACE_MS   = SUBSCRIPTION_GRACE_DAYS * 24 * 60 * 60 * 1000

/** Returns the ISO timestamp at which a subscription with the given
 *  paid_until value will be auto-deactivated by the expiry cron. */
export function deactivatesAt(paidUntilIso: string | null | undefined): string | null {
  if (!paidUntilIso) return null
  const t = new Date(paidUntilIso).getTime()
  if (!Number.isFinite(t)) return null
  return new Date(t + SUBSCRIPTION_GRACE_MS).toISOString()
}

/** True when the row is past paid_until but still within the grace
 *  window — useful for UI tone (yellow vs red). */
export function isInGracePeriod(paidUntilIso: string | null | undefined): boolean {
  if (!paidUntilIso) return false
  const expiry = new Date(paidUntilIso).getTime()
  if (!Number.isFinite(expiry)) return false
  const now = Date.now()
  return now > expiry && now < expiry + SUBSCRIPTION_GRACE_MS
}
