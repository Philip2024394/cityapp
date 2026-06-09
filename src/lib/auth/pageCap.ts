import type { AccountPlan } from './account'

/** Max number of beautician_provider pages a user can own based on plan.
 *  Founder direction 2026-06-09 from the Linktree audit:
 *    free   → 1 page
 *    pro    → 1 page
 *    studio → 5 pages
 *  Pro = single-business workhorse. Studio = agency / multi-location. */
export function pageCapForPlan(plan: AccountPlan | null | undefined): number {
  if (plan === 'studio') return 5
  return 1
}
