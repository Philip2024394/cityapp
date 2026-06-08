import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// POST /api/account/cancel
// ----------------------------------------------------------------------------
// One-tap subscription cancellation from the side drawer "Cancel my app"
// link. Sets subscription_status='inactive' and clears the plan / period
// fields on user_accounts. Account itself stays — sign-in still works,
// data is preserved, and the user can re-subscribe later. This is the
// counterpart to /api/account/delete (which is irreversible).
//
// Marketing copy on the landing + /about + FAQ describes this flow
// verbatim ("Open the side drawer in your dashboard and tap Cancel my
// app"). If the endpoint behaviour ever changes, the copy in
// src/app/page.tsx + src/app/about/page.tsx must move with it.
// ============================================================================

export async function POST() {
  const userClient = await getServerSupabase()
  if (!userClient) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Service role not configured' }, { status: 500 })

  const nowIso = new Date().toISOString()

  // Soft cancel: flip status, clear plan + period. We use upsert so
  // accounts that have never had a row (the default-personal case
  // synthesised by getMyAccount) still end up with an explicit
  // "inactive" row instead of relying on the fallback default. The
  // trigger that seeds the row on signup makes upsert a no-op for the
  // common case; defensive for the edge case where the trigger hasn't
  // run yet.
  const { error } = await admin
    .from('user_accounts')
    .upsert(
      {
        user_id: user.id,
        subscription_status: 'inactive',
        subscription_plan: null,
        subscription_started_at: null,
        subscription_expires_at: nowIso,
      },
      { onConflict: 'user_id' },
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, cancelled_at: nowIso })
}
