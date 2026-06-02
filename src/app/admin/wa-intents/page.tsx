import Link from 'next/link'
import { getAdminSupabase } from '@/lib/supabase/admin'
import DateRangePicker from '@/components/admin/DateRangePicker'
import ExportCsv, { type ExportColumn } from '@/components/admin/ExportCsv'

// ============================================================================
// /admin/wa-intents — READ-ONLY connection_intent review
// ----------------------------------------------------------------------------
// Surfaces the WhatsApp intent-intercept log to admins for ops review.
// EVERY ROW IS A HEADS-UP — a customer pressed the WhatsApp button on a
// provider surface. We logged it to wake the provider's PWA (Realtime +
// VAPID push). We DO NOT know what the customer messaged, whether the
// ride happened, or the fare.
//
// Permenhub 118/2018 + PM 12/2019 posture: this page is observability
// only. No Accept / Refuse / Reassign actions. Cannot be added without
// re-classifying the platform as a dispatch operator. See
// DISASTER_RECOVERY.md §0 and migration 0146 comment.
//
// Filters (URL params):
//   ?vertical=rider|car|beautician|... (single value)
//   ?source=cari|rider_profile|...
//   ?driver=<uuid>   (single provider)
//   ?from=YYYY-MM-DD&to=YYYY-MM-DD   (DateRangePicker; defaults to last 30d)
//
// Pagination: capped at 5000 rows per page render. For deeper history,
// admins should narrow the date window.
// ============================================================================

export const dynamic = 'force-dynamic'

const ROW_LIMIT = 5000
const DEFAULT_DAYS = 30

const VERTICALS = [
  'rider', 'car',
  'beautician', 'handyman', 'laundry', 'massage', 'home-clean',
  'tour-guide', 'facial', 'skincare', 'rentals', 'property', 'places',
] as const

type Vertical = (typeof VERTICALS)[number]

type IntentRow = {
  id: number
  driver_id: string
  source: string
  vertical: string
  ip_hash: string | null
  user_agent: string | null
  occurred_at: string
}

