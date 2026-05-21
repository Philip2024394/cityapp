import { NextResponse } from 'next/server'
import { getMyAccount, runLapseCleanup } from '@/lib/auth/account'

// ============================================================================
// GET /api/me/account
// ----------------------------------------------------------------------------
// Returns the signed-in user's account_type + subscription status so client
// components (DashboardNav, /dashboard root redirect, AppNav badges) can
// gate UI without each one re-implementing the user_accounts query.
//
// Side-effect: opportunistic lapse cleanup. If a rental_company sub
// expired since the last hit we flip subscription_status to 'expired'
// AND pause all the company's approved listings in one place — keeps
// the dashboard, /rent feed, and admin in sync without a cron.
//
// Returns `null` for anonymous callers so the client can treat
// "unauthenticated" and "personal" the same way.
// ============================================================================

export const dynamic = 'force-dynamic'

export async function GET() {
  const result = await getMyAccount()
  if (!result) {
    return NextResponse.json({ account: null }, { headers: { 'Cache-Control': 'no-store' } })
  }
  const account = await runLapseCleanup(result.userId, result.account)
  return NextResponse.json(
    { userId: result.userId, account },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
