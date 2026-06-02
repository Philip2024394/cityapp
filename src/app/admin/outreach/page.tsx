import OutreachClient from './OutreachClient'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// Admin → Outreach CRM + reporting
// ----------------------------------------------------------------------------
// The OutreachClient block is the existing operating tool: pipeline list,
// add contact, mark status. The reporting section above (L4 audit) gives
// the founder the at-a-glance funnel + breakdowns they were missing:
//
//   - Status funnel (queued → contacted → replied → meeting → converted)
//   - Conversion %
//   - Per-source breakdown
//   - Per-category breakdown
//
// Pure server fetch, force-dynamic, no client JS for the report. The
// existing OutreachClient stays as the interactive layer.
// ============================================================================

export const metadata = { title: 'Outreach · Admin' }
export const dynamic = 'force-dynamic'

type ContactRow = {
  id: string
  status: string
  category: string
  source: string | null
  created_at: string
  converted_at: string | null
  contacted_at: string | null
}

const STATUS_ORDER = ['queued', 'contacted', 'replied', 'meeting', 'converted', 'passed', 'no_reply'] as const
type Status = (typeof STATUS_ORDER)[number]

const FUNNEL_ORDER: Status[] = ['queued', 'contacted', 'replied', 'meeting', 'converted']

const STATUS_TINT: Record<Status, string> = {
  queued: '#94A3B8',
  contacted: '#60A5FA',
  replied: '#A78BFA',
  meeting: '#F59E0B',
  converted: '#22C55E',
  passed: '#EF4444',
  no_reply: '#6B7280',
}

export default async function OutreachAdminPage() {
  const admin = getAdminSupabase()
  let contacts: ContactRow[] = []
  if (admin) {
    const { data } = await admin
      .from('outreach_contacts')
      .select('id, status, category, source, created_at, converted_at, contacted_at')
      .limit(20_000)
    contacts = (data ?? []) as ContactRow[]
  }

  return (
    <div className="space-y-6">
      <header className="pt-2">
        <h1 className="text-[22px] font-extrabold leading-tight">Outreach</h1>
        <p className="text-[12px] text-muted mt-1">
          Sales pipeline for cold-WhatsApp outreach. Find leads on Google Maps,
          copy a template, mark status. Conversion data lives in your DB.
        </p>
      </header>

      <OutreachReport contacts={contacts} />

      <OutreachClient />
    </div>
  )
}

