// ============================================================================
// Stripe Checkout — per-vendor session creation
// ----------------------------------------------------------------------------
// Each vendor configures their own Stripe secret key in the dashboard; we
// decrypt it at request time and instantiate a Stripe client scoped to
// that key. Cards never touch our infrastructure — we mint a hosted
// Checkout Session and redirect the browser to Stripe's hosted page.
//
// Currency note: Stripe treats IDR as a zero-decimal currency, so
// `unit_amount` is the rupiah figure as-is (not multiplied by 100).
// ============================================================================

import Stripe from 'stripe'
import type { CheckoutOrderContext } from './types'

export type CreateStripeSessionInput = {
  vendorSecret:    string
  order:           CheckoutOrderContext
  returnOriginUrl: string  // e.g. https://citydrivers.id — used to build success/cancel URLs
}

export type CreateStripeSessionResult = {
  session_id: string
  url:        string
}

export async function createStripeCheckoutSession(
  input: CreateStripeSessionInput,
): Promise<CreateStripeSessionResult> {
  const { vendorSecret, order, returnOriginUrl } = input
  if (!vendorSecret) throw new Error('stripe_secret_key_missing')
  if (!order.items?.length) throw new Error('stripe_no_items')

  // apiVersion left to the SDK default so we don't have to bump it
  // every time Stripe ships a new version — the SDK pins to the
  // version it was built against, which is always fine for Checkout.
  const stripe = new Stripe(vendorSecret)

  const line_items = order.items.map((item) => ({
    price_data: {
      currency: 'idr',
      // IDR is zero-decimal in Stripe — unit_amount is the rupiah figure as-is.
      unit_amount: Math.round(item.price_idr),
      product_data: {
        name: item.name.slice(0, 250),
        ...(item.image_url ? { images: [item.image_url] } : {}),
      },
    },
    quantity: item.qty,
  }))

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items,
    success_url: `${returnOriginUrl}/order/${order.orderId}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${returnOriginUrl}/order/${order.orderId}/cancel`,
    customer_email: order.customerEmail || undefined,
    metadata: { order_id: order.orderId },
  })

  if (!session.id || !session.url) {
    throw new Error('stripe_session_missing_url')
  }
  return { session_id: session.id, url: session.url }
}
