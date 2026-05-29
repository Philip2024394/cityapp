import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { createSnapTransaction } from '@/lib/midtrans/snap'

// ============================================================================
// POST /api/payments/snap/create
// ----------------------------------------------------------------------------
// DEPRECATED 2026-05 — superseded by the QR-receipt flow at
// /api/me/receipts/upload (see mig 0038 + commit 84ff3a5). Migrated
// because: (1) Midtrans Snap added a per-tx fee that ate into the
// founder's already-thin Rp 38K margin, (2) Indonesian customers
// strongly prefer QRIS bank-direct over redirect-to-Snap flows.
//
// This route is no longer linked from any client surface. The webhook
// at /api/payments/snap/webhook still verifies + processes any
// in-flight settlements from before the cutover, then forwards the
// same extend_*_on_payment triggers — safe to leave running until
// no pending Snap intents remain.
//
// DELETE TARGET: 2026-08 (60 days after no pending Snap intents
// observed). Until then keep this route alive for the long-tail of
// users who started Snap checkout before the QR flow shipped.
// ----------------------------------------------------------------------------
// Original behaviour (kept verbatim below for archeological reference):
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
//   product='subscription'         → Rp 38,000,  extends_days=30
//   product='subscription_yearly'  → Rp 350,000, extends_days=365
//   product='verified'             → Rp 100,000, extends_days=30
// ============================================================================

type Product =
  | 'subscription'
  | 'subscription_yearly'
  | 'verified'
  | 'rental_company_monthly'
  | 'rental_company_yearly'
  | 'tour_guide_monthly'
  | 'tour_guide_yearly'

type Payload = { product?: Product }

const PRICE_BY_PRODUCT: Record<Product, { amount: number; days: number; label: string }> = {
  subscription:           { amount:  38_000, days:  30, label: 'Kita2u · 30 days'       },
  subscription_yearly:    { amount: 350_000, days: 365, label: 'Kita2u · 365 days'      },
  verified:               { amount: 100_000, days:  30, label: 'Tour Verified · 30 d'       },
  rental_company_monthly: { amount:  38_000, days:  30, label: 'Rental Company · 30 days'   },
  rental_company_yearly:  { amount: 350_000, days: 365, label: 'Rental Company · 365 days'  },
  tour_guide_monthly:     { amount:  38_000, days:  30, label: 'Tour Guide · 30 days'       },
  tour_guide_yearly:      { amount: 350_000, days: 365, label: 'Tour Guide · 365 days'      },
}

// Both rental_company AND tour_guide products are "non-driver" — they
// don't require a row in the drivers table to settle a payment intent.
const NON_DRIVER_PRODUCTS = new Set<Product>([
  'rental_company_monthly',
  'rental_company_yearly',
  'tour_guide_monthly',
  'tour_guide_yearly',
])

export async function POST(req: Request) {
  const supabase = await getServerSupabase()
  if (!supabase) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  let body: Payload = {}
  try { body = (await req.json().catch(() => ({}))) as Payload } catch { /* allow empty body */ }
  const product: Product =
    body.product === 'verified' ? 'verified'
    : body.product === 'subscription_yearly' ? 'subscription_yearly'
    : body.product === 'rental_company_monthly' ? 'rental_company_monthly'
    : body.product === 'rental_company_yearly' ? 'rental_company_yearly'
    : body.product === 'tour_guide_monthly' ? 'tour_guide_monthly'
    : body.product === 'tour_guide_yearly' ? 'tour_guide_yearly'
    : 'subscription'
  const tier = PRICE_BY_PRODUCT[product]

  // Non-driver products (rental_company, tour_guide) don't require a
  // `drivers` row. Driver-side products still gate on the drivers row
  // so we have business_name + whatsapp for the Midtrans customer block.
  let customerName = 'Kita2u user'
  let customerPhone: string | undefined
  if (NON_DRIVER_PRODUCTS.has(product)) {
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>
    customerName = String(meta.full_name || meta.name || 'Rental Company owner')
    if (user.phone) customerPhone = '+' + user.phone
  } else {
    const { data: driver } = await supabase
      .from('drivers')
      .select('user_id, business_name, whatsapp_e164')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!driver) {
      return NextResponse.json({ error: 'Complete onboarding before paying' }, { status: 403 })
    }
    customerName = driver.business_name || 'Kita2u driver'
    customerPhone = driver.whatsapp_e164 || undefined
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
        name: customerName,
        phone: customerPhone,
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
