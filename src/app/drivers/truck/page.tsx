// /drivers/truck — Truck driver recruitment landing page.
//
// Mirror of /drivers/car but tuned for truck drivers: copy emphasises
// daily-rate jobs (pindahan, distribusi), multi-day rentals, and large
// B2B parcel contracts for Shopee sellers / UMKM — very different
// economics from per-km ojek or hourly car work.

import Link from 'next/link'
import {
  ArrowRight,
  MessageCircle,
  Smartphone,
  Wallet,
  ShieldCheck,
  Sparkles,
  Truck,
  Package,
  Calendar,
  Building2,
  Boxes,
} from 'lucide-react'
import EarningModeCard from '@/components/recruitment/EarningModeCard'
import { getSupportWhatsApp } from '@/lib/support/contacts'
import {
  MONTHLY_PRICE_LABEL,
  YEARLY_PRICE_LABEL,
  TRIAL_LABEL_EN,
} from '@/lib/pricing/constants'

const HERO_URL =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2030,%202026,%2005_42_12%20AM.png'

const BRAND_LOGO_URL =
  'https://ik.imagekit.io/nepgaxllc/Untitleddasdasdasasd-removebg-preview.png?updatedAt=1779015947714'

// Public WhatsApp number for driver-side support — sourced from env via getSupportWhatsApp().

export const metadata = {
  title: 'Drive your truck with CityRiders — Pindahan, distribusi, bulk parcel',
  description:
    'Join CityRiders as a truck driver. You set the daily rate. Customers pay you directly via WhatsApp. Built for pindahan, distribusi, and bulk parcel delivery.',
}

