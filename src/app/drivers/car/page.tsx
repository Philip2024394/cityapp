// /drivers/car — Car driver recruitment landing page.
//
// Mirror of /drivers (the motorbike landing) but tuned for car drivers:
// copy emphasises higher-ticket use cases like airport transfers, daily
// rentals (sewa harian), and family / group transport — different
// economics from the per-km ojek model.

import Link from 'next/link'
import {
  ArrowRight,
  MessageCircle,
  Smartphone,
  Wallet,
  ShieldCheck,
  Sparkles,
  Plane,
  Users,
  Calendar,
  UserRound,
  Package,
} from 'lucide-react'
import FounderCohortCounter from '@/components/pricing/FounderCohortCounter'
import EarningModeCard from '@/components/recruitment/EarningModeCard'
import {
  MONTHLY_PRICE_LABEL,
  YEARLY_PRICE_LABEL,
  TRIAL_LABEL_EN,
} from '@/lib/pricing/constants'

const HERO_URL =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2003_53_26%20PM.png'

const BRAND_LOGO_URL =
  'https://ik.imagekit.io/nepgaxllc/Untitleddasdasdasasd-removebg-preview.png?updatedAt=1779015947714'

// Public WhatsApp number for driver-side support. Shared with the
// motorbike landing; replace with the real ops line when provisioned.
const WA_HELP = '6281234567890'

export const metadata = {
  title: 'Drive your car with CityRiders — Airport, rental, tours',
  description:
    'Join CityRiders as a car driver. You set the rates. Customers pay you directly via WhatsApp. Built for airport transfers, daily rentals, and tours.',
}

