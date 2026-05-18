import Link from 'next/link'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { idr } from '@/lib/format/idr'
import type { DriverRow, TripRow } from '@/types/database'

export const dynamic = 'force-dynamic'

type Filter = 'all' | 'live' | 'completed' | 'canceled'

export default async function AdminTrips({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const admin = getAdminSupabase()
  if (!admin) return <p className="text-muted text-[14px]">Server not configured.</p>

  const sp = await searchParams
  const filter = (sp?.filter ?? 'all') as Filter

  const { data: trips } = await admin
    .from('trips')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  const list = ((trips as TripRow[] | null) ?? []).filter((t) => {
    if (filter === 'all') return true
    if (filter === 'live') return ['requested', 'accepted', 'arrived', 'in_progress'].includes(t.status)
    if (filter === 'completed') return t.status === 'completed'
    if (filter === 'canceled') return t.status === 'canceled' || t.status === 'expired'
    return true
  })

  // Resolve driver names for the visible page
  const driverIds = Array.from(new Set(list.map((t) => t.driver_id)))
  const { data: drivers } = driverIds.length
    ? await admin.from('drivers').select('user_id, business_name, slug').in('user_id', driverIds)
    : { data: [] }
  const driverMap = new Map<string, Pick<DriverRow, 'user_id' | 'business_name' | 'slug'>>()
  for (const d of (drivers as Pick<DriverRow, 'user_id' | 'business_name' | 'slug'>[] | null) ?? []) {
    driverMap.set(d.user_id, d)
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-extrabold">Trips</h1>
        <div className="flex items-center gap-1 overflow-x-auto -mx-1 px-1">
          {(['all','live','completed','canceled'] as Filter[]).map((f) => (
            <FilterPill key={f} filter={f} active={filter === f} />
          ))}
        </div>
      </header>

      {list.length === 0 ? (
        <div className="card p-8 text-center text-[13px] text-muted">No trips match this filter.</div>
      ) : (
        <div className="space-y-2">
          {list.map((t) => (
            <TripCard key={t.id} trip={t} driver={driverMap.get(t.driver_id) ?? null} />
          ))}
        </div>
      )}
    </div>
  )
}

function FilterPill({ filter, active }: { filter: Filter; active: boolean }) {
  return (
    <Link
      href={filter === 'all' ? '/admin/trips' : `/admin/trips?filter=${filter}`}
      className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold border whitespace-nowrap transition"
      style={{
        background: active ? '#FACC15' : 'rgba(255,255,255,0.04)',
        color: active ? '#0A0A0A' : 'rgba(255,255,255,0.75)',
        borderColor: active ? '#FACC15' : 'rgba(255,255,255,0.10)',
      }}
    >
      {filter}
    </Link>
  )
}

function TripCard({ trip, driver }: { trip: TripRow; driver: Pick<DriverRow, 'user_id' | 'business_name' | 'slug'> | null }) {
  const when = new Date(trip.created_at).toLocaleString('en-GB', {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short',
  })
  return (
    <div className="card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap text-[12px]">
            <span className="font-mono text-dim">{when}</span>
            <StatusPill status={trip.status} />
            <PaymentPill status={trip.payment_status} method={trip.payment_method} />
          </div>
          <div className="text-[13px] mt-1.5">
            <span className="text-ink truncate">{trip.pickup_label ?? '—'} → {trip.dropoff_label ?? '—'}</span>
          </div>
          <div className="text-[12px] text-muted mt-1 flex items-center gap-2 flex-wrap">
            <span>{trip.service}</span>
            <span>·</span>
            <span>{driver?.business_name ?? trip.driver_id.slice(0, 8)}</span>
            <span>·</span>
            <span>{trip.customer_name || trip.customer_phone}</span>
            {trip.distance_km != null && <><span>·</span><span>{Number(trip.distance_km).toFixed(1)} km</span></>}
            {trip.rating != null && <><span>·</span><span>★ {trip.rating}</span></>}
          </div>
        </div>
        <div className="text-right shrink-0">
          {trip.estimated_fare != null && (
            <div className="font-extrabold text-[14px] gradient-text">{idr(trip.estimated_fare)}</div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: TripRow['status'] }) {
  const color =
    status === 'completed' ? '#22C55E'
    : status === 'canceled' || status === 'expired' ? '#EF4444'
    : status === 'requested' ? '#FACC15'
    : '#F97316'
  return (
    <span
      className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full"
      style={{ background: 'rgba(255,255,255,0.04)', color }}
    >
      {status}
    </span>
  )
}

function PaymentPill({ status, method }: { status: TripRow['payment_status']; method: TripRow['payment_method'] }) {
  if (status === 'confirmed') {
    return (
      <span
        className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full"
        style={{ background: 'rgba(34,197,94,0.10)', color: '#22C55E' }}
      >
        paid{method ? ` · ${method}` : ''}
      </span>
    )
  }
  if (status === 'disputed') {
    return (
      <span
        className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full"
        style={{ background: 'rgba(239,68,68,0.10)', color: '#EF4444' }}
      >
        disputed
      </span>
    )
  }
  return null
}
