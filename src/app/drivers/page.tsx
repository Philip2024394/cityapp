// /drivers — Motor-bike driver recruitment landing page.
//
// Single-purpose marketing surface for driver acquisition. Customer
// booking lives at /cari; this page is for someone considering joining
// CityDrivers as a driver. Routes to /signup?role=driver from every CTA.
//
// Mobile-first portrait hero (the founder-supplied illustration is
// taller than wide — vertical phones get a full-height impact shot,
// desktop pairs the hero side-by-side with the headline copy).

import Link from 'next/link'
import { ArrowRight, MessageCircle, Smartphone, Wallet, ShieldCheck, Sparkles, Star, UserRound, Package } from 'lucide-react'
import EarningModeCard from '@/components/recruitment/EarningModeCard'
import { getSupportWhatsApp } from '@/lib/support/contacts'
import {
  MONTHLY_PRICE_LABEL,
  YEARLY_PRICE_LABEL,
  TRIAL_LABEL_EN,
} from '@/lib/pricing/constants'

const HERO_URL =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2003_30_50%20PM.png'

const BRAND_LOGO_URL =
  'https://ik.imagekit.io/nepgaxllc/Untitledasdasdaasssdasdasd-removebg-preview.png?updatedAt=1780193517351'

// Public WhatsApp number for driver-side support — sourced from env via getSupportWhatsApp().

const PAGE_TITLE = 'Drive with CityDrivers — Your earnings, your rules'
const PAGE_DESCRIPTION =
  'Join CityDrivers as a motorbike driver. Customers pay you directly via WhatsApp. No per-trip commission, no algorithm cutting your fare.'
const PAGE_URL = 'https://citydrivers.id/drivers'

