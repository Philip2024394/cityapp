'use client'
import { MessageCircle, Clock } from 'lucide-react'
import { idr } from '@/lib/format/idr'

export type InboxQuote = {
  id: string
  pickupLabel: string
  dropoffLabel: string
  distanceKm: number
  fare: number
  receivedAt: number
  read: boolean
  customerWhatsApp?: string
}

type Props = {
  quotes: InboxQuote[]
  onReply: (q: InboxQuote) => void
}

export default function QuoteInbox({ quotes, onReply }: Props) {
  const unread = quotes.filter(q => !q.read).length

  return (
    <div className="card overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-line">
        <div>
          <div className="text-[13px] font-extrabold uppercase tracking-wider text-muted">Inbox quote</div>
          <div className="text-xl font-extrabold mt-0.5">
            {unread > 0
              ? <><span className="text-brand">{unread}</span> belum direspons</>
              : 'Semua sudah direspons'}
          </div>
        </div>
        {unread > 0 && (
          <span className="bg-brand text-bg text-[13px] font-extrabold w-7 h-7 rounded-full flex items-center justify-center">
            {unread}
          </span>
        )}
      </div>

      {quotes.length === 0 ? (
        <div className="p-8 text-center text-muted text-[14px]">
          Belum ada quote. Saat customer tap WhatsApp button di profilmu, akan muncul di sini.
        </div>
      ) : (
        <div className="divide-y divide-line">
          {quotes.map(q => (
            <div key={q.id} className="px-4 py-3 flex items-start gap-3">
              <div className={q.read ? 'w-2 h-2 rounded-full bg-line mt-2' : 'w-2 h-2 rounded-full bg-brand mt-2 shadow-glow'} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold text-[14px] truncate">
                    {q.pickupLabel || 'Lokasi A'} → {q.dropoffLabel || 'Lokasi B'}
                  </div>
                  <div className="text-brand font-extrabold text-[14px] shrink-0">{idr(q.fare)}</div>
                </div>
                <div className="text-[13px] text-muted mt-0.5 flex items-center gap-3">
                  <span>{q.distanceKm.toFixed(1)} km</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {relativeTime(q.receivedAt)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => onReply(q)}
                className="shrink-0 bg-[#25D366] text-white rounded-full px-3 py-1.5 text-[13px] font-bold flex items-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Balas
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.round(diff / 60000)
  if (m < 1) return 'baru saja'
  if (m < 60) return `${m}m`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}j`
  return `${Math.round(h / 24)}h`
}