export default function CarDriversLandingPage() {
  return (
    <main
      className="relative min-h-[100dvh] text-[#0A0A0A]"
      style={{
        background:
          'radial-gradient(circle at top, #FEF3C7 0%, #F5F5F4 70%, #E7E5E4 100%)',
      }}
    >
      {/* Mobile-only design — centred on desktop as a phone-frame
          preview. Same lock as /drivers. */}
      <div className="mx-auto bg-white lg:my-6 lg:max-w-[480px] lg:rounded-[32px] lg:shadow-[0_24px_80px_rgba(10,10,10,0.18)] lg:overflow-hidden">
      {/* ─── Hero ────────────────────────────────────────────────────── */}
      <section className="relative">
        {/* HERO — flex-column layout matching /drivers. Header pinned
            top, headline + CTAs pinned bottom, flexible spacer absorbs
            the middle so nothing overflows 100dvh. */}
        <div
          className="relative w-full overflow-hidden"
          style={{ height: '100dvh', minHeight: 560 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO_URL}
            alt="CityRiders car driver next to a yellow sedan at sunset in Bali"
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
            {/* Header — logo + brand left, "← Bike version" link right.
                Top padding combines pt-safe (iOS notch / Dynamic Island
                clearance) with an extra 32px so the brand name is never
                visually pinched against the notch or the status bar. */}
            <header
              className="shrink-0 flex items-center justify-between gap-2 px-3 pb-2"
              style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 32px)' }}
            >
              <Link
                href="/drivers/car"
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
              <Link
                href="/drivers"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold transition"
                style={{
                  background: 'rgba(255,255,255,0.92)',
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                  color: '#0A0A0A',
                  border: '1px solid rgba(0,0,0,0.10)',
                }}
              >
                ← Bike version
              </Link>
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
                Your car.<br />
                <span style={{ color: '#FACC15' }}>Your rates.</span>
              </h1>
              <p className="mt-2.5 text-[13px] text-white/85 leading-relaxed">
                Airport transfers, daily rentals, tours — you choose.
                Customers pay you directly. No platform cut.
              </p>

              <div className="mt-4 flex flex-col gap-2">
                <Link
                  href="/signup?role=driver&vehicle=car"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#FACC15] text-[#0A0A0A] text-[14px] font-extrabold shadow-[0_8px_24px_rgba(250,204,21,0.55)] active:scale-[0.97] transition"
                  style={{ minHeight: 48 }}
                >
                  List your car
                  <ArrowRight className="w-4 h-4" strokeWidth={3} />
                </Link>
                <a
                  href={`https://wa.me/${WA_HELP}?text=${encodeURIComponent(
                    "Hi, I'm interested in listing my car on CityRiders. Can I get more info?",
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
            Four ways to earn from one car.
          </h2>
          <p className="mt-3 text-[14px] text-black/65 max-w-xl mx-auto">
            You decide. Show one service or all of them on your public
            profile. Customers contact you for the one they need.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <UseCase
            icon={<Plane className="w-5 h-5" strokeWidth={2.5} />}
            title="Airport transfers"
            body="YIA, Adisutjipto, DPS — fixed fare, customers reserve via WhatsApp, you confirm the pickup time."
          />
          <UseCase
            icon={<Calendar className="w-5 h-5" strokeWidth={2.5} />}
            title="Daily rental (self-drive or with driver)"
            body="Rent by the day, weekend, or week. You set the deposit and terms."
          />
          <UseCase
            icon={<Users className="w-5 h-5" strokeWidth={2.5} />}
            title="Family / group tours"
            body="Yogyakarta, Bali, or cross-city tours. Day rate + fuel. You drive and guide."
          />
          <UseCase
            icon={<Smartphone className="w-5 h-5" strokeWidth={2.5} />}
            title="Per-trip transport"
            body="Regular intra-city trips. You set the per-km rate and minimum fee."
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
              Upload ID, vehicle registration, car photos. Verified within
              24 hours. Profile goes live in one business day.
            </Step>
            <Step n={2} icon={<Sparkles className="w-5 h-5" strokeWidth={2.5} />} title="Customers find you">
              Your profile appears in car search. They see your rates, car
              type, services — and tap WhatsApp to book.
            </Step>
            <Step n={3} icon={<Wallet className="w-5 h-5" strokeWidth={2.5} />} title="Agree &amp; drive">
              Rate, time, location — all in chat. They pay cash or your own
              QRIS. You keep 100%, no platform cut.
            </Step>
          </div>
        </div>
      </section>

      {/* ─── Why CityRiders ─────────────────────────────────────────── */}
      <section className="px-5 py-12">
        <div className="text-center mb-10">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#EAB308] mb-2">
            Why CityRiders
          </div>
          <h2 className="text-[24px] sm:text-[32px] font-black leading-tight">
            Your rates. Your customers. Your earnings.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Differentiator
            icon={<Wallet className="w-5 h-5" strokeWidth={2.5} />}
            title="0% commission per trip"
            body={`Just ${MONTHLY_PRICE_LABEL}/month flat. Daily rental at Rp 500,000? You keep all of it.`}
          />
          <Differentiator
            icon={<MessageCircle className="w-5 h-5" strokeWidth={2.5} />}
            title="Direct relationship"
            body="Customers WhatsApp you for repeat bookings. Build regulars, not one-shot orders."
          />
          <Differentiator
            icon={<ShieldCheck className="w-5 h-5" strokeWidth={2.5} />}
            title="Pick your services"
            body="Airport only? Daily rentals only? Tours only? All of them? Your public profile shows what you offer."
          />
          <Differentiator
            icon={<Sparkles className="w-5 h-5" strokeWidth={2.5} />}
            title="Personal page"
            body="A cityriders.id/car/you page you can share to regulars, partner hotels, or Instagram."
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
            Passengers and parcels — one car.
          </h2>
          <p className="mt-2 text-[13px] sm:text-[14px] text-black/70 max-w-md mx-auto">
            Penumpang dan paket — satu mobil, dua sumber penghasilan.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md sm:max-w-2xl mx-auto">
          <EarningModeCard
            icon={<UserRound className="w-5 h-5" strokeWidth={2.5} />}
            title="Passenger trips"
            subtitle="Antar penumpang"
            body="Airport runs, family rides, hotel transfers, daily rental. Set your per-km rate and minimum fee."
          />
          <EarningModeCard
            icon={<Package className="w-5 h-5" strokeWidth={2.5} />}
            title="Cargo & parcel"
            subtitle="Kirim barang"
            body="Larger items, multiple boxes, inter-city couriers. Cars carry what bikes can't — often a premium rate."
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
            <Bullet>Your personal public page (cityriders.id/car/you)</Bullet>
            <Bullet>Offer airport transfers, daily rentals, or tours</Bullet>
            <Bullet>Listed in Yogyakarta, Bali, Jogja car search</Bullet>
            <Bullet>0% commission per trip — forever</Bullet>
            <Bullet>WhatsApp direct — customers chat you</Bullet>
            <Bullet>Set fixed rates or per-km rates yourself</Bullet>
          </ul>

          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <Link
              href="/signup?role=driver&vehicle=car"
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
            Ready to make your car earn?
          </h2>
          <p className="mt-3 text-[14px] sm:text-[16px] text-white/70 max-w-xl mx-auto">
            Join the first 1,000 founder drivers and lock in
            {' '}{MONTHLY_PRICE_LABEL}/month for life. Price goes up for
            new signups once the cohort fills.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/signup?role=driver&vehicle=car"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#FACC15] text-[#0A0A0A] text-[14px] font-extrabold shadow-[0_8px_24px_rgba(250,204,21,0.55)] active:scale-[0.97] transition"
              style={{ minHeight: 48 }}
            >
              Sign up now — 7 days free
              <ArrowRight className="w-4 h-4" strokeWidth={3} />
            </Link>
            <a
              href={`https://wa.me/${WA_HELP}?text=${encodeURIComponent(
                "Hi, I'm interested in listing my car on CityRiders. Can I get more info?",
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
