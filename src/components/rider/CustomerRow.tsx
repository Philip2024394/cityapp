'use client'
import { MessageCircle, MapPin } from 'lucide-react'
import type { Customer } from '@/data/mockCustomers'
import { idr } from '@/lib/format/idr'

type Props = {
  customer: Customer
  onPesanUlang: () => void
  onQuickPing: () => void
}

export default function CustomerRow({ customer, onPesanUlang, onQuickPing }: Props) {
  const initials = (customer.displayName ?? '?').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()
  const isRepeat = customer.totalTrips >= 2
  return (
    <article className="card card-driver p-4 relative overflow-hidden animate-[fadeUp_0.4s_ease-out_both]">
      <div className="flex gap-3 items-start">
        {/* Avatar w/ initials */}
        <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-brand/25 to-brand2/15 border border-brand/30 flex items-center justify-center font-extrabold text-brand text-[15px]">
          {initials !== '?' ? initials : (customer.whatsappE164.slice(-2))}
        </div>

        {/* Name + WhatsApp + route */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-extrabold text-[15px] truncate max-w-[170px]">
              {customer.displayName ?? `+${customer.whatsappE164}`}
            </span>
            {isRepeat && (
              <span className="chip text-[13px] py-0.5 px-2">
                {customer.totalTrips}× repeat
              </span>
            )}
          </div>
          {customer.displayName && (
            <div className="text-[13px] text-dim font-mono mt-0.5">+{customer.whatsappE164}</div>
          )}
          <div className="text-[13px] text-muted mt-1.5 flex items-center gap-1 min-w-0">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{customer.lastRoute}</span>
          </div>
        </div>

        {/* Revenue block */}
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-dim leading-none">Total</div>
          <div className="text-[15px] font-extrabold gradient-text leading-tight mt-1 whitespace-nowrap">
            {idr(customer.totalRevenue)}
          </div>
          <div className="text-[12px] text-muted leading-none mt-1 whitespace-nowrap">
            {relativeTime(customer.lastContactAt)}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="mt-3 pt-3 border-t border-line flex items-center gap-2">
        <button
          onClick={onQuickPing}
          className="flex-1 px-3 py-2 rounded-xl border border-line text-[13px] font-bold text-muted hover:text-ink hover:border-brand/40 transition min-h-[44px]"
        >
          Kabari online
        </button>
        <button
          onClick={onPesanUlang}
          className="flex-[1.2] btn-wa-compact min-h-[44px]"
          aria-label={`Pesan ulang ${customer.displayName ?? customer.whatsappE164}`}
        >
          <MessageCircle className="w-4 h-4" aria-hidden />
          Pesan ulang
        </button>
      </div>
    </article>
  )
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.round(diff / 60_000)
  if (m < 1) return 'baru saja'
  if (m < 60) return `${m}m lalu`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}j lalu`
  const d = Math.round(h / 24)
  if (d < 30) return `${d}h lalu`
  return `${Math.round(d / 30)}bl lalu`
}
