import Link from 'next/link'
import { getAdminSupabase } from '@/lib/supabase/admin'
import DriverRowActions from './DriverRowActions'
import type { DriverRow, SubscriptionRow } from '@/types/database'

export const dynamic = 'force-dynamic'

type Filter = 'all' | 'active' | 'suspended' | 'past_due' | 'trial'

export default async function AdminDrivers({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const admin = getAdminSupabase()
  if (!admin) return <p className="text-muted text-[14px]">Server not configured.</p>

  const sp = await searchParams
  const filter = (sp?.filter ?? 'all') as Filter

  const [{ data: drivers }, { data: subs }] = await Promise.all([
    admin.from('drivers').select('*').order('created_at', { ascending: false }),
    admin.from('subscriptions').select('*'),
  ])

  const subsByDriver = new Map<string, SubscriptionRow>()
  for (const s of (subs as SubscriptionRow[] | null) ?? []) {
    subsByDriver.set(s.driver_id, s)
  }

  const list = ((drivers as DriverRow[] | null) ?? []).filter((d) => {
    const sub = subsByDriver.get(d.user_id)
    if (filter === 'all') return true
    if (filter === 'active') return d.status === 'active'
    if (filter === 'suspended') return d.status === 'suspended'
    if (filter === 'past_due') return sub?.status === 'past_due'
    if (filter === 'trial') return sub?.status === 'trial'
    return true
  })

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-extrabold">Riders</h1>
        <div className="flex items-center gap-1 overflow-x-auto -mx-1 px-1">
          {(['all','active','suspended','past_due','trial'] as Filter[]).map((f) => (
            <FilterPill key={f} filter={f} active={filter === f} />
          ))}
        </div>
      </header>

      {list.length === 0 ? (
        <div className="card p-8 text-center text-[13px] text-muted">
          No riders match this filter.
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((d) => (
            <DriverCard key={d.user_id} driver={d} sub={subsByDriver.get(d.user_id) ?? null} />
          ))}
        </div>
      )}
    </div>
  )
}

function FilterPill({ filter, active }: { filter: Filter; active: boolean }) {
  return (
    <Link
      href={filter === 'all' ? '/admin/drivers' : `/admin/drivers?filter=${filter}`}
      className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold border whitespace-nowrap transition"
      style={{
        background: active ? '#FACC15' : 'rgba(255,255,255,0.04)',
        color: active ? '#0A0A0A' : 'rgba(255,255,255,0.75)',
        borderColor: active ? '#FACC15' : 'rgba(255,255,255,0.10)',
      }}
    >
      {filter.replace('_', ' ')}
    </Link>
  )
}

function DriverCard({ driver, sub }: { driver: DriverRow; sub: SubscriptionRow | null }) {
  const statusColor = driver.status === 'active' ? '#22C55E' : 'rgba(255,255,255,0.55)'
  const subTone =
    sub?.status === 'active' ? { bg: 'rgba(34,197,94,0.10)', color: '#22C55E' }
    : sub?.status === 'past_due' ? { bg: 'rgba(239,68,68,0.10)', color: '#EF4444' }
    : sub?.status === 'trial' ? { bg: 'rgba(250,204,21,0.10)', color: '#FACC15' }
    : { bg: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.55)' }
  const expiresAt = sub?.current_period_end ?? sub?.trial_ends_at
  return (
    <div className="card p-3">
      <div className="flex items-start gap-3">
        <img
          src={driver.brand_logo_url || `https://i.pravatar.cc/300?u=${driver.slug}`}
          alt=""
          className="w-12 h-12 rounded-xl object-cover shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-[14px]">{driver.business_name}</span>
            <span className="text-[11px] text-dim font-mono">/{driver.slug}</span>
          </div>
          <div className="text-[12px] text-muted truncate mt-0.5">
            {driver.whatsapp_e164} · {driver.city || '—'}
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span
              className="text-[11px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.04)', color: statusColor }}
            >
              {driver.status}
            </span>
            <span
              className="text-[11px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full"
              style={{ background: subTone.bg, color: subTone.color }}
            >
              {sub?.status ?? 'no sub'}
            </span>
            {expiresAt && (
              <span className="text-[11px] text-dim">
                until {new Date(expiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            )}
            {driver.rating != null && (
              <span className="text-[11px] text-muted">★ {driver.rating.toFixed(1)} · {driver.trips_count} trips</span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3">
        <DriverRowActions
          driverId={driver.user_id}
          driverStatus={driver.status}
          subStatus={sub?.status ?? null}
        />
      </div>
    </div>
  )
}
