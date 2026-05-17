'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Users, IdCard, MessageSquare, Share2, Eye } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import DashboardNav from '@/components/layout/DashboardNav'
import GoOnlineToggle from '@/components/rider/GoOnlineToggle'
import ROIHero from '@/components/rider/ROIHero'
import QuoteInbox, { type InboxQuote } from '@/components/rider/QuoteInbox'
import IncomingOrderModal, { type IncomingOrder } from '@/components/rider/IncomingOrderModal'
import { MOCK_RIDERS } from '@/data/mockRiders'
import { MOCK_CUSTOMERS, repeatCustomers } from '@/data/mockCustomers'
import { useBeep } from '@/hooks/useBeep'
import { useHaptic } from '@/hooks/useHaptic'

const ME = MOCK_RIDERS[0]!
const SUBSCRIPTION_MONTHLY = 30_000

const DEMO_QUOTES: InboxQuote[] = [
  { id: 'q1', pickupLabel: 'Malioboro 45', dropoffLabel: 'UGM Bulaksumur',
    distanceKm: 4.2, fare: 12_500, receivedAt: Date.now() - 5 * 60 * 1000, read: false,
    customerWhatsApp: '6285800000001' },
  { id: 'q2', pickupLabel: 'Jl. Solo Km 6', dropoffLabel: 'Ambarrukmo Plaza',
    distanceKm: 2.8, fare: 10_000, receivedAt: Date.now() - 18 * 60 * 1000, read: false,
    customerWhatsApp: '6285800000002' },
  { id: 'q3', pickupLabel: 'Bandara YIA', dropoffLabel: 'Kraton',
    distanceKm: 6.1, fare: 15_250, receivedAt: Date.now() - 2 * 60 * 60 * 1000, read: true,
    customerWhatsApp: '6285800000003' },
]

export default function DashboardPage() {
  const beep = useBeep()
  const haptic = useHaptic()
  const [quotes, setQuotes] = useState<InboxQuote[]>(DEMO_QUOTES)
  const [online, setOnline] = useState(true)
  const [incoming, setIncoming] = useState<IncomingOrder | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function fakeIncomingOrder() {
    // Open the incoming-order modal — the LOUD alarm fires automatically
    // on mount + repeats every ~3 seconds until rider responds.
    haptic.buzz()
    setIncoming({
      id: 'o' + Date.now(),
      pickupLabel: 'Tugu Jogja',
      dropoffLabel: 'Hotel Tentrem',
      pitstopNote: 'Buy 1 pack Marlboro Lights at warung depan',
      distanceKm: 3.5,
      fare: 10_000,
      pitstopFee: 5_000,
    })
  }

  function onAccept(order: IncomingOrder) {
    haptic.impact()
    beep.play()
    // Add accepted order into the inbox + mark as read
    setQuotes(qs => [{
      id: order.id,
      pickupLabel: order.pickupLabel,
      dropoffLabel: order.dropoffLabel,
      distanceKm: order.distanceKm,
      fare: order.fare + (order.pitstopFee ?? 0),
      receivedAt: Date.now(),
      read: true,
      customerWhatsApp: '6285800000099',
    }, ...qs])
    setIncoming(null)
    showToast('✅ Accepted — customer notified, coordinate on WhatsApp')
  }

  function onDecline(_order: IncomingOrder) {
    haptic.tap()
    setIncoming(null)
    showToast('Declined — customer will be redirected to other riders')
  }

  function onExpire(_order: IncomingOrder) {
    setIncoming(null)
    showToast('⌛ Timed out — order missed')
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  function onReply(q: InboxQuote) {
    setQuotes(qs => qs.map(x => (x.id === q.id ? { ...x, read: true } : x)))
    const link = `https://wa.me/${q.customerWhatsApp?.replace(/[^0-9]/g, '')}`
    window.open(link, '_blank', 'noopener,noreferrer')
  }

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

          {/* New rider-tools row */}
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

          {/* Quote inbox */}
          <QuoteInbox quotes={quotes} onReply={onReply} />

          {/* Demo trigger — fires the LOUD incoming-order modal */}
          <button onClick={fakeIncomingOrder} className="btn-secondary w-full">
            🚨 Simulate an incoming order (loud alarm + accept/decline modal)
          </button>

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

      {/* Loud incoming-order modal — z-100, full-screen overlay */}
      <IncomingOrderModal
        order={incoming}
        timeoutSec={300}
        onAccept={onAccept}
        onDecline={onDecline}
        onExpire={onExpire}
      />

      {/* Toast — short-lived status bar at the top */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[110] glass-strong rounded-full px-4 py-2.5 text-[13px] font-bold shadow-card animate-[fadeUp_0.25s_ease-out_both] max-w-[92vw] text-center">
          {toast}
        </div>
      )}
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
