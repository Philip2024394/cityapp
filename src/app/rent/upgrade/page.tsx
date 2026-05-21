'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Star, Check, Loader2, ChevronLeft, ShieldCheck } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { startSnapCheckout } from '@/lib/midtrans/client'

// ============================================================================
// /rent/upgrade
// ----------------------------------------------------------------------------
// Personal account hit their 1-listing quota OR a Rental Company account's
// subscription lapsed. This page sells the same flat StreetLocal pricing
// (Rp 38K/mo or Rp 350K/yr) and kicks off Midtrans Snap.
//
// On settlement the payment_intents → user_accounts trigger flips the
// caller's account_type to 'rental_company' and any paused listings of
// theirs un-pause back to 'approved'.
// ============================================================================

type Plan = 'monthly' | 'yearly'

export default function RentalCompanyUpgradePage() {
  const router = useRouter()
  const supabase = getBrowserSupabase()
  const [authedUserId, setAuthedUserId] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [busy, setBusy] = useState<Plan | null>(null)
  const [err, setErr] = useState<string | null>(null)

  // Auth gate — bounce to /login with returnTo = this page.
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/login?next=/rent/upgrade')
        return
      }
      setAuthedUserId(user.id)
      setAuthChecked(true)
    })
  }, [router, supabase])

  async function startCheckout(plan: Plan) {
    setErr(null)
    if (!authedUserId) return
    setBusy(plan)
    const product = plan === 'yearly' ? 'rental_company_yearly' : 'rental_company_monthly'
    await startSnapCheckout({
      product,
      onSuccess: () => router.push('/dashboard/rentals?upgraded=1'),
      onPending: () => router.push('/dashboard/rentals?pending=1'),
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
          <Link href="/rent/list/new" className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-ink">
            <ChevronLeft className="w-4 h-4" /> Kembali
          </Link>

          <header className="space-y-2">
            <h1 className="text-[26px] sm:text-[30px] font-extrabold tracking-tight leading-tight">
              Upgrade ke <span className="gradient-text">Rental Company</span>
            </h1>
            <p className="text-[13px] text-muted leading-snug">
              Listing motor tanpa batas. Tampil di seluruh kota Indonesia. Cocok
              untuk usaha rental, hotel, atau toko motor yang punya beberapa unit.
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
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand shrink-0" strokeWidth={2.5} />
              <div className="text-[13px] font-extrabold text-ink">Termasuk</div>
            </div>
            <ul className="text-[12px] text-bg/80 leading-snug space-y-1">
              <li>• Listing motor tanpa batas (sewa harian / mingguan / bulanan)</li>
              <li>• Dukungan motor + driver tour (3 / 6 / 8 jam)</li>
              <li>• Dashboard kelola listing, edit harga + foto kapan saja</li>
              <li>• Tampil di /rent untuk semua pelanggan City Riders</li>
            </ul>
            <p className="text-[11px] text-muted leading-snug pt-1">
              <strong>Catatan:</strong> akun Rental Company khusus untuk listing motor
              — bookingan personal (motor, food, parcel) tidak tersedia di akun ini.
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
        background: highlight
          ? 'linear-gradient(135deg, #FACC15, #EAB308)'
          : 'rgba(255,255,255,0.04)',
        border: highlight ? '1px solid rgba(0,0,0,0.85)' : '1px solid rgba(250,204,21,0.30)',
        boxShadow: highlight
          ? '0 12px 28px rgba(250,204,21,0.30)'
          : '0 6px 18px rgba(0,0,0,0.30)',
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
