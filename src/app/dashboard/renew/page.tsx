'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Star, ChevronLeft, ShieldCheck, Loader2 } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { getBrowserSupabase } from '@/lib/supabase/client'
import QrPaymentFlow, { type QrProduct } from '@/components/payments/QrPaymentFlow'

// ============================================================================
// /dashboard/renew
// ----------------------------------------------------------------------------
// Driver subscription renewal via the QR + receipt flow (replaces the old
// Midtrans Snap path on the dashboard SubscriptionCard). User picks monthly
// (Rp 38K) or yearly (Rp 350K), uploads receipt, account activates within
// seconds via the activate_on_receipt_insert trigger which then runs
// extend_subscription_on_payment to bump subscriptions.current_period_end.
// ============================================================================

type Plan = 'monthly' | 'yearly'

const PRODUCT_BY_PLAN: Record<Plan, QrProduct> = {
  monthly: 'subscription',
  yearly:  'subscription_yearly',
}

export default function DashboardRenewPage() {
  const router = useRouter()
  const supabase = getBrowserSupabase()
  const [authChecked, setAuthChecked] = useState(false)
  const [plan, setPlan] = useState<Plan | null>(null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/login?next=/dashboard/renew')
        return
      }
      setAuthChecked(true)
    })
  }, [router, supabase])

  if (!authChecked) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand" />
      </main>
    )
  }

  return (
    <>
      <AppNav />
      <main className="min-h-[100dvh] pb-16">
        <div className="max-w-md mx-auto px-4 pt-4 pb-24 space-y-5">
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-ink">
            <ChevronLeft className="w-4 h-4" /> Kembali ke dashboard
          </Link>

          <header className="space-y-2">
            <h1 className="text-[26px] sm:text-[30px] font-extrabold tracking-tight leading-tight">
              Renew <span style={{ color: '#0A0A0A' }}>Kita</span><span style={{ color: '#FACC15' }}>2u</span>
            </h1>
            <p className="text-[13px] text-muted leading-snug">
              Bayar Rp 38.000/bulan atau Rp 350.000/tahun lewat QRIS. Scan QR,
              bayar, upload bukti — profil kamu aktif lagi dalam beberapa
              detik. Customer langsung bisa kontak kamu di /cari/rider.
            </p>
          </header>

          {!plan && (
            <>
              <PlanCard
                plan="monthly" price="38.000" cadence="per bulan"
                saveBadge={null} highlight={false}
                onPick={() => setPlan('monthly')}
              />
              <PlanCard
                plan="yearly" price="350.000" cadence="per tahun"
                saveBadge="Hemat ~23%" highlight={true}
                onPick={() => setPlan('yearly')}
              />
              <div className="card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand shrink-0" strokeWidth={2.5} />
                  <div className="text-[13px] font-extrabold text-ink">Termasuk dalam subscription</div>
                </div>
                <ul className="text-[12px] text-bg/80 leading-snug space-y-1">
                  <li>• Tampil di /cari/rider untuk semua pelanggan Kita2u</li>
                  <li>• Push notification untuk setiap booking customer</li>
                  <li>• 1 listing tour guide gratis (di /tour) — bonus driver perk</li>
                  <li>• Akses dashboard hotspots + ROI tracking</li>
                </ul>
              </div>
            </>
          )}

          {plan && (
            <>
              <div className="card p-3 flex items-center justify-between gap-3">
                <div className="text-[12px] text-muted">Paket dipilih:</div>
                <button
                  type="button"
                  onClick={() => setPlan(null)}
                  className="text-[12px] font-extrabold text-brand hover:underline"
                >
                  ← Ganti paket
                </button>
              </div>
              <QrPaymentFlow
                product={PRODUCT_BY_PLAN[plan]}
                onActivated={() => setTimeout(() => router.push('/dashboard?renewed=1'), 2500)}
              />
            </>
          )}
        </div>
      </main>
    </>
  )
}

function PlanCard({
  plan, price, cadence, saveBadge, highlight, onPick,
}: {
  plan: Plan
  price: string
  cadence: string
  saveBadge: string | null
  highlight: boolean
  onPick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="relative w-full text-left rounded-2xl p-4 active:scale-[0.99] transition"
      style={{
        background: highlight ? 'linear-gradient(135deg, #FACC15, #EAB308)' : 'rgba(255,255,255,0.04)',
        border: highlight ? '1px solid rgba(0,0,0,0.85)' : '1px solid rgba(250,204,21,0.30)',
        boxShadow: highlight ? '0 12px 28px rgba(250,204,21,0.30)' : '0 6px 18px rgba(0,0,0,0.30)',
        color: highlight ? '#0A0A0C' : undefined,
      }}
    >
      {saveBadge && (
        <span
          className="absolute -top-2 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider"
          style={{ background: '#0A0A0C', color: '#FACC15' }}
        >
          <Star className="w-2.5 h-2.5 fill-brand stroke-brand" />
          {saveBadge}
        </span>
      )}
      <div className="text-[11px] font-extrabold uppercase tracking-wider opacity-80">
        {plan === 'yearly' ? 'Yearly' : 'Monthly'}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-[28px] font-extrabold tabular-nums leading-none">Rp {price}</span>
        <span className="text-[12px] font-bold opacity-75">{cadence}</span>
      </div>
      <div className="mt-3 text-[12px] font-extrabold">Pilih paket ini →</div>
    </button>
  )
}
