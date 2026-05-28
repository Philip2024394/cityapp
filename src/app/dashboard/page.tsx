'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight, Users, IdCard, MessageSquare, Share2, Edit3, MapPin, Bike, Star,
  Copy, Check, MessageCircle, Facebook, Instagram, ChevronDown, Camera, Rocket,
  Hourglass, CircleDot, Circle, AlertCircle as AlertIcon,
} from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import DriverSubscriptionBanner from '@/components/upgrade/DriverSubscriptionBanner'
import DashboardNav from '@/components/layout/DashboardNav'
import GoOnlineToggle from '@/components/rider/GoOnlineToggle'
import ROIHero from '@/components/rider/ROIHero'
import ViralityPanel from '@/components/rider/ViralityPanel'
import BookingAlertsToggle from '@/components/rider/BookingAlertsToggle'
import DriverInboxWidget from '@/components/rider/DriverInboxWidget'
import DeleteAccountSection from '@/components/settings/DeleteAccountSection'
import HelpTip from '@/components/common/HelpTip'
import { MOCK_RIDERS } from '@/data/mockRiders'
import { MOCK_CUSTOMERS, repeatCustomers } from '@/data/mockCustomers'
import { fetchMyDriverBrowser } from '@/lib/drivers/queries'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { SERVICE_OFFERINGS } from '@/lib/drivers/serviceOfferings'
import { useHaptic } from '@/hooks/useHaptic'
import type { Rider } from '@/types/rider'
import {
  SUBSCRIPTION_MONTHLY_IDR,
  MONTHLY_PRICE_PER_MONTH,
  YEARLY_PRICE_PER_YEAR,
  MONTHLY_OR_YEARLY_LABEL,
} from '@/lib/pricing/constants'
import { fetchMyAccountCached } from '@/lib/auth/client'

const FALLBACK_ME = MOCK_RIDERS[0]!
const SUBSCRIPTION_MONTHLY = SUBSCRIPTION_MONTHLY_IDR

