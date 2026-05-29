'use client'
import { useEffect, useState } from 'react'
import { ShoppingBag, X, Minus, Plus, MessageCircle } from 'lucide-react'
import { formatWhatsAppCartMessage } from './whatsappCartMessage'
import type { VendorCartItem } from './useVendorCart'

// =============================================================================
// VendorCartSheet — vendor-agnostic bottom-anchored cart review modal.
//
// Lifted from PlaceProfileShell's PlaceCartSheet, generalized so any
// vertical (beautician, handyman, laundry, massage, home-clean, tour
// guide) can drop in the same UI. Three checkout modes:
//
//   - paymentProvider='none'     → WhatsApp-only (current /food behavior)
//   - paymentProvider='stripe'   → "Pay with card" primary CTA + WA fallback
//   - paymentProvider='midtrans' → "Pay (cards / QRIS / bank)" primary CTA + WA fallback
//
// When a paid mode is active we POST the cart payload to `checkoutEndpoint`
// and follow the returned `checkout_url`. The WhatsApp link is ALWAYS
// rendered as a secondary action — the vendor's WA stays an option even
// when checkout is on, per founder direction.
//
// Vendor-specific niceties from the /food version (delivery estimate row,
// "Free delivery by venue" pill, geo lookups) are NOT lifted here — those
// belong to places-specific logic and live in PlaceProfileShell. This
// sheet is the lowest common denominator that works for every vertical.
// =============================================================================

const BRAND_YELLOW = '#FACC15'
const BRAND_NAVY   = '#0F172A'

type CheckoutResponse = {
  checkout_url?: string
  error?:        string
}

export type VendorCartSheetProps = {
  open:            boolean
  onClose:         () => void
  items:           VendorCartItem[]
  setQty:          (offerId: string, qty: number) => void
  remove:          (offerId: string) => void
  clear:           () => void
  totalIdr:        number
  totalQty:        number
  themeColor:      string
  currencySymbol:  string
  vendorName:      string
  /** WhatsApp number for the WhatsApp fallback CTA. Always shown. */
  whatsappE164?:   string | null
  /** Payment mode. 'none' = WhatsApp only. 'stripe' / 'midtrans' show a
   *  "Pay" CTA which posts to the checkout API and redirects. */
  paymentProvider: 'none' | 'stripe' | 'midtrans'
  /** Where to POST to start a paid checkout. Receives the cart. */
  checkoutEndpoint?: string
  /** Vendor identifier used in the checkout POST body. */
  vendorType: string
  vendorId:   string
}

// Exact rupiah formatter — abbreviation belongs to "Start from" labels,
// the cart sheet shows full precision.
function formatRpExact(amount: number, symbol: string): string {
  if (!Number.isFinite(amount) || amount <= 0) return `${symbol} 0`
  return `${symbol} ${Math.round(amount).toLocaleString('id-ID')}`
}

