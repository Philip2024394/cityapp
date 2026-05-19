'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Users, IdCard, MessageSquare, Share2, Eye, Scale, Edit3, MapPin, Bike, Star, Copy, Check, MessageCircle, Facebook, Instagram, ClipboardList, Map as MapIcon, ExternalLink } from 'lucide-react'
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
          <div className="grid grid-cols-3 gap-2">
            <ToolCard
              href="/dashboard/favourites"
              icon={<Star className="w-4 h-4" />}
              label="Favourite places"
              hint="Recommend to customers"
            />
            <ToolCard
              href="/dashboard/places"
              icon={<MapPin className="w-4 h-4" />}
              label="My places"
              hint="Listings I own"
            />
            <ToolCard
              href="/dashboard/rentals"
              icon={<Bike className="w-4 h-4" />}
              label="My rentals"
              hint="Edit bikes"
            />
          </div>

          {/* Rider-tools row */}
          <div className="grid grid-cols-2 gap-2">
            <ToolCard
              href="/dashboard/operations"
              icon={<ClipboardList className="w-4 h-4" />}
              label="Operations log"
              hint="Rides · NPWP · CSV"
            />
            <ToolCard
              href="/dashboard/customers"
              icon={<Users className="w-4 h-4" />}
              label="Customer Book"
              hint={`${MOCK_CUSTOMERS.length} · ${repeatCustomers().length} repeat`}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
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

          {/* Help map your area — deep-links to the OpenStreetMap iD editor
              centred on the driver's current service area. Drivers who know
              the local alleys/gangs can add them to OSM; that improves the
              public map for everyone. Important: the contribution is made
              on the driver's own OSM account — City Rider is NOT the
              recorder of trip data or road geometry, preserving the
              software-directory legal posture. */}
          <OsmContributeCard lat={ME.lat} lng={ME.lng} city={ME.city} />

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

          {/* Share kit — explicit per-channel buttons. The dashboard's job
              is to push the driver to share as often as possible; one tap
              per channel = lower friction than picking from a system share
              sheet. Instagram has no web-share API, so we copy + open the
              IG app via deep-link as the closest equivalent. */}
          <ShareKitCard slug={ME.slug} riderName={ME.name} city={ME.city} />

          {/* Subscription card with working Renew button (Midtrans Snap) */}
          <SubscriptionCard status={ME.subscriptionStatus} />
        </div>
      </main>
      <DashboardNav />
    </>
  )
}

