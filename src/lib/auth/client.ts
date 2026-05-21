// ============================================================================
// Client-side helpers for the user_accounts read.
// ----------------------------------------------------------------------------
// Multiple components (/dashboard root redirect, DashboardNav tab swap,
// future AppNav badges) all need the same answer: "what account_type +
// subscription_status does the signed-in user have?". Without a cache,
// each component fires its own /api/me/account on mount — that's 2-3
// redundant round-trips per navigation, each adding ~100-150 ms.
//
// This module dedupes in-flight requests and caches the result for a
// short TTL so back-to-back consumers share a single fetch.
// ============================================================================

type AccountResponse = {
  account: {
    account_type?: string
    subscription_status?: string
    [k: string]: unknown
  } | null
}

const TTL_MS = 30_000

let cachedPromise: Promise<AccountResponse | null> | null = null
let cachedAt = 0

export function fetchMyAccountCached(): Promise<AccountResponse | null> {
  if (cachedPromise && Date.now() - cachedAt < TTL_MS) return cachedPromise
  cachedAt = Date.now()
  cachedPromise = fetch('/api/me/account', { cache: 'no-store' })
    .then((r) => (r.ok ? (r.json() as Promise<AccountResponse>) : null))
    .catch(() => null)
  return cachedPromise
}

// Bust the cache after a known state-change (e.g. after a successful
// Midtrans webhook return on /rent/upgrade).
export function clearMyAccountCache() {
  cachedPromise = null
  cachedAt = 0
}