function OutreachReport({ contacts }: { contacts: ContactRow[] }) {
  if (contacts.length === 0) {
    return (
      <section className="card p-4 text-[13px] text-muted">
        No outreach contacts yet. Add your first contact below to start tracking conversion.
      </section>
    )
  }

  const statusCounts: Record<string, number> = {}
  const sourceCounts: Record<string, number> = {}
  const categoryCounts: Record<string, number> = {}
  let convertedCount = 0
  let contactedCount = 0
  for (const c of contacts) {
    statusCounts[c.status] = (statusCounts[c.status] ?? 0) + 1
    const src = c.source || 'unknown'
    sourceCounts[src] = (sourceCounts[src] ?? 0) + 1
    categoryCounts[c.category] = (categoryCounts[c.category] ?? 0) + 1
    if (c.converted_at) convertedCount += 1
    if (c.contacted_at) contactedCount += 1
  }

  const total = contacts.length
  const reachedRate = total > 0 ? contactedCount / total : 0
  const conversionRate = total > 0 ? convertedCount / total : 0

  // Funnel uses cumulative "entered at least this stage" semantics — a
  // contact in 'meeting' implies it passed 'replied' and 'contacted', so
  // we count down the funnel and add forward statuses. 'passed' and
  // 'no_reply' are terminal drop-outs displayed separately.
  const funnelCounts: Record<Status, number> = {
    queued: 0, contacted: 0, replied: 0, meeting: 0,
    converted: 0, passed: 0, no_reply: 0,
  }
  for (const c of contacts) {
    const s = c.status as Status
    if (STATUS_ORDER.includes(s)) funnelCounts[s] += 1
  }
  // Cumulative roll-down: every 'converted' implies 'meeting' implies …
  const cumulative: Record<Status, number> = {
    queued: 0, contacted: 0, replied: 0, meeting: 0,
    converted: 0, passed: funnelCounts.passed, no_reply: funnelCounts.no_reply,
  }
  let carry = 0
  for (let i = FUNNEL_ORDER.length - 1; i >= 0; i--) {
    carry += funnelCounts[FUNNEL_ORDER[i]!]!
    cumulative[FUNNEL_ORDER[i]!] = carry
  }

  return (
    <section className="space-y-3">
      <h2 className="text-[13px] uppercase tracking-wider font-extrabold text-dim">Pipeline report</h2>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Total leads" value={total.toLocaleString()} tone="brand" />
        <KpiTile label="Reached" value={`${(reachedRate * 100).toFixed(1)}%`} sub={`${contactedCount.toLocaleString()} contacted`} />
        <KpiTile label="Converted" value={`${(conversionRate * 100).toFixed(1)}%`} sub={`${convertedCount.toLocaleString()} signed`} tone="success" />
        <KpiTile label="Dropped" value={(funnelCounts.passed + funnelCounts.no_reply).toLocaleString()} sub="passed + no_reply" tone="danger" />
      </div>

      {/* Funnel + breakdowns side-by-side on wide */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="card p-3 lg:col-span-1">
          <h3 className="text-[11px] uppercase tracking-wider font-extrabold text-dim mb-2">Funnel</h3>
          {FUNNEL_ORDER.map((s) => {
            const count = cumulative[s]
            const widthPct = total > 0 ? (count / total) * 100 : 0
            return (
              <div key={s} className="mb-1.5">
                <div className="flex items-center justify-between text-[12px] mb-0.5">
                  <span className="uppercase tracking-wider font-extrabold" style={{ color: STATUS_TINT[s] }}>{s}</span>
                  <span className="tabular-nums font-extrabold">{count.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${widthPct}%`, background: STATUS_TINT[s] }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="card p-3 lg:col-span-1">
          <h3 className="text-[11px] uppercase tracking-wider font-extrabold text-dim mb-2">By source</h3>
          <BreakdownList counts={sourceCounts} total={total} />
        </div>

        <div className="card p-3 lg:col-span-1">
          <h3 className="text-[11px] uppercase tracking-wider font-extrabold text-dim mb-2">By category</h3>
          <BreakdownList counts={categoryCounts} total={total} />
        </div>
      </div>
    </section>
  )
}

function KpiTile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'brand' | 'success' | 'danger' }) {
  const color =
    tone === 'success' ? '#22C55E'
    : tone === 'danger' ? '#EF4444'
    : '#FACC15'
  return (
    <div
      className="rounded-2xl border p-3"
      style={{
        background: 'rgba(255,255,255,0.02)',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      <div className="text-[11px] uppercase tracking-wider font-extrabold text-dim">{label}</div>
      <div className="text-[22px] font-extrabold leading-none mt-1" style={{ color }}>{value}</div>
      {sub ? <div className="text-[11px] text-dim mt-1">{sub}</div> : null}
    </div>
  )
}

function BreakdownList({ counts, total }: { counts: Record<string, number>; total: number }) {
  const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 8)
  if (sorted.length === 0) return <div className="text-[13px] text-muted py-2">No data.</div>
  const max = sorted[0]![1]
  return (
    <div className="space-y-1.5">
      {sorted.map(([label, n]) => {
        const widthPct = max > 0 ? (n / max) * 100 : 0
        const pct = total > 0 ? (n / total) * 100 : 0
        return (
          <div key={label}>
            <div className="flex items-center justify-between text-[12px] mb-0.5">
              <span className="text-muted truncate max-w-[200px]">{label.replace('_', ' ')}</span>
              <span className="tabular-nums">
                <span className="font-extrabold">{n.toLocaleString()}</span>
                <span className="text-dim ml-1">({pct.toFixed(1)}%)</span>
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${widthPct}%`, background: '#FACC15' }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
