'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import AppNav from '@/components/layout/AppNav'

const PartnerQRCard = dynamic(() => import('@/components/partners/PartnerQRCard'), { ssr: false })

// Partner dashboard — KPI strip + printable QR. Bookings live on their
// own route (/dashboard/partner/bookings) reached from the partner
// drawer, one drawer item per filter (pending / overdue / settled / all).

type Partner = {
  id: string
  slug: string
  name: string
  partner_type: string
  status: string
  commission_rate: number
  city: string | null
  payout_method: string | null
}

type Summary = {
  totalBookings: number
  pendingCount: number; pendingIdr: number
  settledCount: number; settledIdr: number
  disputedCount: number
  waivedCount: number
  overdueCount: number; overdueIdr: number
}

export default function PartnerDashboard() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/partners/me/bookings', { cache: 'no-store' })
        if (r.status === 401) { setErr('not_signed_in'); return }
        const j = await r.json() as { partners: Partner[]; summary: Summary }
        setPartners(j.partners || [])
        setSummary(j.summary || null)
      } catch {
        setErr('fetch_failed')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <DashboardShell><Loading /></DashboardShell>
  if (err === 'not_signed_in') return <DashboardShell><NeedsSignIn /></DashboardShell>
  if (partners.length === 0) return <DashboardShell><NotAPartner /></DashboardShell>

  return (
    <DashboardShell>
      <div className="px-4 pt-6 pb-24 max-w-3xl mx-auto">
        <h1 className="text-[24px] font-black mb-1">Partner dashboard</h1>
        <p className="text-[13px] text-ink/60 mb-6">
          {partners[0].name} · <span className="font-mono text-ink/40">{partners[0].slug}</span>
        </p>

        {!partners[0].payout_method && (
          <Link
            href="/dashboard/partner/payout"
            className="block rounded-2xl bg-brand text-bg p-4 mb-4 shadow-card hover:brightness-105 transition"
          >
            <div className="text-[12px] font-extrabold uppercase tracking-wider mb-0.5">⚠ Payout details not set</div>
            <div className="text-[13px] font-bold">
              Tell us how drivers should pay you the 8% commission. Until you do, drivers can&apos;t see your bank / QRIS details. →
            </div>
          </Link>
        )}

        {summary && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Stat
              label="Earned (settled)"
              value={`Rp ${summary.settledIdr.toLocaleString('id-ID')}`}
              sub={`${summary.settledCount} bookings`}
              accent
            />
            <Stat
              label="Pending"
              value={`Rp ${summary.pendingIdr.toLocaleString('id-ID')}`}
              sub={`${summary.pendingCount} bookings`}
            />
            <Stat
              label="Overdue"
              value={`Rp ${summary.overdueIdr.toLocaleString('id-ID')}`}
              sub={`${summary.overdueCount} bookings`}
              warn={summary.overdueCount > 0}
            />
            <Stat
              label="Total bookings"
              value={String(summary.totalBookings)}
              sub="all time"
            />
          </div>
        )}

        <section className="rounded-2xl bg-black/85 border border-white/10 p-5 mb-6 shadow-card">
          <h2 className="text-[14px] font-extrabold mb-3 uppercase tracking-wider">Your QR code</h2>
          <p className="text-[12px] text-ink/60 mb-4">
            Print and place in rooms / lobby. Each scan attributes that guest to you for 24 hours.
          </p>
          <PartnerQRCard
            partnerName={partners[0].name}
            partnerSlug={partners[0].slug}
            city={partners[0].city}
          />
        </section>

        <p className="text-[12px] text-ink/60 text-center mt-4">
          Bookings live in the side drawer →{' '}
          <Link href="/dashboard/partner/bookings?status=pending" className="text-brand hover:underline">
            open the pending list
          </Link>
        </p>
      </div>
    </DashboardShell>
  )
}

function Stat({ label, value, sub, accent, warn }: {
  label: string; value: string; sub?: string; accent?: boolean; warn?: boolean
}) {
  return (
    <div className={`rounded-xl p-3 bg-black/85 shadow-card border ${
      warn ? 'border-red-500/40'
      : accent ? 'border-brand/45'
      : 'border-white/10'
    }`}>
      <div className="text-[10px] uppercase tracking-wider font-bold text-ink/60 mb-1">{label}</div>
      <div className={`text-[18px] font-black ${accent ? 'text-brand' : warn ? 'text-red-300' : 'text-ink'}`}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-ink/50 mt-0.5">{sub}</div>}
    </div>
  )
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] text-ink overflow-hidden">
      <AppNav />
      {children}
    </main>
  )
}

function Loading() {
  return (
    <div className="px-4 pt-6 pb-24 max-w-3xl mx-auto">
      <div className="h-6 bg-white/5 rounded w-1/3 mb-3 animate-pulse" />
      <div className="h-4 bg-white/5 rounded w-1/2 mb-6 animate-pulse" />
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[0,1,2,3].map((i) => <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />)}
      </div>
    </div>
  )
}

function NeedsSignIn() {
  return (
    <div className="px-4 pt-20 pb-24 max-w-md mx-auto text-center">
      <h1 className="text-[20px] font-black mb-2">Sign in required</h1>
      <p className="text-[13px] text-ink/60 mb-6">Log in to view your partner dashboard.</p>
      <Link href="/login?next=/dashboard/partner" className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block">
        Sign in
      </Link>
    </div>
  )
}

function NotAPartner() {
  return (
    <div className="px-4 pt-20 pb-24 max-w-md mx-auto text-center">
      <h1 className="text-[20px] font-black mb-2">Not a partner yet</h1>
      <p className="text-[13px] text-ink/70 mb-6">
        Your account isn&apos;t linked to a partner profile. Register as a hotel, villa, restaurant, cafe, tour operator, or private individual to start earning commissions.
      </p>
      <Link href="/partners/signup" className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block">
        Register as partner
      </Link>
    </div>
  )
}
