'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ShoppingBag, RefreshCcw, ChevronDown, ChevronUp,
  Phone, Mail, MessageCircle, Loader2, Check, X as XIcon, PackageCheck, Inbox,
} from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { countryByCode } from '@/lib/data/countries'

// /dashboard/facial/orders — the vendor's cart-order inbox. Lists every
// vendor_orders row owned by this facial provider, with filter chips, expand-to-
// see-detail rows, and Accept / Fulfill / Cancel actions that POST to
// /api/facial/me/orders/[id].
//
// Stays close to /dashboard/facial/promos for visual parity — same
// Shell, brand-header style, 13px text floor, 44px tap targets.

type LineItem = {
  offer_id?:  string
  name:       string
  price_idr:  number
  qty:        number
  image_url?: string | null
}

type Order = {
  id: string
  vendor_type: string
  vendor_id:   string
  line_items:  LineItem[]
  subtotal_idr:     number
  service_fee_idr:  number
  total_idr:        number
  currency:         string
  customer_name:    string | null
  customer_email:   string | null
  customer_phone:   string | null
  scheduled_at:     string | null
  notes:            string | null
  payment_provider: string | null
  payment_ref:      string | null
  payment_status:   'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled'
  paid_at:          string | null
  fulfillment_status: 'new' | 'accepted' | 'fulfilled' | 'cancelled'
  created_at:       string
  updated_at:       string
}

type Provider = {
  id: string
  display_name: string
  country_code?: string | null
}

type Filter = 'all' | 'pending' | 'paid' | 'fulfilled'

