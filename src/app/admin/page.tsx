import Link from 'next/link'
import {
  Users, AlertTriangle, CheckCircle2, History, MapPin, Bike,
  Shield, CreditCard, UserPlus, Wallet, Activity,
  Megaphone, Receipt, QrCode, Handshake, MessageCircle,
  Calendar, ArrowRight, FileCheck,
} from 'lucide-react'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/guard'

// ============================================================================
// /admin — Mission Control hub
// ----------------------------------------------------------------------------
// Single dashboard that gives the founder full visibility + one-tap access to
// every admin tool. Server component: parallelizes all count queries via
// Promise.all so TTFB stays fast. Each query is wrapped in a safeCount() so
// a single failure renders "—" rather than crashing the page.
//
// Compliance: only counts are surfaced — never driver-specific PII. The
// recent-activity rail anonymises down to vehicle category + relative time.
// ============================================================================

export const dynamic = 'force-dynamic'

type VehicleType = 'bike' | 'car' | 'truck' | 'premium_car' | 'minibus'

export default async function AdminOverview() {
  const profile = await requireAdmin()
  const admin = getAdminSupabase()
  if (!admin) {
    return <p className="text-muted text-[14px]">Server not configured.</p>
  }

  const today = new Date()
  const todayIso = today.toISOString().slice(0, 10) // YYYY-MM-DD
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()

  // ---------------------------------------------------------------------------
  // Parallel count queries — every one wrapped in a try so a single failed
  // query renders "—" not an error page.
  // ---------------------------------------------------------------------------
  const [
    realDriverRows,
    mockDriverRows,
    pendingSubsCount,
    todaySignupsCount,
    todayScreenshotsCount,
    pastDuePaymentsCount,
    placesPendingCount,
    placesUnpaidCount,
    rentalsPendingCount,
    rentalsUnpaidCount,
    recentPayments,
    recentSignups,
    recentAudit,
  ] = await Promise.all([
    safeRows<{ vehicle_type: VehicleType; status: string; paid_until: string | null }>(
      admin.from('drivers').select('vehicle_type, status, paid_until'),
    ),
    safeRows<{ vehicle_type: VehicleType }>(
      admin.from('mock_drivers').select('vehicle_type').is('mock_hidden_at', null),
    ),
    safeCount(admin.from('subscription_payments').select('*', { count: 'exact', head: true }).eq('status', 'pending')),
    safeCount(admin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayStart)),
    safeCount(admin.from('subscription_payments').select('*', { count: 'exact', head: true }).gte('submitted_at', todayStart)),
    safeCount(admin.from('subscription_payments').select('*', { count: 'exact', head: true }).eq('status', 'rejected')),
    safeCount(admin.from('places').select('*', { count: 'exact', head: true }).eq('status', 'pending')),
    safeCount(admin.from('places').select('*', { count: 'exact', head: true }).eq('status', 'approved').is('paid_until', null)),
    safeCount(admin.from('bike_rentals').select('*', { count: 'exact', head: true }).eq('status', 'pending')),
    safeCount(admin.from('bike_rentals').select('*', { count: 'exact', head: true }).eq('status', 'approved').is('paid_until', null)),
    safeRows<{ vehicle_type: VehicleType; status: string; submitted_at: string }>(
      admin.from('subscription_payments').select('vehicle_type, status, submitted_at').order('submitted_at', { ascending: false }).limit(5),
    ),
    safeRows<{ vehicle_type: VehicleType; created_at: string }>(
      admin.from('drivers').select('vehicle_type, created_at').order('created_at', { ascending: false }).limit(5),
    ),
    safeRows<{ action: string; entity_type: string | null; created_at: string }>(
      admin.from('audit_log').select('action, entity_type, created_at').order('created_at', { ascending: false }).limit(5),
    ),
  ])

  // ---------------------------------------------------------------------------
  // Derive counts from the bulk rows we pulled (drivers + mock_drivers)
  // ---------------------------------------------------------------------------
  const activeReals = (realDriverRows ?? []).filter((r) => r.status === 'active')
  const realByType = countBy(activeReals, (r) => r.vehicle_type)
  const realTotal = activeReals.length

  const paidActiveReals = activeReals.filter((r) => r.paid_until && r.paid_until >= todayIso)
  const paidByType = countBy(paidActiveReals, (r) => r.vehicle_type)
  const paidTotal = paidActiveReals.length

  const mockByType = countBy(mockDriverRows ?? [], (r) => r.vehicle_type)
  const mockTotal = (mockDriverRows ?? []).length

  return (
    <div className="space-y-6">
      {/* ============================================================== */}
      {/* 1. Welcome row                                                  */}
      {/* ============================================================== */}
      <section className="card p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-brand" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[18px] sm:text-[20px] font-extrabold tracking-tight leading-tight">
              Admin Mission Control <span className="text-muted font-bold">·</span> <span style={{ color: '#0A0A0A' }}>Kita</span><span style={{ color: '#FACC15' }}>2u</span>
            </div>
            <div className="text-[13px] text-muted flex items-center gap-2 mt-0.5 truncate">
              <Calendar className="w-3 h-3 shrink-0" />
              <span>{formatDate(today)}</span>
              <span aria-hidden>·</span>
              <span className="truncate">Signed in as <strong className="text-ink">{profile.full_name || profile.phone}</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 2. Platform stats — high-level glances                          */}
      {/* ============================================================== */}
      <section>
        <SectionHeader title="Platform stats" subtitle="Real drivers, paid subscriptions, today's activity" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <BigStat
            label="Active drivers (real)"
            value={realTotal}
            icon={<Users className="w-4 h-4" />}
            sub={breakdown(realByType)}
          />
          <BigStat
            label="Paid · active"
            value={paidTotal}
            icon={<CheckCircle2 className="w-4 h-4" />}
            sub={breakdown(paidByType)}
            tone="online"
          />
          <BigStat
            label="Mock drivers visible"
            value={mockTotal}
            icon={<Activity className="w-4 h-4" />}
            sub={breakdown(mockByType)}
            tone="muted"
          />
          <BigStat
            label="Pending QRIS review"
            value={pendingSubsCount}
            icon={<CreditCard className="w-4 h-4" />}
            sub={pendingSubsCount && pendingSubsCount > 0 ? 'Awaiting screenshot check' : 'Nothing to review'}
            tone={pendingSubsCount && pendingSubsCount > 0 ? 'warn' : 'muted'}
          />
          <BigStat
            label="Signups today"
            value={todaySignupsCount}
            icon={<UserPlus className="w-4 h-4" />}
            sub="New profiles in last 24h"
          />
          <BigStat
            label="Screenshots today"
            value={todayScreenshotsCount}
            icon={<FileCheck className="w-4 h-4" />}
            sub="Payment uploads today"
          />
        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. Alerts — only render rows with non-zero counts               */}
      {/* ============================================================== */}
      {(pendingSubsCount || pastDuePaymentsCount || placesPendingCount || placesUnpaidCount || rentalsPendingCount || rentalsUnpaidCount) ? (
        <section>
          <SectionHeader title="Needs attention" subtitle="Live items waiting on you" />
          <div className="grid sm:grid-cols-2 gap-3">
            {pendingSubsCount && pendingSubsCount > 0 ? (
              <AlertCard
                href="/admin/subscriptions"
                icon={<CreditCard className="w-5 h-5" />}
                title={`${pendingSubsCount} subscription payment${pendingSubsCount === 1 ? '' : 's'} pending`}
                description="QRIS screenshots awaiting your approve/reject decision."
                tone="warn"
              />
            ) : null}
            {pastDuePaymentsCount && pastDuePaymentsCount > 0 ? (
              <AlertCard
                href="/admin/subscriptions"
                icon={<AlertTriangle className="w-5 h-5" />}
                title={`${pastDuePaymentsCount} rejected payment${pastDuePaymentsCount === 1 ? '' : 's'} on file`}
                description="Historical rejects — review if any deserve a second look."
                tone="muted"
              />
            ) : null}
            {placesPendingCount && placesPendingCount > 0 ? (
              <AlertCard
                href="/admin/places?filter=pending"
                icon={<MapPin className="w-5 h-5" />}
                title={`${placesPendingCount} place listing${placesPendingCount === 1 ? '' : 's'} pending`}
                description="Submitted by owners — review photos + details."
                tone="warn"
              />
            ) : null}
            {placesUnpaidCount && placesUnpaidCount > 0 ? (
              <AlertCard
                href="/admin/places?filter=unpaid"
                icon={<AlertTriangle className="w-5 h-5" />}
                title={`${placesUnpaidCount} approved place${placesUnpaidCount === 1 ? '' : 's'} unpaid`}
                description="Live but no payment recorded — chase or mark paid."
                tone="orange"
              />
            ) : null}
            {rentalsPendingCount && rentalsPendingCount > 0 ? (
              <AlertCard
                href="/admin/rentals?filter=pending"
                icon={<Bike className="w-5 h-5" />}
                title={`${rentalsPendingCount} bike rental${rentalsPendingCount === 1 ? '' : 's'} pending`}
                description="Submitted by owners — review photos + details."
                tone="warn"
              />
            ) : null}
            {rentalsUnpaidCount && rentalsUnpaidCount > 0 ? (
              <AlertCard
                href="/admin/rentals?filter=unpaid"
                icon={<AlertTriangle className="w-5 h-5" />}
                title={`${rentalsUnpaidCount} approved rental${rentalsUnpaidCount === 1 ? '' : 's'} unpaid`}
                description="Live but no payment recorded — chase or mark paid."
                tone="orange"
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ============================================================== */}
      {/* 4. Quick actions — every admin tool, one tap away               */}
      {/* ============================================================== */}
      <section>
        <SectionHeader title="Tools" subtitle="Every admin surface — direct access" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <ToolCard
            href="/admin/subscriptions"
            icon={<CreditCard className="w-5 h-5" />}
            title="Subscriptions"
            description="QRIS payments awaiting verification."
            badge={pendingSubsCount && pendingSubsCount > 0 ? `${pendingSubsCount} pending` : null}
            highlight={Boolean(pendingSubsCount && pendingSubsCount > 0)}
          />
          <ToolCard
            href="/admin/drivers"
            icon={<Users className="w-5 h-5" />}
            title="Drivers"
            description="Active driver directory — moderate listings."
            badge={realTotal > 0 ? `${realTotal} active` : null}
          />
          <ToolCard
            href="/admin/members"
            icon={<UserPlus className="w-5 h-5" />}
            title="Members"
            description="All profiles — search, suspend, audit role changes."
          />
          <ToolCard
            href="/admin/places"
            icon={<MapPin className="w-5 h-5" />}
            title="Places"
            description="Venue submissions — approve or reject."
            badge={placesPendingCount && placesPendingCount > 0 ? `${placesPendingCount} pending` : null}
            highlight={Boolean(placesPendingCount && placesPendingCount > 0)}
          />
          <ToolCard
            href="/admin/rentals"
            icon={<Bike className="w-5 h-5" />}
            title="Rentals"
            description="Bike rental submissions — review + price."
            badge={rentalsPendingCount && rentalsPendingCount > 0 ? `${rentalsPendingCount} pending` : null}
            highlight={Boolean(rentalsPendingCount && rentalsPendingCount > 0)}
          />
          <ToolCard
            href="/admin/payouts"
            icon={<Wallet className="w-5 h-5" />}
            title="Payouts"
            description="Partner program + affiliate disbursements."
          />
          <ToolCard
            href="/admin/health"
            icon={<Activity className="w-5 h-5" />}
            title="Health"
            description="System checks — Supabase, storage, webhooks."
          />
          <ToolCard
            href="/admin/audit"
            icon={<History className="w-5 h-5" />}
            title="Audit log"
            description="Every admin mutation is recorded — review here."
          />
          <ToolCard
            href="/admin/outreach"
            icon={<Megaphone className="w-5 h-5" />}
            title="Outreach"
            description="Driver acquisition tools + campaign tracking."
          />
          <ToolCard
            href="/admin/wa-queue"
            icon={<MessageCircle className="w-5 h-5" />}
            title="WA Queue"
            description="WhatsApp reminder + nudge dispatch."
          />
          <ToolCard
            href="/admin/qr-codes"
            icon={<QrCode className="w-5 h-5" />}
            title="QR codes"
            description="Partner / driver QR sticker management."
          />
          <ToolCard
            href="/admin/receipts"
            icon={<Receipt className="w-5 h-5" />}
            title="Receipts"
            description="Customer payment screenshot history."
          />
          <ToolCard
            href="/admin/providers"
            icon={<Handshake className="w-5 h-5" />}
            title="Providers"
            description="Massage, beautician, handyman, laundry providers."
          />
        </div>
      </section>

      {/* ============================================================== */}
      {/* 5. Recent activity — anonymised feeds                           */}
      {/* ============================================================== */}
      <section>
        <SectionHeader title="Recent activity" subtitle="Last 5 events per channel · anonymised" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <ActivityList
            title="Subscription uploads"
            icon={<CreditCard className="w-4 h-4" />}
            empty="No screenshots yet."
            items={(recentPayments ?? []).map((p) => ({
              key: `${p.vehicle_type}-${p.submitted_at}`,
              primary: `1 ${p.vehicle_type.replace('_', ' ')} driver paid`,
              secondary: `${labelForStatus(p.status)} · ${relativeTime(p.submitted_at)}`,
            }))}
          />
          <ActivityList
            title="Driver signups"
            icon={<UserPlus className="w-4 h-4" />}
            empty="No signups yet."
            items={(recentSignups ?? []).map((s) => ({
              key: `${s.vehicle_type}-${s.created_at}`,
              primary: `1 new ${s.vehicle_type.replace('_', ' ')} driver`,
              secondary: relativeTime(s.created_at),
            }))}
          />
          <ActivityList
            title="Admin actions"
            icon={<History className="w-4 h-4" />}
            empty="No admin actions logged."
            items={(recentAudit ?? []).map((a) => ({
              key: `${a.action}-${a.created_at}`,
              primary: a.action,
              secondary: `${a.entity_type ?? 'system'} · ${relativeTime(a.created_at)}`,
            }))}
          />
        </div>
      </section>
    </div>
  )
}

// ============================================================================
// Helpers
// ============================================================================

async function safeRows<T>(query: PromiseLike<{ data: unknown; error: unknown }>): Promise<T[] | null> {
  try {
    const { data, error } = await query
    if (error) return null
    return (data as T[]) ?? []
  } catch {
    return null
  }
}

async function safeCount(query: PromiseLike<{ count: number | null; error: unknown }>): Promise<number | null> {
  try {
    const { count, error } = await query
    if (error) return null
    return count ?? 0
  } catch {
    return null
  }
}

function countBy<T>(arr: T[], key: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const item of arr) out[key(item)] = (out[key(item)] ?? 0) + 1
  return out
}

