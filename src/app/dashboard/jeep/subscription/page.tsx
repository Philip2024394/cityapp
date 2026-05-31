'use client'
// ============================================================================
// /dashboard/jeep/subscription — CityDrivers Rp 38.000/month subscription
// ----------------------------------------------------------------------------
// Drivers self-serve via QRIS in their banking app, then upload the
// payment screenshot. The /api/dashboard/subscription-payment endpoint
// records the proof + bumps drivers.paid_until = max(today, paid_until)
// + 30 days. Admin verifies (or rejects) later at /admin/subscriptions.
//
// COMPLIANCE: CityDrivers is a software directory under PM 12/2019. We do
// not custody funds — the QRIS payment is between the driver's bank
// and the founder's merchant account.
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Loader2, X, Upload, CheckCircle2, Wallet,
  AlertTriangle, Clock, MessageCircle, Receipt,
} from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { tryLoadDevDriver } from '@/lib/dev/loadDriverSelf'
import {
  SUBSCRIPTION_MONTHLY_IDR,
  SUBSCRIPTION_YEARLY_IDR,
  MONTHLY_PRICE_LABEL,
  YEARLY_PRICE_LABEL,
  TRIAL_LABEL_EN,
} from '@/lib/pricing/constants'

// ----------------------------------------------------------------------------
// Constants (preserved verbatim from legacy)
// ----------------------------------------------------------------------------
const ADMIN_WHATSAPP_E164 = '6285183600015' // streetlocallive admin line
const ADMIN_WA_RENEW = `https://wa.me/${ADMIN_WHATSAPP_E164}?text=${encodeURIComponent(
  'Halo admin, saya mau bayar/renew langganan dashboard Jeep driver CityDrivers (Rp 38.000/bulan).',
)}`
// Swap this single constant when the merchant QRIS image is ready.
import {
  SUBSCRIPTION_QRIS_IMAGE_URL,
  SUBSCRIPTION_QRIS_ALT,
  SUBSCRIPTION_QRIS_YEARLY_IMAGE_URL,
  SUBSCRIPTION_QRIS_YEARLY_ALT,
} from '@/lib/pricing/qris'

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
type DriverRow = {
  user_id: string
  vehicle_type: string | null
  business_name: string | null
  paid_until: string | null
}

type PaymentRow = {
  id: string
  amount_idr: number
  period_start: string
  period_end: string
  status: 'pending' | 'approved' | 'rejected'
  submitted_at: string
  screenshot_url: string
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'unauth' }
  | { kind: 'no_supabase' }
  | { kind: 'no_driver' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; row: DriverRow; payments: PaymentRow[]; screenshots: Record<string, string> }

type SubStatus =
  | { kind: 'never' }
  | { kind: 'expired'; until: string }
  | { kind: 'active'; until: string; daysLeft: number }

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
function classifySubscription(paidUntil: string | null): SubStatus {
  if (!paidUntil) return { kind: 'never' }
  const today = new Date().toISOString().slice(0, 10)
  if (paidUntil < today) return { kind: 'expired', until: paidUntil }
  const todayMs = Date.parse(today + 'T00:00:00')
  const untilMs = Date.parse(paidUntil + 'T00:00:00')
  const daysLeft = Math.max(0, Math.round((untilMs - todayMs) / 86_400_000))
  return { kind: 'active', until: paidUntil, daysLeft }
}

function formatDateID(iso: string): string {
  try {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch { return iso }
}

function formatSubmittedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch { return iso }
}

