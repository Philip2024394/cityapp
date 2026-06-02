import Link from 'next/link'
import { getAdminSupabase } from '@/lib/supabase/admin'
import DateRangePicker from '@/components/admin/DateRangePicker'
import ExportCsv, { type ExportColumn } from '@/components/admin/ExportCsv'

// ============================================================================
// /admin/members — all auth.users across every account type
// ----------------------------------------------------------------------------
// Single table joining auth.users + profiles + drivers + user_accounts so
// admin can see who signed up, when, with what type, and the contact info.
// Columns: name · WhatsApp · email · type · status · created_at.
//
// Type derivation precedence (most specific first):
//   1. user_accounts.account_type='rental_company' → "Rental Company"
//   2. drivers row exists → "Driver" (with sub status badge)
//   3. profiles.role     → "Admin" / "Customer"
//   4. fallback          → "User"
//
// Filters: ?type=driver|rental_company|customer|admin
//          ?from=YYYY-MM-DD&to=YYYY-MM-DD   (preferred, drives DateRangePicker)
//          ?since=<iso date>                (legacy fallback for old bookmarks)
// ============================================================================

export const dynamic = 'force-dynamic'

type TypeFilter = 'all' | 'driver' | 'rental_company' | 'customer' | 'admin'

type AuthUserLite = {
  id: string
  email: string | null
  phone: string | null
  created_at: string
  user_metadata: Record<string, unknown>
}

type Row = {
  user_id: string
  name: string
  whatsapp: string | null
  email: string | null
  account_type: 'driver' | 'rental_company' | 'customer' | 'admin' | 'unknown'
  status_badge: string
  created_at: string
}

const SINCE_DEFAULT_DAYS = 90