function breakdown(by: Record<string, number>): string {
  const order: VehicleType[] = ['bike', 'car', 'truck', 'minibus', 'premium_car']
  const parts = order
    .filter((k) => by[k])
    .map((k) => `${labelForVehicle(k)} ${by[k]}`)
  return parts.length ? parts.join(' · ') : 'No vehicles yet'
}

function labelForVehicle(v: VehicleType): string {
  switch (v) {
    case 'bike': return 'Bike'
    case 'car': return 'Car'
    case 'truck': return 'Truck'
    case 'minibus': return 'Bus'
    case 'premium_car': return 'Premium'
  }
}

function labelForStatus(s: string): string {
  if (s === 'pending') return 'Pending review'
  if (s === 'approved') return 'Approved'
  if (s === 'rejected') return 'Rejected'
  return s
}

function formatDate(d: Date): string {
  try {
    return d.toLocaleString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return d.toISOString()
  }
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return iso
  const diffMs = Date.now() - then
  const sec = Math.round(diffMs / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 30) return `${day}d ago`
  const mon = Math.round(day / 30)
  return `${mon}mo ago`
}

// ============================================================================
// Presentational sub-components
// ============================================================================

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-2.5 px-0.5">
      <div className="text-[15px] font-extrabold tracking-tight">{title}</div>
      {subtitle && <div className="text-[13px] text-muted">{subtitle}</div>}
    </div>
  )
}

