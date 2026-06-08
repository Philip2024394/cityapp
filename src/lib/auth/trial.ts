import type { UserAccount } from './account'

// ============================================================================
// Trial info derived from the (subscription_status='active' + plan=null +
// dates) encoding written by /api/auth/signup step 4.5. Pure function —
// no DB calls, no clock side-effects beyond Date.now(). Safe to call
// from server or client.
//
// Trial encoding (single source of truth):
//   - subscription_status === 'active'
//   - subscription_plan IS NULL          (paid users have monthly|yearly)
//   - subscription_expires_at IS NOT NULL
// Anything else → not a trial. Returns is_trial=false with zero counters.
// ============================================================================

export type TrialInfo = {
  is_trial: boolean
  day_number: number        // 1..7 (clamped)
  days_remaining: number    // 0..7 (clamped; 0 = expires today)
  hours_remaining: number   // 0..168 (clamped)
  expires_at: string | null
}

const ZERO: TrialInfo = {
  is_trial: false,
  day_number: 0,
  days_remaining: 0,
  hours_remaining: 0,
  expires_at: null,
}

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo
  return Math.min(hi, Math.max(lo, n))
}

export function getTrialInfo(account: UserAccount | null | undefined): TrialInfo {
  if (!account) return ZERO
  if (account.subscription_status !== 'active') return ZERO
  if (account.subscription_plan !== null) return ZERO
  if (!account.subscription_expires_at) return ZERO

  const now = Date.now()
  const expiresMs = new Date(account.subscription_expires_at).getTime()
  if (!Number.isFinite(expiresMs)) return ZERO

  // started_at is technically nullable in the type, but the signup route
  // always sets it alongside expires_at. Fall back to (expires - 7d) so
  // we never throw a NaN at the banner if a row was hand-crafted without it.
  const startedMs = account.subscription_started_at
    ? new Date(account.subscription_started_at).getTime()
    : expiresMs - 7 * 86_400_000

  const dayNumber = clamp(1 + Math.floor((now - startedMs) / 86_400_000), 1, 7)
  const daysRemaining = clamp(Math.ceil((expiresMs - now) / 86_400_000), 0, 7)
  const hoursRemaining = clamp(Math.ceil((expiresMs - now) / 3_600_000), 0, 168)

  return {
    is_trial: true,
    day_number: dayNumber,
    days_remaining: daysRemaining,
    hours_remaining: hoursRemaining,
    expires_at: account.subscription_expires_at,
  }
}
