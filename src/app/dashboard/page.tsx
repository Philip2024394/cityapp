'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight, Users, IdCard, MessageSquare, Share2, Edit3, MapPin, Bike, Star,
  Copy, Check, MessageCircle, Facebook, Instagram, ChevronDown, Camera, Rocket,
  Hourglass, CircleDot, Circle, AlertCircle as AlertIcon,
} from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import DashboardNav from '@/components/layout/DashboardNav'
import GoOnlineToggle from '@/components/rider/GoOnlineToggle'
import ROIHero from '@/components/rider/ROIHero'
import ViralityPanel from '@/components/rider/ViralityPanel'
import RentalToggles from '@/components/rider/RentalToggles'
import BusinessContractToggle from '@/components/rider/BusinessContractToggle'
import BookingAlertsToggle from '@/components/rider/BookingAlertsToggle'
import DriverInboxWidget from '@/components/rider/DriverInboxWidget'
import TourGuideToggle from '@/components/rider/TourGuideToggle'
import B2BScoreCard from '@/components/rider/B2BScoreCard'
import DeleteAccountSection from '@/components/settings/DeleteAccountSection'
import HelpTip from '@/components/common/HelpTip'
import { MOCK_RIDERS } from '@/data/mockRiders'
import { MOCK_CUSTOMERS, repeatCustomers } from '@/data/mockCustomers'
import { fetchMyDriverBrowser } from '@/lib/drivers/queries'
import { useHaptic } from '@/hooks/useHaptic'
import type { Rider } from '@/types/rider'
import {
  SUBSCRIPTION_MONTHLY_IDR,
  MONTHLY_PRICE_PER_MONTH,
  YEARLY_PRICE_PER_YEAR,
  MONTHLY_OR_YEARLY_LABEL,
} from '@/lib/pricing/constants'

const FALLBACK_ME = MOCK_RIDERS[0]!
const SUBSCRIPTION_MONTHLY = SUBSCRIPTION_MONTHLY_IDR