export const metadata = {
  title:       PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates:  { canonical: PAGE_URL },
  openGraph: {
    title:       PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    type:        'website',
    url:         PAGE_URL,
    images:      [{ url: HERO_URL }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images:      [HERO_URL],
  },
}

export default function DriversLandingPage() {
  return (
    <main
      className="relative min-h-[100dvh] text-[#0A0A0A]"
      style={{
        // Soft cream backdrop on desktop frames the centered phone-style
        // layout. Mobile renders edge-to-edge so the backdrop is invisible.
        background:
          'radial-gradient(circle at top, #FEF3C7 0%, #F5F5F4 70%, #E7E5E4 100%)',
      }}
    >
      {/* Mobile-only design — centred on desktop as a phone-frame preview.
          Driver acquisition traffic is ~95% mobile (WhatsApp shares, QR
          codes, ojek-group forwards); desktop visitors are admins or
          curiosity browsers. One layout, one source of truth. */}
      <div className="mx-auto bg-white lg:my-6 lg:max-w-[480px] lg:rounded-[32px] lg:shadow-[0_24px_80px_rgba(10,10,10,0.18)] lg:overflow-hidden">
      {/* ─── Hero ────────────────────────────────────────────────────── */}
      <section className="relative">
        {/* HERO — flex-column layout so all content (brand header at
            top, headline + CTAs at bottom) is always visible inside
            100dvh. The image fills the viewport behind; the flex spacer
            absorbs any extra height between header and bottom so nothing
            ever overflows or gets clipped, regardless of phone size. */}
        <div
          className="relative w-full overflow-hidden"
          style={{ height: '100dvh', minHeight: 560 }}
        >
          {/* Background image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO_URL}
            alt="CityDrivers driver on a yellow scooter at sunset in Bali"
            className="absolute inset-0 w-full h-full object-cover object-center"
            loading="eager"
          />

          {/* Top soft-white gradient — readability backdrop for the
              brand mark on the sunset sky. Taller now so the gradient
              fully covers the iPhone notch area + the brand row. */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 pointer-events-none"
            style={{
              height: 160,
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.90) 0%, rgba(255,255,255,0.50) 55%, rgba(255,255,255,0) 100%)',
            }}
          />

          {/* Bottom dark gradient — readability backdrop for the headline
              and CTA stack. Sits behind the bottom content area. */}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 pointer-events-none"
            style={{
              height: '55%',
              background:
                'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.95) 100%)',
            }}
          />

          {/* Foreground flex column — header pinned top, content pinned
              bottom, spacer absorbs the middle. Guarantees the headline
              + CTAs are always inside the viewport. */}
          <div className="absolute inset-0 z-10 flex flex-col">
            {/* Header — logo + brand left, vehicle switcher right.
                Top padding combines pt-safe (iOS notch / Dynamic Island
                clearance) with an extra 32px so the brand name is never
                visually pinched against the notch or the status bar. */}
            <header
              className="shrink-0 flex items-center justify-between gap-2 px-3 pb-2"
              style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 32px)' }}
            >
              <Link
                href="/cityriders"
                className="inline-flex items-center gap-2 active:scale-[0.97] transition"
                aria-label="CityDrivers home"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={BRAND_LOGO_URL}
                  alt=""
                  className="h-11 w-auto rounded-xl object-contain"
                />
                <span
                  className="font-black text-[18px] tracking-tight leading-none"
                  style={{ color: '#0A0A0A' }}
                >
                  CityDrivers
                </span>
              </Link>
              <VehicleSwitcher active="bike" />
            </header>

            {/* Flexible spacer — eats whatever vertical space remains
                between header and bottom content. */}
            <div className="flex-1 min-h-0" aria-hidden />

            {/* Bottom content — headline + paragraph + CTA stack. Sized
                to its own height; spacer above keeps it pinned to the
                bottom edge. Bottom padding combines pb-safe (iOS home
                indicator clearance) with extra 40px so the CTAs read as
                "card lifted off the bottom" instead of pinned to the
                screen edge on first arrival. */}
            <div
              className="shrink-0 px-5 pt-6"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 40px)' }}
            >
              <h1 className="text-[26px] xs:text-[28px] sm:text-[32px] font-black leading-[1.08] tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]">
                Drive when you want.<br />
                <span style={{ color: '#FACC15' }}>Get paid directly.</span>
              </h1>
              <p className="mt-2.5 text-[13px] text-white/85 leading-relaxed">
                Customers find you, WhatsApp you, pay you directly.
                No commission.
              </p>

              <div className="mt-4 flex flex-col gap-2">
                <Link
                  href="/signup?role=driver"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#FACC15] text-[#0A0A0A] text-[14px] font-extrabold shadow-[0_8px_24px_rgba(250,204,21,0.55)] active:scale-[0.97] transition"
                  style={{ minHeight: 48 }}
                >
                  Sign up to drive
                  <ArrowRight className="w-4 h-4" strokeWidth={3} />
                </Link>
                <a
                  href={`https://wa.me/${getSupportWhatsApp()}?text=${encodeURIComponent(
                    "Hi, I'm interested in joining CityDrivers as a driver. Can I get more info?",
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

      {/* ─── How it works ──────────────────────────────────────────── */}
      <section className="px-5 py-12">
        <div className="text-center mb-10">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#EAB308] mb-2">
            How it works
          </div>
          <h2 className="text-[24px] sm:text-[32px] font-black leading-tight">
            Three steps. No customer app required.
          </h2>
          <p className="mt-3 text-[14px] text-black/65 max-w-xl mx-auto">
            Customers don&apos;t need to install anything. They search, tap
            WhatsApp, and chat you directly. You set your rate, pickup
            location, and accept cash or your own QRIS.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <Step n={1} icon={<Smartphone className="w-5 h-5" strokeWidth={2.5} />} title="Sign up &amp; verify">
            Upload your ID, set your per-km rate, add bike photos.
            Verified within 24 hours. Your profile goes live in one business day.
          </Step>
          <Step n={2} icon={<Sparkles className="w-5 h-5" strokeWidth={2.5} />} title="Customers find you">
            Your profile shows up in Yogyakarta and Bali search. They see
            your rating, rate, bike type — and tap WhatsApp to book.
          </Step>
          <Step n={3} icon={<Wallet className="w-5 h-5" strokeWidth={2.5} />} title="Agree &amp; ride">
            You and the customer agree on location and price by chat.
            They pay you directly — cash or your own QRIS. You keep 100%.
          </Step>
        </div>
      </section>

      {/* ─── Why CityDrivers ─────────────────────────────────────────── */}
      <section className="bg-[#FFFBEA] border-y border-[#FACC15]/30">
        <div className="px-5 py-12">
          <div className="text-center mb-10">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#EAB308] mb-2">
              Why CityDrivers
            </div>
            <h2 className="text-[24px] sm:text-[32px] font-black leading-tight">
              Fair rules. Clear costs. You stay in control.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Differentiator
              icon={<Wallet className="w-5 h-5" strokeWidth={2.5} />}
              title="0% commission per trip"
              body={`Just ${MONTHLY_PRICE_LABEL}/month. No 15-20% cut on every order like the big apps take.`}
            />
            <Differentiator
              icon={<MessageCircle className="w-5 h-5" strokeWidth={2.5} />}
              title="Direct relationship"
              body="Customers WhatsApp you directly. Build a repeat customer base instead of random algorithm orders."
            />
            <Differentiator
              icon={<ShieldCheck className="w-5 h-5" strokeWidth={2.5} />}
              title="No price cuts"
              body="You set the per-km rate and minimum fee. No surge pricing dictating your earnings."
            />
            <Differentiator
              icon={<Star className="w-5 h-5" strokeWidth={2.5} />}
              title="Your personal page"
              body="A public profile you can share to your own WhatsApp contacts. Every share is a potential customer."
            />
          </div>
        </div>
      </section>

      {/* ─── Two ways to earn ───────────────────────────────────────── */}
      <section className="px-5 py-12 bg-[#FFFBEA]">
        <div className="text-center mb-8">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#EAB308] mb-2">
            Two ways to earn
          </div>
          <h2 className="text-[24px] sm:text-[32px] font-black leading-tight">
            Passengers and parcels — one motorbike.
          </h2>
          <p className="mt-2 text-[13px] sm:text-[14px] text-black/70 max-w-md mx-auto">
            Penumpang dan paket — satu motor, dua sumber penghasilan.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md sm:max-w-2xl mx-auto">
          <EarningModeCard
            icon={<UserRound className="w-5 h-5" strokeWidth={2.5} />}
            title="Passenger rides"
            subtitle="Antar penumpang"
            body="Daily rides, school pickups, after-hours runs. Set your per-km rate. Customers WhatsApp you direct."
          />
          <EarningModeCard
            icon={<Package className="w-5 h-5" strokeWidth={2.5} />}
            title="Parcel delivery"
            subtitle="Kirim paket"
            body="Out-of-town couriers, document drops, marketplace pickups. Often a higher per-trip value than rides."
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
            <Bullet>Your personal public page (citydrivers.id/r/you)</Bullet>
            <Bullet>Listed in Yogyakarta, Bali, Jogja customer search</Bullet>
            <Bullet>0% commission per trip — forever</Bullet>
            <Bullet>WhatsApp direct — customers chat you</Bullet>
            <Bullet>Set your own per-km rate and minimum fee</Bullet>
            <Bullet>Profile views &amp; share analytics</Bullet>
          </ul>

          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <Link
              href="/signup?role=driver"
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#FACC15] text-[#0A0A0A] text-[14px] font-extrabold shadow-[0_8px_24px_rgba(250,204,21,0.45)] active:scale-[0.97] transition"
              style={{ minHeight: 48 }}
            >
              Start 30-day free trial
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
            Ready to set your own schedule?
          </h2>
          <p className="mt-3 text-[14px] sm:text-[16px] text-white/70 max-w-xl mx-auto">
            Early founder drivers get
            {' '}{MONTHLY_PRICE_LABEL}/month locked in for life. Price goes up
            for new signups once the early cohort fills.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/signup?role=driver"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#FACC15] text-[#0A0A0A] text-[14px] font-extrabold shadow-[0_8px_24px_rgba(250,204,21,0.55)] active:scale-[0.97] transition"
              style={{ minHeight: 48 }}
            >
              Sign up now — 30 days free
              <ArrowRight className="w-4 h-4" strokeWidth={3} />
            </Link>
            <a
              href={`https://wa.me/${getSupportWhatsApp()}?text=${encodeURIComponent(
                "Hi, I'm interested in joining CityDrivers as a driver. Can I get more info?",
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
            CityDrivers is a directory and profile management tool — not a
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
// cross-nav pill style: white-blur background, rounded-full, 11px
// font, charcoal text. Duplicated in /drivers/car and /drivers/truck —
// same pattern these pages already use for Step/Differentiator/Bullet.
function VehicleSwitcher({ active }: { active: 'bike' | 'car' | 'bus' | 'truck' | 'jeep' }) {
  const items: { key: 'bike' | 'car' | 'bus' | 'truck' | 'jeep'; label: string; href: string }[] = [
    { key: 'bike',  label: 'Bike',  href: '/drivers' },
    { key: 'car',   label: 'Car',   href: '/drivers/car' },
    { key: 'bus',   label: 'Bus',   href: '/drivers/bus' },
    { key: 'truck', label: 'Truck', href: '/drivers/truck' },
    { key: 'jeep',  label: 'Jeep',  href: '/drivers/jeep' },
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
    <div
      className="rounded-2xl bg-white border border-black/10 p-5 sm:p-6 hover:border-[#FACC15] hover:shadow-[0_8px_24px_rgba(250,204,21,0.18)] transition"
    >
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
