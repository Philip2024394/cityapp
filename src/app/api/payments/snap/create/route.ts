import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { createSnapTransaction } from '@/lib/midtrans/snap'

// ============================================================================
// POST /api/payments/snap/create
// ----------------------------------------------------------------------------
// Driver taps "Renew now" on their dashboard. We:
//   1. Authenticate (drivers can only pay for themselves)
//   2. Insert a `payment_intents` row with status='pending'
//   3. Mint a Midtrans Snap token using the intent ID as order_id
//   4. Return the token to the client; the client opens the Snap popup
//
// Webhook (separate route) flips status='paid' when Midtrans settles,
// the DB trigger then bumps subscriptions.current_period_end.
//
// Pricing rule:
//   product='subscription' → Rp 30,000, extends_days=30
//   product='verified'     → Rp 100,000, extends_days=30
// ============================================================================

type Payload = { product?: 'subscription' | 'verified' }

const PRICE_BY_PRODUCT: Record<'subscription' | 'verified', { amount: number; days: number; label: string }> = {
  subscription: { amount:  30_000, days: 30, label: 'City Rider · 30 days'  },
  verified:     { amount: 100_000, days: 30, label: 'Tour Verified · 30 d'  },
}

export async function POST(req: Request) {
  const supabase = await getServerSupabase()
  if (!supabase) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  let body: Payload = {}
  try { body = (await req.json().catch(() => ({}))) as Payload } catch { /* allow empty body */ }
  const product = body.product === 'verified' ? 'verified' : 'subscription'
  const tier = PRICE_BY_PRODUCT[product]

  // Need a few driver fields for the Midtrans customer_details block
  const { data: driver } = await supabase
    .from('drivers')
    .select('user_id, business_name, whatsapp_e164')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!driver) {
    return NextResponse.json({ error: 'Complete onboarding before paying' }, { status: 403 })
  }

  // We need service-role to insert into payment_intents (its RLS only
  // grants SELECT to owner — writes are server-only).
  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  // Insert the intent BEFORE calling Midtrans — if Midtrans returns
  // a token, we update with it. If Midtrans fails, the intent stays
  // 'pending' and will eventually be expired by the webhook or admin.
  const { data: intentRow, error: insertErr } = await admin
    .from('payment_intents')
    .insert({
      driver_user_id: user.id,
      product,
      amount_idr: tier.amount,
      provider: 'midtrans',
      provider_order_id: '',  // placeholder; replaced below with the intent id
      extends_days: tier.days,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertErr || !intentRow) {
    return NextResponse.json({ error: insertErr?.message || 'Could not create intent' }, { status: 500 })
  }
  const orderId = intentRow.id

  // Set provider_order_id = the intent's UUID
  await admin
    .from('payment_intents')
    .update({ provider_order_id: orderId })
    .eq('id', orderId)

  // Call Midtrans Snap
  let snap: { token: string; redirectUrl: string }
  try {
    snap = await createSnapTransaction({
      orderId,
      amountIdr: tier.amount,
      customer: {
        name: driver.business_name || 'City Rider driver',
        phone: driver.whatsapp_e164 || undefined,
      },
      itemName: tier.label,
    })
  } catch (e) {
    // Mark intent failed so we don't leak orphaned pending rows
    await admin
      .from('payment_intents')
      .update({ status: 'failed' })
      .eq('id', orderId)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Midtrans error' },
      { status: 502 },
    )
  }

  // Persist the token + redirect on the intent
  await admin
    .from('payment_intents')
    .update({ snap_token: snap.token, snap_redirect_url: snap.redirectUrl })
    .eq('id', orderId)

  return NextResponse.json({
    intent_id: orderId,
    token: snap.token,
    redirect_url: snap.redirectUrl,
  })
}
