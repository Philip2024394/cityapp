import Link from 'next/link'
import { getAdminSupabase } from '@/lib/supabase/admin'
import DriverRowActions from './DriverRowActions'
import AutoRefresh from './AutoRefresh'
import ExportCsv, { type ExportColumn } from '@/components/admin/ExportCsv'
import type { DriverRow, SubscriptionRow } from '@/types/database'

export const dynamic = 'force-dynamic'

// Live-refresh + "online" definition match the /admin/health tile so ops
// can correlate counts between the two pages without mental math.
const ONLINE_WINDOW_MS = 5 * 60_000

type Filter = 'all' | 'active' | 'suspended' | 'deactivated' | 'past_due' | 'trial'

type DriverCsvRow = {
  business_name: string
  slug: string
  vehicle_type: string
  city: string
  status: string
  sub_status: string
  whatsapp_e164: string
  rating: number
  trips_count: number
  last_active_at: string
  created_at: string
  user_id: string
}

const DRIVERS_CSV_COLUMNS: ReadonlyArray<ExportColumn<DriverCsvRow>> = [
  { label: 'Business',       get: (r) => r.business_name },
  { label: 'Slug',           get: (r) => r.slug },
  { label: 'Vehicle',        get: (r) => r.vehicle_type },
  { label: 'City',           get: (r) => r.city },
  { label: 'Account status', get: (r) => r.status },
  { label: 'Subscription',   get: (r) => r.sub_status },
  { label: 'WhatsApp',       get: (r) => r.whatsapp_e164 },
  { label: 'Rating',         get: (r) => r.rating },
  { label: 'Trips',          get: (r) => r.trips_count },
  { label: 'Last seen',      get: (r) => r.last_active_at },
  { label: 'Created',        get: (r) => r.created_at },
  { label: 'User ID',        get: (r) => r.user_id },
]

/** Driver is "live" (green dot) when self-marked online AND the last
 *  heartbeat is within ONLINE_WINDOW_MS. "busy" gets the amber tone. */
type LiveTone = 'live' | 'busy' | 'stale'

function liveTone(d: DriverRow, nowMs: number): LiveTone {
  const last = d.last_active_at ? Date.parse(d.last_active_at) : NaN
  const fresh = Number.isFinite(last) && nowMs - last < ONLINE_WINDOW_MS
  if (d.availability === 'online' && fresh) return 'live'
  if (d.availability === 'busy') return 'busy'
  return 'stale'
}

/** "2 min ago", "1 h ago", "Yesterday", "3 days ago". Returns "—" when
 *  the timestamp is missing or unparseable so the column still renders. */
