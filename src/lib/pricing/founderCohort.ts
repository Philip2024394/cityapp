// ============================================================================
// Founder cohort — derivation + counting helpers
// ----------------------------------------------------------------------------
// The first FOUNDER_COHORT_CAP drivers in Indonesia keep the founder
// price (Rp 38.000/month) for life. After that cap, new drivers pay
// the standard rate (TBD — currently the same number as a placeholder).
//
// Cohort status is computed from the drivers table — no column needed
// today. We count drivers ordered by created_at ASC; rows 1..1000 are
// founders, 1001+ are standard. When a country dimension lands, the
// helper grows a country filter.
//
// Functions in this file are framework-agnostic — they take a Supabase
// admin client (so they can be used from API routes + server pages).
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import { FOUNDER_COHORT_CAP } from './constants'

/** Total active drivers signed up to date. Used to drive the "X of 1000
 *  founder slots remaining" marketing counter. Returns null on failure
 *  so the caller can decide whether to show "—" or a cached fallback. */
export async function countTotalDrivers(
  admin: SupabaseClient,
): Promise<number | null> {
  const { count, error } = await admin
    .from('drivers')
    .select('id', { count: 'exact', head: true })
  if (error) return null
  return count ?? 0
}

/** True when the driver who signed up at `createdAt` qualifies as a
 *  founder. Founder = one of the first FOUNDER_COHORT_CAP rows ordered
 *  by created_at ASC. We compute this by counting how many drivers
 *  existed STRICTLY BEFORE this row's created_at; if that count is
 *  less than the cap, the row is in the founder cohort. */
export async function isFounderCohort(
  admin: SupabaseClient,
  createdAt: string,
): Promise<boolean> {
  const { count, error } = await admin
    .from('drivers')
    .select('id', { count: 'exact', head: true })
    .lt('created_at', createdAt)
  if (error) return false
  return (count ?? 0) < FOUNDER_COHORT_CAP
}

/** Founder slots remaining (out of FOUNDER_COHORT_CAP). Never returns a
 *  negative number — once the cap is hit we clamp at 0 so the marketing
 *  counter reads "0 of 1000 left" rather than going negative. */
export async function founderSlotsRemaining(
  admin: SupabaseClient,
): Promise<number | null> {
  const total = await countTotalDrivers(admin)
  if (total == null) return null
  return Math.max(0, FOUNDER_COHORT_CAP - total)
}
