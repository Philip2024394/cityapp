'use client'
import Link from 'next/link'
import { CreditCard, AlertCircle } from 'lucide-react'

// ============================================================================
// Provider subscription status banner — drops into every provider dashboard.
// Reads paid_until + trial_ends_at + subscription_status from the provider
// row the dashboard already loaded, derives a state, and renders the right
// CTA + countdown.
//
// States:
//   • Trial active   — yellow, "Trial selesai dalam X hari" + Renew button
//   • Paid active    — subtle, "Berikutnya: <date>" no CTA (unless < 7d)
//   • Paid renewing  — yellow, "Renew dalam X hari" + Renew button
//   • Expired        — red, "Subscription overdue · listing tersembunyi"
//                      + Renew button
//   • Unknown        — silent (avoid noisy UI when DB columns are null)
// ============================================================================

type Provider = {
  subscription_status?: 'trial' | 'active' | 'expired' | 'cancelled' | null
  trial_ends_at?: string | null
  paid_until?: string | null
}

function daysUntil(ts: string | null | undefined): number | null {
  if (!ts) return null
  const ms = new Date(ts).getTime() - Date.now()
  if (!Number.isFinite(ms)) return null
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

export default function ProviderRenewBanner({
  provider,
  upgradeHref,
}: {
  provider: Provider | null
  upgradeHref: string
}) {
  if (!provider) return null

  const status = provider.subscription_status ?? 'trial'
  const trialDays = daysUntil(provider.trial_ends_at)
  const paidDays  = daysUntil(provider.paid_until)

  // Expired or about to expire while in trial.
  if (status === 'expired' || status === 'cancelled') {
    return (
      <Section tone="red" icon={<AlertCircle className="w-4 h-4 shrink-0" strokeWidth={2.5} />}>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-extrabold leading-tight">Subscription overdue</div>
          <div className="text-[12px] opacity-85 mt-0.5 leading-snug">
            Listing kamu disembunyikan dari marketplace sampai pembayaran masuk.
          </div>
        </div>
        <CTA href={upgradeHref} tone="red" />
      </Section>
    )
  }

  // Paid + still has time. Show subtle reminder when <7 days out.
  if (status === 'active' && paidDays != null) {
    if (paidDays > 7) {
      return (
        <Section tone="subtle">
          <div className="flex-1 min-w-0 text-[12px] opacity-80">
            Subscription aktif · perpanjang otomatis tidak ada — perbarui sebelum {formatDate(provider.paid_until)}
          </div>
        </Section>
      )
    }
    if (paidDays >= 0) {
      return (
        <Section tone="yellow" icon={<CreditCard className="w-4 h-4 shrink-0" strokeWidth={2.5} />}>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-extrabold leading-tight">
              Renew dalam {paidDays} hari
            </div>
            <div className="text-[12px] opacity-85 mt-0.5 leading-snug">
              Akun aktif sampai {formatDate(provider.paid_until)} · upload bukti transfer dan akun tetap online.
            </div>
          </div>
          <CTA href={upgradeHref} tone="yellow" />
        </Section>
      )
    }
    // paidDays < 0 → treat as expired
    return (
      <Section tone="red" icon={<AlertCircle className="w-4 h-4 shrink-0" strokeWidth={2.5} />}>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-extrabold leading-tight">
            Subscription telat {Math.abs(paidDays)} hari
          </div>
          <div className="text-[12px] opacity-85 mt-0.5 leading-snug">
            Listing akan disembunyikan dari marketplace. Renew untuk aktif kembali.
          </div>
        </div>
        <CTA href={upgradeHref} tone="red" />
      </Section>
    )
  }

  // Trial mode.
  if (status === 'trial' && trialDays != null) {
    if (trialDays > 0) {
      return (
        <Section tone="yellow" icon={<CreditCard className="w-4 h-4 shrink-0" strokeWidth={2.5} />}>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-extrabold leading-tight">
              Trial selesai dalam {trialDays} hari
            </div>
            <div className="text-[12px] opacity-85 mt-0.5 leading-snug">
              Setelah {formatDate(provider.trial_ends_at)} listing kamu disembunyikan kalau belum subscribe.
            </div>
          </div>
          <CTA href={upgradeHref} tone="yellow" />
        </Section>
      )
    }
    return (
      <Section tone="red" icon={<AlertCircle className="w-4 h-4 shrink-0" strokeWidth={2.5} />}>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-extrabold leading-tight">Trial sudah selesai</div>
          <div className="text-[12px] opacity-85 mt-0.5 leading-snug">
            Subscribe Rp 38K/bulan supaya listing aktif kembali.
          </div>
        </div>
        <CTA href={upgradeHref} tone="red" />
      </Section>
    )
  }

  return null
}

function Section({
  tone, icon, children,
}: {
  tone: 'yellow' | 'red' | 'subtle'
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  const styles = tone === 'red'
    ? { background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)', color: '#FCA5A5' }
    : tone === 'yellow'
    ? { background: 'rgba(250,204,21,0.10)', border: '1px solid rgba(250,204,21,0.40)', color: '#FACC15' }
    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', color: '#9CA3AF' }
  return (
    <section className="rounded-2xl px-4 py-3 flex items-center gap-3" style={styles}>
      {icon}
      {children}
    </section>
  )
}

function CTA({ href, tone }: { href: string; tone: 'yellow' | 'red' }) {
  const bg = tone === 'red' ? '#EF4444' : '#FACC15'
  const fg = tone === 'red' ? '#FFFFFF' : '#0A0A0A'
  return (
    <Link href={href}
      className="shrink-0 rounded-full px-4 py-2 text-[12px] font-extrabold uppercase tracking-wider whitespace-nowrap active:scale-95 transition"
      style={{ background: bg, color: fg }}>
      Renew
    </Link>
  )
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}
