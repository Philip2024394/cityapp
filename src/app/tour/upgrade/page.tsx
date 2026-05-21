'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Star, Check, Loader2, ChevronLeft, Compass } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { startSnapCheckout } from '@/lib/midtrans/client'

// ============================================================================
// /tour/upgrade
// ----------------------------------------------------------------------------
// Standalone tour guide (NOT a City Rider driver) pays Rp 38K/month or
// Rp 350K/year to unlock 1 tour-guide listing. Same flat StreetLocal
// pricing as /rent/upgrade — different DB product (tour_guide_*).
//
// On settlement, the extend_tour_guide_on_payment trigger flips
// user_accounts.tour_guide_status='active' and un-pauses any listings.
// ============================================================================

type Plan = 'monthly' | 'yearly'

export default function TourGuideUpgradePage() {
  const router = useRouter()
  const supabase = getBrowserSupabase()
  const [authChecked, setAuthChecked] = useState(false)
  const [busy, setBusy] = useState<Plan | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/login?next=/tour/upgrade')
        return
      }
      setAuthChecked(true)
    })
  }, [router, supabase])

  async function startCheckout(plan: Plan) {
    setErr(null)
    setBusy(plan)
    const product = plan === 'yearly' ? 'tour_guide_yearly' : 'tour_guide_monthly'
    await startSnapCheckout({
      product,
      onSuccess: () => router.push('/tour/list/new?upgraded=1'),
      onPending: () => router.push('/dashboard?tour=pending'),
      onError:   (m) => { setErr(m); setBusy(null) },
      onClose:   () => setBusy(null),
    })
  }

  if (!authChecked) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand" />
      </main>
    )
  }

  return (
    <>
      <AppNav />
      <main className="min-h-screen pb-16">
        <div className="max-w-md mx-auto px-4 pt-4 pb-24 space-y-5">
          <Link href="/tour/list/new" className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-ink">
            <ChevronLeft className="w-4 h-4" /> Kembali
          </Link>

          <header className="space-y-2">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #FACC15, #EAB308)',
                border: '1px solid rgba(0,0,0,0.85)',
              }}
            >
              <Compass className="w-6 h-6 text-bg" strokeWidth={2.5} />
            </div>
            <h1 className="text-[26px] sm:text-[30px] font-extrabold tracking-tight leading-tight">
              Aktifkan <span className="gradient-text">Tour Guide</span>
            </h1>
            <p className="text-[13px] text-muted leading-snug">
              1 listing tour guide di /tour. Cocok kalau kamu freelance guide
              dan tidak (atau belum) jadi City Rider driver — karena driver dengan
              subscription aktif sudah dapat listing tour guide gratis.
            </p>
          </header>

          {err && (
            <div className="rounded-xl p-3 bg-red-900/30 border border-red-500/40 text-[13px] text-red-200 font-bold">{err}</div>
          )}

          <PlanCard
            plan="monthly"
            price="38.000"
            cadence="per bulan"
            saveBadge={null}
            highlight={false}
            busy={busy === 'monthly'}
            onPick={() => startCheckout('monthly')}
          />
          <PlanCard
            plan="yearly"
            price="350.000"
            cadence="per tahun"
            saveBadge="Hemat ~23%"
            highlight={true}
            busy={busy === 'yearly'}
            onPick={() => startCheckout('yearly')}
          />

          <div className="card p-4 space-y-2">
            <div className="text-[13px] font-extrabold text-ink">Termasuk</div>
            <ul className="text-[12px] text-bg/80 leading-snug space-y-1">
              <li>• 1 listing tour guide tayang di /tour untuk semua pelanggan City Riders</li>
              <li>• Pilih max 3 specialties (Temples, Mountain, Waterfall, dll)</li>
              <li>• Pelanggan kontak langsung lewat WhatsApp — kamu pegang full transaksi</li>
              <li>• Edit profil + harga + lokasi kapan saja dari /dashboard</li>
            </ul>
            <p className="text-[11px] text-muted leading-snug pt-1">
              Subscription auto-renew tiap bulan/tahun via Midtrans. Cancel kapan saja — listing kamu di-pause sampai renew berikutnya.
            </p>
          </div>
        </div>
      </main>
    </>
  )
}

function PlanCard({
  plan, price, cadence, saveBadge, highlight, busy, onPick,
}: {
  plan: Plan
  price: string
  cadence: string
  saveBadge: string | null
  highlight: boolean
  busy: boolean
  onPick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={busy}
      className="relative w-full text-left rounded-2xl p-4 active:scale-[0.99] transition disabled:opacity-70"
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
      <div className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-extrabold">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" strokeWidth={3} />}
        {busy ? 'Mempersiapkan pembayaran…' : 'Pilih paket ini'}
      </div>
    </button>
  )
}
