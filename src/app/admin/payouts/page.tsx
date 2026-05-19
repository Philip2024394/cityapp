import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSupabase } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/supabase/server'
import { idr } from '@/lib/format/idr'
import PayoutRowActions from './PayoutRowActions'

export const dynamic = 'force-dynamic'

type PayoutRow = {
  id: string
  agent_id: string
  amount_idr: number
  referral_count: number
  status: 'pending' | 'processing' | 'paid' | 'cancelled' | 'failed'
  provider: 'manual' | 'xendit' | 'iris' | null
  provider_txn_id: string | null
  bank_name: string | null
  bank_account: string | null
  bank_holder: string | null
  paid_at: string | null
  notes: string | null
  created_at: string
  affiliate_agents?: { name: string; whatsapp: string; agent_code: string } | null
}

export default async function AdminPayoutsPage() {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') redirect('/login?next=/admin/payouts')

  const supabase = await getServerSupabase()
  if (!supabase) return <p className="text-muted">Server not configured.</p>

  const { data, error } = await supabase
    .from('affiliate_payouts')
    .select('*, affiliate_agents(name, whatsapp, agent_code)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return <p className="text-red-400">{error.message}</p>
  const rows = (data ?? []) as PayoutRow[]

  const pendingTotal = rows
    .filter((r) => r.status === 'pending')
    .reduce((s, r) => s + r.amount_idr, 0)

  return (
    <div className="space-y-4">
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Affiliate payouts</h1>
          <p className="text-[12px] text-muted mt-1">
            Pending total: <strong className="text-brand">{idr(pendingTotal)}</strong>
            · {rows.filter((r) => r.status === 'pending').length} batches
          </p>
        </div>
        <form action="/api/admin/payouts/aggregate" method="post">
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand to-brand2 text-bg font-extrabold text-[13px] uppercase tracking-wider border border-black/85 active:scale-[0.99]"
          >
            Run aggregation
          </button>
        </form>
      </header>

      <p className="text-[11px] text-dim">
        Aggregation rolls approved (paid-subscription) affiliate_referrals into one pending payout per agent.
        Click "Mark paid" once the bank transfer has settled, with the bank ref or provider txn ID as proof.
      </p>

      {rows.length === 0 ? (
        <div className="card p-6 text-center text-[13px] text-muted">
          No payouts yet. Run aggregation when there are approved referrals.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((p) => (
            <li key={p.id} className="card p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-[14px] font-extrabold text-ink">
                      {p.affiliate_agents?.name ?? '(unknown agent)'}
                    </span>
                    <span className="text-[11px] text-brand font-mono">
                      {p.affiliate_agents?.agent_code ?? p.agent_id.slice(0, 8)}
                    </span>
                    <StatusPill status={p.status} />
                  </div>
                  <div className="text-[12px] text-muted mt-0.5">
                    {p.referral_count} referrals · created {new Date(p.created_at).toLocaleString('en-GB')}
                  </div>
                  {p.bank_name && (
                    <div className="text-[12px] text-muted mt-0.5 font-mono">
                      {p.bank_name} {p.bank_account} ({p.bank_holder})
                    </div>
                  )}
                  {p.notes && (
                    <div className="text-[11px] text-dim mt-1 italic">{p.notes}</div>
                  )}
                  {p.provider_txn_id && (
                    <div className="text-[11px] text-dim mt-1 font-mono">
                      ref: {p.provider_txn_id}
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[15px] font-extrabold text-brand">{idr(p.amount_idr)}</div>
                  {p.status === 'pending' || p.status === 'processing' ? (
                    <PayoutRowActions payoutId={p.id} />
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link href="/admin" className="inline-block text-[13px] font-bold text-brand">← Admin</Link>
    </div>
  )
}

function StatusPill({ status }: { status: PayoutRow['status'] }) {
  const cfg: Record<PayoutRow['status'], { color: string; label: string }> = {
    pending:    { color: '#FACC15', label: 'Pending' },
    processing: { color: '#60A5FA', label: 'Processing' },
    paid:       { color: '#22C55E', label: 'Paid ✓' },
    cancelled:  { color: '#94A3B8', label: 'Cancelled' },
    failed:     { color: '#EF4444', label: 'Failed' },
  }
  const c = cfg[status]
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider"
      style={{ color: c.color, background: `${c.color}1A`, border: `1px solid ${c.color}55` }}
    >
      {c.label}
    </span>
  )
}