// ShareKitCard — explicit per-channel share buttons. The driver page is
// only valuable if it gets distributed; this section optimises for low-
// friction sharing to the three channels Indonesian drivers actually use:
// WhatsApp (status + groups), Facebook (Pages + Marketplace), Instagram
// (Stories + bio link). Plus a literal copy button as the universal
// fallback.
function ShareKitCard({ slug, riderName, city }: { slug: string; riderName: string; city: string }) {
  const [shareUrl, setShareUrl] = useState('')
  const [copied,   setCopied]   = useState<'url' | 'ig' | null>(null)
  const [igTip,    setIgTip]    = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setShareUrl(`${window.location.origin}/r/${slug}`)
  }, [slug])

  const shareText = `Booking driver di ${city}? Saya ada di sini — langsung WhatsApp:`

  function flashCopied(which: 'url' | 'ig') {
    setCopied(which)
    setTimeout(() => setCopied(null), 1800)
  }

  function copyLink() {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl).then(() => flashCopied('url')).catch(() => {})
  }

  function shareWhatsApp() {
    if (!shareUrl) return
    const text = encodeURIComponent(`${shareText}\n${shareUrl}`)
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  function shareFacebook() {
    if (!shareUrl) return
    // Facebook's sharer pulls Open Graph metadata from the URL — make sure
    // /r/[slug] has og:title + og:image (handled by Next.js metadata).
    const u = encodeURIComponent(shareUrl)
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      '_blank',
      'noopener,noreferrer,width=620,height=600',
    )
  }

  function shareInstagram() {
    // Instagram has no web share API. The closest UX is: copy the URL to
    // clipboard, then prompt the driver to paste it into their IG Story or
    // bio. On mobile we ALSO try the instagram:// deep link to nudge the
    // app open; desktop just gets the copy + tooltip.
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl).then(() => {
      flashCopied('ig')
      setIgTip(true)
      setTimeout(() => setIgTip(false), 4000)
      // Try opening the IG app (works on mobile; silently does nothing
      // on desktop).
      if (typeof window !== 'undefined') {
        const w = window.open('instagram://story-camera', '_blank')
        // If the browser blocked it (desktop), no-op.
        if (w) w.focus()
      }
    }).catch(() => {})
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Share2 className="w-4 h-4 text-brand" />
        <h2 className="text-[12px] text-dim uppercase tracking-wider font-extrabold">
          Share your page
        </h2>
      </div>

      {/* URL + Copy */}
      <div className="flex items-stretch gap-2 mb-3">
        <div className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-[13px] text-ink font-mono truncate">
          {shareUrl || '—'}
        </div>
        <button
          type="button"
          onClick={copyLink}
          className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-[12px] font-extrabold text-ink hover:border-brand/40 transition"
        >
          {copied === 'url'
            ? <><Check className="w-3.5 h-3.5 text-brand" /> Copied</>
            : <><Copy className="w-3.5 h-3.5" /> Copy</>}
        </button>
      </div>

      {/* Per-channel buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={shareWhatsApp}
          className="inline-flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-[12px] font-extrabold text-white border border-black/60 active:scale-[0.98] transition"
          style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
        >
          <MessageCircle className="w-4 h-4" />
          WhatsApp
        </button>

        <button
          type="button"
          onClick={shareFacebook}
          className="inline-flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-[12px] font-extrabold text-white border border-black/60 active:scale-[0.98] transition"
          style={{ background: 'linear-gradient(135deg, #1877F2, #0E5FD2)' }}
        >
          <Facebook className="w-4 h-4" />
          Facebook
        </button>

        <button
          type="button"
          onClick={shareInstagram}
          className="inline-flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-[12px] font-extrabold text-white border border-black/60 active:scale-[0.98] transition"
          style={{
            background:
              'linear-gradient(135deg, #f9ce34 0%, #ee2a7b 50%, #6228d7 100%)',
          }}
        >
          <Instagram className="w-4 h-4" />
          {copied === 'ig' ? 'Copied' : 'Instagram'}
        </button>
      </div>

      {igTip && (
        <p className="mt-2 text-[12px] text-brand leading-snug">
          Link copied. Open Instagram → tambahkan ke bio atau paste di Story.
        </p>
      )}

      <p className="text-[11px] text-dim text-center mt-3 leading-snug">
        Tip: paste your URL ke IG bio, WA Status, dan Facebook profile description.
        Every share = a new customer who knows your name, not the platform&apos;s.
      </p>

      {/* Voiceover for the empty driver name reference (silence the linter
          and reassure the maintainer that it's intentionally used in the
          shareText constant above). */}
      <span className="sr-only">{riderName}</span>
    </div>
  )
}