const MEMBERS_CSV_COLUMNS: ReadonlyArray<ExportColumn<Row>> = [
  { label: 'Name',     get: (r) => r.name },
  { label: 'WhatsApp', get: (r) => r.whatsapp ?? '' },
  { label: 'Email',    get: (r) => r.email ?? '' },
  { label: 'Type',     get: (r) => r.account_type },
  { label: 'Status',   get: (r) => r.status_badge },
  { label: 'Joined',   get: (r) => r.created_at },
  { label: 'User ID',  get: (r) => r.user_id },
]

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; since?: string; from?: string; to?: string }>
}) {
  const admin = getAdminSupabase()
  if (!admin) return <p className="text-muted text-[14px]">Server not configured.</p>

  const sp = await searchParams
  const typeFilter = (sp?.type ?? 'all') as TypeFilter

  // ?from / ?to (preferred) > ?since (legacy) > 90d default.
  const since = sp?.from
    ? new Date(sp.from)
    : sp?.since
      ? new Date(sp.since)
      : new Date(Date.now() - SINCE_DEFAULT_DAYS * 24 * 60 * 60 * 1000)
  const until = sp?.to ? new Date(sp.to) : null

  // listUsers caps at 1000 per page — fine for v1; paginate later.
  const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const users = (usersData?.users ?? []) as unknown as AuthUserLite[]

  // Pull joinable tables in parallel.
  const [profilesRes, driversRes, accountsRes, subsRes] = await Promise.all([
    admin.from('profiles').select('id, full_name, role'),
    admin.from('drivers').select('user_id, business_name, whatsapp_e164, status, created_at'),
    admin.from('user_accounts').select('user_id, account_type, subscription_status, subscription_expires_at'),
    admin.from('subscriptions').select('driver_id, status, current_period_end'),
  ])

  const profiles = new Map<string, { full_name: string | null; role: string | null }>()
  for (const p of (profilesRes.data ?? []) as Array<{ id: string; full_name: string | null; role: string | null }>) {
    profiles.set(p.id, p)
  }
  const drivers = new Map<string, { business_name: string | null; whatsapp_e164: string | null; status: string | null }>()
  for (const d of (driversRes.data ?? []) as Array<{ user_id: string; business_name: string | null; whatsapp_e164: string | null; status: string | null }>) {
    drivers.set(d.user_id, d)
  }
  const accounts = new Map<string, { account_type: string; subscription_status: string; subscription_expires_at: string | null }>()
  for (const a of (accountsRes.data ?? []) as Array<{ user_id: string; account_type: string; subscription_status: string; subscription_expires_at: string | null }>) {
    accounts.set(a.user_id, a)
  }
  const subs = new Map<string, { status: string; current_period_end: string | null }>()
  for (const s of (subsRes.data ?? []) as Array<{ driver_id: string; status: string; current_period_end: string | null }>) {
    subs.set(s.driver_id, s)
  }

  // Build the unified rows.
  // Window: created_at in [since, until]. Until is optional (defaults to now).
  const untilMs = until ? until.getTime() + 24 * 60 * 60 * 1000 - 1 : Number.POSITIVE_INFINITY
  const rows: Row[] = users
    .filter((u) => {
      const t = new Date(u.created_at).getTime()
      return t >= since.getTime() && t <= untilMs
    })
    .map((u) => {
      const profile = profiles.get(u.id)
      const driver  = drivers.get(u.id)
      const acct    = accounts.get(u.id)
      const sub     = subs.get(u.id)

      let type: Row['account_type'] = 'unknown'
      let status = ''
      let name = profile?.full_name || (u.user_metadata?.full_name as string | undefined) || (u.user_metadata?.name as string | undefined) || (u.email?.split('@')[0]) || 'Unknown'
      let whatsapp: string | null = null

      if (acct?.account_type === 'rental_company') {
        type = 'rental_company'
        status = acct.subscription_status === 'active' ? 'Active' : acct.subscription_status
      } else if (driver) {
        type = 'driver'
        if (driver.business_name) name = driver.business_name
        whatsapp = driver.whatsapp_e164
        status = sub?.status ? sub.status.replace('_', ' ') : (driver.status ?? 'unknown')
      } else if (profile?.role === 'admin') {
        type = 'admin'
        status = 'Admin'
      } else {
        type = 'customer'
        status = profile ? 'Active' : 'Pending profile'
      }

      if (!whatsapp && u.phone) whatsapp = '+' + u.phone
      return {
        user_id: u.id,
        name,
        whatsapp,
        email: u.email,
        account_type: type,
        status_badge: status,
        created_at: u.created_at,
      }
    })
    .filter((r) => typeFilter === 'all' || r.account_type === typeFilter)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const counts = {
    all: rows.length,
    driver: rows.filter((r) => r.account_type === 'driver').length,
    rental_company: rows.filter((r) => r.account_type === 'rental_company').length,
    customer: rows.filter((r) => r.account_type === 'customer').length,
    admin: rows.filter((r) => r.account_type === 'admin').length,
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold">Members</h1>
          <p className="text-[12px] text-muted mt-1">
            Sejak {since.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} ·
            <span className="text-ink"> {counts.all}</span> total
          </p>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto -mx-1 px-1">
          {(['all','driver','rental_company','customer','admin'] as TypeFilter[]).map((f) => (
            <FilterPill key={f} filter={f} active={typeFilter === f} count={counts[f]} />
          ))}
        </div>
      </header>

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <DateRangePicker defaultDays={SINCE_DEFAULT_DAYS} label="Joined window" />
        <ExportCsv
          rows={rows}
          columns={MEMBERS_CSV_COLUMNS}
          filename={`members-${typeFilter}`}
        />
      </div>

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-[13px] text-muted">
          Belum ada member untuk filter ini.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="text-left text-muted border-b border-line">
              <tr>
                <Th>Name</Th>
                <Th>WhatsApp</Th>
                <Th>Email</Th>
                <Th>Type</Th>
                <Th>Status</Th>
                <Th>Joined</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.user_id} className="border-b border-line/40 hover:bg-white/5">
                  <Td>
                    <span className="font-extrabold text-ink truncate">{r.name}</span>
                  </Td>
                  <Td>
                    {r.whatsapp
                      ? <a href={`https://wa.me/${r.whatsapp.replace(/[^\d]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">{r.whatsapp}</a>
                      : <span className="text-muted">—</span>}
                  </Td>
                  <Td>
                    {r.email
                      ? <a href={`mailto:${r.email}`} className="text-ink hover:underline">{r.email}</a>
                      : <span className="text-muted">—</span>}
                  </Td>
                  <Td>
                    <TypeBadge type={r.account_type} />
                  </Td>
                  <Td>
                    <span className="text-ink/80 capitalize">{r.status_badge}</span>
                  </Td>
                  <Td>
                    <time className="text-muted" dateTime={r.created_at}>
                      {new Date(r.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    </time>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 font-extrabold uppercase tracking-wider text-[11px]">{children}</th>
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 align-middle whitespace-nowrap">{children}</td>
}

function FilterPill({ filter, active, count }: { filter: TypeFilter; active: boolean; count: number }) {
  const label = filter === 'rental_company' ? 'Rental Co.' : filter.charAt(0).toUpperCase() + filter.slice(1)
  return (
    <Link
      href={filter === 'all' ? '/admin/members' : `/admin/members?type=${filter}`}
      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold border whitespace-nowrap transition"
      style={{
        background: active ? '#FACC15' : 'rgba(255,255,255,0.04)',
        color: active ? '#0A0A0A' : 'rgba(255,255,255,0.75)',
        borderColor: active ? '#FACC15' : 'rgba(255,255,255,0.10)',
      }}
    >
      {label}
      <span className="text-[10px] opacity-70">{count}</span>
    </Link>
  )
}

function TypeBadge({ type }: { type: Row['account_type'] }) {
  const styles: Record<Row['account_type'], { bg: string; fg: string; label: string }> = {
    driver:         { bg: 'rgba(34,197,94,0.16)',  fg: '#22C55E', label: 'Driver' },
    rental_company: { bg: 'rgba(250,204,21,0.18)', fg: '#FACC15', label: 'Rental Co.' },
    customer:       { bg: 'rgba(99,102,241,0.16)', fg: '#A5B4FC', label: 'Customer' },
    admin:          { bg: 'rgba(239,68,68,0.16)',  fg: '#F87171', label: 'Admin' },
    unknown:        { bg: 'rgba(255,255,255,0.08)', fg: '#A1A1AA', label: 'Unknown' },
  }
  const s = styles[type]
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold"
      style={{ background: s.bg, color: s.fg, border: `1px solid ${s.fg}33` }}
    >
      {s.label}
    </span>
  )
}
