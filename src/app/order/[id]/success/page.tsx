'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { CheckCircle, Clock, Receipt, Printer, ArrowLeft } from 'lucide-react'

// /order/[id]/success — customer-facing confirmation after Stripe / Midtrans
// success redirect. Deliberately AppNav-free: the customer just paid and
// shouldn't see the vendor's dashboard chrome. Polls /api/orders/[id]
// every 3s while payment_status='pending' for up to 60s before giving up
// gracefully with a "still processing" message.

type Order = {
  id:               string
  line_items:       Array<{ name: string; price_idr: number; qty: number; image_url?: string | null }>
  total_idr:        number
  currency:         string
  payment_status:   'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled'
  payment_provider: string | null
  vendor_type:      string
  vendor_id:        string
  scheduled_at:     string | null
  created_at:       string
}

type Vendor = { display_name: string; slug: string | null }

const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS  = 60_000

function fmtMoney(amount: number, currency: string): string {
  // Customer-facing receipt — show full digits, no k/M abbreviation.
  // Currency renders before the amount, e.g. "IDR 350,000".
  if (currency === 'IDR') return `Rp ${amount.toLocaleString('id-ID')}`
  return `${currency} ${amount.toLocaleString('en-US')}`
}

function fmtScheduled(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

// Path back to the vendor profile. Beautician + handyman + laundry + etc.
// all live under /<vendor_type>/<slug>. Tour-guide / rentals / place need
// different roots so we map them.
function vendorHref(vendorType: string, slug: string | null): string {
  if (!slug) return '/'
  switch (vendorType) {
    case 'beautician':  return `/beautician/${slug}`
    case 'handyman':    return `/handyman/${slug}`
    case 'laundry':     return `/laundry/${slug}`
    case 'massage':     return `/massage/${slug}`
    case 'home-clean':  return `/home-clean/${slug}`
    case 'tour-guide':  return `/tour/${slug}`
    case 'rentals':     return `/rent/${slug}`
    case 'place':       return `/places/${slug}`
    case 'facial':      return `/facial/${slug}`
    case 'skincare':    return `/skincare/${slug}`
    default:            return '/'
  }
}

export default function OrderSuccessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [order,  setOrder]  = useState<Order | null>(null)
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [err,    setErr]    = useState<string | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  // Poll only while pending. Stops as soon as payment_status flips.
  const polledForMs = useRef(0)

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/orders/${id}`, { cache: 'no-store' })
      if (r.status === 404) { setErr('not_found'); return }
      if (!r.ok)            { setErr('fetch_failed'); return }
      const j = await r.json() as { order: Order; vendor: Vendor }
      setOrder(j.order)
      setVendor(j.vendor)
      setErr(null)
    } catch { setErr('fetch_failed') }
  }, [id])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!order || order.payment_status !== 'pending') return
    if (timedOut) return
    const t = setInterval(async () => {
      polledForMs.current += POLL_INTERVAL_MS
      if (polledForMs.current >= POLL_TIMEOUT_MS) {
        setTimedOut(true)
        clearInterval(t)
        return
      }
      await load()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(t)
  }, [order, timedOut, load])

  // ───── Render states ─────────────────────────────────────────────

  if (err === 'not_found') {
    return (
      <Shell>
        <div className="px-4 pt-24 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black mb-2 text-black">Order not found</h1>
          <p className="text-[13px] text-black/60 leading-snug">We couldn&rsquo;t find an order with this id. Check the link and try again.</p>
          <Link href="/" className="mt-6 inline-block rounded-full bg-black text-white px-6 py-3 text-[13px] font-extrabold">Back to home</Link>
        </div>
      </Shell>
    )
  }

  if (!order) {
    return (
      <Shell>
        <Skeleton />
      </Shell>
    )
  }

  const scheduledLabel = fmtScheduled(order.scheduled_at)
  const back = vendorHref(order.vendor_type, vendor?.slug ?? null)

  if (order.payment_status === 'pending') {
    return (
      <Shell>
        <PopKeyframes />
        <div className="max-w-md mx-auto px-4 pt-16 pb-12">
          <div className="text-center">
            <div className="cr-pop inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 text-amber-600 mb-5">
              <Clock size={44} strokeWidth={2.2} className="animate-pulse" />
            </div>
            <h1 className="text-[24px] font-black text-black leading-tight">
              {timedOut ? 'Still processing' : 'Payment processing'}
            </h1>
            <p className="mt-2 text-[13px] text-black/60 leading-snug">
              {timedOut
                ? 'Your payment is still being confirmed. Come back in a few minutes — we&rsquo;ll email you the receipt once it settles.'
                : 'Confirming your payment with the bank. This usually takes a few seconds.'}
            </p>
          </div>

          <OrderCard order={order} />

          <div className="mt-6 grid grid-cols-1 gap-2">
            <Link
              href={back}
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-black text-white px-5 py-3 text-[13px] font-extrabold uppercase tracking-wider min-h-[44px] transition active:scale-[0.98]"
            >
              <ArrowLeft size={14} strokeWidth={3} />
              Back to {vendor?.display_name ?? 'vendor'}
            </Link>
          </div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <PopKeyframes />
      <div className="max-w-md mx-auto px-4 pt-16 pb-12">
        <div className="text-center">
          <div className="cr-pop inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 mb-5">
            <CheckCircle size={48} strokeWidth={2.2} />
          </div>
          <h1 className="text-[26px] font-black text-black leading-tight">Payment successful</h1>
          <p className="mt-2 text-[13px] text-black/60 leading-snug">
            Thanks for your order. {vendor?.display_name ? `${vendor.display_name} has been notified.` : ''}
          </p>
          <div className="mt-3 inline-block rounded-full bg-gray-100 border border-gray-200 px-3 py-1 text-[12px] font-bold font-mono text-black/70">
            #{order.id.slice(0, 8)}
          </div>
        </div>

        <OrderCard order={order} />

        {scheduledLabel && (
          <div className="mt-3 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-[13px] text-emerald-800 inline-flex items-center gap-2">
            <Clock size={14} strokeWidth={2.5} className="shrink-0" />
            <span><strong className="font-extrabold">Scheduled for</strong> {scheduledLabel}</span>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-2">
          <Link
            href={back}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-black text-white px-5 py-3 text-[13px] font-extrabold uppercase tracking-wider min-h-[44px] transition active:scale-[0.98]"
          >
            <ArrowLeft size={14} strokeWidth={3} />
            Back to {vendor?.display_name ?? 'vendor'}
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white border border-gray-300 text-black px-5 py-3 text-[13px] font-extrabold uppercase tracking-wider min-h-[44px] transition active:scale-[0.98]"
          >
            <Printer size={14} strokeWidth={3} />
            View receipt
          </button>
        </div>

        <p className="mt-6 text-center text-[11px] text-black/40 leading-snug">
          A confirmation email will arrive shortly. Keep this page or the order id for your records.
        </p>
      </div>
    </Shell>
  )
}

function OrderCard({ order }: { order: Order }) {
  return (
    <div className="mt-6 rounded-3xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <Receipt size={14} strokeWidth={2.5} className="text-black/55" />
        <h2 className="text-[12px] font-extrabold uppercase tracking-wider text-black/55">Your order</h2>
      </div>
      <ul className="divide-y divide-gray-100">
        {order.line_items.map((li, i) => (
          <li key={i} className="px-4 py-3 flex items-center gap-3">
            {li.image_url ? (
              <img src={li.image_url} alt="" className="w-12 h-12 rounded-xl object-cover bg-gray-100 shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gray-100 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-black truncate">{li.name}</div>
              <div className="text-[12px] text-black/55 tabular-nums">× {li.qty}</div>
            </div>
            <div className="text-[13px] font-extrabold tabular-nums text-black">
              {fmtMoney(li.price_idr * li.qty, order.currency)}
            </div>
          </li>
        ))}
      </ul>
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <span className="text-[13px] font-extrabold text-black/70 uppercase tracking-wider">Total</span>
        <span className="text-[18px] font-black tabular-nums text-black">{fmtMoney(order.total_idr, order.currency)}</span>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="max-w-md mx-auto px-4 pt-16 pb-12 animate-pulse">
      <div className="flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-gray-200" />
        <div className="mt-5 h-6 w-56 rounded-md bg-gray-200" />
        <div className="mt-2 h-3 w-40 rounded-md bg-gray-100" />
        <div className="mt-3 h-5 w-24 rounded-full bg-gray-100" />
      </div>
      <div className="mt-6 rounded-3xl bg-gray-100 h-44" />
      <div className="mt-6 h-12 rounded-2xl bg-gray-200" />
    </div>
  )
}

function PopKeyframes() {
  // Inline so the page is self-contained and the keyframe can't collide
  // with the dashboard's global stylesheet.
  return (
    <style jsx global>{`
      @keyframes cr-success-pop {
        0%   { transform: scale(0.4); opacity: 0; }
        60%  { transform: scale(1.12); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      .cr-pop { animation: cr-success-pop 480ms cubic-bezier(0.34, 1.56, 0.64, 1) both; }
      @media print {
        button, a[href] { display: none !important; }
      }
    `}</style>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] bg-gradient-to-b from-white via-white to-gray-50 text-black">
      {children}
    </main>
  )
}
