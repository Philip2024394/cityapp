'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, Check, Trash2, ExternalLink } from 'lucide-react'

type Row = {
  id: number
  user_id: string
  kind: string
  period_end: string
  whatsapp_number: string | null
  wa_message: string | null
  queued_at: string
}

export default function WaQueueRow({ row }: { row: Row }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [opened, setOpened] = useState(false)

  // Strip leading + and any non-digit so wa.me accepts the number.
  const digits = (row.whatsapp_number ?? '').replace(/[^0-9]/g, '')
  const text = row.wa_message ?? ''
  const waUrl = digits
    ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
    : null

  function act(action: 'mark_sent' | 'delete') {
    setErr(null)
    startTransition(async () => {
      const r = await fetch('/api/admin/wa-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, action }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j.ok) { setErr(j.error || 'failed'); return }
      router.refresh()
    })
  }

  const queuedAgo = (() => {
    const ms = Date.now() - new Date(row.queued_at).getTime()
    const hrs = Math.floor(ms / 3_600_000)
    if (hrs < 1) return 'just now'
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  })()

  return (
    <div className="rounded-xl border border-line bg-white/[0.02] p-3 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-extrabold">{row.kind}</div>
          <div className="text-[11px] text-muted mt-0.5 truncate font-mono">
            {row.whatsapp_number ?? '—'} · queued {queuedAgo}
          </div>
        </div>
      </div>

      <div className="text-[12px] text-ink/85 leading-snug whitespace-pre-wrap rounded-lg bg-black/30 border border-white/05 p-2">
        {text || <span className="text-muted">(no message body)</span>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {waUrl ? (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpened(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-extrabold uppercase tracking-wider text-white bg-[#25D366] hover:brightness-110 transition"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Open WhatsApp
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        ) : (
          <span className="text-[11px] text-muted italic">no WA number on file</span>
        )}
        <button
          type="button"
          onClick={() => act('mark_sent')}
          disabled={pending}
          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-extrabold uppercase tracking-wider transition disabled:opacity-50 ${
            opened ? 'bg-brand text-bg hover:brightness-105' : 'bg-white/5 text-ink hover:bg-white/10'
          }`}
        >
          <Check className="w-3.5 h-3.5" />
          Mark sent
        </button>
        <button
          type="button"
          onClick={() => act('delete')}
          disabled={pending}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-extrabold uppercase tracking-wider text-red-300 hover:bg-red-500/15 transition disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
        {err && <span className="text-[11px] text-red-300">{err}</span>}
      </div>
    </div>
  )
}
