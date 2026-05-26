import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeft, Printer, CheckCircle2 } from 'lucide-react'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getLegalEntity } from '@/lib/legal/entity'
import { idr } from '@/lib/format/idr'

// ============================================================================
// /dashboard/billing/receipt/[paymentId] — printable kuitansi
// ----------------------------------------------------------------------------
// Indonesian commercial practice expects a kuitansi (receipt) per
// transaction even below the PKP (PPN-eligible) threshold. This page
// renders one per paid Midtrans transaction. Driver can print to PDF
// or save the page for their bookkeeping.
//
// Server-rendered so the receipt URL is shareable + bookmarkable. RLS
// gates access — driver can only see their own receipts; admin can see
// any (via is_admin policy). Anyone else gets a 404.
// ============================================================================

export const metadata = {
  title: 'Kuitansi · IndoCity',
  description: 'Receipt for IndoCity subscription payment.',
}

type PageProps = { params: Promise<{ paymentId: string }> }

export default async function ReceiptPage({ params }: PageProps) {
  const { paymentId } = await params

  const userClient = await getServerSupabase()
  if (!userClient) return notFound()

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login?next=/dashboard/billing')

  // RLS gate is on user-scoped client. Admin scope handled by the
  // policy itself (pi_owner_select grants the driver themselves; admin
  // bypass would need a separate "Admin select" policy if you want admin
  // access from this page in the future).
  const { data: payment, error } = await userClient
    .from('payment_intents')
    .select('id, product, amount_idr, status, paid_at, created_at, provider, provider_order_id, provider_txn_id, extends_days, driver_user_id')
    .eq('id', paymentId)
    .maybeSingle()
  if (error || !payment) return notFound()
  if (payment.status !== 'paid') {
    // Only generate kuitansi for successfully-paid transactions.
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-6 max-w-sm text-center space-y-3">
          <p className="text-[14px] text-muted">
            This transaction is not paid yet. Receipt is only available after payment confirmation.
          </p>
          <Link href="/dashboard" className="btn-primary inline-flex">Back to dashboard</Link>
        </div>
      </main>
    )
  }

  // Driver profile for the "Diterima dari" line. Use admin client so we
  // can read across RLS — the receipt is for the authenticated driver
  // anyway (already gated above).
  const admin = getAdminSupabase()
  const { data: driver } = admin
    ? await admin
        .from('drivers')
        .select('business_name, whatsapp_e164, city, area')
        .eq('user_id', payment.driver_user_id)
        .maybeSingle()
    : { data: null }

  const entity = getLegalEntity()
  const paidAt = new Date(payment.paid_at ?? payment.created_at)
  const productLabel = payment.product === 'subscription'
    ? 'IndoCity — langganan software (1 bulan)'
    : 'IndoCity — Tour Verified (1 bulan)'

  return (
    <main className="min-h-screen pb-16">
      {/* Top nav — hidden when printing */}
      <header className="sticky top-0 z-40 glass-strong pt-safe print:hidden">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="text-[13px] font-bold text-muted hover:text-ink flex items-center gap-1.5">
            <ChevronLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <PrintButton />
        </div>
      </header>

      <article className="max-w-2xl mx-auto px-4 pt-6 print:pt-2">
        <div
          id="kuitansi"
          className="card p-6 print:border-0 print:shadow-none print:bg-white print:text-black"
          style={{ printColorAdjust: 'exact' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-line print:border-black/30">
            <div>
              <div className="text-[12px] uppercase tracking-wider font-extrabold text-brand print:text-black">
                Kuitansi · Receipt
              </div>
              <h1 className="text-[24px] font-extrabold mt-1 leading-tight">IndoCity</h1>
              {entity.name && (
                <div className="text-[13px] text-muted mt-1 print:text-black/70">{entity.name}</div>
              )}
              {entity.address && (
                <div className="text-[12px] text-muted mt-0.5 whitespace-pre-line print:text-black/70">{entity.address}</div>
              )}
              {entity.npwp && (
                <div className="text-[12px] text-muted mt-0.5 print:text-black/70">NPWP: {entity.npwp}</div>
              )}
            </div>
            <div className="text-right shrink-0">
              <CheckCircle2 className="w-7 h-7 inline-block" style={{ color: '#22C55E' }} strokeWidth={2.25} />
              <div className="text-[12px] uppercase tracking-wider font-extrabold mt-1" style={{ color: '#22C55E' }}>
                Paid
              </div>
            </div>
          </div>

          {/* No. + Tanggal */}
          <div className="grid grid-cols-2 gap-4 mt-4 text-[13px]">
            <div>
              <div className="text-[12px] uppercase tracking-wider font-extrabold text-dim print:text-black/55">
                No. kuitansi
              </div>
              <div className="font-mono mt-0.5 break-all">{payment.id}</div>
            </div>
            <div>
              <div className="text-[12px] uppercase tracking-wider font-extrabold text-dim print:text-black/55">
                Tanggal
              </div>
              <div className="mt-0.5">{formatDate(paidAt)}</div>
            </div>
          </div>

          {/* Diterima dari */}
          <div className="mt-4 text-[13px]">
            <div className="text-[12px] uppercase tracking-wider font-extrabold text-dim print:text-black/55">
              Diterima dari · Received from
            </div>
            <div className="mt-0.5 font-bold">{driver?.business_name ?? '—'}</div>
            {driver?.whatsapp_e164 && (
              <div className="text-muted print:text-black/70">WhatsApp: +{driver.whatsapp_e164}</div>
            )}
            {(driver?.area || driver?.city) && (
              <div className="text-muted print:text-black/70">
                {[driver.area, driver.city].filter(Boolean).join(', ')}
              </div>
            )}
          </div>

          {/* Untuk pembayaran */}
          <div className="mt-4 text-[13px]">
            <div className="text-[12px] uppercase tracking-wider font-extrabold text-dim print:text-black/55">
              Untuk pembayaran · For
            </div>
            <div className="mt-0.5">{productLabel}</div>
            <div className="text-muted text-[12px] mt-0.5 print:text-black/70">
              Berlaku {payment.extends_days} hari sejak tanggal pembayaran
            </div>
          </div>

          {/* Amount */}
          <div className="mt-5 rounded-xl p-4 print:rounded-none print:border print:border-black/30" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.25)' }}>
            <div className="text-[12px] uppercase tracking-wider font-extrabold text-dim print:text-black/55">
              Jumlah · Amount
            </div>
            <div className="text-[28px] font-extrabold mt-1 leading-none">
              {idr(payment.amount_idr)}
            </div>
            <div className="text-[12px] text-muted mt-1 print:text-black/70">
              {amountInWords(payment.amount_idr)} rupiah
            </div>
          </div>

          {/* Provider */}
          <div className="mt-4 text-[12px] text-muted print:text-black/70 space-y-0.5">
            <div>
              Metode: {payment.provider === 'midtrans' ? 'Midtrans Snap' : payment.provider}
            </div>
            {payment.provider_order_id && (
              <div className="font-mono">Order ID: {payment.provider_order_id}</div>
            )}
            {payment.provider_txn_id && (
              <div className="font-mono">Transaction ID: {payment.provider_txn_id}</div>
            )}
          </div>

          {/* Footer note */}
          <div className="mt-5 pt-4 border-t border-line print:border-black/30 text-[12px] text-muted print:text-black/70 leading-relaxed">
            Kuitansi ini diterbitkan secara elektronik dan sah tanpa tanda tangan.
            Untuk pertanyaan terkait pembayaran, hubungi{' '}
            <Link href="/contact" className="text-brand print:text-black underline-offset-2 underline">contact page</Link>.
          </div>
        </div>
      </article>
    </main>
  )
}

