import Link from 'next/link'
import { Users, AlertTriangle, CheckCircle2, Clock, History, MapPin, Bike } from 'lucide-react'
import { getAdminSupabase } from '@/lib/supabase/admin'
import type { DriverRow, SubscriptionRow } from '@/types/database'

// Force SSR every request so freshly-mutated state is reflected without
// hard-refreshing the browser cache.
export const dynamic = 'force-dynamic'

export default async function AdminOverview() {
  const admin = getAdminSupabase()
  if (!admin) {
    return <p className="text-muted text-[14px]">Server not configured.</p>
  }

  const [{ data: drivers }, { data: subs }, { data: places }, { data: rentals }] = await Promise.all([
    admin.from('drivers').select('user_id, status, availability'),
    admin.from('subscriptions').select('driver_id, status'),
    admin.from('places').select('id, status, paid_until'),
    admin.from('bike_rentals').select('id, status, paid_until'),
  ])

  const driversByStatus = countBy((drivers as Pick<DriverRow, 'status'>[] | null) || [], (r) => r.status)
  const subsByStatus = countBy((subs as Pick<SubscriptionRow, 'status'>[] | null) || [], (r) => r.status)
  const pastDueCount = subsByStatus['past_due'] ?? 0
  type RowStub = { id: string; status: string; paid_until: string | null }
  const placesList = (places as RowStub[] | null) ?? []
  const placesPending = placesList.filter((p) => p.status === 'pending').length
  const placesUnpaid  = placesList.filter((p) => p.status === 'approved' && !p.paid_until).length
  const rentalsList    = (rentals as RowStub[] | null) ?? []
  const rentalsPending = rentalsList.filter((r) => r.status === 'pending').length
  const rentalsUnpaid  = rentalsList.filter((r) => r.status === 'approved' && !r.paid_until).length

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

      {placesPending > 0 && (
        <Link
          href="/admin/places?filter=pending"
          className="card card-interactive p-4 flex items-center gap-3"
          style={{ background: 'rgba(250,204,21,0.06)', borderColor: 'rgba(250,204,21,0.30)' }}
        >
          <MapPin className="w-5 h-5 text-brand shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-[14px]">{placesPending} place listing{placesPending > 1 ? 's' : ''} pending</div>
            <div className="text-[12px] text-muted">Submitted by owners — review photos + details, then approve or reject.</div>
          </div>
        </Link>
      )}

      {placesUnpaid > 0 && (
        <Link
          href="/admin/places?filter=unpaid"
          className="card card-interactive p-4 flex items-center gap-3"
          style={{ background: 'rgba(249,115,22,0.06)', borderColor: 'rgba(249,115,22,0.30)' }}
        >
          <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: '#F97316' }} />
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-[14px]">{placesUnpaid} approved listing{placesUnpaid > 1 ? 's' : ''} unpaid</div>
            <div className="text-[12px] text-muted">Already public, but no payment recorded yet — chase or mark paid.</div>
          </div>
        </Link>
      )}

      {rentalsPending > 0 && (
        <Link
          href="/admin/rentals?filter=pending"
          className="card card-interactive p-4 flex items-center gap-3"
          style={{ background: 'rgba(250,204,21,0.06)', borderColor: 'rgba(250,204,21,0.30)' }}
        >
          <Bike className="w-5 h-5 text-brand shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-[14px]">{rentalsPending} bike rental{rentalsPending > 1 ? 's' : ''} pending</div>
            <div className="text-[12px] text-muted">Submitted by owners — review photos + details, then approve or reject.</div>
          </div>
        </Link>
      )}

      {rentalsUnpaid > 0 && (
        <Link
          href="/admin/rentals?filter=unpaid"
          className="card card-interactive p-4 flex items-center gap-3"
          style={{ background: 'rgba(249,115,22,0.06)', borderColor: 'rgba(249,115,22,0.30)' }}
        >
          <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: '#F97316' }} />
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-[14px]">{rentalsUnpaid} approved rental{rentalsUnpaid > 1 ? 's' : ''} unpaid</div>
            <div className="text-[12px] text-muted">Already public, but no payment recorded yet — chase or mark paid.</div>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile icon={<Users className="w-4 h-4" />} label="Active riders"   value={(driversByStatus['active']    ?? 0).toString()} />
        <StatTile icon={<Users className="w-4 h-4" />} label="Suspended"       value={(driversByStatus['suspended'] ?? 0).toString()} tone="muted" />
        <StatTile icon={<CheckCircle2 className="w-4 h-4" />} label="Subs active" value={(subsByStatus['active'] ?? 0).toString()} tone="online" />
        <StatTile icon={<Clock className="w-4 h-4" />}        label="On trial"   value={(subsByStatus['trial']  ?? 0).toString()} />
      </div>

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