export default function TruckDriversLandingPage() {
  return (
    <main
      className="relative min-h-[100dvh] text-[#0A0A0A]"
      style={{
        background:
          'radial-gradient(circle at top, #FEF3C7 0%, #F5F5F4 70%, #E7E5E4 100%)',
      }}
    >
      {/* Mobile-only design — centred on desktop as a phone-frame
          preview. Same lock as /drivers and /drivers/car. */}
      <div className="mx-auto bg-white lg:my-6 lg:max-w-[480px] lg:rounded-[32px] lg:shadow-[0_24px_80px_rgba(10,10,10,0.18)] lg:overflow-hidden">
      {/* ─── Hero ────────────────────────────────────────────────────── */}
      <section className="relative">
        {/* HERO — flex-column layout matching /drivers/car. Header pinned
            top, headline + CTAs pinned bottom, flexible spacer absorbs
            the middle so nothing overflows 100dvh. */}
        <div
          className="relative w-full overflow-hidden"
          style={{ height: '100dvh', minHeight: 560 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO_URL}
            alt="CityRiders truck driver at sunset in Yogyakarta"
            className="absolute inset-0 w-full h-full object-cover object-center"
            loading="eager"
          />

          {/* Top white gradient + bottom dark gradient for text contrast.
              Top gradient is taller so it fully covers the iPhone notch
              area + the brand row below. */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0"
            style={{
              height: 160,
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.90) 0%, rgba(255,255,255,0.50) 55%, rgba(255,255,255,0) 100%)',
            }}
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0"
            style={{
              height: '55%',
              background:
                'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.95) 100%)',
            }}
          />

          {/* Foreground flex column */}
          <div className="absolute inset-0 z-10 flex flex-col">
            {/* Header — logo + brand left, 3-way Bike/Car/Truck mini
                selector right. Top padding combines pt-safe (iOS notch
                / Dynamic Island clearance) with an extra 32px so the
                brand name is never visually pinched against the notch
                or the status bar. */}
            <header
              className="shrink-0 flex items-center justify-between gap-2 px-3 pb-2"
              style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 32px)' }}
            >
              <Link
                href="/drivers/truck"
                className="inline-flex items-center gap-2 active:scale-[0.97] transition"
                aria-label="CityRiders home"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={BRAND_LOGO_URL}
                  alt=""
                  className="w-9 h-9 rounded-xl"
                  style={{ boxShadow: '0 2px 8px rgba(10,10,10,0.18)' }}
                />
                <span
                  className="font-black text-[18px] tracking-tight leading-none"
                  style={{ color: '#0A0A0A' }}
                >
                  CityRiders
                </span>
              </Link>
              <VehicleSwitcher active="truck" />
            </header>

            <div className="flex-1 min-h-0" aria-hidden />

            {/* Bottom — headline + paragraph + CTAs. Bottom padding
                combines pb-safe (iOS home indicator clearance) with
                extra 40px so the CTAs lift off the bottom edge instead
                of pinning to it on first arrival. */}
            <div
              className="shrink-0 px-5 pt-6"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 40px)' }}
            >
              <h1 className="text-[26px] xs:text-[28px] sm:text-[32px] font-black leading-[1.08] tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]">
                Your truck.<br />
                <span style={{ color: '#FACC15' }}>Your daily rate.</span>
              </h1>
              <p className="mt-2.5 text-[13px] text-white/85 leading-relaxed">
                Pindahan, distribusi, bulk parcel — you choose.
                Customers pay you directly. No platform cut.
              </p>

              <div className="mt-4 flex flex-col gap-2">
                <Link
                  href="/signup?role=driver&vehicle=truck"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#FACC15] text-[#0A0A0A] text-[14px] font-extrabold shadow-[0_8px_24px_rgba(250,204,21,0.55)] active:scale-[0.97] transition"
                  style={{ minHeight: 48 }}
                >
                  List your truck
                  <ArrowRight className="w-4 h-4" strokeWidth={3} />
                </Link>
                <a
                  href={`https://wa.me/${getSupportWhatsApp()}?text=${encodeURIComponent(
                    "Hi, I'm interested in listing my truck on CityRiders. Can I get more info?",
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-[13px] font-extrabold active:scale-[0.97] transition"
                  style={{
                    background: 'rgba(255,255,255,0.10)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255,255,255,0.30)',
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                    minHeight: 42,
                  }}
                >
                  <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
                  Ask via WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── What you can offer (use cases) ─────────────────────────── */}
      <section className="px-5 py-12">
        <div className="text-center mb-10">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#EAB308] mb-2">
            What you can offer
          </div>
          <h2 className="text-[24px] sm:text-[32px] font-black leading-tight">
            Four ways to earn from one truck.
          </h2>
          <p className="mt-3 text-[14px] text-black/65 max-w-xl mx-auto">
            You decide. Show one service or all of them on your public
            profile. Customers contact you for the one they need.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <UseCase
            icon={<Truck className="w-5 h-5" strokeWidth={2.5} />}
            title="Pindahan rumah / kantor"
            body="Household + office moves. Day rate + crew. Customers reserve via WhatsApp, you confirm date and load size."
          />
          <UseCase
            icon={<Building2 className="w-5 h-5" strokeWidth={2.5} />}
            title="Distribusi & supply runs"
            body="Hardware stores, building supply, market restocks. Set per-trip or daily rate. Regulars become weekly contracts."
          />
          <UseCase
            icon={<Boxes className="w-5 h-5" strokeWidth={2.5} />}
            title="Bulk parcel for sellers"
            body="Shopee, Tokopedia, UMKM warehouses. Pickup + drop large daily volumes. Often a fixed monthly contract."
          />
          <UseCase
            icon={<Calendar className="w-5 h-5" strokeWidth={2.5} />}
            title="Multi-day rental"
            body="Rent by the day, weekend, or project. You set the deposit, fuel terms, and driver availability."
          />
        </div>
      </section>

      {/* ─── How it works ──────────────────────────────────────────── */}
      <section className="bg-[#FFFBEA] border-y border-[#FACC15]/30">
        <div className="px-5 py-12">
          <div className="text-center mb-10">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#EAB308] mb-2">
              How it works
            </div>
            <h2 className="text-[24px] sm:text-[32px] font-black leading-tight">
              Three steps. You stay in full control.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <Step n={1} icon={<Smartphone className="w-5 h-5" strokeWidth={2.5} />} title="Sign up &amp; verify">
              Upload ID, vehicle registration (STNK), truck photos, load
              capacity. Verified within 24 hours. Profile goes live in one
              business day.
            </Step>
            <Step n={2} icon={<Sparkles className="w-5 h-5" strokeWidth={2.5} />} title="Customers find you">
              Your profile appears in truck search. They see your daily
              rate, truck size, services — and tap WhatsApp to book.
            </Step>
            <Step n={3} icon={<Wallet className="w-5 h-5" strokeWidth={2.5} />} title="Agree &amp; drive">
              Rate, schedule, load — all in chat. They pay cash, transfer,
              or your own QRIS. You keep 100%, no platform cut.
            </Step>
          </div>
        </div>
      </section>

      {/* ─── Why CityRiders ─────────────────────────────────────────── */}
      <section className="px-5 py-12">
        <div className="text-center mb-10">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#EAB308] mb-2">
            Why drivers love this
          </div>
          <h2 className="text-[24px] sm:text-[32px] font-black leading-tight">
            Daily rates. Big jobs. Regular contracts.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Differentiator
            icon={<Wallet className="w-5 h-5" strokeWidth={2.5} />}
            title="0% commission per job"
            body={`Just ${MONTHLY_PRICE_LABEL}/month flat. Pindahan job at Rp 800,000? You keep all of it.`}
          />
          <Differentiator
            icon={<Calendar className="w-5 h-5" strokeWidth={2.5} />}
            title="Daily + multi-day rates"
            body="Built for bigger jobs. Quote per day, per project, or per weekly contract — not per kilometre."
          />
          <Differentiator
            icon={<ShieldCheck className="w-5 h-5" strokeWidth={2.5} />}
            title="Big jobs, real margins"
            body="Pindahan, distribusi, building supply, bulk parcel for Shopee sellers. Higher ticket than per-km transport."
          />
          <Differentiator
            icon={<Sparkles className="w-5 h-5" strokeWidth={2.5} />}
            title="Personal page"
            body="A cityriders.id/truck/you page you can share to repeat clients, supply contracts, or distributor groups."
          />
        </div>
      </section>

      {/* ─── Typical day ────────────────────────────────────────────── */}
      <section className="px-5 py-12 bg-white">
        <div className="text-center mb-8">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#EAB308] mb-2">
            Typical day
          </div>
          <h2 className="text-[24px] sm:text-[32px] font-black leading-tight">
            One booking can pay for the week.
          </h2>
          <p className="mt-2 text-[13px] sm:text-[14px] text-black/70 max-w-md mx-auto">
            Truck work is fewer jobs, bigger margins — not the per-km grind.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-md sm:max-w-2xl mx-auto">
          <MetricCard
            label="Daily rate range"
            value="Rp 400–800k"
            sub="Per-day quote. Driver-set, no surge cap."
          />
          <MetricCard
            label="Pindahan job"
            value="Rp 600k+"
            sub="One household move. Day rate + crew."
          />
          <MetricCard
            label="Weekly contract"
            value="Rp 2–4M"
            sub="Bulk parcel for one UMKM seller."
          />
        </div>
      </section>

      {/* ─── Two ways to earn ───────────────────────────────────────── */}
      <section className="px-5 py-12 bg-[#FFFBEA]">
        <div className="text-center mb-8">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#EAB308] mb-2">
            Two ways to earn
          </div>
          <h2 className="text-[24px] sm:text-[32px] font-black leading-tight">
            Moving jobs and bulk parcel — one truck.
          </h2>
          <p className="mt-2 text-[13px] sm:text-[14px] text-black/70 max-w-md mx-auto">
            Pindahan dan paket besar — satu truk, dua sumber penghasilan.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md sm:max-w-2xl mx-auto">
          <EarningModeCard
            icon={<Truck className="w-5 h-5" strokeWidth={2.5} />}
            title="Pindahan & distribusi"
            subtitle="Moving + distribution"
            body="Household moves, hardware deliveries, market supply runs. Day rate + crew. Customers book by date, not by kilometre."
          />
          <EarningModeCard
            icon={<Package className="w-5 h-5" strokeWidth={2.5} />}
            title="Bulk parcel B2B"
            subtitle="Kontrak paket UMKM"
            body="Shopee sellers, Tokopedia warehouses, large daily volumes. Often weekly or monthly contracts — stable repeat income."
          />
        </div>

        <p className="mt-6 text-center text-[12px] text-black/55 max-w-md mx-auto">
          Opt into both from your driver dashboard. Customers pick the mode on the booking page, then see only drivers who offer it.
        </p>
      </section>

      {/* ─── Pricing card ───────────────────────────────────────────── */}
      <section className="px-5 py-12">
        <div className="rounded-3xl border-2 border-[#FACC15] bg-white p-6 sm:p-8 shadow-[0_16px_48px_rgba(250,204,21,0.18)]">
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFBEA] border border-[#FACC15] text-[11px] font-extrabold uppercase tracking-wider text-[#0A0A0A] mb-3">
              <Sparkles className="w-3.5 h-3.5" strokeWidth={2.5} style={{ color: '#EAB308' }} />
              Founder Pricing — Locked Forever
            </div>
            <div className="text-[44px] sm:text-[56px] font-black leading-none">
              {MONTHLY_PRICE_LABEL}
              <span className="text-[16px] font-bold text-black/55">/month</span>
            </div>
            <div className="text-[13px] text-black/60 mt-2">
              or {YEARLY_PRICE_LABEL}/year (save ~23%)
            </div>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0A0A0A] text-white text-[12px] font-extrabold">
              <Sparkles className="w-3.5 h-3.5" strokeWidth={2.5} style={{ color: '#FACC15' }} />
              {TRIAL_LABEL_EN}
            </div>
          </div>

          <ul className="mt-6 space-y-2.5 text-[13px] sm:text-[14px] text-black/80">
            <Bullet>Your personal public page (cityriders.id/truck/you)</Bullet>
            <Bullet>Offer pindahan, distribusi, or bulk parcel contracts</Bullet>
            <Bullet>Listed in Yogyakarta, Bali, Jogja truck search</Bullet>
            <Bullet>0% commission per job — forever</Bullet>
            <Bullet>WhatsApp direct — customers chat you</Bullet>
            <Bullet>Set daily rates, project rates, or contracts yourself</Bullet>
          </ul>

          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <Link
              href="/signup?role=driver&vehicle=truck"
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#FACC15] text-[#0A0A0A] text-[14px] font-extrabold shadow-[0_8px_24px_rgba(250,204,21,0.45)] active:scale-[0.97] transition"
              style={{ minHeight: 48 }}
            >
              Start 7-day free trial
              <ArrowRight className="w-4 h-4" strokeWidth={3} />
            </Link>
          </div>
          <p className="mt-3 text-center text-[11px] text-black/45">
            No credit card required for the trial. Cancel anytime.
          </p>
        </div>
      </section>

      {/* ─── Final CTA + WA footer ──────────────────────────────────── */}
      <section className="bg-[#0A0A0A] text-white">
        <div className="px-5 py-12 text-center">
          <h2 className="text-[24px] sm:text-[32px] font-black leading-tight">
            Ready to make your truck earn?
          </h2>
          <p className="mt-3 text-[14px] sm:text-[16px] text-white/70 max-w-xl mx-auto">
            Early founder drivers get
            {' '}{MONTHLY_PRICE_LABEL}/month locked in for life. Price goes up
            for new signups once the early cohort fills.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/signup?role=driver&vehicle=truck"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#FACC15] text-[#0A0A0A] text-[14px] font-extrabold shadow-[0_8px_24px_rgba(250,204,21,0.55)] active:scale-[0.97] transition"
              style={{ minHeight: 48 }}
            >
              Sign up now — 7 days free
              <ArrowRight className="w-4 h-4" strokeWidth={3} />
            </Link>
            <a
              href={`https://wa.me/${getSupportWhatsApp()}?text=${encodeURIComponent(
                "Hi, I'm interested in listing my truck on CityRiders. Can I get more info?",
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white/10 border border-white/25 text-white text-[14px] font-extrabold active:scale-[0.97] transition hover:bg-white/15"
              style={{ minHeight: 48 }}
            >
              <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
              Ask via WhatsApp first
            </a>
          </div>

          <div className="mt-10 pt-6 border-t border-white/10 text-[12px] text-white/45">
            CityRiders is a directory and profile management tool — not a
            ride-hailing app. Drivers and customers transact directly,
            off-platform.
          </div>
        </div>
      </section>
      </div>{/* /phone-frame wrapper */}
    </main>
  )
}