export default function VendorCartSheet({
  open, onClose, items, setQty, remove, clear,
  totalIdr, totalQty, themeColor, currencySymbol, vendorName,
  whatsappE164, paymentProvider, checkoutEndpoint, vendorType, vendorId,
}: VendorCartSheetProps) {
  const empty = items.length === 0

  // ------------------------------------------------------------------
  // Body scroll lock while the sheet is open. Restoring the original
  // overflow on close avoids stranding the page in a locked state if
  // the customer dismisses by tapping the scrim.
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!open) return
    if (typeof document === 'undefined') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // ------------------------------------------------------------------
  // Paid checkout state machine. Idle → posting → (redirect | error).
  // ------------------------------------------------------------------
  const [posting,    setPosting]    = useState(false)
  const [postError,  setPostError]  = useState<string | null>(null)

  const showPayCta = paymentProvider !== 'none'

  const payLabel = paymentProvider === 'stripe'
    ? 'Pay with card'
    : paymentProvider === 'midtrans'
      ? 'Pay (cards / QRIS / bank)'
      : ''

  const digits  = (whatsappE164 || '').replace(/[^\d]/g, '')
  const canSendWa = !empty && digits.length > 0

  const waHref = canSendWa
    ? `https://wa.me/${digits}?text=${encodeURIComponent(
        formatWhatsAppCartMessage(items, totalIdr, currencySymbol, vendorName),
      )}`
    : null

  async function handlePay() {
    if (empty || !checkoutEndpoint) return
    setPosting(true)
    setPostError(null)
    try {
      const res = await fetch(checkoutEndpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          vendor_type: vendorType,
          vendor_id:   vendorId,
          items:       items.map((it) => ({
            offer_id:  it.offer_id,
            name:      it.name,
            price_idr: it.price_idr,
            qty:       it.qty,
          })),
          total_idr: totalIdr,
        }),
      })
      const json = (await res.json().catch(() => ({}))) as CheckoutResponse
      if (!res.ok || !json.checkout_url) {
        throw new Error(json.error || `Checkout failed (${res.status})`)
      }
      // Successful POST → follow the hosted checkout URL. We leave the
      // cart populated so a customer who bounces back from a cancelled
      // payment doesn't have to re-add every item.
      window.location.href = json.checkout_url
    } catch (err) {
      setPostError(err instanceof Error ? err.message : 'Could not start checkout')
      setPosting(false)
    }
    // No `finally` reset — on success we navigate away; on failure the
    // catch already cleared posting=false above.
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Your cart"
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl relative flex flex-col max-h-[90dvh]"
        style={{ borderTop: `4px solid ${themeColor}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle — small grey bar at the top, mirrors the food sheet's
            mobile affordance. Decorative; the scrim is the real dismiss. */}
        <div className="pt-2 pb-1 flex justify-center shrink-0" aria-hidden>
          <span
            className="block rounded-full"
            style={{ width: 38, height: 4, background: '#E5E7EB' }}
          />
        </div>

        {/* Header — themed cart icon + "Your cart" + close X. */}
        <div className="px-5 pt-2 pb-2 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full"
              style={{ background: themeColor }}
              aria-hidden
            >
              <ShoppingBag className="w-4 h-4 text-black" strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
              <h3 className="text-[15px] font-black text-black truncate">
                Your cart · <span className="font-extrabold">{vendorName}</span>
              </h3>
              <div className="text-[12px] text-gray-500 mt-0.5">
                {totalQty > 0
                  ? `${totalQty} item${totalQty === 1 ? '' : 's'}`
                  : 'No items yet'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close cart"
            className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center shrink-0"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <X className="w-4 h-4 text-gray-600" strokeWidth={2.5} />
          </button>
        </div>

        {/* Body — scrollable line items or empty state. */}
        <div className="px-5 py-2 overflow-y-auto flex-1">
          {empty ? (
            <div
              className="text-center py-10 px-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50"
            >
              <ShoppingBag className="w-7 h-7 mx-auto text-gray-400 mb-2" strokeWidth={2} />
              <div className="text-[13px] font-extrabold text-gray-700">
                Your cart is empty.
              </div>
              <div className="text-[13px] text-gray-500 mt-1">
                Tap an offer to add.
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map((it) => (
                <li key={it.offer_id} className="py-3 flex items-start gap-3">
                  {it.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.image_url}
                      alt={it.name}
                      className="w-14 h-14 rounded-lg object-cover bg-gray-100 shrink-0 border border-gray-200"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-gray-400" strokeWidth={2} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-extrabold text-black leading-tight line-clamp-2">
                      {it.name}
                    </div>
                    <div className="text-[13px] text-gray-500 mt-0.5">
                      {formatRpExact(it.price_idr, currencySymbol)} each
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQty(it.offer_id, it.qty - 1)}
                          aria-label={`Decrease quantity of ${it.name}`}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-black active:scale-[0.95] transition"
                          style={{ minWidth: 44, minHeight: 44, background: themeColor }}
                        >
                          <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </button>
                        <span
                          className="text-[14px] font-black text-black tabular-nums"
                          style={{ minWidth: 22, textAlign: 'center' }}
                          aria-live="polite"
                        >
                          {it.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty(it.offer_id, Math.min(99, it.qty + 1))}
                          aria-label={`Increase quantity of ${it.name}`}
                          disabled={it.qty >= 99}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-black active:scale-[0.95] transition disabled:opacity-40 disabled:active:scale-100"
                          style={{ minWidth: 44, minHeight: 44, background: themeColor }}
                        >
                          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </button>
                      </div>
                      <div className="text-[13px] font-black text-black tabular-nums">
                        {formatRpExact(it.price_idr * it.qty, currencySymbol)}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(it.offer_id)}
                    aria-label={`Remove ${it.name}`}
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white active:scale-[0.95] transition"
                    style={{ minWidth: 44, minHeight: 44, background: '#B91C1C' }}
                  >
                    <X className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer — totals + actions. */}
        <div
          className="px-5 pt-3 pb-5 border-t shrink-0 space-y-3"
          style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}
        >
          {/* Subtotal — themed accent on the label so it visually ties to
              the primary CTA below. */}
          {!empty && (
            <div
              className="flex items-baseline justify-between gap-2 rounded-xl px-3 py-2"
              style={{ background: `${themeColor}1A` /* ~10% tint */ }}
            >
              <div className="text-[13px] font-extrabold uppercase tracking-wider" style={{ color: BRAND_NAVY }}>
                Subtotal
              </div>
              <div className="text-[20px] font-black text-black tabular-nums">
                {formatRpExact(totalIdr, currencySymbol)}
              </div>
            </div>
          )}

          {/* Error banner — only renders after a failed POST. */}
          {postError && (
            <div
              role="alert"
              className="rounded-xl border bg-red-50 border-red-200 text-red-700 px-3 py-2 text-[13px] font-extrabold leading-snug"
            >
              {postError}
            </div>
          )}

          {/* Primary CTA — paid checkout, only when provider is on. */}
          {showPayCta && (
            <button
              type="button"
              onClick={handlePay}
              disabled={empty || posting || !checkoutEndpoint}
              aria-disabled={empty || posting || !checkoutEndpoint}
              className="inline-flex items-center justify-center gap-1.5 w-full px-4 py-3 rounded-xl text-[13px] font-extrabold shadow-md active:scale-[0.98] transition disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed"
              style={{
                background: themeColor,
                color:      BRAND_NAVY,
                minHeight:  48,
              }}
            >
              {posting ? (
                <>
                  <span
                    className="inline-block w-4 h-4 rounded-full border-2 border-current border-r-transparent animate-spin"
                    aria-hidden
                  />
                  Redirecting…
                </>
              ) : (
                <>{payLabel}</>
              )}
            </button>
          )}

          {/* Secondary CTA — WhatsApp link. Always rendered when the
              vendor exposes a WA number, even alongside the paid CTA. */}
          {canSendWa && waHref ? (
            showPayCta ? (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  // Match /food behavior — close the sheet on send. The
                  // cart stays populated in case WA eats the prefill.
                  onClose()
                }}
                className="inline-flex items-center justify-center gap-1.5 w-full text-[13px] font-extrabold underline-offset-4 hover:underline active:scale-[0.99] transition"
                style={{ color: BRAND_NAVY, minHeight: 44 }}
              >
                <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
                Send via WhatsApp instead
              </a>
            ) : (
              // No paid checkout → WA is the primary CTA. Same yellow
              // button style PlaceCartSheet used.
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onClose()}
                className="inline-flex items-center justify-center gap-1.5 w-full px-4 py-3 rounded-xl text-[13px] font-extrabold shadow-md active:scale-[0.98] transition"
                style={{
                  background: BRAND_YELLOW,
                  color:      BRAND_NAVY,
                  minHeight:  48,
                }}
              >
                <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
                Send via WhatsApp
              </a>
            )
          ) : (
            // No WA number on file — show a disabled-style hint so the
            // customer knows what's missing rather than seeing nothing.
            !showPayCta && (
              <div
                className="text-[12px] text-gray-500 italic text-center leading-snug"
                role="note"
              >
                This vendor doesn&apos;t accept WhatsApp orders.
              </div>
            )
          )}

          {/* Clear-cart shortcut — secondary, low-emphasis. Visible only
              when there's something to clear. */}
          {!empty && (
            <div className="text-center">
              <button
                type="button"
                onClick={clear}
                className="text-[12px] text-gray-500 underline-offset-2 hover:underline font-bold"
                style={{ minHeight: 44 }}
              >
                Clear cart
              </button>
            </div>
          )}

          <p className="text-[12px] text-gray-500 leading-snug text-center">
            You pay the vendor directly · agree details with them.
          </p>
        </div>
      </div>
    </div>
  )
}
