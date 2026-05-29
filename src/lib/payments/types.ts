// ============================================================================
// Shared payment types — Stripe + Midtrans vendor-direct checkout
// ----------------------------------------------------------------------------
// Indocity is a SaaS tool: each vendor brings their own Stripe / Midtrans
// keys. Cards never touch our servers — we hand the customer off to the
// vendor's hosted Checkout page (Stripe Checkout or Midtrans Snap).
//
// These types are the contract between:
//   • the cart UI on the public profile page
//   • POST /api/checkout (creates the order + checkout session)
//   • the Stripe / Midtrans webhook handlers that settle the order
// ============================================================================

export type CheckoutLineItem = {
  offer_id:  string
  name:      string
  price_idr: number
  qty:       number
  image_url?: string | null
}

export type CheckoutRequest = {
  vendor_type:     string
  vendor_id:       string
  items:           CheckoutLineItem[]
  customer_name?:  string
  customer_email?: string
  customer_phone?: string
  notes?:          string
  scheduled_at?:   string  // ISO 8601 — when the customer wants the service
}

export type CheckoutResponse = {
  order_id:     string
  checkout_url: string  // browser does window.location = checkout_url
}

// Internal helpers — not part of the wire contract, but co-located so
// the checkout route + per-provider helpers agree on shape.

export type VendorPaymentRow = {
  id:                       string
  payment_provider:         'none' | 'stripe' | 'midtrans'
  stripe_secret_key_enc:    string | null
  stripe_publishable_key:   string | null
  midtrans_server_key_enc:  string | null
  midtrans_client_key:      string | null
  midtrans_is_production:   boolean
}

export type CheckoutOrderContext = {
  orderId:        string
  totalIdr:       number
  items:          CheckoutLineItem[]
  customerName?:  string
  customerEmail?: string
  customerPhone?: string
}