function relativeTime(iso: string | null | undefined, nowMs = Date.now()): string {
  if (!iso) return '—'
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return '—'
  const diff = Math.max(0, nowMs - t)
  if (diff < 60_000) return 'just now'
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(diff / 60 / 60_000)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(diff / 24 / 60 / 60_000)
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  // Anything older just shows the date — ops don't care about precision
  // for a driver who hasn't pinged in a month.
  return new Date(t).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

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
    // Pull last_active_at / availability / online_until so the row can
    // show a live status dot + "last seen" without a second round-trip.
    admin
      .from('drivers')
      .select('*, last_active_at, availability, online_until')
      .order('created_at', { ascending: false }),
    admin.from('subscriptions').select('*'),
  ])

  const subsByDriver = new Map<string, SubscriptionRow>()
  for (const s of (subs as SubscriptionRow[] | null) ?? []) {
    subsByDriver.set(s.driver_id, s)
  }

  const nowMs = Date.now()
  const filtered = ((drivers as DriverRow[] | null) ?? []).filter((d) => {
    const sub = subsByDriver.get(d.user_id)
    if (filter === 'all') return true
    if (filter === 'active') return d.status === 'active'
    if (filter === 'suspended') return d.status === 'suspended'
    if (filter === 'deactivated') return d.status === 'deactivated'
    if (filter === 'past_due') return sub?.status === 'past_due'
    if (filter === 'trial') return sub?.status === 'trial'
    return true
  })

  // Online drivers float to the top so ops can see who's actually
  // reachable right now. Within each bucket we preserve the existing
  // "most recently created first" ordering (from the SELECT above).
  const TONE_RANK: Record<LiveTone, number> = { live: 0, busy: 1, stale: 2 }
  const list = filtered.slice().sort((a, b) => {
    return TONE_RANK[liveTone(a, nowMs)] - TONE_RANK[liveTone(b, nowMs)]
  })

  return (
    <div className="space-y-4">
      <AutoRefresh />
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-extrabold">Riders</h1>
        <div className="flex items-center gap-1 overflow-x-auto -mx-1 px-1">
          {(['all','active','suspended','deactivated','past_due','trial'] as Filter[]).map((f) => (
            <FilterPill key={f} filter={f} active={filter === f} />
          ))}
        </div>
      </header>

      <div className="flex justify-end">
        <ExportCsv
          rows={list.map((d) => {
            const sub = subsByDriver.get(d.user_id) ?? null
            // vehicle_type exists at runtime (added in mig 0092) but the
            // DriverRow type predates it; cast at the read site rather
            // than amending the shared type for an export-only field.
            const vt = (d as DriverRow & { vehicle_type?: string | null }).vehicle_type ?? ''
            return {
              business_name: d.business_name ?? '',
              slug: d.slug ?? '',
              vehicle_type: vt,
              city: d.city ?? '',
              status: d.status,
              sub_status: sub?.status ?? '',
              whatsapp_e164: d.whatsapp_e164 ?? '',
              rating: d.rating ?? 0,
              trips_count: d.trips_count ?? 0,
              last_active_at: d.last_active_at ?? '',
              created_at: d.created_at,
              user_id: d.user_id,
            }
          })}
          columns={DRIVERS_CSV_COLUMNS}
          filename={`drivers-${filter}`}
        />
      </div>

      {list.length === 0 ? (
        <div className="card p-8 text-center text-[13px] text-muted">
          No riders match this filter.
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((d) => (
            <DriverCard
              key={d.user_id}
              driver={d}
              sub={subsByDriver.get(d.user_id) ?? null}
              tone={liveTone(d, nowMs)}
              lastSeen={relativeTime(d.last_active_at, nowMs)}
            />
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

// Status-dot colour + label for the live presence pill. Green = live (online
// + fresh ping), amber = busy, gray = offline / stale heartbeat. Matches the
// presence dot in src/lib/drivers/presence.ts so the admin and marketplace
// can't disagree about who is "online".
const LIVE_TONE_STYLE: Record<LiveTone, { dot: string; label: string }> = {
  live: { dot: '#22C55E',           label: 'online' },
  busy: { dot: '#F59E0B',           label: 'busy'   },
  stale:{ dot: 'rgba(255,255,255,0.35)', label: 'offline' },
}

function DriverCard({
  driver, sub, tone, lastSeen,
}: {
  driver: DriverRow
  sub: SubscriptionRow | null
  tone: LiveTone
  lastSeen: string
}) {
  const statusColor = driver.status === 'active' ? '#22C55E' : 'rgba(255,255,255,0.55)'
  const subTone =
    sub?.status === 'active' ? { bg: 'rgba(34,197,94,0.10)', color: '#22C55E' }
    : sub?.status === 'past_due' ? { bg: 'rgba(239,68,68,0.10)', color: '#EF4444' }
    : sub?.status === 'trial' ? { bg: 'rgba(250,204,21,0.10)', color: '#FACC15' }
    : { bg: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.55)' }
  const expiresAt = sub?.current_period_end ?? sub?.trial_ends_at
  const live = LIVE_TONE_STYLE[tone]
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
            <span
              aria-label={`Presence: ${live.label}`}
              title={`Presence: ${live.label}`}
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{
                background: live.dot,
                boxShadow: tone === 'live' ? '0 0 0 3px rgba(34,197,94,0.18)' : undefined,
              }}
            />
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
              style={{ background: 'rgba(255,255,255,0.04)', color: live.dot }}
            >
              {live.label}
            </span>
            <span
              className="text-[11px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full"
              style={{ background: subTone.bg, color: subTone.color }}
            >
              {sub?.status ?? 'no sub'}
            </span>
            <span className="text-[11px] text-dim">last seen {lastSeen}</span>
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
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <DriverRowActions
          driverId={driver.user_id}
          driverStatus={driver.status}
          subStatus={sub?.status ?? null}
        />
        <Link
          href={`/admin/drivers/${driver.user_id}/performance`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border transition"
          style={{
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.85)',
            borderColor: 'rgba(255,255,255,0.10)',
            minHeight: 32,
          }}
        >
          Performance →
        </Link>
      </div>
    </div>
  )
}
