import Link from 'next/link'
import { getAdminSupabase } from '@/lib/supabase/admin'
import SubscriptionReviewActions from './SubscriptionReviewActions'

// ============================================================================
// /admin/subscriptions — QRIS payment review
// ----------------------------------------------------------------------------
// Drivers self-serve their 38,000 IDR/month subscription via QRIS in their
// banking app, upload a screenshot, and their listing activates immediately
// (drivers.paid_until is bumped optimistically on upload). This page lets
// admin verify the screenshot afterwards:
//
//   • Approve → status='approved' (no further change to paid_until)
//   • Reject  → status='rejected', revert paid_until to the LATEST prior
//               approved payment's period_end (or NULL if none).
//
// Compliance: IndoCity never custodies funds. Driver paid externally; we
// only record the proof of payment and grant access window. "Verified" /
// "Rejected" terminology is fine — admin is verifying the screenshot.
// ============================================================================

export const dynamic = 'force-dynamic'

type PaymentStatus = 'pending' | 'approved' | 'rejected'

type PaymentRow = {
  id: string
  user_id: string
  vehicle_type: 'bike' | 'car' | 'truck' | 'premium_car' | 'minibus'
  amount_idr: number
  screenshot_url: string // object path inside subscription-screenshots bucket
  period_start: string
  period_end: string
  status: PaymentStatus
  admin_notes: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  submitted_at: string
}

type DriverLite = {
  user_id: string
  business_name: string | null
  whatsapp_e164: string | null
  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_year: number | null
  vehicle_plate: string | null
  bike_make: string | null
  bike_model: string | null
  bike_year: number | null
  paid_until: string | null
}

type EnrichedPayment = PaymentRow & {
  driver: DriverLite | null
  screenshotSignedUrl: string | null
}

