// /cityriders/partner — Partner Program recruitment landing for hotels,
// villas, tour operators, restaurants, cafés. Mirrors the /drivers/* hero
// pattern so partners feel first-class alongside drivers. Sign-up CTA
// points to the existing multi-step /partners/signup flow.

import Link from 'next/link'
import {
  ArrowRight,
  MessageCircle,
  Smartphone,
  Wallet,
  ShieldCheck,
  Sparkles,
  Building2,
  QrCode,
  HandCoins,
  Clock,
} from 'lucide-react'
import { getSupportWhatsApp } from '@/lib/support/contacts'

const HERO_URL =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2009_29_49%20AM.png'

const BRAND_LOGO_URL =
  'https://ik.imagekit.io/nepgaxllc/Untitledasdasdaasssdasdasd-removebg-preview.png?updatedAt=1780193517351'

const PAGE_TITLE = 'CityDrivers Partner Program — Hotels, villas, tour operators earn 8%'
const PAGE_DESCRIPTION =
  'Hotels, villas, restaurants and tour operators: print a CityDrivers QR, refer guests to local drivers, and earn 8% commission per confirmed booking. Free to join. Driver pays you every 48 hours, directly.'
const PAGE_URL = 'https://citydrivers.id/cityriders/partner'

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

export default function PartnerProgramLandingPage() {
  return (
    <main
      className="relative min-h-[100dvh] text-[#0A0A0A]"
      style={{
        background:
          'radial-gradient(circle at top, #FEF3C7 0%, #F5F5F4 70%, #E7E5E4 100%)',
      }}
    >
      <div className="mx-auto bg-white lg:my-6 lg:max-w-[480px] lg:rounded-[32px] lg:shadow-[0_24px_80px_rgba(10,10,10,0.18)] lg:overflow-hidden">

      <section className="relative">
        <div
          className="relative w-full overflow-hidden"
          style={{ height: '100dvh', minHeight: 560 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO_URL}
            alt="CityDrivers Partner — hotel and villa hosts earn 8% commission per booking"
            className="absolute inset-0 w-full h-full object-cover object-center"
            loading="eager"
          />

          <div
            aria-hidden
            className="absolute inset-x-0 top-0 pointer-events-none"
            style={{
              height: 160,
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.90) 0%, rgba(255,255,255,0.50) 55%, rgba(255,255,255,0) 100%)',
            }}
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 pointer-events-none"
            style={{
              height: '55%',
              background:
                'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.95) 100%)',
            }}
          />

          <div className="absolute inset-0 z-10 flex flex-col">
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
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold"
                style={{
                  background: 'rgba(255,255,255,0.92)',
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                  color: '#0A0A0A',
                  border: '1px solid rgba(0,0,0,0.10)',
                }}
              >
                Mitra Resmi
              </span>
            </header>

            <div className="flex-1 min-h-0" aria-hidden />

            <div
              className="shrink-0 px-5 pt-6"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 40px)' }}
            >
              <h1 className="text-[26px] xs:text-[28px] sm:text-[32px] font-black leading-[1.08] tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]">
                Your guests need rides.<br />
                <span style={{ color: '#FACC15' }}>Earn 8% per booking.</span>
              </h1>
              <p className="mt-2.5 text-[13px] text-white/85 leading-relaxed">
                Print a QR, refer guests to local drivers, earn 8% on every
                confirmed booking. Driver pays you every 48 hours, directly.
              </p>

              <div className="mt-4 flex flex-col gap-2">
                <Link
                  href="/partners/signup"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#FACC15] text-[#0A0A0A] text-[14px] font-extrabold shadow-[0_8px_24px_rgba(250,204,21,0.55)] active:scale-[0.97] transition"
                  style={{ minHeight: 48 }}
                >
                  Join as a partner
                  <ArrowRight className="w-4 h-4" strokeWidth={3} />
                </Link>
                <a
                  href={`https://wa.me/${getSupportWhatsApp()}?text=${encodeURIComponent(
                    "Halo, saya mau gabung CityDrivers Partner Program. Bisa info lebih lanjut?",
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
                  Tanya via WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-12">
        <div className="text-center mb-10">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#EAB308] mb-2">
            Who joins
          </div>
          <h2 className="text-[24px] sm:text-[32px] font-black leading-tight">
            Built for businesses with guests.
          </h2>
          <p className="mt-3 text-[14px] text-black/65 max-w-xl mx-auto">
            If guests walk through your door and need a ride, you qualify.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <UseCase
            icon={<Building2 className="w-5 h-5" strokeWidth={2.5} />}
            title="Hotels &amp; villas"
            body="Lobby QR, room cards. Guests scan, find a local driver, you earn 8%."
          />
          <UseCase
            icon={<Building2 className="w-5 h-5" strokeWidth={2.5} />}
            title="Restaurants &amp; cafés"
            body="Table sticker. Diners going home or to the next stop tap to book."
          />
          <UseCase
            icon={<Building2 className="w-5 h-5" strokeWidth={2.5} />}
            title="Tour operators"
            body="QR on tour vouchers. Returning groups need transport back to the hotel."
          />
          <UseCase
            icon={<Building2 className="w-5 h-5" strokeWidth={2.5} />}
            title="Spas &amp; salons"
            body="Counter QR. Tired customers leaving the spa? One scan, one ride home."
          />
        </div>
      </section>

      <section className="bg-[#FFFBEA] border-y border-[#FACC15]/30">
        <div className="px-5 py-12">
          <div className="text-center mb-10">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#EAB308] mb-2">
              How it works
            </div>
            <h2 className="text-[24px] sm:text-[32px] font-black leading-tight">
              Five steps. Free forever.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <Step n={1} icon={<Smartphone className="w-5 h-5" strokeWidth={2.5} />} title="Sign up free">
              Name, email, partner type. Active within minutes. No contracts,
              no monthly fees, no platform cut.
            </Step>
            <Step n={2} icon={<QrCode className="w-5 h-5" strokeWidth={2.5} />} title="Get your QR + link">
              Download a printable QR for rooms / lobby / tables and a shareable
              link for your website. Each scan tags that guest to you for
              <strong> 30 days</strong>.
            </Step>
            <Step n={3} icon={<Sparkles className="w-5 h-5" strokeWidth={2.5} />} title="Guest books a driver">
              Tagged guest contacts a driver through CityDrivers. The moment
              the driver confirms, your 8% commission line lands on your
              dashboard.
            </Step>
            <Step n={4} icon={<HandCoins className="w-5 h-5" strokeWidth={2.5} />} title="Driver pays you within 48h">
              Cash, GoPay, transfer, QRIS — your choice. CityDrivers never
              holds money. We&apos;re just the ledger.
            </Step>
            <Step n={5} icon={<Clock className="w-5 h-5" strokeWidth={2.5} />} title="Unpaid? Driver loses access">
              If a driver doesn&apos;t settle within 48 hours they get a 24-hour
              grace warning. After 72 hours total they&apos;re deactivated
              from the partner-referred pool. You&apos;ll never be routed to
              defaulters.
            </Step>
          </div>

          <div className="mt-8 max-w-xl mx-auto rounded-2xl border-2 border-[#FACC15] bg-white p-5">
            <div className="text-[13px] font-extrabold uppercase tracking-wider text-[#A16207] mb-2">
              Community standard — your protection
            </div>
            <p className="text-[13px] text-black/75 leading-relaxed">
              Every driver who joins the CityDrivers Partner Program agrees,
              in writing, that they must pay you within <strong>48 hours</strong>{' '}
              of each confirmed booking. They get a <strong>1-day grace
              warning</strong> at 48 hours, and at <strong>72 hours total they
              are deactivated</strong> — every partner in our community skips
              them until they settle. We protect each other.
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 py-12">
        <div className="text-center mb-10">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#EAB308] mb-2">
            Why it&apos;s safe
          </div>
          <h2 className="text-[24px] sm:text-[32px] font-black leading-tight">
            CityDrivers never touches the money.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Differentiator
            icon={<ShieldCheck className="w-5 h-5" strokeWidth={2.5} />}
            title="Software only"
            body="We never hold funds, never take a cut of your 8%, never touch money between you and the driver."
          />
          <Differentiator
            icon={<Wallet className="w-5 h-5" strokeWidth={2.5} />}
            title="Compliant by design"
            body="The 8% is a B2B commission against the driver's published rate — not an aplikator cut from the customer's fare. Clear under Perpres 27/2026."
          />
          <Differentiator
            icon={<QrCode className="w-5 h-5" strokeWidth={2.5} />}
            title="You control the QR"
            body="Print it. Place it. Display the 'Mitra Resmi CityDrivers' sign. (Avoid 'Pangkalan' / 'Rank' — those imply ride-hail operator status under PM 12/2019.)"
          />
        </div>
      </section>

      <section className="px-5 py-12 bg-[#FFFBEA]">
        <div className="text-center mb-8">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#EAB308] mb-2">
            What you get
          </div>
          <h2 className="text-[24px] sm:text-[32px] font-black leading-tight">
            Real-time partner dashboard.
          </h2>
          <p className="mt-2 text-[13px] sm:text-[14px] text-black/70 max-w-md mx-auto">
            See every booking the moment a driver confirms.
          </p>
        </div>

        <ul className="mt-6 max-w-md mx-auto space-y-2.5 text-[13px] sm:text-[14px] text-black/80">
          <Bullet>QR code generator — print or share as image</Bullet>
          <Bullet>Live ledger — pending, paid, overdue commissions</Bullet>
          <Bullet>Booking-by-booking list with driver name + WhatsApp</Bullet>
          <Bullet>Payout setup — cash / GoPay / transfer / QRIS</Bullet>
          <Bullet>Driver deactivated after 72h overdue (48h due + 24h grace), one-tap reactivate</Bullet>
        </ul>
      </section>

      <section className="px-5 py-12">
        <div className="rounded-3xl border-2 border-[#FACC15] bg-white p-6 sm:p-8 shadow-[0_16px_48px_rgba(250,204,21,0.18)]">
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFBEA] border border-[#FACC15] text-[11px] font-extrabold uppercase tracking-wider text-[#0A0A0A] mb-3">
              <Sparkles className="w-3.5 h-3.5" strokeWidth={2.5} style={{ color: '#EAB308' }} />
              Founder Partners — Locked Forever
            </div>
            <div className="text-[44px] sm:text-[56px] font-black leading-none">
              Rp 0
              <span className="text-[16px] font-bold text-black/55">/month</span>
            </div>
            <div className="text-[13px] text-black/60 mt-2">
              No platform fee. No setup fee. Forever.
            </div>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0A0A0A] text-white text-[12px] font-extrabold">
              <Sparkles className="w-3.5 h-3.5" strokeWidth={2.5} style={{ color: '#FACC15' }} />
              You only earn — never pay
            </div>
          </div>

          <ul className="mt-6 space-y-2.5 text-[13px] sm:text-[14px] text-black/80">
            <Bullet>8% commission per confirmed booking</Bullet>
            <Bullet>30-day attribution window per scan</Bullet>
            <Bullet>Driver pays you direct every 48 hours</Bullet>
            <Bullet>Suspended drivers can&apos;t reach your guests</Bullet>
            <Bullet>Real-time dashboard + WhatsApp reminders</Bullet>
            <Bullet>Free printable QR + share link</Bullet>
          </ul>

          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <Link
              href="/partners/signup"
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#FACC15] text-[#0A0A0A] text-[14px] font-extrabold shadow-[0_8px_24px_rgba(250,204,21,0.45)] active:scale-[0.97] transition"
              style={{ minHeight: 48 }}
            >
              Join as a partner
              <ArrowRight className="w-4 h-4" strokeWidth={3} />
            </Link>
          </div>
          <p className="mt-3 text-center text-[11px] text-black/45">
            Verification within 24 hours. No credit card. No contracts.
          </p>
        </div>
      </section>

      <section className="bg-[#0A0A0A] text-white">
        <div className="px-5 py-12 text-center">
          <h2 className="text-[24px] sm:text-[32px] font-black leading-tight">
            Ready to monetize your foot traffic?
          </h2>
          <p className="mt-3 text-[14px] sm:text-[16px] text-white/70 max-w-xl mx-auto">
            Print one QR. Earn forever. CityDrivers is the rails — you keep
            the relationship with your guest, the driver keeps the fare,
            you take 8% for the introduction.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/partners/signup"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#FACC15] text-[#0A0A0A] text-[14px] font-extrabold shadow-[0_8px_24px_rgba(250,204,21,0.55)] active:scale-[0.97] transition"
              style={{ minHeight: 48 }}
            >
              Sign up now — free
              <ArrowRight className="w-4 h-4" strokeWidth={3} />
            </Link>
            <a
              href={`https://wa.me/${getSupportWhatsApp()}?text=${encodeURIComponent(
                "Halo, saya mau gabung CityDrivers Partner Program. Bisa info lebih lanjut?",
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white/10 border border-white/25 text-white text-[14px] font-extrabold active:scale-[0.97] transition hover:bg-white/15"
              style={{ minHeight: 48 }}
            >
              <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
              Tanya dulu di WhatsApp
            </a>
          </div>

          <div className="mt-10 pt-6 border-t border-white/10 text-[12px] text-white/45">
            CityDrivers is a directory and profile management tool — not a
            ride-hailing operator. The 8% is a B2B referral commission
            between you and the driver. We never set fares or hold funds.
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