// ─── Small presentational helpers ───────────────────────────────────

// 3-way Bike/Car/Truck mini selector. Active chip renders as plain
// text (no link); inactive chips are pill links. Matches the existing
// cross-nav pill style used on /drivers and /drivers/car: white-blur
// background, rounded-full, 11px font, charcoal text.
function VehicleSwitcher({ active }: { active: 'bike' | 'car' | 'truck' }) {
  const items: { key: 'bike' | 'car' | 'truck'; label: string; href: string }[] = [
    { key: 'bike', label: 'Bike', href: '/drivers' },
    { key: 'car', label: 'Car', href: '/drivers/car' },
    { key: 'truck', label: 'Truck', href: '/drivers/truck' },
  ]
  return (
    <div
      className="inline-flex items-center gap-1 px-1 py-1 rounded-full"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        border: '1px solid rgba(0,0,0,0.10)',
      }}
    >
      {items.map((it) =>
        it.key === active ? (
          <span
            key={it.key}
            className="px-2 py-0.5 rounded-full text-[11px] font-extrabold"
            style={{ color: '#0A0A0A', background: '#FACC15' }}
            aria-current="page"
          >
            {it.label}
          </span>
        ) : (
          <Link
            key={it.key}
            href={it.href}
            className="px-2 py-0.5 rounded-full text-[11px] font-extrabold transition active:scale-[0.97]"
            style={{ color: '#0A0A0A' }}
          >
            {it.label}
          </Link>
        ),
      )}
    </div>
  )
}

