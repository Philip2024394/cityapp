import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// user_accounts helpers
// ----------------------------------------------------------------------------
// Single source of truth for the account-type / subscription state used by
// the rental-listing quota, the upgrade flow, and the route guards that
// hide bike-booking / food / parcel from rental-company vendor accounts.
// ============================================================================

export type AccountType = 'personal' | 'rental_company'
export type SubscriptionStatus = 'inactive' | 'active' | 'expired'
export type SubscriptionPlan = 'monthly' | 'yearly' | null
// mig 0223 — 3-tier billing plan that drives the Kita2u presentation
// product (Free / Pro / Studio). Orthogonal to subscription_status, which
// stays the rental-company / tour-guide entitlement signal.
export type AccountPlan = 'free' | 'pro' | 'studio'

export type UserAccount = {
  user_id: string
  account_type: AccountType
  subscription_status: SubscriptionStatus
  subscription_plan: SubscriptionPlan
  subscription_started_at: string | null
  subscription_expires_at: string | null
  tour_guide_status: SubscriptionStatus
  tour_guide_plan: SubscriptionPlan
  tour_guide_started_at: string | null
  tour_guide_expires_at: string | null
  trusted: boolean
  // mig 0223 — current billing tier on the presentation product.
  plan: AccountPlan
}

const DEFAULT_PERSONAL: Omit<UserAccount, 'user_id'> = {
  account_type: 'personal',
  subscription_status: 'inactive',
  subscription_plan: null,
  subscription_started_at: null,
  subscription_expires_at: null,
  tour_guide_status: 'inactive',
  tour_guide_plan: null,
  tour_guide_started_at: null,
  tour_guide_expires_at: null,
  trusted: false,
  // Default matches the DB column default (mig 0223).
  plan: 'free',
}

// Fetch the signed-in user's account row using the request's auth cookie.
// Falls back to a synthesized personal default if the row hasn't been
// created yet (rare — the signup trigger seeds it).
export async function getMyAccount(): Promise<{ userId: string; account: UserAccount } | null> {
  const supabase = await getServerSupabase()
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('user_accounts')
    .select('user_id, account_type, subscription_status, subscription_plan, subscription_started_at, subscription_expires_at, tour_guide_status, tour_guide_plan, tour_guide_started_at, tour_guide_expires_at, trusted, plan')
    .eq('user_id', user.id)
    .maybeSingle()

  const account: UserAccount = (data as UserAccount | null) ?? {
    user_id: user.id,
    ...DEFAULT_PERSONAL,
  }
  return { userId: user.id, account: refreshExpiry(account) }
}

// Server-side check used by the rental-listing quota: how many ACTIVE
// (pending + approved + paused, i.e. non-rejected) rentals does this
// owner have? Personal accounts can have at most 1.
export async function countOwnedRentals(userId: string): Promise<number> {
  const admin = getAdminSupabase()
  if (!admin) return 0
  const { count } = await admin
    .from('bike_rentals')
    .select('id', { count: 'exact', head: true })
    .eq('owner_user_id', userId)
    .in('status', ['pending', 'approved', 'paused'])
  return count ?? 0
}

// Treats a row whose expires_at < now() as expired, regardless of what the
// DB column says — protects the UI from races where the lapse cron hasn't
// flipped subscription_status yet. Applies independently to the rental
// subscription and the tour-guide subscription.
function refreshExpiry(a: UserAccount): UserAccount {
  let out = a
  if (out.subscription_status === 'active' && out.subscription_expires_at &&
      new Date(out.subscription_expires_at).getTime() <= Date.now()) {
    out = { ...out, subscription_status: 'expired' }
  }
  if (out.tour_guide_status === 'active' && out.tour_guide_expires_at &&
      new Date(out.tour_guide_expires_at).getTime() <= Date.now()) {
    out = { ...out, tour_guide_status: 'expired' }
  }
  return out
}

export function isActiveRentalCompany(a: UserAccount): boolean {
  return a.account_type === 'rental_company' && a.subscription_status === 'active'
}

// Tour-guide entitlement is granted by EITHER:
//   1. An active driver subscription (drivers already pay Rp 38K/mo,
//      tour-guide listing is included). Caller passes hasActiveDriverSub
//      from the subscriptions table check.
//   2. A standalone tour_guide subscription (Rp 38K/mo or Rp 350K/yr).
export function isTourGuideEntitled(a: UserAccount, hasActiveDriverSub = false): boolean {
  if (hasActiveDriverSub) return true
  return a.tour_guide_status === 'active'
}

// Helper to read the active driver subscription state. Used by the
// /tour quota check so a paying driver doesn't need to pay a second
// subscription just to add a tour guide listing.
export async function hasActiveDriverSubscription(userId: string): Promise<boolean> {
  const admin = getAdminSupabase()
  if (!admin) return false
  const { data } = await admin
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('driver_id', userId)
    .maybeSingle()
  if (!data) return false
  if (data.status !== 'active' && data.status !== 'trial') return false
  if (!data.current_period_end) return data.status === 'trial'
  return new Date(data.current_period_end as string).getTime() > Date.now()
}

// Lazy lapse cleanup — call from server endpoints that read account state.
// Handles BOTH rental_company subscription lapse AND tour_guide
// subscription lapse independently. Each lapse:
//   1. Flips its DB status column to 'expired' (idempotent)
//   2. Pauses the owner's listings on the corresponding feed
// The reverse (un-pause on payment) is handled by the matching
// extend_*_on_payment triggers in migrations 0034 + 0037.
export async function runLapseCleanup(userId: string, account: UserAccount): Promise<UserAccount> {
  let out = account
  const admin = getAdminSupabase()

  // ── Rental Company lapse ──────────────────────────────────────────
  if (out.account_type === 'rental_company'
      && out.subscription_status === 'active'
      && out.subscription_expires_at
      && new Date(out.subscription_expires_at).getTime() <= Date.now()) {
    if (admin) {
      await admin
        .from('user_accounts')
        .update({ subscription_status: 'expired' })
        .eq('user_id', userId)
        .eq('subscription_status', 'active')

      await admin
        .from('bike_rentals')
        .update({ status: 'paused' })
        .eq('owner_user_id', userId)
        .eq('status', 'approved')
    }
    out = { ...out, subscription_status: 'expired' }
  }

  // ── Tour Guide lapse ──────────────────────────────────────────────
  if (out.tour_guide_status === 'active'
      && out.tour_guide_expires_at
      && new Date(out.tour_guide_expires_at).getTime() <= Date.now()) {
    if (admin) {
      await admin
        .from('user_accounts')
        .update({ tour_guide_status: 'expired' })
        .eq('user_id', userId)
        .eq('tour_guide_status', 'active')

      await admin
        .from('tour_guide_listings')
        .update({ status: 'paused' })
        .eq('owner_user_id', userId)
        .eq('status', 'approved')
    }
    out = { ...out, tour_guide_status: 'expired' }
  }

  return out
}