function formatDate(d: Date): string {
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
  const day = d.getDate()
  const month = months[d.getMonth()]
  const year = d.getFullYear()
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  return `${day} ${month} ${year} · ${hh}:${mm} WIB`
}

// Minimal Indonesian number-to-words for amounts up to 999,999,999.
// Avoids a library dep; sufficient for subscription receipts.
function amountInWords(n: number): string {
  if (!Number.isFinite(n) || n < 0) return ''
  if (n === 0) return 'nol'
  const units = ['','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan','sepuluh','sebelas']
  function under20(x: number): string {
    if (x < 12) return units[x]
    return `${units[x - 10]} belas`
  }
  function under100(x: number): string {
    if (x < 20) return under20(x)
    const tens = Math.floor(x / 10)
    const rest = x % 10
    return rest === 0 ? `${units[tens]} puluh` : `${units[tens]} puluh ${units[rest]}`
  }
  function under1000(x: number): string {
    if (x < 100) return under100(x)
    const hundreds = Math.floor(x / 100)
    const rest = x % 100
    const head = hundreds === 1 ? 'seratus' : `${units[hundreds]} ratus`
    return rest === 0 ? head : `${head} ${under100(rest)}`
  }
  function under1M(x: number): string {
    if (x < 1000) return under1000(x)
    const thou = Math.floor(x / 1000)
    const rest = x % 1000
    const head = thou === 1 ? 'seribu' : `${under1000(thou)} ribu`
    return rest === 0 ? head : `${head} ${under1000(rest)}`
  }
  if (n < 1_000_000) return under1M(n)
  const millions = Math.floor(n / 1_000_000)
  const rest = n % 1_000_000
  const head = `${under1000(millions)} juta`
  return rest === 0 ? head : `${head} ${under1M(rest)}`
}

// Client component for the print button — keeps the page server-rendered.
function PrintButton() {
  return (
    <form action="javascript:window.print()">
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-[13px] active:scale-95 transition"
        style={{
          background: 'linear-gradient(135deg, #FACC15, #EAB308)',
          color: '#0A0A0A',
          minHeight: 44,
        }}
      >
        <Printer className="w-4 h-4" strokeWidth={2.5} />
        Print / Save PDF
      </button>
    </form>
  )
}