function BigStat({
  label, value, icon, sub, tone,
}: {
  label: string
  value: number | null
  icon: React.ReactNode
  sub?: string
  tone?: 'online' | 'muted' | 'warn'
}) {
  const display = value === null ? '—' : value.toString()
  const color =
    tone === 'online' ? '#22C55E' :
    tone === 'warn'   ? '#FACC15' :
    tone === 'muted'  ? 'rgba(255,255,255,0.55)' :
                         '#FACC15'
  return (
    <div className="card p-3 sm:p-4">
      <div className="text-[11px] uppercase tracking-wider font-extrabold text-dim flex items-center gap-1.5">
        <span style={{ color }}>{icon}</span>
        {label}
      </div>
      <div className="text-[24px] sm:text-[28px] font-extrabold leading-none mt-1.5" style={{ color: tone ? color : undefined }}>
        {display}
      </div>
      {sub && <div className="text-[12px] text-dim mt-1.5 leading-snug">{sub}</div>}
    </div>
  )
}

function AlertCard({
  href, icon, title, description, tone,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
  tone: 'warn' | 'orange' | 'muted'
}) {
  const styles =
    tone === 'warn'
      ? { background: 'rgba(250,204,21,0.06)', borderColor: 'rgba(250,204,21,0.30)', iconColor: '#FACC15' }
      : tone === 'orange'
        ? { background: 'rgba(249,115,22,0.06)', borderColor: 'rgba(249,115,22,0.30)', iconColor: '#F97316' }
        : { background: undefined, borderColor: undefined, iconColor: 'rgba(255,255,255,0.55)' }
  return (
    <Link
      href={href}
      className="card card-interactive p-4 flex items-center gap-3 min-h-[44px]"
      style={{ background: styles.background, borderColor: styles.borderColor }}
    >
      <span className="shrink-0" style={{ color: styles.iconColor }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-[14px] leading-tight">{title}</div>
        <div className="text-[13px] text-muted mt-0.5 leading-snug">{description}</div>
      </div>
      <ArrowRight className="w-4 h-4 text-muted shrink-0" />
    </Link>
  )
}

function ToolCard({
  href, icon, title, description, badge, highlight,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
  badge?: string | null
  highlight?: boolean
}) {
  return (
    <Link
      href={href}
      className="card card-interactive p-4 flex flex-col gap-2 min-h-[44px]"
      style={highlight ? { borderColor: 'rgba(250,204,21,0.45)' } : undefined}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-brand/12 border border-brand/25 flex items-center justify-center shrink-0 text-brand">
          {icon}
        </div>
        <div className="flex-1 min-w-0 font-extrabold text-[14px] tracking-tight truncate">{title}</div>
        {badge && (
          <span
            className="shrink-0 text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={
              highlight
                ? { background: '#FACC15', color: '#0A0A0A' }
                : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)' }
            }
          >
            {badge}
          </span>
        )}
      </div>
      <div className="text-[13px] text-muted leading-snug">{description}</div>
    </Link>
  )
}

function ActivityList({
  title, icon, items, empty,
}: {
  title: string
  icon: React.ReactNode
  items: Array<{ key: string; primary: string; secondary: string }>
  empty: string
}) {
  return (
    <div className="card p-3.5">
      <div className="flex items-center gap-1.5 text-[13px] font-extrabold uppercase tracking-wider text-dim mb-2">
        <span className="text-brand">{icon}</span>
        {title}
      </div>
      {items.length === 0 ? (
        <div className="text-[13px] text-muted py-2">{empty}</div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it) => (
            <li key={it.key} className="text-[13px] leading-snug">
              <div className="font-bold truncate">{it.primary}</div>
              <div className="text-[12px] text-dim truncate">{it.secondary}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
