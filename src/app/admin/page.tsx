import Link from 'next/link'
import { Users, AlertTriangle, Receipt, CheckCircle2, Clock, History } from 'lucide-react'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { idr } from '@/lib/format/idr'
import type { DriverRow, SubscriptionRow, TripRow } from '@/types/database'

// Force SSR every request so freshly-mutated state is reflected without
// hard-refreshing the browser cache.
export const dynamic = 'force-dynamic'

export default async function AdminOverview() {
  const admin = getAdminSupabase()
  if (!admin) {
    return <p className="text-muted text-[14px]">Server not configured.</p>
  }

  const [{ data: drivers }, { data: subs }, { data: trips }] = await Promise.all([
    admin.from('drivers').select('user_id, status, availability'),
    admin.from('subscriptions').select('driver_id, status'),
    admin.from('trips').select('id, status, estimated_fare, created_at').order('created_at', { ascending: false }).limit(50),
  ])

  const driversByStatus = countBy((drivers as Pick<DriverRow, 'status'>[] | null) || [], (r) => r.status)
  const subsByStatus = countBy((subs as Pick<SubscriptionRow, 'status'>[] | null) || [], (r) => r.status)
  const last24h = (trips || []).filter((t) => Date.now() - new Date(t.created_at).getTime() < 86_400_000)
  const grossLast24h = last24h.reduce((s, t) => s + (t.estimated_fare ?? 0), 0)
  const pastDueCount = subsByStatus['past_due'] ?? 0

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Overview</h1>

      {pastDueCount > 0 && (
        <Link
          href="/admin/drivers?filter=past_due"
          className="card card-interactive p-4 flex items-center gap-3"
          style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.30)' }}
        >
          <AlertTriangle className="w-5 h-5 text-danger shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-[14px]">{pastDueCount} rider{pastDueCount > 1 ? 's' : ''} past due</div>
            <div className="text-[12px] text-muted">Tap to review and flip to active when payment is received.</div>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile icon={<Users className="w-4 h-4" />} label="Active riders"   value={(driversByStatus['active']    ?? 0).toString()} />
        <StatTile icon={<Users className="w-4 h-4" />} label="Suspended"       value={(driversByStatus['suspended'] ?? 0).toString()} tone="muted" />
        <StatTile icon={<CheckCircle2 className="w-4 h-4" />} label="Subs active" value={(subsByStatus['active'] ?? 0).toString()} tone="online" />
        <StatTile icon={<Clock className="w-4 h-4" />}        label="On trial"   value={(subsByStatus['trial']  ?? 0).toString()} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatTile icon={<Receipt className="w-4 h-4" />} label="Trips · 24h"   value={last24h.length.toString()} />
        <StatTile icon={<Receipt className="w-4 h-4" />} label="Trips · total" value={(trips?.length ?? 0).toString()} hint="(last 50 fetched)" />
        <StatTile icon={<Receipt className="w-4 h-4" />} label="Gross · 24h"   value={idr(grossLast24h)} />
      </div>

      <section className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[14px] font-extrabold uppercase tracking-wider text-dim">Recent trips</h2>
          <Link href="/admin/trips" className="text-[12px] font-bold text-brand">All trips →</Link>
        </div>
        <div className="space-y-2">
          {(trips || []).slice(0, 8).map((t) => (
            <TripRowLine key={t.id} trip={t as TripRow} />
          ))}
          {(!trips || trips.length === 0) && (
            <p className="text-[13px] text-muted">No trips yet.</p>
          )}
        </div>
      </section>

      <Link href="/admin/audit" className="card card-interactive p-4 flex items-center gap-3">
        <History className="w-4 h-4 text-muted shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-[14px]">Audit log</div>
          <div className="text-[12px] text-muted">Every admin mutation is recorded — review here.</div>
        </div>
      </Link>
    </div>
  )
}

function countBy<T>(arr: T[], key: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const item of arr) out[key(item)] = (out[key(item)] ?? 0) + 1
  return out
}

function StatTile({ icon, label, value, hint, tone }: { icon: React.ReactNode; label: string; value: string; hint?: string; tone?: 'online' | 'muted' }) {
  const color = tone === 'online' ? '#22C55E' : tone === 'muted' ? 'rgba(255,255,255,0.55)' : '#FACC15'
  return (
    <div className="card p-3">
      <div className="text-[11px] uppercase tracking-wider font-extrabold text-dim flex items-center gap-1.5">
        <span style={{ color }}>{icon}</span>
        {label}
      </div>
      <div className="text-[20px] font-extrabold mt-1 leading-none">{value}</div>
      {hint && <div className="text-[11px] text-dim mt-1">{hint}</div>}
    </div>
  )
}

function TripRowLine({ trip }: { trip: TripRow }) {
  const time = new Date(trip.created_at).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <span className="text-[11px] text-dim font-mono shrink-0 w-24">{time}</span>
      <span className="text-[11px] uppercase tracking-wider font-extrabold shrink-0" style={{ color: statusColor(trip.status) }}>
        {trip.status}
      </span>
      <span className="text-ink truncate flex-1">{trip.pickup_label ?? '—'} → {trip.dropoff_label ?? '—'}</span>
      {trip.estimated_fare != null && <span className="text-muted shrink-0">{idr(trip.estimated_fare)}</span>}
    </div>
  )
}

function statusColor(status: TripRow['status']): string {
  if (status === 'completed') return '#22C55E'
  if (status === 'canceled' || status === 'expired') return '#EF4444'
  if (status === 'requested') return '#FACC15'
  return '#F97316'
}
