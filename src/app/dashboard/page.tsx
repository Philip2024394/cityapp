'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Users, IdCard, MessageSquare, Share2, Eye, Scale, Edit3, MapPin, Bike } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import DashboardNav from '@/components/layout/DashboardNav'
import GoOnlineToggle from '@/components/rider/GoOnlineToggle'
import ROIHero from '@/components/rider/ROIHero'
import { MOCK_RIDERS } from '@/data/mockRiders'
import { MOCK_CUSTOMERS, repeatCustomers } from '@/data/mockCustomers'
import { fetchMyDriverBrowser } from '@/lib/drivers/queries'
import { useHaptic } from '@/hooks/useHaptic'
import type { Rider } from '@/types/rider'

const FALLBACK_ME = MOCK_RIDERS[0]!
const SUBSCRIPTION_MONTHLY = 30_000

// City Rider is a software listing directory, NOT a ride-hailing operator.
// This dashboard is therefore a PROFILE + SUBSCRIPTION + ANALYTICS console
// for the independent rider — there is intentionally no dispatch, no
// realtime incoming-trip channel, and no platform-side trip records.
// Customers reach the rider via WhatsApp deep-links from the public
// profile; everything after that is between them.
export default function DashboardPage() {
  const haptic = useHaptic()
  const [online, setOnline] = useState(true)

  // Authenticated independent rider for this dashboard. Falls back to demo
  // rider until Supabase responds (or if not configured at all).
  const [ME, setME] = useState<Rider>(FALLBACK_ME)
  useEffect(() => {
    let cancelled = false
    fetchMyDriverBrowser().then((me) => {
      if (cancelled || !me) return
      setME(me)
    })
    return () => { cancelled = true }
  }, [])

  async function shareProfile() {
    haptic.tap()
    const url = `${window.location.origin}/r/${ME.slug}`
    const shareData = {
      title: `${ME.name} · City Rider`,
      text: `I'm a motorcycle courier in ${ME.city}. Book directly on WhatsApp.`,
      url,
    }
    if (navigator.share) {
      try { await navigator.share(shareData) } catch { /* user cancel */ }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        alert('Your profile link has been copied — paste in WhatsApp Status / Instagram / FB')
      } catch { /* clipboard blocked */ }
    }
  }

  // Derive ROI numbers — in production, sum quote_events for current month.
  const monthQuoteCount  = 47
  const monthLeadsValue  = 615_000  // sum of fares across the month

  return (
    <>
      <AppNav />
      <main className="min-h-screen pb-28">
        <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
          {/* Greeting */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={ME.photoUrl} alt="" className="w-11 h-11 rounded-xl object-cover" />
              <div>
                <div className="text-[13px] text-muted">Welcome back,</div>
                <div className="text-lg font-extrabold">{ME.name.split(' ')[0]}</div>
              </div>
            </div>
            <button onClick={shareProfile} className="btn-secondary !py-2 !px-3 !text-[13px] !min-h-0">
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
          </div>

          {/* GO ONLINE */}
          <GoOnlineToggle defaultOnline={online} onChange={setOnline} />

          {/* ROI Hero — replaces the old 3-tile stats */}
          <ROIHero
            monthlyQuotes={monthQuoteCount}
            monthlyLeadsValue={monthLeadsValue}
            subscriptionMonthly={SUBSCRIPTION_MONTHLY}
          />

          {/* Edit listing — sends rider back through /onboarding which
              upserts the drivers row. Top-level CTA because it's the most
              common action ("change my price / hours / bike"). */}
          <Link
            href="/onboarding?mode=edit"
            className="card card-interactive p-4 flex items-center justify-between"
            style={{ background: 'rgba(250,204,21,0.08)', borderColor: 'rgba(250,204,21,0.30)' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center shrink-0">
                <Edit3 className="w-4 h-4 text-brand" />
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-[14px]">Edit my listing</div>
                <div className="text-[13px] text-muted truncate">
                  Price, services, bike details — all editable
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-brand shrink-0" />
          </Link>

          {/* Owner dashboards — visible to all signed-in users so a non-rider
              place or rental owner can still navigate here. The dashboards
              themselves show empty-state CTAs if the user has no listings. */}
          <div className="grid grid-cols-2 gap-2">
            <ToolCard
              href="/dashboard/places"
              icon={<MapPin className="w-4 h-4" />}
              label="My places"
              hint="Edit / renew"
            />
            <ToolCard
              href="/dashboard/rentals"
              icon={<Bike className="w-4 h-4" />}
              label="My rentals"
              hint="Edit bikes"
            />
          </div>

          {/* Rider-tools row */}
          <div className="grid grid-cols-3 gap-2">
            <ToolCard
              href="/dashboard/customers"
              icon={<Users className="w-4 h-4" />}
              label="Customer Book"
              hint={`${MOCK_CUSTOMERS.length} · ${repeatCustomers().length} repeat`}
            />
            <ToolCard
              href="/dashboard/card"
              icon={<IdCard className="w-4 h-4" />}
              label="Business card"
              hint="QR + print"
            />
            <ToolCard
              href="/dashboard/templates"
              icon={<MessageSquare className="w-4 h-4" />}
              label="Quick reply"
              hint="8 templates"
            />
          </div>

          {/* Legal requirements — single-row prompt to /dashboard/legal */}
          <Link href="/dashboard/legal" className="card card-interactive p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-brand/12 border border-brand/22 flex items-center justify-center shrink-0">
                <Scale className="w-4 h-4 text-brand" />
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-[14px]">Legal requirements</div>
                <div className="text-[13px] text-muted truncate">
                  SIM C · STNK · insurance · NPWP — what you need as an independent rider
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-brand shrink-0" />
          </Link>

          {/* Profile preview link */}
          <a
            href={`/r/${ME.slug}`}
            target="_blank"
            rel="noopener"
            className="card card-interactive p-4 flex items-center justify-between"
          >
            <div className="min-w-0">
              <div className="text-[13px] text-dim uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                <Eye className="w-3 h-3" />
                Your public profile
              </div>
              <div className="font-bold mt-1 text-[14px] text-brand truncate">cityrider.id/r/{ME.slug}</div>
              <div className="text-[13px] text-muted mt-1">Share this link with customers & social</div>
            </div>
            <ArrowRight className="w-5 h-5 text-brand shrink-0" />
          </a>

          {/* Subscription card */}
          <div className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[13px] text-dim uppercase tracking-wider font-extrabold">Subscription</div>
                <div className="font-extrabold text-lg mt-0.5">
                  {ME.subscriptionStatus === 'trial' ? 'Trial — 14 days remaining' : 'Active'}
                </div>
                <div className="text-[13px] text-muted mt-1">Rp 30.000/month · Midtrans</div>
              </div>
              <span className={ME.subscriptionStatus === 'trial' ? 'chip' : 'chip chip-online'}>
                {ME.subscriptionStatus === 'trial' ? '⏳ Trial' : '✓ Active'}
              </span>
            </div>
          </div>
        </div>
      </main>
      <DashboardNav />
    </>
  )
}

function ToolCard({ href, icon, label, hint }: { href: string; icon: React.ReactNode; label: string; hint: string }) {
  return (
    <Link
      href={href}
      className="card card-interactive p-3 flex flex-col gap-1.5 min-h-[96px]"
    >
      <div className="w-8 h-8 rounded-lg bg-brand/12 border border-brand/22 flex items-center justify-center text-brand">
        {icon}
      </div>
      <div className="text-[14px] font-extrabold leading-tight mt-1">{label}</div>
      <div className="text-[13px] text-muted leading-tight">{hint}</div>
    </Link>
  )
}
