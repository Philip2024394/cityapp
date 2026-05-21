'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Check, X, Receipt, ExternalLink, Loader2 } from 'lucide-react'

type Row = {
  id: string
  user_id: string
  product: string
  amount_idr: number
  receipt_url: string
  signed_url: string | null
  payer_note: string | null
  payer_phone: string | null
  status: 'pending_review' | 'approved' | 'rejected'
  admin_reviewed_at: string | null
  rejection_reason: string | null
  created_at: string
  user: { email: string | null; name: string | null; phone: string | null }
}

type Filter = 'pending' | 'approved' | 'rejected' | 'all'

const PRODUCT_LABEL: Record<string, string> = {
  subscription:           'Driver · monthly',
  subscription_yearly:    'Driver · yearly',
  rental_company_monthly: 'Rental Company · monthly',
  rental_company_yearly:  'Rental Company · yearly',
  tour_guide_monthly:     'Tour Guide · monthly',
  tour_guide_yearly:      'Tour Guide · yearly',
}

export default function ReceiptsReview({
  initial, currentFilter,
}: { initial: Row[]; currentFilter: Filter }) {
  const [rows, setRows] = useState<Row[]>(initial)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  async function approve(id: string) {
    setErr(null); setBusyId(id)
    try {
      const res = await fetch(`/api/admin/receipts/${id}/decide`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'approved' }),
      })
      const j = await res.json().catch(() => ({})) as { ok?: boolean; error?: string }
      if (!res.ok || !j.ok) throw new Error(j?.error || `Failed (${res.status})`)
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, status: 'approved' } : r))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Approve failed')
    } finally { setBusyId(null) }
  }

  async function reject(id: string) {
    setErr(null); setBusyId(id)
    try {
      const res = await fetch(`/api/admin/receipts/${id}/decide`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'rejected', rejection_reason: reason.trim() || 'No reason provided' }),
      })
      const j = await res.json().catch(() => ({})) as { ok?: boolean; error?: string }
      if (!res.ok || !j.ok) throw new Error(j?.error || `Failed (${res.status})`)
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, status: 'rejected', rejection_reason: reason.trim() || 'No reason' } : r))
      setRejectingId(null); setReason('')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Reject failed')
    } finally { setBusyId(null) }
  }

  const filtered = rows  // server-side filtered

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <Receipt className="w-6 h-6 text-brand" /> Payment receipts
        </h1>
        <p className="text-[12px] text-muted">Review user-submitted screenshots. Accounts are already provisionally active — reject reverses the activation.</p>
      </header>

      <div className="flex items-center gap-1 overflow-x-auto -mx-1 px-1">
        {(['pending', 'approved', 'rejected', 'all'] as Filter[]).map((f) => (
          <FilterPill key={f} filter={f} active={currentFilter === f} />
        ))}
      </div>

      {err && <div className="rounded-xl p-3 text-[12px] text-red-200 font-bold" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.40)' }}>{err}</div>}

      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-[13px] text-muted">No receipts in this state.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="card p-3 space-y-2.5">
              <div className="flex items-start gap-3">
                {r.signed_url ? (
                  <a href={r.signed_url} target="_blank" rel="noopener noreferrer" className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-white border border-line">
                    <img src={r.signed_url} alt="receipt" className="w-full h-full object-contain" />
                  </a>
                ) : (
                  <div className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-lg flex items-center justify-center text-[10px] text-muted bg-bg/40">missing</div>
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-extrabold text-ink truncate">
                      {r.user.name || r.user.email || r.user_id.slice(0, 8)}
                    </span>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="text-[11px] text-muted">{PRODUCT_LABEL[r.product] ?? r.product} · <strong className="text-ink">Rp {r.amount_idr.toLocaleString('id-ID')}</strong></div>
                  <div className="text-[10px] text-muted">{new Date(r.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                  {(r.user.phone || r.payer_phone) && (
                    <a href={`https://wa.me/${(r.user.phone || r.payer_phone)!.replace(/[^\d]/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-extrabold text-brand hover:underline">
                      <ExternalLink className="w-3 h-3" /> WhatsApp
                    </a>
                  )}
                </div>
              </div>

              {r.payer_note && (
                <div className="rounded-lg p-2 text-[12px] text-bg/85" style={{ background: 'rgba(0,0,0,0.30)' }}>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-muted">Catatan: </span>{r.payer_note}
                </div>
              )}

              {r.status === 'rejected' && r.rejection_reason && (
                <div className="rounded-lg p-2 text-[12px] text-red-200" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)' }}>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold">Rejected: </span>{r.rejection_reason}
                </div>
              )}

              {r.status === 'pending_review' && rejectingId !== r.id && (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => approve(r.id)} disabled={busyId === r.id} className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-bg text-[12px] font-extrabold uppercase tracking-wider transition active:scale-95 disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)', border: '1px solid rgba(0,0,0,0.85)' }}>
                    {busyId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Approve</>}
                  </button>
                  <button type="button" onClick={() => { setRejectingId(r.id); setReason('') }} className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-white text-[12px] font-extrabold uppercase tracking-wider transition active:scale-95" style={{ background: 'rgba(239,68,68,0.20)', border: '1px solid rgba(239,68,68,0.50)' }}>
                    <X className="w-4 h-4" /> Reject
                  </button>
                </div>
              )}

              {rejectingId === r.id && (
                <div className="space-y-2 rounded-lg p-2.5" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)' }}>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value.slice(0, 500))}
                    placeholder="Reason (will be saved to audit log + can be sent to user via WA)"
                    rows={2}
                    className="w-full bg-bg/80 text-ink placeholder:text-white/40 border border-black/85 rounded-lg px-2.5 py-2 text-[12px] font-bold focus:outline-none resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => reject(r.id)} disabled={busyId === r.id} className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-md text-white text-[11px] font-extrabold uppercase tracking-wider" style={{ background: 'rgba(239,68,68,0.45)' }}>
                      {busyId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <>Confirm reject</>}
                    </button>
                    <button type="button" onClick={() => { setRejectingId(null); setReason('') }} className="text-[11px] text-muted hover:text-ink px-2">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: Row['status'] }) {
  const s = status === 'pending_review'
    ? { bg: 'rgba(250,204,21,0.18)', fg: '#FACC15', label: 'Pending' }
    : status === 'approved'
    ? { bg: 'rgba(34,197,94,0.18)', fg: '#22C55E', label: 'Approved' }
    : { bg: 'rgba(239,68,68,0.18)', fg: '#F87171', label: 'Rejected' }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider" style={{ background: s.bg, color: s.fg, border: `1px solid ${s.fg}33` }}>{s.label}</span>
}

function FilterPill({ filter, active }: { filter: Filter; active: boolean }) {
  return (
    <Link
      href={filter === 'pending' ? '/admin/receipts' : `/admin/receipts?filter=${filter}`}
      className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold border whitespace-nowrap transition capitalize"
      style={{ background: active ? '#FACC15' : 'rgba(255,255,255,0.04)', color: active ? '#0A0A0A' : 'rgba(255,255,255,0.75)', borderColor: active ? '#FACC15' : 'rgba(255,255,255,0.10)' }}
    >
      {filter}
    </Link>
  )
}