export default function DashboardPage() {
  const router = useRouter()
  const haptic = useHaptic()
  const [online, setOnline] = useState(false)
  const [ME, setME] = useState<Rider>(FALLBACK_ME)
  const [meLoaded, setMeLoaded] = useState(false)

  // Rental Company accounts don't see the driver dashboard at all — bounce
  // them straight to their listings page on every /dashboard hit. The
  // fetchMyAccountCached helper shares one in-flight request with the
  // DashboardNav consumer below so this is free after the first call.
  useEffect(() => {
    fetchMyAccountCached().then((j) => {
      if (j?.account?.account_type === 'rental_company' && j.account.subscription_status === 'active') {
        router.replace('/dashboard/rentals')
      }
    })
  }, [router])

  useEffect(() => {
    let cancelled = false
    fetchMyDriverBrowser().then((me) => {
      if (cancelled) return
      if (me) {
        setME(me)
        setOnline(me.isOnline)
      }
      setMeLoaded(true)
    })
    return () => { cancelled = true }
  }, [])

  async function shareProfile() {
    haptic.tap()
    const url = `${window.location.origin}/r/${ME.slug}`
    const shareData = {
      title: `${ME.name} · IndoCity`,
      text: `I'm a motorcycle courier in ${ME.city}. Book directly on WhatsApp.`,
      url,
    }
    if (navigator.share) {
      try { await navigator.share(shareData) } catch { /* user cancel */ }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        alert('Link profilmu sudah ter-copy — paste di WhatsApp Status / Instagram / FB')
      } catch { /* clipboard blocked */ }
    }
  }

  // "Activated" = rider has earned a trip OR is currently online.
  // Until activated, the dashboard shows the focused first-time layout
  // (4 large yellow actions). Once activated, the full grouped view
  // unlocks. Defaults to activated while loading so existing users
  // don't see a flash of the simplified layout.
  const isActivated = !meLoaded || (ME.trips ?? 0) > 0 || online

  // Real ROI numbers — once `quote_events` aggregation is wired, replace
  // null with the live counts. Until then, downstream consumers MUST hide
  // any "this month" tile when the value is null (no fabricated metrics).
  const monthQuoteCount: number | null  = null
  const monthLeadsValue: number | null  = null

  return (
    <>
      <AppNav />
      <main className="min-h-[100dvh] pb-28 bg-white text-black">
        <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
          <Greeting ME={ME} onShare={shareProfile} />

          {isActivated ? (
            <ActivatedDashboard
              ME={ME}
              online={online}
              setOnline={setOnline}
              monthQuoteCount={monthQuoteCount}
              monthLeadsValue={monthLeadsValue}
            />
          ) : (
            <FirstTimeDashboard
              ME={ME}
              online={online}
              setOnline={setOnline}
            />
          )}
        </div>
      </main>
      <DashboardNav />
    </>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Shared: greeting strip — always visible at the top.
// ────────────────────────────────────────────────────────────────────────────
function Greeting({ ME, onShare }: { ME: Rider; onShare: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <img src={ME.photoUrl} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0" />
        <div className="min-w-0">
          <div className="text-[13px] text-gray-600">Selamat datang,</div>
          <div className="text-lg font-extrabold truncate text-[#0A0A0A]">{ME.name.split(' ')[0]}</div>
        </div>
      </div>
      <button
        onClick={onShare}
        className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 border border-gray-200 text-[13px] font-extrabold text-[#0A0A0A] hover:bg-gray-200 transition"
      >
        <Share2 className="w-3.5 h-3.5" />
        Share
      </button>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// FIRST-TIME DASHBOARD — focused on activation. One outcome per card.
// Shows 4 numbered yellow primary actions and hides everything else
// behind a single "Lihat semua alat" expandable.
// ────────────────────────────────────────────────────────────────────────────
function FirstTimeDashboard({
  ME, online, setOnline,
}: {
  ME: Rider
  online: boolean
  setOnline: (b: boolean) => void
}) {
  const hasBikePhoto = !!(ME.photoUrl && !ME.photoUrl.includes('pravatar.cc'))
  const [moreOpen, setMoreOpen] = useState(false)

  let stepNum = 0
  const nextStep = () => ++stepNum

  return (
    <div className="space-y-4">
      {/* Welcome banner — motivational, sets tone */}
      <div
        className="rounded-2xl p-4 flex items-start gap-3"
        style={{
          background: 'linear-gradient(135deg, rgba(250,204,21,0.12), rgba(250,204,21,0.04))',
          border: '1px solid rgba(250,204,21,0.30)',
        }}
      >
        <div
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #FACC15, #EAB308)' }}
        >
          <Rocket className="w-5 h-5 text-[#0A0A0A]" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <div className="font-extrabold text-[15px] leading-snug text-[#0A0A0A]">
            Yuk mulai dapat customer pertama!
          </div>
          <div className="text-[13px] text-gray-600 mt-1 leading-snug">
            Selesaikan 3 langkah cepat di bawah — habis itu profilmu langsung tayang di marketplace.
          </div>
        </div>
      </div>

      {/* PRIMARY 1 — Go online */}
      <PrimaryActionCard
        step={nextStep()}
        title="Aktifkan & Go Online"
        subtitle="Muncul di marketplace dengan dot kuning berdenyut"
        helpTitle="Cara kerja Go Online"
        helpBody={
          <>
            <p>Saat kamu online, profilmu muncul di marketplace dengan dot kuning berdenyut yang artinya <strong>"siap menerima order"</strong>.</p>
            <p>Customer cari kamu, lalu kontak langsung via WhatsApp. <strong>Kamu yang setting harga, kamu yang setting jam kerja</strong> — tidak ada algoritma yang nentuin.</p>
          </>
        }
      >
        <GoOnlineToggle defaultOnline={online} onChange={setOnline} />
      </PrimaryActionCard>

      {/* Inbox — only renders when customers have tapped Contact and
          the driver hasn't acknowledged yet. Self-hides otherwise. */}
      <DriverInboxWidget />

      {/* PRIMARY 2 — Upload bike photo (only if missing) */}
      {!hasBikePhoto && (
        <PrimaryActionCard
          step={nextStep()}
          title="Tambahkan foto motormu"
          subtitle="Customer 3× lebih percaya driver dengan foto motor"
          helpTitle="Kenapa foto penting?"
          helpBody={
            <>
              <p>Customer di Indonesia sangat percaya foto. Driver dengan foto motor mendapat <strong>3× lebih banyak booking</strong> dibanding yang tanpa foto.</p>
              <p>Cukup 1 foto bersih dari samping. Tidak perlu profesional — yang penting kelihatan rapi dan bersih.</p>
            </>
          }
        >
          <Link href="/onboarding?mode=edit" className="btn-primary w-full">
            <Camera className="w-4 h-4" strokeWidth={2.5} />
            Upload foto sekarang
          </Link>
        </PrimaryActionCard>
      )}

      {/* PRIMARY 3 — Share profile */}
      <PrimaryActionCard
        step={nextStep()}
        title="Bagikan link profilmu"
        subtitle="Setiap share = customer baru yang kontak kamu langsung"
        helpTitle="Setiap share = customer baru"
        helpBody={
          <>
            <p>Driver yang share link profil ke WA Status setiap hari biasanya mendapat <strong>10+ customer dalam minggu pertama</strong>.</p>
            <p>Pasang link kamu di: <strong>WA Status setiap pagi</strong>, <strong>IG bio</strong>, dan <strong>Facebook profile description</strong>. Customer akan tahu kamu yang punya bisnis — bukan platform.</p>
          </>
        }
      >
        <ShareKitCard slug={ME.slug} riderName={ME.name} city={ME.city} compact />
      </PrimaryActionCard>

      {/* PRIMARY 4 — Subscription (compact) */}
      <DriverSubscriptionBanner />
      <SubscriptionCard status={ME.subscriptionStatus} compact />

      {/* Collapsed: All other tools */}
      <button
        type="button"
        onClick={() => setMoreOpen((v) => !v)}
        className="w-full rounded-3xl bg-gray-100 border border-gray-200 p-3.5 shadow-sm flex items-center justify-between"
      >
        <span className="text-[13px] font-extrabold text-gray-600 uppercase tracking-wider">
          Lihat semua alat (opsional)
        </span>
        <ChevronDown
          className="w-4 h-4 text-gray-500 transition-transform"
          style={{ transform: moreOpen ? 'rotate(180deg)' : 'rotate(0)' }}
        />
      </button>
      {moreOpen && (
        <div className="space-y-3">
          <p className="text-[12px] text-gray-500 leading-snug px-1">
            Alat-alat tambahan untuk driver yang sudah aktif. Boleh diatur nanti — fokus dulu di 3 langkah di atas.
          </p>
          <SecondaryToolGrid />
        </div>
      )}
    </div>
  )
}

function PrimaryActionCard({
  step, title, subtitle, helpTitle, helpBody, children,
}: {
  step: number
  title: string
  subtitle: string
  helpTitle: string
  helpBody: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-3xl bg-gray-100 border border-gray-200 p-4 shadow-sm">
      <div className="flex items-start gap-3 mb-3">
        <div
          className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-[14px]"
          style={{
            background: 'linear-gradient(135deg, #FACC15, #EAB308)',
            color: '#0A0A0A',
          }}
        >
          {step}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-extrabold leading-tight text-[#0A0A0A]">{title}</h3>
            <HelpTip title={helpTitle} body={helpBody} variant="lightbulb" />
          </div>
          <p className="text-[13px] text-gray-600 leading-snug mt-1">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// ACTIVATED DASHBOARD — full feature surface, grouped under section headers
// (Penghasilan, Tumbuh, Layanan tambahan, Alat profesional). Each section
// has a HelpTip so the driver can learn what it's for without leaving.
// ────────────────────────────────────────────────────────────────────────────
function ActivatedDashboard({
  ME, online, setOnline, monthQuoteCount, monthLeadsValue,
}: {
  ME: Rider
  online: boolean
  setOnline: (b: boolean) => void
  monthQuoteCount: number | null
  monthLeadsValue: number | null
}) {
  return (
    <div className="space-y-4">
      <GoOnlineToggle defaultOnline={online} onChange={setOnline} />
      <DriverInboxWidget />
      <BookingAlertsToggle />

      {/* PENGHASILAN — render only when we have real numbers. No fabricated metrics. */}
      {monthQuoteCount != null && monthLeadsValue != null && (
        <>
          <SectionHeader
            title="Penghasilan kamu"
            helpTitle="Tentang penghasilan kamu"
            helpBody={
              <>
                <p>Angka ini real-time dari customer yang minta quote bulan ini. Target idealnya <strong>5× lipat dari biaya langganan</strong>.</p>
                <p>Driver yang reply WhatsApp dalam 5 menit pertama biasanya dapat <strong>3× lebih banyak customer</strong> dari yang lambat reply.</p>
              </>
            }
          />
          <ROIHero
            monthlyQuotes={monthQuoteCount}
            monthlyLeadsValue={monthLeadsValue}
            subscriptionMonthly={SUBSCRIPTION_MONTHLY}
          />
        </>
      )}

      {/* TUMBUH */}
      <SectionHeader
        title="Tumbuh customer"
        helpTitle="Cara cepat dapat customer baru"
        helpBody={
          <>
            <p>Share link profilmu ke <strong>WA Status setiap pagi</strong>. Driver aktif share 3× sehari biasanya dapat 10+ customer dalam minggu pertama.</p>
            <p>Ajak teman driver gabung — kamu dapat komisi referral tiap mereka aktif berlangganan.</p>
          </>
        }
      />
      <ViralityPanel />
      <ShareKitCard slug={ME.slug} riderName={ME.name} city={ME.city} />

      {/* LAYANAN TAMBAHAN — collapsible */}
      <CollapsibleSection
        title="Layanan tambahan"
        helpTitle="Layanan tambahan = penghasilan tambahan"
        helpBody={
          <>
            <p>Pilih layanan yang kamu tawarkan — antar-jemput, hourly hire, airport, dst.</p>
            <p>Pasang yang sesuai bike + jadwal kamu. Customer cari driver berdasarkan layanan ini.</p>
          </>
        }
        defaultOpen
      >
        <ServicesSection />
        <Link
          href="/onboarding?mode=edit"
          className="rounded-3xl bg-gray-100 border border-gray-200 shadow-sm p-4 flex items-center justify-between"
          style={{ borderColor: 'rgba(250,204,21,0.40)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center shrink-0">
              <Edit3 className="w-4 h-4 text-brand" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-[14px] text-[#0A0A0A]">Edit profil & harga</div>
              <div className="text-[13px] text-gray-600 truncate">
                Ubah harga, jam kerja, foto motor, dan layanan
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-brand shrink-0" />
        </Link>
      </CollapsibleSection>

      {/* ALAT PROFESIONAL — collapsible */}
      <CollapsibleSection
        title="Alat profesional"
        helpTitle="Alat profesional"
        helpBody={
          <>
            <p>Customer Book, kartu nama digital, dan template WhatsApp — alat yang dipakai driver pro untuk kelihatan profesional dan tidak ketinggalan customer.</p>
            <p>Print kartu nama dengan QR, tempel di motor, kasih ke customer setelah trip. <strong>1 kartu = banyak repeat customer.</strong></p>
          </>
        }
      >
        <SecondaryToolGrid />
      </CollapsibleSection>

      {/* SUBSCRIPTION */}
      <SectionHeader
        title="Langganan"
        helpTitle="Tentang langganan"
        helpBody={
          <>
            <p>Bulanan <strong>{MONTHLY_PRICE_PER_MONTH}</strong> atau tahunan <strong>{YEARLY_PRICE_PER_YEAR}</strong> (hemat ~23%).</p>
            <p>0% komisi selamanya — kamu bayar tetap setiap bulan, kamu dapat <strong>semua</strong> hasil trip. Bisa cancel kapan saja.</p>
          </>
        }
      />
      <DriverSubscriptionBanner />
      <SubscriptionCard status={ME.subscriptionStatus} />

      <DeleteAccountSection />
    </div>
  )
}

function SectionHeader({
  title, helpTitle, helpBody,
}: {
  title: string
  helpTitle: string
  helpBody: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-2 pt-2 pb-1 px-1">
      <h2 className="text-[12px] uppercase tracking-wider font-extrabold text-gray-500">
        {title}
      </h2>
      <HelpTip title={helpTitle} body={helpBody} />
    </div>
  )
}

function CollapsibleSection({
  title, helpTitle, helpBody, defaultOpen = false, children,
}: {
  title: string
  helpTitle: string
  helpBody: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 pt-2 pb-1 px-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-[12px] uppercase tracking-wider font-extrabold text-gray-500 hover:text-[#0A0A0A] transition"
        >
          {title}
          <ChevronDown
            className="w-3.5 h-3.5 transition-transform"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)' }}
          />
        </button>
        <HelpTip title={helpTitle} body={helpBody} />
      </div>
      {open && <div className="space-y-3">{children}</div>}
    </div>
  )
}

function SecondaryToolGrid() {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <ToolCard
          href="/dashboard/favourites"
          icon={<Star className="w-4 h-4" />}
          label="Tempat favorit"
          hint="Rekomendasi ke customer"
        />
        <ToolCard
          href="/dashboard/rentals"
          icon={<Bike className="w-4 h-4" />}
          label="Rental saya"
          hint="Edit motor"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ToolCard
          href="/dashboard/customers"
          icon={<Users className="w-4 h-4" />}
          label="Customer Book"
          hint={`${MOCK_CUSTOMERS.length} · ${repeatCustomers().length} repeat`}
        />
        <ToolCard
          href="/dashboard/card"
          icon={<IdCard className="w-4 h-4" />}
          label="Kartu nama"
          hint="QR + print"
        />
      </div>
      <div className="grid grid-cols-1">
        <ToolCard
          href="/dashboard/templates"
          icon={<MessageSquare className="w-4 h-4" />}
          label="Template WhatsApp"
          hint="8 template siap pakai"
        />
      </div>
    </>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// ShareKitCard — explicit per-channel share buttons. The driver page is
// only valuable if it gets distributed; this section optimises for low-
// friction sharing to the three channels Indonesian drivers actually use.
// `compact` collapses the helper paragraph for the first-time dashboard.
// ────────────────────────────────────────────────────────────────────────────
function ShareKitCard({
  slug, riderName, city, compact = false,
}: {
  slug: string
  riderName: string
  city: string
  compact?: boolean
}) {
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
    const u = encodeURIComponent(shareUrl)
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      '_blank',
      'noopener,noreferrer,width=620,height=600',
    )
  }

  function shareInstagram() {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl).then(() => {
      flashCopied('ig')
      setIgTip(true)
      setTimeout(() => setIgTip(false), 4000)
      if (typeof window !== 'undefined') {
        const w = window.open('instagram://story-camera', '_blank')
        if (w) w.focus()
      }
    }).catch(() => {})
  }

  return (
    <div className={compact ? '' : 'rounded-3xl bg-gray-100 border border-gray-200 shadow-sm p-5'}>
      {!compact && (
        <div className="flex items-center gap-2 mb-3">
          <Share2 className="w-4 h-4 text-brand" />
          <h2 className="text-[12px] text-gray-500 uppercase tracking-wider font-extrabold">
            Share your page
          </h2>
        </div>
      )}

      <div className="flex items-stretch gap-2 mb-3">
        <div className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-gray-100 border border-gray-200 text-[13px] text-[#0A0A0A] font-mono truncate">
          {shareUrl || '—'}
        </div>
        <button
          type="button"
          onClick={copyLink}
          className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-gray-100 border border-gray-200 text-[12px] font-extrabold text-[#0A0A0A] hover:border-brand/40 transition"
        >
          {copied === 'url'
            ? <><Check className="w-3.5 h-3.5 text-brand" /> Copied</>
            : <><Copy className="w-3.5 h-3.5" /> Copy</>}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={shareWhatsApp}
          className="inline-flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-[12px] font-extrabold text-white border border-gray-300 active:scale-[0.98] transition"
          style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
        >
          <MessageCircle className="w-4 h-4" />
          WhatsApp
        </button>
        <button
          type="button"
          onClick={shareFacebook}
          className="inline-flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-[12px] font-extrabold text-white border border-gray-300 active:scale-[0.98] transition"
          style={{ background: 'linear-gradient(135deg, #1877F2, #0E5FD2)' }}
        >
          <Facebook className="w-4 h-4" />
          Facebook
        </button>
        <button
          type="button"
          onClick={shareInstagram}
          className="inline-flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-[12px] font-extrabold text-white border border-gray-300 active:scale-[0.98] transition"
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
          Link sudah ter-copy. Buka Instagram → paste di bio atau Story.
        </p>
      )}

      <span className="sr-only">{riderName}</span>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// SubscriptionCard — QR + receipt-upload renewal (replaces the old Midtrans
// Snap path). `compact` strips internals for the first-time dashboard
// where it's a status indicator only. The Bulanan / Tahunan buttons just
// link to /dashboard/renew where the QrPaymentFlow component drives the
// actual checkout — same shape as /rent/upgrade and /tour/upgrade.
// ────────────────────────────────────────────────────────────────────────────
function SubscriptionCard({ status, compact = false }: { status?: string; compact?: boolean }) {
  // Notice kept for compatibility with the past_due banner copy below —
  // QR flow uses page-level state, so we never set this here anymore.
  const notice: string | null = null
  const hasClientKey = true  // QR is always available — no Midtrans env required

  if (compact) {
    return (
      <div className="rounded-3xl bg-gray-100 border border-gray-200 shadow-sm p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] text-gray-500 uppercase tracking-wider font-extrabold">Langganan</div>
          <div className="text-[14px] font-extrabold mt-0.5 text-[#0A0A0A]">
            {status === 'trial' ? 'Trial aktif' : status === 'active' ? 'Aktif' : 'Belum aktif'}
          </div>
          <div className="text-[12px] text-gray-600 mt-0.5">Rp 38K/bulan · Rp 350K/tahun</div>
        </div>
        <SubscriptionStatusChip status={status} />
      </div>
    )
  }

  const isPastDue = status === 'past_due' || status === 'canceled'

  return (
    <div
      className="rounded-3xl bg-gray-100 border border-gray-200 shadow-sm p-5"
      style={isPastDue
        ? { borderColor: 'rgba(239,68,68,0.45)', boxShadow: '0 0 24px rgba(239,68,68,0.15)' }
        : undefined}
    >
      {/* past_due / canceled red banner — explicit recovery prompt.
          Audit (2026-05) flagged this as the silent killer: drivers were
          dropped from /cari/rider but the UI just read "Belum aktif" with
          no urgency or renew CTA. */}
      {isPastDue && (
        <div
          className="rounded-xl p-3 mb-4 flex items-start gap-3"
          style={{
            background: 'rgba(239,68,68,0.10)',
            border: '1px solid rgba(239,68,68,0.35)',
          }}
        >
          <span
            aria-hidden
            className="shrink-0 w-2 h-2 rounded-full mt-2"
            style={{ background: '#EF4444', boxShadow: '0 0 6px #EF4444' }}
          />
          <div className="min-w-0">
            <div className="text-[15px] font-extrabold leading-snug" style={{ color: '#B91C1C' }}>
              Langganan kamu tidak aktif
            </div>
            <p className="text-[14px] text-gray-600 leading-relaxed mt-1">
              Profilmu disembunyikan dari marketplace — customer tidak bisa
              kontak kamu sampai langganan diperpanjang. Bayar bulanan atau
              tahunan di bawah untuk tampil kembali.
            </p>
            <a
              href="https://wa.me/6285183600015?text=Halo%20admin%2C%20saya%20mau%20bayar%20langganan%20City%20Rider%20manual."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 text-[13px] font-extrabold text-brand hover:underline"
            >
              Bayar manual via WhatsApp admin →
            </a>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[13px] text-gray-500 uppercase tracking-wider font-extrabold">Subscription</div>
          <div className="font-extrabold text-lg mt-0.5 text-[#0A0A0A]">
            {status === 'trial'
              ? 'Trial — renew sebelum expired'
              : status === 'active'
                ? 'Aktif'
                : status === 'past_due'
                  ? 'Langganan terlambat'
                  : status === 'canceled'
                    ? 'Langganan dibatalkan'
                    : 'Belum aktif'}
          </div>
          <div className="text-[13px] text-gray-600 mt-1">{MONTHLY_OR_YEARLY_LABEL}</div>
        </div>
        <SubscriptionStatusChip status={status} />
      </div>

      {hasClientKey ? (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Link
            href="/dashboard/renew"
            className="btn-primary w-full !text-[13px] inline-flex items-center justify-center"
          >
            Bulanan · Rp 38K / 30 hari
          </Link>
          <Link
            href="/dashboard/renew"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white text-brand font-extrabold text-[13px] uppercase tracking-wider border-2 border-brand active:scale-[0.99]"
          >
            Tahunan · Rp 350K / 365 hari
          </Link>
        </div>
      ) : (
        <div className="mt-4 rounded-xl p-3 text-[13px] leading-snug" style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.35)' }}>
          <div className="font-extrabold text-[#0A0A0A] mb-1">Pembayaran via WhatsApp admin</div>
          <p className="text-gray-600 leading-relaxed mb-2">
            Auto-billing belum aktif. Bayar manual via QRIS / transfer bank, lalu kirim
            bukti ke admin untuk aktivasi langganan.
          </p>
          <a
            href="https://wa.me/6285183600015?text=Halo%20admin%2C%20saya%20mau%20bayar%20langganan%20City%20Rider%20manual."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-extrabold text-brand hover:underline"
          >
            Chat admin →
          </a>
          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-2 pt-2 border-t border-gray-200 text-[11px] text-gray-500">
              Dev only: set <code className="text-brand">NEXT_PUBLIC_MIDTRANS_CLIENT_KEY</code> + <code className="text-brand">MIDTRANS_SERVER_KEY</code> to enable auto-billing.
            </div>
          )}
        </div>
      )}

      {notice && (
        <p className="mt-3 text-[13px] text-brand leading-snug">{notice}</p>
      )}
    </div>
  )
}

// Subscription chip — Lucide icons instead of emoji glyphs (consistent
// with the rest of the design system; emoji weight/colour varies per OS).
function SubscriptionStatusChip({ status }: { status?: string }) {
  const variant =
    status === 'trial'   ? { cls: 'chip',             Icon: Hourglass, label: 'Trial' }
  : status === 'active'  ? { cls: 'chip chip-online', Icon: CircleDot, label: 'Aktif' }
  : status === 'past_due'? { cls: 'chip chip-warn',   Icon: AlertIcon, label: 'Terlambat' }
  : status === 'canceled'? { cls: 'chip chip-warn',   Icon: Circle,    label: 'Dibatalkan' }
  :                        { cls: 'chip chip-warn',   Icon: Circle,    label: 'Off' }
  const { cls, Icon, label } = variant
  return (
    <span className={cls}>
      <Icon className="w-3.5 h-3.5" strokeWidth={2.25} />
      {label}
    </span>
  )
}

function ToolCard({ href, icon, label, hint }: { href: string; icon: React.ReactNode; label: string; hint: string }) {
  return (
    <Link
      href={href}
      className="rounded-3xl bg-gray-100 border border-gray-200 shadow-sm p-3 flex flex-col gap-1.5 min-h-[96px] hover:border-gray-300 transition"
    >
      <div className="w-8 h-8 rounded-lg bg-brand/12 border border-brand/22 flex items-center justify-center text-brand">
        {icon}
      </div>
      <div className="text-[14px] font-extrabold leading-tight mt-1 text-[#0A0A0A]">{label}</div>
      <div className="text-[13px] text-gray-600 leading-tight">{hint}</div>
    </Link>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// ServicesSection — Services-offered editor for the bike dashboard.
// ----------------------------------------------------------------------------
// Loads `drivers.service_offerings` for the signed-in driver, lets them pick
// which trip types they offer (City Service, Daily Hire, Hourly Hire,
// Airport Pickup, etc.), then writes the array back on Save. Mirrors the
// pattern used by the other bike-dashboard toggle widgets (load own state
// from Supabase, optimistic-write on click). Customers see these badges on
// the public /r/[slug] profile.
//
// Empty state and unauth/Supabase-missing states render nothing (parity with
// BusinessContractToggle).
// ────────────────────────────────────────────────────────────────────────────
function ServicesSection() {
  const haptic = useHaptic()
  const [selected, setSelected] = useState<string[]>([])
  const [initial, setInitial] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('drivers')
        .select('service_offerings')
        .eq('user_id', user.id)
        .maybeSingle()
      if (cancelled) return
      const arr = Array.isArray((data as { service_offerings?: unknown } | null)?.service_offerings)
        ? ((data as { service_offerings: unknown[] }).service_offerings.filter((x): x is string => typeof x === 'string'))
        : []
      setSelected(arr)
      setInitial(arr)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  const dirty = (() => {
    if (selected.length !== initial.length) return true
    const a = new Set(selected)
    for (const id of initial) if (!a.has(id)) return true
    return false
  })()

  function toggle(id: string) {
    haptic.tap()
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  async function onSave() {
    setError(null)
    const supabase = getBrowserSupabase()
    if (!supabase) { setError('Supabase not configured.'); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not signed in.'); return }
    setSaving(true)
    const { error: err } = await supabase
      .from('drivers')
      .update({ service_offerings: selected })
      .eq('user_id', user.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    setInitial(selected)
    setSavedFlash(true)
    haptic.impact()
    setTimeout(() => setSavedFlash(false), 2200)
  }

  if (loading) {
    return <div className="rounded-3xl bg-gray-100 border border-gray-200 shadow-sm h-24 shimmer" />
  }

  return (
    <div className="rounded-3xl bg-gray-100 border border-gray-200 shadow-sm p-4 space-y-3">
      <div>
        <div className="font-extrabold text-[14px] text-[#0A0A0A]">Services offered</div>
        <div className="text-[12px] text-gray-600 mt-0.5 leading-relaxed">
          Pick the kinds of trips you offer. Customers see these badges on your profile.
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SERVICE_OFFERINGS.map((s) => {
          const active = selected.includes(s.id)
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.id)}
              aria-pressed={active}
              className="rounded-xl px-3 py-3 text-[13px] font-extrabold transition border min-h-[44px] active:scale-[0.98]"
              style={{
                background: active ? '#FEF9C3' : '#FFFFFF',
                borderColor: active ? '#FACC15' : '#E4E4E7',
                color: active ? '#854D0E' : '#0A0A0A',
                boxShadow: active ? '0 2px 8px rgba(250,204,21,0.30)' : 'none',
              }}
            >
              {s.label}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !dirty}
          className="rounded-full bg-brand text-[#0A0A0A] px-6 py-3 text-[13px] font-extrabold uppercase tracking-wider min-h-[44px] disabled:opacity-60"
        >
          {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
        </button>
        {savedFlash && (
          <span className="text-[12px] font-extrabold" style={{ color: '#16A34A' }}>
            Saved.
          </span>
        )}
        {error && (
          <span className="text-[12px] font-extrabold" style={{ color: '#DC2626' }}>
            {error}
          </span>
        )}
      </div>
    </div>
  )
}
