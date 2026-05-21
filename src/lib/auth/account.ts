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

export type UserAccount = {
  user_id: string
  account_type: AccountType
  subscription_status: SubscriptionStatus
  subscription_plan: SubscriptionPlan
  subscription_started_at: string | null
  subscription_expires_at: string | null
  trusted: boolean
}

const DEFAULT_PERSONAL: Omit<UserAccount, 'user_id'> = {
  account_type: 'personal',
  subscription_status: 'inactive',
  subscription_plan: null,
  subscription_started_at: null,
  subscription_expires_at: null,
  trusted: false,
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
    .select('user_id, account_type, subscription_status, subscription_plan, subscription_started_at, subscription_expires_at, trusted')
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
// flipped subscription_status yet.
function refreshExpiry(a: UserAccount): UserAccount {
  if (a.subscription_status !== 'active') return a
  if (!a.subscription_expires_at) return a
  if (new Date(a.subscription_expires_at).getTime() > Date.now()) return a
  return { ...a, subscription_status: 'expired' }
}

export function isActiveRentalCompany(a: UserAccount): boolean {
  return a.account_type === 'rental_company' && a.subscription_status === 'active'
}

// Lazy lapse cleanup — call from server endpoints that read account state.
// If a rental_company subscription has expired since the last check we
// flip the DB row to 'expired' AND pause all of the owner's listings so
// they stop appearing on /rent until the company renews. The reverse
// (un-pause on payment) is handled by the extend_rental_company_on_payment
// trigger in migration 0034.
export async function runLapseCleanup(userId: string, account: UserAccount): Promise<UserAccount> {
  if (account.account_type !== 'rental_company') return account
  if (account.subscription_status !== 'active') return account
  if (!account.subscription_expires_at) return account
  if (new Date(account.subscription_expires_at).getTime() > Date.now()) return account

  const admin = getAdminSupabase()
  if (!admin) return { ...account, subscription_status: 'expired' }

  await admin
    .from('user_accounts')
    .update({ subscription_status: 'expired' })
    .eq('user_id', userId)
    .eq('subscription_status', 'active')  // idempotent — only flip once

  await admin
    .from('bike_rentals')
    .update({ status: 'paused' })
    .eq('owner_user_id', userId)
    .eq('status', 'approved')

  return { ...account, subscription_status: 'expired' }
}