export default async function AdminSubscriptions() {
  const admin = getAdminSupabase()
  if (!admin) {
    return <p className="text-muted text-[14px]">Server not configured.</p>
  }

  // 1. Pending payments (oldest-first wait queue surfaced at top via desc on submitted_at)
  const { data: pendingData } = await admin
    .from('subscription_payments')
    .select(
      'id, user_id, vehicle_type, amount_idr, screenshot_url, period_start, period_end, ' +
      'status, admin_notes, reviewed_at, reviewed_by, submitted_at',
    )
    .eq('status', 'pending')
    .order('submitted_at', { ascending: false })
  const pending = (pendingData as PaymentRow[] | null) ?? []

  // 2. Last 30 reviewed (approved or rejected)
  const { data: reviewedData } = await admin
    .from('subscription_payments')
    .select(
      'id, user_id, vehicle_type, amount_idr, screenshot_url, period_start, period_end, ' +
      'status, admin_notes, reviewed_at, reviewed_by, submitted_at',
    )
    .in('status', ['approved', 'rejected'])
    .order('reviewed_at', { ascending: false })
    .limit(30)
  const reviewed = (reviewedData as PaymentRow[] | null) ?? []

  // 3. Hydrate driver info + signed URLs in parallel
  const allRows = [...pending, ...reviewed]
  const userIds = [...new Set(allRows.map((r) => r.user_id))]

  const { data: driverData } =
    userIds.length === 0
      ? { data: [] as DriverLite[] }
      : await admin
          .from('drivers')
          .select(
            'user_id, business_name, whatsapp_e164, vehicle_make, vehicle_model, ' +
            'vehicle_year, vehicle_plate, bike_make, bike_model, bike_year, paid_until',
          )
          .in('user_id', userIds)
  const driversByUserId = new Map<string, DriverLite>()
  for (const d of (driverData as DriverLite[] | null) ?? []) {
    driversByUserId.set(d.user_id, d)
  }

  // Generate signed URLs in parallel — 1 hour TTL is plenty for an admin
  // session reviewing payments in real-time.
  const signedUrls = await Promise.all(
    allRows.map(async (r) => {
      const { data } = await admin.storage
        .from('subscription-screenshots')
        .createSignedUrl(r.screenshot_url, 3600)
      return [r.id, data?.signedUrl ?? null] as const
    }),
  )
  const signedById = new Map(signedUrls)

  const enrich = (r: PaymentRow): EnrichedPayment => ({
    ...r,
    driver: driversByUserId.get(r.user_id) ?? null,
    screenshotSignedUrl: signedById.get(r.id) ?? null,
  })

  const pendingEnriched = pending.map(enrich)
  const reviewedEnriched = reviewed.map(enrich)

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold">Subscriptions</h1>
          <p className="text-[13px] text-muted mt-0.5">
            Verify QRIS payment screenshots. Rejecting reverts the driver&apos;s
            <span className="font-mono"> paid_until</span> to the last approved period.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Pill label="Pending" count={pendingEnriched.length} tone="pending" />
          <Pill label="Recent reviewed" count={reviewedEnriched.length} tone="muted" />
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-[14px] font-extrabold uppercase tracking-wider text-dim">
          Pending review
        </h2>
        {pendingEnriched.length === 0 ? (
          <div className="card p-6 text-center text-[13px] text-muted">
            All caught up — no pending payments.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingEnriched.map((p) => (
              <PaymentCard key={p.id} payment={p} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3 pt-2">
        <h2 className="text-[14px] font-extrabold uppercase tracking-wider text-dim">
          Recently reviewed
        </h2>
        {reviewedEnriched.length === 0 ? (
          <div className="card p-6 text-center text-[13px] text-muted">
            No reviewed payments yet.
          </div>
        ) : (
          <div className="space-y-3">
            {reviewedEnriched.map((p) => (
              <PaymentCard key={p.id} payment={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PaymentCard — single row in either the pending or reviewed list.
// Status drives the left-border color so admins can scan at a glance.
// ---------------------------------------------------------------------------
function PaymentCard({ payment: p }: { payment: EnrichedPayment }) {
  const border =
    p.status === 'pending'  ? '#FACC15' :
    p.status === 'approved' ? '#22C55E' :
                              '#EF4444'

  const d = p.driver
  const vehicleLabel = formatVehicle(p.vehicle_type, d)
  const wa = d?.whatsapp_e164 ? d.whatsapp_e164.replace(/[^\d]/g, '') : null

  return (
    <div
      className="card p-3"
      style={{ borderLeft: `3px solid ${border}` }}
    >
      <div className="flex items-start gap-3">
        {/* Screenshot thumbnail */}
        <a
          href={p.screenshotSignedUrl ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-brand transition"
          aria-label="Open full-size screenshot"
        >
          {p.screenshotSignedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.screenshotSignedUrl}
              alt="QRIS payment screenshot"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-muted uppercase tracking-wider text-center px-1">
              No preview
            </div>
          )}
        </a>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-extrabold text-ink leading-tight truncate">
                {d?.business_name ?? 'Unknown driver'}
              </h3>
              <div className="mt-0.5 text-[13px] text-muted truncate">
                <span className="text-brand font-bold capitalize">{p.vehicle_type.replace('_', ' ')}</span>
                {vehicleLabel && (
                  <>
                    <span className="mx-1.5 text-dim">·</span>
                    <span>{vehicleLabel}</span>
                  </>
                )}
              </div>
            </div>
            <StatusBadge status={p.status} />
          </div>

          {/* Contact + period strip */}
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
            <div>
              <span className="text-dim">WhatsApp:</span>{' '}
              {wa ? (
                <a
                  href={`https://wa.me/${wa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand hover:underline"
                >
                  {d?.whatsapp_e164}
                </a>
              ) : (
                <span className="text-muted">—</span>
              )}
            </div>
            <div>
              <span className="text-dim">Amount:</span>{' '}
              <span className="font-extrabold">Rp {p.amount_idr.toLocaleString('id-ID')}</span>
            </div>
            <div>
              <span className="text-dim">Period:</span>{' '}
              <span className="font-mono">{p.period_start} → {p.period_end}</span>
            </div>
            <div>
              <span className="text-dim">Submitted:</span>{' '}
              <span title={new Date(p.submitted_at).toLocaleString()}>
                {formatRelative(p.submitted_at)}
              </span>
            </div>
            {d?.paid_until && (
              <div className="col-span-2">
                <span className="text-dim">Driver paid_until (current):</span>{' '}
                <span className="font-mono">{d.paid_until}</span>
              </div>
            )}
          </div>

          {p.admin_notes && (
            <div className="mt-2 text-[13px] text-red-300 bg-red-900/20 border border-red-500/20 rounded p-2">
              <strong>Admin notes:</strong> {p.admin_notes}
            </div>
          )}

          {p.reviewed_at && (
            <div className="mt-2 text-[12px] text-dim">
              Reviewed {formatRelative(p.reviewed_at)}
            </div>
          )}

          {p.status === 'pending' && (
            <div className="mt-3">
              <SubscriptionReviewActions paymentId={p.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  const styles: Record<PaymentStatus, { bg: string; fg: string; label: string }> = {
    pending:  { bg: 'rgba(250,204,21,0.15)', fg: '#FACC15', label: 'Pending' },
    approved: { bg: 'rgba(34,197,94,0.15)',  fg: '#22C55E', label: 'Verified' },
    rejected: { bg: 'rgba(239,68,68,0.15)',  fg: '#EF4444', label: 'Rejected' },
  }
  const s = styles[status]
  return (
    <span
      className="shrink-0 px-2 py-0.5 rounded text-[13px] font-extrabold uppercase tracking-wider"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  )
}

function Pill({ label, count, tone }: { label: string; count: number; tone: 'pending' | 'muted' }) {
  const colors = tone === 'pending'
    ? { bg: 'rgba(250,204,21,0.15)', fg: '#FACC15', border: 'rgba(250,204,21,0.35)' }
    : { bg: 'rgba(255,255,255,0.04)', fg: 'rgba(255,255,255,0.75)', border: 'rgba(255,255,255,0.10)' }
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold border whitespace-nowrap"
      style={{ background: colors.bg, color: colors.fg, borderColor: colors.border }}
    >
      {label}
      <span
        className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full text-[13px] font-extrabold"
        style={{ background: 'rgba(0,0,0,0.30)' }}
      >
        {count}
      </span>
    </span>
  )
}

// Format the vehicle make/model/year line. Cars/trucks store these on
// vehicle_*; bikes store them on bike_*. We surface whichever is set so
// admin can see what was paid for.
function formatVehicle(
  vehicleType: PaymentRow['vehicle_type'],
  d: DriverLite | null,
): string {
  if (!d) return ''
  const make  = vehicleType === 'bike' ? d.bike_make  : d.vehicle_make
  const model = vehicleType === 'bike' ? d.bike_model : d.vehicle_model
  const year  = vehicleType === 'bike' ? d.bike_year  : d.vehicle_year
  const parts: string[] = []
  if (make)  parts.push(make)
  if (model) parts.push(model)
  if (year)  parts.push(String(year))
  let str = parts.join(' ')
  if (vehicleType !== 'bike' && d.vehicle_plate) {
    str = str ? `${str} · ${d.vehicle_plate}` : d.vehicle_plate
  }
  return str
}

// "5 min ago" style relative timestamp.
function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  const diffSec = Math.round((Date.now() - then) / 1000)
  if (diffSec < 60)     return `${diffSec} sec ago`
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60)     return `${diffMin} min ago`
  const diffHour = Math.round(diffMin / 60)
  if (diffHour < 24)    return `${diffHour} hr ago`
  const diffDay = Math.round(diffHour / 24)
  if (diffDay < 30)     return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}