type DriverLite = {
  user_id: string
  business_name: string | null
  slug: string | null
  vehicle_type: string | null
  city: string | null
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

function isUuid(s: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(s)
}

export default async function AdminWaIntentsPage({
  searchParams,
}: {
  searchParams: Promise<{ vertical?: string; source?: string; driver?: string; from?: string; to?: string }>
}) {
  const admin = getAdminSupabase()
  if (!admin) {
    return <p className="text-muted text-[14px]">Server not configured.</p>
  }

  const sp = await searchParams
  const vertical = sp?.vertical && (VERTICALS as ReadonlyArray<string>).includes(sp.vertical) ? sp.vertical : null
  const source = sp?.source ? String(sp.source).slice(0, 64) : null
  const driverFilter = sp?.driver && isUuid(sp.driver) ? sp.driver : null

  const from = sp?.from || daysAgoIso(DEFAULT_DAYS).slice(0, 10)
  const to = sp?.to || new Date().toISOString().slice(0, 10)
  const fromIso = new Date(from).toISOString()
  const toIso = new Date(`${to}T23:59:59.999Z`).toISOString()

  let query = admin.from('connection_intent')
    .select('id, driver_id, source, vertical, ip_hash, user_agent, occurred_at')
    .gte('occurred_at', fromIso)
    .lte('occurred_at', toIso)
    .order('occurred_at', { ascending: false })
    .limit(ROW_LIMIT)
  if (vertical) query = query.eq('vertical', vertical)
  if (source) query = query.eq('source', source)
  if (driverFilter) query = query.eq('driver_id', driverFilter)

  const { data: intentsData, error } = await query
  const rows = ((intentsData ?? []) as IntentRow[])

  // Pull driver names for the rows we have (one query, batched on user_id).
  const driverIds = Array.from(new Set(rows.map((r) => r.driver_id)))
  const driverMap = new Map<string, DriverLite>()
  if (driverIds.length > 0) {
    const { data: dData } = await admin.from('drivers')
      .select('user_id, business_name, slug, vehicle_type, city')
      .in('user_id', driverIds)
    for (const d of (dData ?? []) as DriverLite[]) {
      driverMap.set(d.user_id, d)
    }
  }

  // Build display rows.
  type DisplayRow = IntentRow & {
    business_name: string
    slug: string | null
    vehicle_type: string | null
    city: string | null
  }
  const display: DisplayRow[] = rows.map((r) => {
    const d = driverMap.get(r.driver_id)
    return {
      ...r,
      business_name: d?.business_name ?? '(unknown)',
      slug: d?.slug ?? null,
      vehicle_type: d?.vehicle_type ?? null,
      city: d?.city ?? null,
    }
  })

  const verticalCounts = new Map<string, number>()
  for (const r of rows) {
    verticalCounts.set(r.vertical, (verticalCounts.get(r.vertical) ?? 0) + 1)
  }

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-extrabold">WhatsApp Intents</h1>
            <p className="text-[12px] text-muted mt-1">
              Heads-up log · <span className="text-ink">{rows.length}</span> rows {rows.length === ROW_LIMIT ? `(capped at ${ROW_LIMIT} — narrow the window)` : ''}
            </p>
          </div>
        </div>

        {/* Regulatory banner — must stay. This page is observability only. */}
        <div
          className="rounded-xl border px-3 py-2 text-[12px] leading-relaxed"
          style={{
            background: 'rgba(250, 204, 21, 0.06)',
            borderColor: 'rgba(250, 204, 21, 0.30)',
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          <strong className="text-brand">Heads-up only.</strong> Each row records that a customer
          pressed a WhatsApp button on a provider surface. We do not store the conversation, ride
          details, or fare. Per Permenhub 118/2018 + PM 12/2019 this page is read-only — no
          accept / refuse / reassign actions can be added without re-classifying the platform.
        </div>

        {error ? (
          <div className="rounded-xl border border-danger/30 bg-danger/10 text-danger text-[12px] px-3 py-2">
            Query error: {error.message}
          </div>
        ) : null}
      </header>

      <DateRangePicker defaultDays={DEFAULT_DAYS} label="Occurred window" />

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="flex flex-wrap gap-1">
          <VerticalPill label="All" href="/admin/wa-intents" active={!vertical} count={rows.length} />
          {VERTICALS.map((v) => (
            <VerticalPill
              key={v}
              label={v}
              href={`/admin/wa-intents?vertical=${v}`}
              active={vertical === v}
              count={verticalCounts.get(v) ?? 0}
            />
          ))}
        </div>
        <ExportCsv
          rows={display}
          columns={WA_INTENTS_CSV_COLUMNS}
          filename={`wa-intents-${vertical ?? 'all'}`}
        />
      </div>

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-[13px] text-muted">
          No intents for this window/filter.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-[12px] min-w-[760px]">
            <thead className="text-left text-muted border-b border-line">
              <tr>
                <Th>Time</Th>
                <Th>Provider</Th>
                <Th>Vertical</Th>
                <Th>Source</Th>
                <Th>City</Th>
                <Th>UA</Th>
              </tr>
            </thead>
            <tbody>
              {display.map((r) => (
                <tr key={r.id} className="border-b border-line/40 hover:bg-white/5">
                  <Td>
                    <time className="text-muted tabular-nums" dateTime={r.occurred_at}>
                      {new Date(r.occurred_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    </time>
                  </Td>
                  <Td>
                    {r.slug ? (
                      <Link
                        href={`/admin/wa-intents?driver=${r.driver_id}`}
                        className="font-extrabold text-ink hover:text-brand transition truncate block max-w-[200px]"
                        title={r.business_name}
                      >
                        {r.business_name}
                      </Link>
                    ) : (
                      <span className="font-extrabold text-ink truncate block max-w-[200px]" title={r.business_name}>
                        {r.business_name}
                      </span>
                    )}
                    <div className="text-[11px] text-dim font-mono truncate max-w-[200px]">{r.driver_id.slice(0, 8)}…</div>
                  </Td>
                  <Td>
                    <span className="text-ink/80 lowercase">{r.vertical}</span>
                  </Td>
                  <Td>
                    <span className="text-muted lowercase">{r.source}</span>
                  </Td>
                  <Td>
                    <span className="text-muted">{r.city ?? '—'}</span>
                  </Td>
                  <Td>
                    <span className="text-dim text-[11px] truncate inline-block max-w-[180px]" title={r.user_agent ?? ''}>
                      {r.user_agent ?? '—'}
                    </span>
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

const WA_INTENTS_CSV_COLUMNS: ReadonlyArray<ExportColumn<{
  id: number
  occurred_at: string
  business_name: string
  driver_id: string
  vertical: string
  source: string
  city: string | null
  user_agent: string | null
  ip_hash: string | null
}>> = [
  { label: 'Time',           get: (r) => r.occurred_at },
  { label: 'Provider',       get: (r) => r.business_name },
  { label: 'Provider ID',    get: (r) => r.driver_id },
  { label: 'Vertical',       get: (r) => r.vertical },
  { label: 'Source',         get: (r) => r.source },
  { label: 'City',           get: (r) => r.city ?? '' },
  { label: 'User Agent',     get: (r) => r.user_agent ?? '' },
  { label: 'IP Hash',        get: (r) => r.ip_hash ?? '' },
]

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 font-extrabold uppercase tracking-wider text-[11px]">{children}</th>
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 align-middle whitespace-nowrap">{children}</td>
}

function VerticalPill({ label, href, active, count }: { label: string; href: string; active: boolean; count: number }) {
  return (
    <Link
      href={href}
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