// ============================================================================
// Page
// ============================================================================
export default function JeepSubscriptionPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [payOpen, setPayOpen] = useState(false)
  const [paidUntilOverride, setPaidUntilOverride] = useState<string | null>(null)
  const [paidToast, setPaidToast] = useState<string | null>(null)

  const reload = useCallback(async () => {
    // DEV BYPASS — localhost impersonation via cr-dev-uid cookie.
    // Render with empty payment history (subscription_payments is admin-gated
    // and not directly readable via the browser client on most envs).
    const dev = await tryLoadDevDriver()
    if (dev) {
      setState({
        kind: 'ready',
        row: dev.driver as unknown as DriverRow,
        payments: [],
        screenshots: {},
      })
      return
    }

    const supabase = getBrowserSupabase()
    if (!supabase) { setState({ kind: 'no_supabase' }); return }
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) { setState({ kind: 'unauth' }); return }
    const { data, error } = await supabase
      .from('drivers')
      .select('user_id, vehicle_type, business_name, paid_until')
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) { setState({ kind: 'error', message: error.message }); return }
    if (!data) { setState({ kind: 'no_driver' }); return }
    const row = data as unknown as DriverRow

    // Fetch payment history (best-effort — table may be RLS'd to admin
    // only on some envs; we silently degrade to empty list in that case).
    let payments: PaymentRow[] = []
    const screenshots: Record<string, string> = {}
    try {
      const { data: rows } = await supabase
        .from('subscription_payments')
        .select('id, amount_idr, period_start, period_end, status, submitted_at, screenshot_url')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(5)
      if (Array.isArray(rows)) {
        payments = rows as unknown as PaymentRow[]
        // Try signed URLs for the screenshots so the driver can preview
        // their most recent proof. Signed URL failures degrade silently.
        for (const p of payments.slice(0, 1)) {
          try {
            const { data: signed } = await supabase.storage
              .from('subscription-screenshots')
              .createSignedUrl(p.screenshot_url, 60 * 60)
            if (signed?.signedUrl) screenshots[p.id] = signed.signedUrl
          } catch { /* swallow */ }
        }
      }
    } catch { /* swallow */ }

    setState({ kind: 'ready', row, payments, screenshots })
  }, [])

  useEffect(() => { void reload() }, [reload])

  function handlePaymentSubmitted(activeUntil: string) {
    setPaidUntilOverride(activeUntil)
    setPayOpen(false)
    setPaidToast('Payment submitted! Your listing is active.')
    setTimeout(() => setPaidToast(null), 4200)
    void reload()
  }

  if (state.kind === 'loading')     return <FullPageMessage spinner>Loading subscription…</FullPageMessage>
  if (state.kind === 'no_supabase') return <FullPageMessage>Auth not configured.</FullPageMessage>
  if (state.kind === 'unauth')      return <FullPageMessage cta={{ href: '/login?next=/dashboard/jeep/subscription', label: 'Sign in' }}>Sign in to manage your subscription.</FullPageMessage>
  if (state.kind === 'no_driver')   return <FullPageMessage cta={{ href: '/signup?role=driver&vehicle=jeep', label: 'Create driver profile' }}>No driver profile yet.</FullPageMessage>
  if (state.kind === 'error')       return <FullPageMessage>Could not load profile: {state.message}</FullPageMessage>

  return (
    <SubscriptionShell
      row={state.row}
      payments={state.payments}
      screenshots={state.screenshots}
      paidUntilOverride={paidUntilOverride}
      payOpen={payOpen}
      onOpenPay={() => setPayOpen(true)}
      onClosePay={() => setPayOpen(false)}
      onSubmitted={handlePaymentSubmitted}
      paidToast={paidToast}
    />
  )
}