function Step({
  n, icon, title, children,
}: {
  n: number
  icon: React.ReactNode
  title: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl bg-white border border-black/10 p-5 sm:p-6 hover:border-[#FACC15] hover:shadow-[0_8px_24px_rgba(250,204,21,0.18)] transition">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-[#0A0A0A]"
          style={{ background: '#FFFBEA', border: '1px solid #FACC15' }}
        >
          {icon}
        </div>
        <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#EAB308]">
          Step {n}
        </span>
      </div>
      <h3 className="text-[16px] sm:text-[18px] font-black leading-tight">{title}</h3>
      <p className="mt-2 text-[13px] sm:text-[14px] text-black/65 leading-relaxed">
        {children}
      </p>
    </div>
  )
}

function UseCase({
  icon, title, body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="rounded-2xl bg-white border border-black/10 p-5 hover:border-[#FACC15] hover:shadow-[0_8px_24px_rgba(250,204,21,0.18)] transition">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
        style={{ background: '#FACC15' }}
      >
        {icon}
      </div>
      <h3 className="text-[14px] sm:text-[15px] font-black leading-tight">{title}</h3>
      <p className="mt-2 text-[12.5px] sm:text-[13px] text-black/65 leading-relaxed">{body}</p>
    </div>
  )
}

function Differentiator({
  icon, title, body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="rounded-2xl bg-white border border-[#FACC15]/40 p-5">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
        style={{ background: '#FACC15' }}
      >
        {icon}
      </div>
      <h3 className="text-[14px] sm:text-[15px] font-black leading-tight">{title}</h3>
      <p className="mt-2 text-[12.5px] sm:text-[13px] text-black/65 leading-relaxed">{body}</p>
    </div>
  )
}

function MetricCard({
  label, value, sub,
}: {
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="rounded-2xl bg-white border border-black/10 p-5 text-center hover:border-[#FACC15] hover:shadow-[0_8px_24px_rgba(250,204,21,0.18)] transition">
      <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#EAB308] mb-1.5">
        {label}
      </div>
      <div className="text-[20px] sm:text-[22px] font-black leading-tight text-[#0A0A0A]">
        {value}
      </div>
      <div className="mt-1.5 text-[12px] text-black/60 leading-relaxed">{sub}</div>
    </div>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        aria-hidden
        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
        style={{ background: '#FACC15', color: '#0A0A0A' }}
      >
        <span className="block w-2 h-2 rounded-full bg-[#0A0A0A]" />
      </span>
      <span>{children}</span>
    </li>
  )
}