export default function FacialOrdersPage() {
  const [provider, setProvider] = useState<Provider | null>(null)
  const [orders,   setOrders]   = useState<Order[]>([])
  const [loading,  setLoading]  = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [err,      setErr]      = useState<string | null>(null)
  const [filter,   setFilter]   = useState<Filter>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const reload = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true)
    setErr(null)
    try {
      const [pRes, oRes] = await Promise.all([
        fetch('/api/facial/me', { cache: 'no-store' }),
        fetch('/api/facial/me/orders?status=all', { cache: 'no-store' }),
      ])
      if (pRes.status === 401) { setErr('not_signed_in'); return }
      const pj = await pRes.json() as { provider: Provider | null }
      const oj = await oRes.json() as { orders: Order[] }
      setProvider(pj.provider)
      setOrders(oj.orders ?? [])
    } catch { setErr('fetch_failed') }
    finally { setLoading(false); setRefreshing(false) }
  }, [])
  useEffect(() => { void reload() }, [reload])

  const currencySym = countryByCode(provider?.country_code ?? 'ID').currency_symbol

  // Pre-compute counts per chip so badges always reflect the unfiltered total.
  const counts = useMemo(() => ({
    all:       orders.length,
    pending:   orders.filter((o) => o.payment_status === 'pending').length,
    paid:      orders.filter((o) => o.payment_status === 'paid').length,
    fulfilled: orders.filter((o) => o.fulfillment_status === 'fulfilled').length,
  }), [orders])

  const visible = useMemo(() => {
    switch (filter) {
      case 'pending':   return orders.filter((o) => o.payment_status === 'pending')
      case 'paid':      return orders.filter((o) => o.payment_status === 'paid')
      case 'fulfilled': return orders.filter((o) => o.fulfillment_status === 'fulfilled')
      default:          return orders
    }
  }, [filter, orders])

  // Optimistic-ish update on a single row after the action API resolves.
  function applyOrderUpdate(updated: Order) {
    setOrders((cur) => cur.map((o) => (o.id === updated.id ? updated : o)))
  }

  if (loading) return <Shell><Loading /></Shell>
  if (err === 'not_signed_in') {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black mb-2">Sign in required</h1>
          <Link href="/login?next=/dashboard/facial/orders" className="rounded-full bg-pink-500 text-white px-6 py-3 text-[14px] font-extrabold inline-block">Sign in</Link>
        </div>
      </Shell>
    )
  }
  if (!provider) return <Shell><div className="px-4 pt-20 text-center text-black/70">No facial profile yet.</div></Shell>

  return (
    <Shell>
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-32">
        {/* Brand header */}
        <div className="rounded-3xl border border-pink-200/70 bg-gradient-to-br from-pink-50 to-white p-5 shadow-sm mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <ShoppingBag size={22} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[20px] font-black leading-tight text-black truncate">Orders</h1>
              <p className="text-[12.5px] text-black/70 leading-snug">
                Track payments and fulfill jobs.
              </p>
            </div>
            <button
              type="button"
              onClick={() => reload(true)}
              disabled={refreshing}
              aria-label="Refresh"
              className="w-11 h-11 rounded-2xl bg-white border border-pink-200 hover:bg-pink-50 flex items-center justify-center text-pink-600 disabled:opacity-50 transition active:scale-[0.96]"
            >
              {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} strokeWidth={2.5} />}
            </button>
          </div>
        </div>

        {/* Filter chips with counts */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto -mx-1 px-1">
          {([
            { key: 'all',       label: 'All',       count: counts.all },
            { key: 'pending',   label: 'Pending',   count: counts.pending },
            { key: 'paid',      label: 'Paid',      count: counts.paid },
            { key: 'fulfilled', label: 'Fulfilled', count: counts.fulfilled },
          ] as Array<{ key: Filter; label: string; count: number }>).map((c) => {
            const on = filter === c.key
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setFilter(c.key)}
                aria-pressed={on}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-extrabold uppercase tracking-wider border min-h-[40px] transition ${
                  on
                    ? 'bg-pink-500 text-white border-pink-500'
                    : 'bg-white text-black/70 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {c.label}
                <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10.5px] tabular-nums ${
                  on ? 'bg-white/25 text-white' : 'bg-gray-100 text-black/55'
                }`}>{c.count}</span>
              </button>
            )
          })}
        </div>

        {err === 'fetch_failed' && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-[12.5px] px-4 py-3 mb-3">
            Couldn&rsquo;t load orders. Tap refresh to try again.
          </div>
        )}

        {visible.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <div className="space-y-3">
            {visible.map((o) => (
              <OrderRow
                key={o.id}
                order={o}
                expanded={expanded === o.id}
                currencySym={currencySym}
                onToggle={() => setExpanded((cur) => (cur === o.id ? null : o.id))}
                onUpdated={applyOrderUpdate}
              />
            ))}
          </div>
        )}
      </div>
    </Shell>
  )
}

// ───── Row ───────────────────────────────────────────────────────────

function OrderRow({
  order, expanded, currencySym, onToggle, onUpdated,
}: {
  order:        Order
  expanded:     boolean
  currencySym:  string
  onToggle:     () => void
  onUpdated:    (next: Order) => void
}) {
  const [busy, setBusy] = useState<null | 'accept' | 'fulfill' | 'cancel'>(null)
  const [actionErr, setActionErr] = useState<string | null>(null)

  async function setStatus(next: 'accepted' | 'fulfilled' | 'cancelled', kind: 'accept' | 'fulfill' | 'cancel') {
    if (kind === 'cancel' && !confirm('Cancel this order? The customer will need to be refunded separately if they already paid.')) return
    setBusy(kind); setActionErr(null)
    try {
      const r = await fetch(`/api/facial/me/orders/${order.id}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ fulfillment_status: next }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.ok) {
        setActionErr(j?.error === 'not_found' ? 'Order not found.' : 'Update failed.')
        return
      }
      onUpdated(j.order as Order)
    } catch { setActionErr('Network error.') }
    finally { setBusy(null) }
  }

  const itemsLabel = summariseItems(order.line_items)

  return (
    <div className="rounded-3xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50/60 transition min-h-[64px]"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 justify-between">
            <span className="text-[14px] font-black text-black truncate">{order.customer_name ?? 'Guest customer'}</span>
            <span className="text-[16px] font-black tabular-nums text-black shrink-0">{fmtMoney(order.total_idr, order.currency, currencySym)}</span>
          </div>
          <div className="flex items-center gap-2 text-[11.5px] text-black/45 mt-0.5">
            <span>{relTime(order.created_at)}</span>
            <span aria-hidden>·</span>
            <span className="font-mono">#{order.id.slice(0, 6)}</span>
          </div>
          <p className="text-[12.5px] text-black/65 mt-1 line-clamp-2 leading-snug">{itemsLabel}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <PaymentBadge status={order.payment_status} />
            <FulfillmentBadge status={order.fulfillment_status} />
          </div>
        </div>
        <div className="pt-1 text-black/40 shrink-0">
          {expanded ? <ChevronUp size={16} strokeWidth={2.5} /> : <ChevronDown size={16} strokeWidth={2.5} />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 bg-gray-50/50">
          {/* Customer block */}
          <div className="space-y-2 mb-4">
            {order.customer_email && (
              <a
                href={`mailto:${order.customer_email}`}
                className="inline-flex items-center gap-2 text-[12.5px] text-black/80 hover:text-pink-600 break-all"
              >
                <Mail size={13} strokeWidth={2.5} className="shrink-0" />
                {order.customer_email}
              </a>
            )}
            {order.customer_phone && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-2 text-[12.5px] text-black/80">
                  <Phone size={13} strokeWidth={2.5} className="shrink-0" />
                  {order.customer_phone}
                </span>
                <a
                  href={`https://wa.me/${order.customer_phone.replace(/[^\d]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 text-[11.5px] font-extrabold uppercase tracking-wider min-h-[32px] transition"
                >
                  <MessageCircle size={12} strokeWidth={2.5} />
                  WhatsApp
                </a>
              </div>
            )}
            {order.scheduled_at && (
              <div className="text-[12.5px] text-black/70">
                <strong className="font-extrabold text-black/80">Scheduled:</strong> {fmtDate(order.scheduled_at)}
              </div>
            )}
            {order.notes && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[12.5px] px-3 py-2 leading-snug">
                <strong className="font-extrabold">Notes:</strong> {order.notes}
              </div>
            )}
            {order.payment_ref && (
              <div className="text-[11px] text-black/40 font-mono break-all">
                {order.payment_provider ?? 'payment'} · {order.payment_ref}
              </div>
            )}
          </div>

          {/* Line items full list */}
          <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden mb-4">
            <ul className="divide-y divide-gray-100">
              {order.line_items.map((li, i) => (
                <li key={i} className="px-3 py-2 flex items-center gap-2.5">
                  {li.image_url ? (
                    <img src={li.image_url} alt="" className="w-9 h-9 rounded-lg object-cover bg-gray-100 shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-gray-100 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-bold text-black truncate">{li.name}</div>
                    <div className="text-[11.5px] text-black/50 tabular-nums">× {li.qty}</div>
                  </div>
                  <div className="text-[12.5px] font-extrabold tabular-nums text-black">
                    {fmtMoney(li.price_idr * li.qty, order.currency, currencySym)}
                  </div>
                </li>
              ))}
            </ul>
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[11.5px] font-extrabold text-black/55 uppercase tracking-wider">Total</span>
              <span className="text-[14px] font-black tabular-nums text-black">{fmtMoney(order.total_idr, order.currency, currencySym)}</span>
            </div>
          </div>

          {actionErr && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[12px] px-3 py-2 mb-3">{actionErr}</div>
          )}

          {/* Actions — gated on current fulfillment_status */}
          <div className="flex flex-wrap gap-2">
            {order.fulfillment_status === 'new' && (
              <button
                type="button"
                onClick={() => setStatus('accepted', 'accept')}
                disabled={busy !== null}
                className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2.5 text-[12px] font-extrabold uppercase tracking-wider min-h-[44px] disabled:opacity-50 transition"
              >
                {busy === 'accept' ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} strokeWidth={3} />}
                Accept
              </button>
            )}
            {order.fulfillment_status === 'accepted' && (
              <button
                type="button"
                onClick={() => setStatus('fulfilled', 'fulfill')}
                disabled={busy !== null}
                className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 text-[12px] font-extrabold uppercase tracking-wider min-h-[44px] disabled:opacity-50 transition"
              >
                {busy === 'fulfill' ? <Loader2 size={13} className="animate-spin" /> : <PackageCheck size={13} strokeWidth={2.5} />}
                Mark fulfilled
              </button>
            )}
            {order.fulfillment_status !== 'cancelled' && order.fulfillment_status !== 'fulfilled' && (
              <button
                type="button"
                onClick={() => setStatus('cancelled', 'cancel')}
                disabled={busy !== null}
                className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 px-4 py-2.5 text-[12px] font-extrabold uppercase tracking-wider min-h-[44px] disabled:opacity-50 transition"
              >
                {busy === 'cancel' ? <Loader2 size={13} className="animate-spin" /> : <XIcon size={13} strokeWidth={3} />}
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ───── Badges ────────────────────────────────────────────────────────

function PaymentBadge({ status }: { status: Order['payment_status'] }) {
  const map: Record<Order['payment_status'], { label: string; cls: string }> = {
    pending:   { label: 'Pending',   cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    paid:      { label: 'Paid',      cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    failed:    { label: 'Failed',    cls: 'bg-rose-100 text-rose-700 border-rose-200' },
    refunded:  { label: 'Refunded',  cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    cancelled: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  }
  const c = map[status]
  return (
    <span className={`inline-flex items-center text-[10.5px] font-extrabold uppercase tracking-wider rounded-full px-2 py-0.5 border ${c.cls}`}>
      {c.label}
    </span>
  )
}

function FulfillmentBadge({ status }: { status: Order['fulfillment_status'] }) {
  const map: Record<Order['fulfillment_status'], { label: string; cls: string }> = {
    new:       { label: 'New',       cls: 'bg-sky-100 text-sky-700 border-sky-200' },
    accepted:  { label: 'Accepted',  cls: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    fulfilled: { label: 'Fulfilled', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    cancelled: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  }
  const c = map[status]
  return (
    <span className={`inline-flex items-center text-[10.5px] font-extrabold uppercase tracking-wider rounded-full px-2 py-0.5 border ${c.cls}`}>
      {c.label}
    </span>
  )
}

// ───── Empty state ───────────────────────────────────────────────────

function EmptyState({ filter }: { filter: Filter }) {
  const copy = filter === 'all'
    ? 'Orders will appear here once a customer pays.'
    : `No ${filter} orders right now.`
  return (
    <div className="rounded-3xl bg-white border border-gray-200 p-10 text-center shadow-sm">
      <Inbox className="w-10 h-10 text-pink-200 mx-auto mb-3" strokeWidth={2} />
      <h2 className="text-[16px] font-black text-black">No orders yet</h2>
      <p className="text-[13px] text-black/55 leading-snug mt-1 max-w-sm mx-auto">{copy}</p>
    </div>
  )
}

// ───── Helpers ───────────────────────────────────────────────────────

function summariseItems(items: LineItem[]): string {
  if (!items?.length) return 'No items'
  return items.map((li) => `${li.name} × ${li.qty}`).join(', ')
}

function fmtMoney(amount: number, currency: string, currencySym: string): string {
  if (currency === 'IDR' || currencySym === 'Rp') {
    return `Rp ${amount.toLocaleString('id-ID')}`
  }
  return `${currencySym} ${amount.toLocaleString('en-US')}`
}

function relTime(iso: string): string {
  const t  = new Date(iso).getTime()
  const dt = Date.now() - t
  if (Number.isNaN(t)) return ''
  const s = Math.floor(dt / 1000)
  if (s < 60)   return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  const h = Math.floor(s / 3600)
  if (h < 24)   return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)    return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

// ───── Shell ─────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] bg-white text-black">
      <AppNav />
      {children}
    </main>
  )
}
function Loading() {
  return <div className="flex items-center justify-center pt-32"><div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" /></div>
}