// ============================================================================
// Shell — composed layout matching the beautician/edit reference
// ============================================================================
function SubscriptionShell({
  row, payments, screenshots,
  paidUntilOverride, payOpen, onOpenPay, onClosePay, onSubmitted, paidToast,
}: {
  row: DriverRow
  payments: PaymentRow[]
  screenshots: Record<string, string>
  paidUntilOverride: string | null
  payOpen: boolean
  onOpenPay: () => void
  onClosePay: () => void
  onSubmitted: (activeUntil: string) => void
  paidToast: string | null
}) {
  const effectivePaidUntil = paidUntilOverride ?? row.paid_until
  const sub = useMemo(() => classifySubscription(effectivePaidUntil), [effectivePaidUntil])
  const latest = payments[0] ?? null

  return (
    <main className="relative min-h-[100dvh] bg-[#F5F5F4] text-[#0A0A0A]">
      <AppNav />
      <div className="max-w-2xl mx-auto px-4 sm:px-5 pt-4 pb-24">
        <Link
          href="/dashboard/jeep"
          className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-black/55 hover:text-black mb-4"
          style={{ minHeight: 44 }}
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
          Back to dashboard
        </Link>

        {paidToast && (
          <div
            className="rounded-2xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-[13px] px-4 py-3 flex items-center gap-2 shadow-sm mb-4"
            role="status"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden />
            <span className="font-bold">{paidToast}</span>
          </div>
        )}

        {/* Hero strip — yellow gradient, mirrors beautician/edit pattern */}
        <div
          className="rounded-3xl p-5 sm:p-6 shadow-sm mb-4"
          style={{
            background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)',
            color: '#0A0A0A',
            boxShadow: '0 12px 32px rgba(250,204,21,0.30)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FACC15] text-[#0A0A0A] flex items-center justify-center shadow-sm shrink-0">
              <Wallet size={22} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] opacity-70">
                Subscription
              </div>
              <h1 className="text-[22px] sm:text-[26px] font-black leading-tight truncate mt-0.5">
                {MONTHLY_PRICE_LABEL} / month
              </h1>
              <p className="text-[12.5px] font-bold opacity-80 mt-1 leading-snug">
                {YEARLY_PRICE_LABEL}/year option · {TRIAL_LABEL_EN} on new sign-ups
              </p>
            </div>
          </div>
        </div>

        {/* Status card */}
        <StatusCard sub={sub} />

        {/* Primary CTA + admin WhatsApp shortcut */}
        <Section title="Pay or renew" icon={<Receipt size={16} strokeWidth={2.5} />}>
          <button
            type="button"
            onClick={onOpenPay}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FACC15] text-[#0A0A0A] px-5 py-3.5 text-[14px] font-extrabold shadow-[0_8px_24px_rgba(250,204,21,0.45)] active:scale-[0.98] transition"
            style={{ minHeight: 48 }}
          >
            Pay {MONTHLY_PRICE_LABEL} via QRIS
          </button>
          <a
            href={ADMIN_WA_RENEW}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FACC15] text-[#0A0A0A] px-5 py-3 text-[13px] font-extrabold active:scale-[0.98] transition"
            style={{ minHeight: 44 }}
          >
            <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
            Pay via WhatsApp admin
          </a>
          <p className="text-[12px] text-black/55 mt-2 leading-snug">
            QRIS activates your listing immediately. WhatsApp is for help paying — admin will reply manually.
          </p>
        </Section>

        {/* Payment history */}
        {payments.length > 0 && (
          <Section title="Payment history" icon={<Clock size={16} strokeWidth={2.5} />}>
            <ul className="space-y-2">
              {payments.map((p) => {
                const proof = screenshots[p.id]
                return (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 rounded-2xl bg-[#FAFAFA] border border-black/10 p-3"
                  >
                    {proof ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={proof}
                        alt="Payment receipt"
                        className="w-12 h-12 rounded-xl object-cover border border-black/10 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-[#FFFBEA] border border-[#FACC15]/45 flex items-center justify-center shrink-0">
                        <Receipt className="w-5 h-5 text-[#EAB308]" strokeWidth={2.5} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[13px] font-extrabold text-[#0A0A0A]">
                        Rp {p.amount_idr.toLocaleString('id-ID')}
                        <StatusPill status={p.status} />
                      </div>
                      <div className="text-[11.5px] font-bold text-black/55 mt-0.5">
                        Submitted {formatSubmittedAt(p.submitted_at)} · valid until {formatDateID(p.period_end)}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
            {latest && (
              <p className="text-[12px] text-black/55 mt-2 leading-snug">
                Pending payments still activate your listing immediately — admin verifies the screenshot afterwards.
              </p>
            )}
          </Section>
        )}
      </div>

      <QrisPaymentModal
        open={payOpen}
        onClose={onClosePay}
        onSubmitted={onSubmitted}
      />
    </main>
  )
}

// ----------------------------------------------------------------------------
// Status card — current standing block
// ----------------------------------------------------------------------------
function StatusCard({ sub }: { sub: SubStatus }) {
  if (sub.kind === 'active') {
    return (
      <section
        className="rounded-3xl bg-white border border-emerald-200 p-5 shadow-sm mb-4"
        aria-label="Subscription status"
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-emerald-700">
              Active
            </div>
            <h2 className="text-[16px] font-black text-[#0A0A0A] leading-tight mt-0.5">
              Listing live until {formatDateID(sub.until)}
            </h2>
            <p className="text-[12.5px] font-bold text-black/60 mt-1">
              {sub.daysLeft} {sub.daysLeft === 1 ? 'day' : 'days'} remaining
            </p>
          </div>
        </div>
      </section>
    )
  }

  const isExpired = sub.kind === 'expired'
  const heading = isExpired
    ? `Expired on ${formatDateID(sub.until)}`
    : 'Listing not yet active'
  const body = isExpired
    ? 'Renew below to come back online in the public jeep marketplace.'
    : 'Pay your first month to publish your listing in the public jeep marketplace.'

  return (
    <section
      className="rounded-3xl p-5 shadow-sm mb-4"
      style={{ background: '#FEF3C7', border: '1px solid #FACC15' }}
      aria-label="Subscription status"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-[#FACC15] text-[#0A0A0A] flex items-center justify-center">
          <AlertTriangle className="w-5 h-5" strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#854D0E]">
            {isExpired ? 'Expired' : 'Not active'}
          </div>
          <h2 className="text-[16px] font-black text-[#0A0A0A] leading-tight mt-0.5">{heading}</h2>
          <p className="text-[12.5px] font-bold text-black/65 mt-1 leading-snug">{body}</p>
        </div>
      </div>
    </section>
  )
}

function StatusPill({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const cfg =
    status === 'approved'
      ? { bg: '#D1FAE5', fg: '#065F46', label: 'Approved' }
      : status === 'rejected'
      ? { bg: '#FEE2E2', fg: '#991B1B', label: 'Rejected' }
      : { bg: '#FEF3C7', fg: '#854D0E', label: 'Pending' }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider"
      style={{ background: cfg.bg, color: cfg.fg }}
    >
      {cfg.label}
    </span>
  )
}

// ----------------------------------------------------------------------------
// Section card wrapper
// ----------------------------------------------------------------------------
function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white border border-black/10 p-5 shadow-sm space-y-3 mb-4">
      <div className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-wider text-black/70">
        {icon && (
          <span className="w-7 h-7 rounded-lg bg-[#FFFBEA] text-[#EAB308] flex items-center justify-center shrink-0 border border-[#FACC15]/45">
            {icon}
          </span>
        )}
        <span>{title}</span>
      </div>
      {children}
    </section>
  )
}

// ============================================================================
// QRIS payment modal — preserved verbatim from legacy
// ----------------------------------------------------------------------------
// Driver scans the QR in their bank/wallet app, pays externally, then
// uploads a screenshot. /api/dashboard/subscription-payment records the
// proof + bumps drivers.paid_until = max(paid_until, today) + 30 days.
// COMPLIANCE: CityDrivers never custodies funds — payment is between the
// driver's bank/wallet and the founder's merchant QRIS.
// ============================================================================
function QrisPaymentModal({
  open, onClose, onSubmitted,
}: {
  open: boolean
  onClose: () => void
  onSubmitted: (activeUntil: string) => void
}) {
  const [file,         setFile]         = useState<File | null>(null)
  const [filePreview,  setFilePreview]  = useState<string | null>(null)
  const [uploading,    setUploading]    = useState(false)
  const [uploadError,  setUploadError]  = useState<string | null>(null)

  // Billing period — monthly (Rp 38k / 30 days) or yearly (Rp 350k /
  // 365 days, ~23% saving vs monthly × 12). Each period has its own QRIS.
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly')

  // Reset state every time the modal reopens — stale errors / files
  // shouldn't bleed between attempts.
  useEffect(() => {
    if (open) {
      setFile(null)
      setFilePreview(null)
      setUploading(false)
      setUploadError(null)
      setPeriod('monthly')
    }
  }, [open])

  // Manage the object URL lifecycle for the screenshot preview so we
  // don't leak blobs across selections.
  useEffect(() => {
    if (!file) { setFilePreview(null); return }
    const url = URL.createObjectURL(file)
    setFilePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Close on Escape — small affordance that costs nothing.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !uploading) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, uploading, onClose])

  if (!open) return null

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    if (f && !f.type.startsWith('image/')) {
      setUploadError('Please choose an image file (PNG / JPG).')
      return
    }
    setUploadError(null)
    setFile(f)
  }

  async function submit() {
    if (!file || uploading) return
    setUploadError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('screenshot', file)
      fd.append('vehicleType', 'jeep')
      fd.append('billingPeriod', period)
      const r = await fetch('/api/dashboard/subscription-payment', {
        method: 'POST',
        body: fd,
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.ok) {
        setUploadError(j?.error || 'Upload failed. Please try again.')
        setUploading(false)
        return
      }
      onSubmitted(j.activeUntil as string)
    } catch {
      setUploadError('Network error. Please try again.')
      setUploading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      onClick={() => { if (!uploading) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="qris-modal-title"
    >
      <div
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white text-[#0A0A0A] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={uploading}
          aria-label="Close"
          className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-5 pt-6 pb-5">
          <h2 id="qris-modal-title" className="text-[18px] font-black leading-tight pr-10">
            Pay subscription via QRIS
          </h2>
          <p className="text-[13px] text-black/65 mt-1 leading-snug">
            Pick monthly or yearly · scan the matching QR · upload your receipt.
          </p>

          {/* Billing-period toggle — Monthly / Yearly */}
          <div className="mt-4 grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[#F4F4F5] border border-[#E4E4E7]">
            {(['monthly', 'yearly'] as const).map((p) => {
              const active = period === p
              const label  = p === 'monthly' ? 'Monthly' : 'Yearly'
              const price  = p === 'monthly'
                ? `Rp ${SUBSCRIPTION_MONTHLY_IDR.toLocaleString('id-ID')}`
                : `Rp ${SUBSCRIPTION_YEARLY_IDR.toLocaleString('id-ID')}`
              const subnote = p === 'monthly' ? '30 days' : '365 days · save ~23%'
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => !uploading && setPeriod(p)}
                  disabled={uploading}
                  aria-pressed={active}
                  className="flex flex-col items-start justify-center px-3 py-2.5 rounded-xl text-left transition active:scale-[0.99] disabled:opacity-50"
                  style={{
                    background: active ? '#FACC15' : 'transparent',
                    color:      '#0A0A0A',
                    boxShadow:  active ? '0 4px 12px rgba(250,204,21,0.35)' : 'none',
                    minHeight:  56,
                  }}
                >
                  <span className="text-[11px] font-extrabold uppercase tracking-wider opacity-70">{label}</span>
                  <span className="text-[14px] font-black leading-tight mt-0.5">{price}</span>
                  <span className="text-[10.5px] font-bold opacity-65 mt-0.5">{subnote}</span>
                </button>
              )
            })}
          </div>

          {/* QR display — branded card with soft yellow border + drop shadow */}
          <div className="mt-4 flex justify-center">
            <div
              className="bg-white rounded-2xl p-3 border-2"
              style={{
                borderColor: '#FACC15',
                boxShadow:   '0 8px 24px rgba(250,204,21,0.22)',
              }}
            >
              <div className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[#854D0E] text-center mb-2">
                CityDrivers QRIS · {period === 'monthly' ? 'Monthly' : 'Yearly'}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={period === 'monthly' ? SUBSCRIPTION_QRIS_IMAGE_URL : SUBSCRIPTION_QRIS_YEARLY_IMAGE_URL}
                alt={period === 'monthly' ? SUBSCRIPTION_QRIS_ALT : SUBSCRIPTION_QRIS_YEARLY_ALT}
                width={220}
                height={220}
                className="w-[220px] h-[220px] object-contain block"
              />
              <div className="text-[11px] font-bold text-[#0A0A0A]/55 text-center mt-2">
                {period === 'monthly'
                  ? `Rp ${SUBSCRIPTION_MONTHLY_IDR.toLocaleString('id-ID')} · 1 month`
                  : `Rp ${SUBSCRIPTION_YEARLY_IDR.toLocaleString('id-ID')} · 1 year`}
              </div>
            </div>
          </div>

          {/* Steps */}
          <ol className="mt-5 space-y-2 text-[13px] text-black/80">
            <Step n={1}>
              Buka aplikasi banking / dompet digital
              <span className="block text-black/55 text-[12px]">(BCA, Mandiri, GoPay, OVO, Dana, ShopeePay, etc.)</span>
            </Step>
            <Step n={2}>Scan QRIS di atas / Scan the QR above</Step>
            <Step n={3}>
              Bayar <span className="font-black">Rp {(period === 'monthly' ? SUBSCRIPTION_MONTHLY_IDR : SUBSCRIPTION_YEARLY_IDR).toLocaleString('id-ID')}</span> / Pay the amount
            </Step>
            <Step n={4}>Screenshot bukti pembayaran / Screenshot the receipt</Step>
            <Step n={5}>Upload screenshot di bawah — listing aktif segera</Step>
          </ol>

          {/* Upload zone */}
          <div className="mt-5">
            <label
              htmlFor="qris-screenshot-input"
              className="block w-full rounded-2xl border-2 border-dashed border-gray-300 hover:border-[#FACC15] bg-gray-50 hover:bg-[#FACC15]/5 transition cursor-pointer"
            >
              <input
                id="qris-screenshot-input"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={onPick}
                disabled={uploading}
              />
              {filePreview ? (
                <div className="p-3 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={filePreview}
                    alt="Screenshot preview"
                    className="w-16 h-16 rounded-xl object-cover border border-gray-200 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold truncate">{file?.name}</div>
                    <div className="text-[12px] text-black/55">Tap to choose a different screenshot</div>
                  </div>
                </div>
              ) : (
                <div className="p-5 flex flex-col items-center justify-center text-center min-h-[88px]">
                  <Upload className="w-5 h-5 text-black/50 mb-1" aria-hidden />
                  <div className="text-[13px] font-extrabold text-[#0A0A0A]">Choose screenshot</div>
                  <div className="text-[12px] text-black/55 mt-0.5">PNG or JPG of your payment receipt</div>
                </div>
              )}
            </label>
          </div>

          {uploadError && (
            <div className="mt-3 rounded-xl border border-red-300 bg-red-50 text-red-800 text-[13px] px-3 py-2">
              {uploadError}
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={!file || uploading}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#FACC15] text-[#0A0A0A] px-5 py-3 text-[13px] font-extrabold min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                Uploading…
              </>
            ) : (
              <>Submit payment proof</>
            )}
          </button>

          <p className="mt-3 text-[12px] text-black/55 leading-snug">
            Payment is between you and your bank/wallet. CityDrivers is a software directory — we do not custody or process funds.
          </p>

          <div className="mt-3 text-center">
            <a
              href={ADMIN_WA_RENEW}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] font-bold text-black/60 hover:text-black hover:underline"
            >
              Need help paying? WhatsApp admin
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        aria-hidden
        className="shrink-0 w-6 h-6 rounded-full bg-[#FACC15] text-[#0A0A0A] text-[12px] font-black flex items-center justify-center mt-[1px]"
      >
        {n}
      </span>
      <span className="leading-snug">{children}</span>
    </li>
  )
}

// ----------------------------------------------------------------------------
// Full-page message shell — auth / error states
// ----------------------------------------------------------------------------
function FullPageMessage({
  children, cta, spinner,
}: {
  children: React.ReactNode
  cta?: { href: string; label: string }
  spinner?: boolean
}) {
  return (
    <main className="relative min-h-[100dvh] bg-[#F5F5F4] text-[#0A0A0A]">
      <AppNav />
      <div className="max-w-md mx-auto px-4 pt-24 text-center">
        {spinner && (
          <Loader2 className="w-7 h-7 mx-auto text-[#EAB308] animate-spin mb-3" strokeWidth={2.5} />
        )}
        <div className="text-[14px] font-bold text-black/70 leading-relaxed">{children}</div>
        {cta && (
          <Link
            href={cta.href}
            className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#FACC15] text-[#0A0A0A] text-[13px] font-extrabold shadow-[0_8px_24px_rgba(250,204,21,0.45)] active:scale-[0.97] transition"
            style={{ minHeight: 44 }}
          >
            {cta.label}
            <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
          </Link>
        )}
      </div>
    </main>
  )
}