export default function DashboardPage() {
  const haptic = useHaptic()
  const [online, setOnline] = useState(false)
  const [ME, setME] = useState<Rider>(FALLBACK_ME)
  const [meLoaded, setMeLoaded] = useState(false)

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
      title: `${ME.name} · City Rider`,
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

  // Demo ROI numbers — in production, sum quote_events for current month.
  const monthQuoteCount  = 47
  const monthLeadsValue  = 615_000

  return (
    <>
      <AppNav />
      <main className="min-h-screen pb-28">
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
          <div className="text-[13px] text-muted">Selamat datang,</div>
          <div className="text-lg font-extrabold truncate">{ME.name.split(' ')[0]}</div>
        </div>
      </div>
      <button onClick={onShare} className="btn-secondary !py-2 !px-3 !text-[13px] !min-h-0 shrink-0">
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
          <Rocket className="w-5 h-5 text-bg" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <div className="font-extrabold text-[15px] leading-snug">
            Yuk mulai dapat customer pertama!
          </div>
          <div className="text-[13px] text-muted mt-1 leading-snug">
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
      <SubscriptionCard status={ME.subscriptionStatus} compact />

      {/* Collapsed: All other tools */}
      <button
        type="button"
        onClick={() => setMoreOpen((v) => !v)}
        className="w-full card card-interactive p-3.5 flex items-center justify-between"
      >
        <span className="text-[13px] font-extrabold text-muted uppercase tracking-wider">
          Lihat semua alat (opsional)
        </span>
        <ChevronDown
          className="w-4 h-4 text-muted transition-transform"
          style={{ transform: moreOpen ? 'rotate(180deg)' : 'rotate(0)' }}
        />
      </button>
      {moreOpen && (
        <div className="space-y-3">
          <p className="text-[12px] text-dim leading-snug px-1">
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
    <div className="card p-4">
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
            <h3 className="text-[15px] font-extrabold leading-tight">{title}</h3>
            <HelpTip title={helpTitle} body={helpBody} variant="lightbulb" />
          </div>
          <p className="text-[13px] text-muted leading-snug mt-1">{subtitle}</p>
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
  monthQuoteCount: number
  monthLeadsValue: number
}) {
  return (
    <div className="space-y-4">
      <GoOnlineToggle defaultOnline={online} onChange={setOnline} />
      <DriverInboxWidget />
      <BookingAlertsToggle />

      {/* PENGHASILAN */}
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
            <p>Aktifkan rental motor, jadi tour guide, atau terima kontrak B2B dari Shopee/restaurant.</p>
            <p>Penghasilan dari layanan ini bisa <strong>2-3× lipat</strong> dari ojek biasa karena marginnya lebih besar dan customer lebih loyal.</p>
          </>
        }
        defaultOpen
      >
        <RentalToggles />
        <BusinessContractToggle />
        <TourGuideToggle />
        <B2BScoreCard />
        <Link
          href="/onboarding?mode=edit"
          className="card card-interactive p-4 flex items-center justify-between"
          style={{ borderColor: 'rgba(250,204,21,0.40)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center shrink-0">
              <Edit3 className="w-4 h-4 text-brand" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-[14px]">Edit profil & harga</div>
              <div className="text-[13px] text-muted truncate">
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
      <h2 className="text-[12px] uppercase tracking-wider font-extrabold text-dim">
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
          className="flex items-center gap-1.5 text-[12px] uppercase tracking-wider font-extrabold text-dim hover:text-ink transition"
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
    <div className={compact ? '' : 'card p-5'}>
      {!compact && (
        <div className="flex items-center gap-2 mb-3">
          <Share2 className="w-4 h-4 text-brand" />
          <h2 className="text-[12px] text-dim uppercase tracking-wider font-extrabold">
            Share your page
          </h2>
        </div>
      )}

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
          Link sudah ter-copy. Buka Instagram → paste di bio atau Story.
        </p>
      )}

      <span className="sr-only">{riderName}</span>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// SubscriptionCard — Midtrans Snap renewal. `compact` strips internals for
// the first-time dashboard where it's a status indicator only.
// ────────────────────────────────────────────────────────────────────────────
function SubscriptionCard({ status, compact = false }: { status?: string; compact?: boolean }) {
  // Per-product busy state — was a single `busy` flag that disabled
  // BOTH renew buttons during one Snap open. Riders couldn't change
  // their mind mid-flow (audit P3 hygiene).
  const [busyProduct, setBusyProduct] = useState<'subscription' | 'subscription_yearly' | null>(null)
  const [notice, setNotice]   = useState<string | null>(null)
  const hasClientKey = !!process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY

  async function onRenew(product: 'subscription' | 'subscription_yearly') {
    setNotice(null)
    setBusyProduct(product)
    const { startSnapCheckout } = await import('@/lib/midtrans/client')
    startSnapCheckout({
      product,
      onSuccess: () => {
        setNotice('✓ Pembayaran diterima — langganan kamu sekarang aktif.')
        setBusyProduct(null)
        setTimeout(() => window.location.reload(), 1500)
      },
      onPending: () => {
        setNotice('Pending — Midtrans sedang memproses. Status langganan akan ter-update otomatis.')
        setBusyProduct(null)
      },
      onError: (msg) => {
        setNotice(msg || 'Pembayaran gagal. Coba lagi.')
        setBusyProduct(null)
      },
      onClose: () => {
        setBusyProduct(null)
        setNotice('Pembayaran dibatalkan. Tidak ada yang ditagih — coba lagi kapan saja.')
      },
    })
  }
  const isBusy = (p: 'subscription' | 'subscription_yearly') => busyProduct === p
  const anyBusy = busyProduct !== null

  if (compact) {
    return (
      <div className="card p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] text-dim uppercase tracking-wider font-extrabold">Langganan</div>
          <div className="text-[14px] font-extrabold mt-0.5">
            {status === 'trial' ? 'Trial aktif' : status === 'active' ? 'Aktif' : 'Belum aktif'}
          </div>
          <div className="text-[12px] text-muted mt-0.5">Rp 38K/bulan · Rp 350K/tahun</div>
        </div>
        <SubscriptionStatusChip status={status} />
      </div>
    )
  }

  const isPastDue = status === 'past_due' || status === 'canceled'

  return (
    <div
      className="card p-5"
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
            <div className="text-[15px] font-extrabold leading-snug" style={{ color: '#FCA5A5' }}>
              Langganan kamu tidak aktif
            </div>
            <p className="text-[14px] text-muted leading-relaxed mt-1">
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
          <div className="text-[13px] text-dim uppercase tracking-wider font-extrabold">Subscription</div>
          <div className="font-extrabold text-lg mt-0.5">
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
          <div className="text-[13px] text-muted mt-1">{MONTHLY_OR_YEARLY_LABEL}</div>
        </div>
        <SubscriptionStatusChip status={status} />
      </div>

      {hasClientKey ? (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onRenew('subscription')}
            disabled={anyBusy}
            className="btn-primary w-full !text-[13px]"
          >
            {isBusy('subscription') ? 'Opening…' : 'Bulanan · Rp 38K / 30 hari'}
          </button>
          <button
            type="button"
            onClick={() => onRenew('subscription_yearly')}
            disabled={anyBusy}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-bg text-brand font-extrabold text-[13px] uppercase tracking-wider border-2 border-brand active:scale-[0.99] disabled:opacity-60"
          >
            {isBusy('subscription_yearly') ? 'Opening…' : 'Tahunan · Rp 350K / 365 hari'}
          </button>
        </div>
      ) : (
        <div className="mt-4 rounded-xl p-3 text-[13px] leading-snug" style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.35)' }}>
          <div className="font-extrabold text-ink mb-1">Pembayaran via WhatsApp admin</div>
          <p className="text-muted leading-relaxed mb-2">
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
            <div className="mt-2 pt-2 border-t border-white/10 text-[11px] text-dim">
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