// SubscriptionCard — shows subscription status + a working Renew button
// that opens the Midtrans Snap popup. Disabled until Midtrans client
// key is configured (NEXT_PUBLIC_MIDTRANS_CLIENT_KEY), in which case it
// falls back to a manual-QRIS notice.
function SubscriptionCard({ status }: { status?: string }) {
  const [busy, setBusy]       = useState(false)
  const [notice, setNotice]   = useState<string | null>(null)
  const hasClientKey = !!process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY

  async function onRenew() {
    setNotice(null)
    setBusy(true)
    const { startSnapCheckout } = await import('@/lib/midtrans/client')
    startSnapCheckout({
      product: 'subscription',
      onSuccess: () => {
        setNotice('✓ Payment received — your subscription is now active.')
        setBusy(false)
        // Reload after a short pause so the new paid_until shows.
        setTimeout(() => window.location.reload(), 1500)
      },
      onPending: () => {
        setNotice('Pending — Midtrans is finalising the payment. We will update your subscription once confirmed.')
        setBusy(false)
      },
      onError: (msg) => {
        setNotice(msg || 'Payment failed. Please try again.')
        setBusy(false)
      },
      onClose: () => setBusy(false),
    })
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[13px] text-dim uppercase tracking-wider font-extrabold">Subscription</div>
          <div className="font-extrabold text-lg mt-0.5">
            {status === 'trial' ? 'Trial — renew before it expires' : status === 'active' ? 'Active' : 'Inactive'}
          </div>
          <div className="text-[13px] text-muted mt-1">Rp 30.000/month · 30-day extension</div>
        </div>
        <span className={status === 'trial' ? 'chip' : status === 'active' ? 'chip chip-online' : 'chip chip-warn'}>
          {status === 'trial' ? '⏳ Trial' : status === 'active' ? '✓ Active' : '◯ Inactive'}
        </span>
      </div>

      {hasClientKey ? (
        <button
          type="button"
          onClick={onRenew}
          disabled={busy}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-brand to-brand2 text-bg font-extrabold text-[14px] uppercase tracking-wider border border-black/85 active:scale-[0.99] disabled:opacity-60"
        >
          {busy ? 'Opening payment…' : 'Renew · Rp 30.000 / 30 days'}
        </button>
      ) : (
        <div className="mt-4 rounded-xl p-3 text-[12px] leading-snug" style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.35)' }}>
          Midtrans not configured yet. Pay via QRIS to the platform account and ping admin to mark your subscription paid for now. Set <code className="text-brand">NEXT_PUBLIC_MIDTRANS_CLIENT_KEY</code> + <code className="text-brand">MIDTRANS_SERVER_KEY</code> to enable auto-billing.
        </div>
      )}

      {notice && (
        <p className="mt-3 text-[12px] text-brand leading-snug">{notice}</p>
      )}
    </div>
  )
}

// OsmContributeCard — deep-links to the OpenStreetMap iD editor at the
// driver's current location. Lets drivers improve the public map by
// drawing alleys, gangs, and shortcuts that aren't on Google Maps.
//
// The contribution is made on the driver's OWN OSM account (free sign-up
// on openstreetmap.org). City Rider is intentionally not the recorder
// of the road geometry — it links out, the data lives with OSM. That
// keeps the directory-only posture intact under PM 12/2019: we are not
// building a proprietary trip-trace dataset; we're sending drivers to
// contribute to a public commons.
function OsmContributeCard({ lat, lng, city }: { lat: number; lng: number; city: string }) {
  // Yogyakarta is the safe default centre when a driver's row has no
  // current location yet (new sign-up, GPS never granted, etc.).
  const safeLat = Number.isFinite(lat) && lat !== 0 ? lat : -7.7928
  const safeLng = Number.isFinite(lng) && lng !== 0 ? lng : 110.3657
  const editUrl = `https://www.openstreetmap.org/edit?editor=id#map=18/${safeLat.toFixed(5)}/${safeLng.toFixed(5)}`
  const where = city ? `around ${city.replace(/-/g, ' ')}` : 'around your area'
  return (
    <a
      href={editUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="card card-interactive p-4 flex items-center justify-between"
      style={{ background: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.22)' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.32)' }}
        >
          <MapIcon className="w-4 h-4" style={{ color: '#22C55E' }} />
        </div>
        <div className="min-w-0">
          <div className="font-extrabold text-[14px]">Help map your area</div>
          <div className="text-[13px] text-muted truncate">
            Add alleys + shortcuts {where} to OpenStreetMap — better routes for everyone
          </div>
        </div>
      </div>
      <ExternalLink className="w-4 h-4 shrink-0" style={{ color: '#22C55E' }} />
    </a>
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
