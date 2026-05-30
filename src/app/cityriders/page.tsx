// /cityriders — Customer marketing homepage for CityRiders.
//
// This is the cold-traffic front door. Someone clicking a CityRiders
// share-link or seeing an ad lands here, learns what CityRiders is, and
// routes to either /cari (find a driver now) or /drivers (become one).
//
// Sibling pages:
//   /drivers      — bike driver recruitment
//   /drivers/car  — car driver recruitment
//   /cari         — transactional customer booking
//
// Same mobile-only + desktop phone-frame architecture as the driver
// landings so the three pages read as one brand family.
//
// ─── HERO ART BRIEF (paste into Midjourney / DALL-E / etc.) ──────────
// "modern flat illustration with subtle 3D depth, young Indonesian
//  woman (or family) holding a phone at golden hour on a Yogyakarta
//  street, looking at the phone with a calm smile, a CityRiders motor-
//  bike driver visible in soft focus in the background on a yellow
//  scooter, traditional Javanese gate and frangipani tree in the
//  atmospheric backdrop, gunung silhouette in distance, color palette
//  strictly #FACC15 yellow #0A0A0A ink #FFFBEA cream #F59E0B warm sun,
//  NO green NO Grab NO Gojek branding, Linear / Cal.com illustration
//  style, clean line work, soft shadows, optimistic 'a friendly local
//  ride is one tap away' mood, 30% empty space at the top for headline
//  text overlay when used, portrait 531x767 to match the driver heroes,
//  --ar 531:767 --style raw --v 6"
// ─────────────────────────────────────────────────────────────────────

import Link from 'next/link'
import {
  ArrowRight, MessageCircle, Search, Smartphone, Wallet,
  ShieldCheck, Sparkles, Bike, Car,
} from 'lucide-react'

// Customer hero — young Indonesian man between a yellow car and a
// yellow motorbike at golden hour with a Bali gate backdrop. Signals
// "both vehicle types available, ready to book."
const HERO_URL =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2030,%202026,%2001_51_17%20AM.png'

const BRAND_LOGO_URL =
  'https://ik.imagekit.io/nepgaxllc/Untitleddasdasdasasd-removebg-preview.png?updatedAt=1779015947714'

// CTA icon art — bespoke transparent PNGs that replace the Lucide
// UserRound / Package icons in the Book a ride + Book a parcel buttons.
// Render as plain <img> (no next/image) — matches the existing pattern
// used by BRAND_LOGO_URL / HERO_URL on this page.
const RIDE_CTA_ART_URL =
  'https://ik.imagekit.io/nepgaxllc/asdasasasdd-removebg-preview.png?updatedAt=1780110194990'
const PARCEL_CTA_ART_URL =
  'https://ik.imagekit.io/nepgaxllc/asdasasasddasdasddasd-removebg-preview.png'
const B2B_CTA_ART_URL =
  'https://ik.imagekit.io/nepgaxllc/asdasasasddasdasddasdasdasd-removebg-preview.png'

// Customer support WhatsApp line — same as driver-side for now.
const WA_HELP = '6281234567890'

export const metadata = {
  title: 'CityRiders — Local drivers. Direct WhatsApp. No app needed.',
  description:
    'Find local Indonesian drivers in Yogyakarta, Bali, and Jogja. Tap WhatsApp, agree the fare, get a ride. No app install, no surge pricing.',
}

export default function CityRidersHomePage() {
  return (
    <main
      className="relative min-h-[100dvh] text-[#0A0A0A]"
      style={{
        background:
          'radial-gradient(circle at top, #FEF3C7 0%, #F5F5F4 70%, #E7E5E4 100%)',
      }}
    >
      <div className="mx-auto bg-white lg:my-6 lg:max-w-[480px] lg:rounded-[32px] lg:shadow-[0_24px_80px_rgba(10,10,10,0.18)] lg:overflow-hidden">

        {/* ─── Hero ────────────────────────────────────────────────── */}
        <section className="relative">
          <div
            className="relative w-full overflow-hidden"
            style={{ height: '100dvh', minHeight: 560 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HERO_URL}
              alt="Young Indonesian holding a phone between a yellow car and a yellow motorbike at golden hour"
              className="absolute inset-0 w-full h-full object-cover object-center"
              loading="eager"
            />

            {/* Top white gradient for brand contrast against sky */}
            <div
              aria-hidden
              className="absolute inset-x-0 top-0"
              style={{
                height: 160,
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.90) 0%, rgba(255,255,255,0.50) 55%, rgba(255,255,255,0) 100%)',
              }}
            />
            {/* Bottom dark gradient for headline contrast */}
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0"
              style={{
                height: '55%',
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.95) 100%)',
              }}
            />

            <div className="absolute inset-0 z-10 flex flex-col">
              {/* Header — brand left only; this IS the brand homepage so
                  no nav switcher on the right. */}
              <header
                className="shrink-0 flex items-center justify-between gap-2 px-3 pb-2"
                style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 32px)' }}
              >
                <Link
                  href="/cityriders"
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
                  Drive with us →
                </Link>
              </header>

              <div className="flex-1 min-h-0" aria-hidden />

              <div
                className="shrink-0 px-5 pt-6"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 40px)' }}
              >
                <h1 className="text-[26px] xs:text-[28px] sm:text-[32px] font-black leading-[1.08] tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]">
                  Book a ride.<br />
                  <span style={{ color: '#FACC15' }}>Talk to your driver.</span>
                </h1>
                <p className="mt-1 text-[14px] font-extrabold text-white/95 leading-tight">
                  Pesan kendaraan. <span style={{ color: '#FACC15' }}>Chat driver Anda.</span>
                </p>
                <p className="mt-3 text-[12.5px] text-white/85 leading-relaxed">
                  Find a local driver, tap WhatsApp, agree the fare.
                  <br />
                  <span className="text-white/75">
                    Cari driver lokal, klik WhatsApp, sepakat harga. Tanpa aplikasi.
                  </span>
                </p>

                {/* Mode CTAs — Ride, Parcel, Parcel Business. Book a ride
                    is leftmost; every button uses a horizontal layout with
                    the label on the left and the art flush against the
                    right edge of the button. */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Link
                    href="/cari?mode=ride&service=car"
                    className="inline-flex items-center justify-between gap-1 pl-3 pr-0 py-2 rounded-2xl bg-[#FACC15] text-[#0A0A0A] text-[12px] font-extrabold shadow-[0_8px_24px_rgba(250,204,21,0.55)] active:scale-[0.97] transition overflow-hidden"
                    style={{ minHeight: 80 }}
                  >
                    <span className="leading-tight">Book Ride</span>
                    <img
                      src={RIDE_CTA_ART_URL}
                      alt=""
                      aria-hidden
                      className="h-14 w-auto object-contain shrink-0"
                      loading="eager"
                    />
                  </Link>
                  <Link
                    href="/cari?mode=parcel&service=person"
                    className="inline-flex items-center justify-between gap-1 pl-3 pr-0 py-2 rounded-2xl bg-[#FACC15] text-[#0A0A0A] text-[12px] font-extrabold shadow-[0_8px_24px_rgba(250,204,21,0.55)] active:scale-[0.97] transition overflow-hidden"
                    style={{ minHeight: 80 }}
                  >
                    <span className="leading-tight">Book Parcel</span>
                    <img
                      src={PARCEL_CTA_ART_URL}
                      alt=""
                      aria-hidden
                      className="h-14 w-auto object-contain shrink-0"
                      loading="eager"
                    />
                  </Link>
                  <Link
                    href="/cityriders/parcel"
                    className="inline-flex items-center justify-between gap-1 pl-3 pr-0 py-2 rounded-2xl bg-[#FACC15] text-[#0A0A0A] text-[12px] font-extrabold shadow-[0_8px_24px_rgba(250,204,21,0.55)] active:scale-[0.97] transition overflow-hidden"
                    style={{ minHeight: 80 }}
                  >
                    <span className="leading-tight">Parcel Business</span>
                    <img
                      src={B2B_CTA_ART_URL}
                      alt=""
                      aria-hidden
                      className="h-14 w-auto object-contain shrink-0"
                      loading="eager"
                    />
                  </Link>
                </div>

                {/* No WhatsApp CTA here — the homepage funnels customers
                    to /cari where they pick a specific driver. The next
                    WhatsApp tap is to THAT driver, not to us. If a
                    customer needs platform help, a small support link
                    lives in the footer disclaimer. */}
              </div>
            </div>
          </div>
        </section>

        {/* ─── How it works ───────────────────────────────────────── */}
        <section className="px-5 py-12">
          <div className="text-center mb-10">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#EAB308] mb-2">
              How it works
            </div>
            <h2 className="text-[24px] sm:text-[32px] font-black leading-tight">
              Three steps. No app install.
            </h2>
            <p className="mt-3 text-[14px] text-black/65 max-w-xl mx-auto">
              CityRiders is a directory of independent drivers. We help you
              find them; the driver handles the ride and the payment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <Step n={1} icon={<Search className="w-5 h-5" strokeWidth={2.5} />} title="Find a driver">
              Set your pick-up and drop-off. See drivers nearby with their
              rates, ratings, and vehicle.
            </Step>
            <Step n={2} icon={<MessageCircle className="w-5 h-5" strokeWidth={2.5} />} title="Tap WhatsApp">
              You message the driver directly. Agree pickup time and the
              fare. No middleman.
            </Step>
            <Step n={3} icon={<Wallet className="w-5 h-5" strokeWidth={2.5} />} title="Ride &amp; pay direct">
              The driver picks you up. You pay them cash, QR, or transfer
              when the ride ends. CityRiders never touches the money.
            </Step>
          </div>
        </section>

        {/* ─── Why CityRiders ─────────────────────────────────────── */}
        <section className="bg-[#FFFBEA] border-y border-[#FACC15]/30">
          <div className="px-5 py-12">
            <div className="text-center mb-10">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#EAB308] mb-2">
                Why CityRiders
              </div>
              <h2 className="text-[24px] sm:text-[32px] font-black leading-tight">
                Real drivers, real prices, no app.
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Differentiator
                icon={<Smartphone className="w-5 h-5" strokeWidth={2.5} />}
                title="No app to install"
                body="The whole flow runs in WhatsApp. No download, no signup, no account."
              />
              <Differentiator
                icon={<MessageCircle className="w-5 h-5" strokeWidth={2.5} />}
                title="Talk to a human"
                body="You message the driver directly. Confirm details, ask questions, build a regular relationship."
              />
              <Differentiator
                icon={<ShieldCheck className="w-5 h-5" strokeWidth={2.5} />}
                title="No surge pricing"
                body="Drivers set their own rates and stick to them. No algorithm raising the price at rush hour."
              />
              <Differentiator
                icon={<Sparkles className="w-5 h-5" strokeWidth={2.5} />}
                title="Same driver next time"
                body="Save their WhatsApp. Next ride, message them directly — no need to search again."
              />
            </div>
          </div>
        </section>

        {/* ─── What's on CityRiders ───────────────────────────────── */}
        <section className="px-5 py-12">
          <div className="text-center mb-10">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#EAB308] mb-2">
              What you&apos;ll find
            </div>
            <h2 className="text-[24px] sm:text-[32px] font-black leading-tight">
              Bikes, cars, and more.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ServiceTile
              icon={<Bike className="w-5 h-5" strokeWidth={2.5} />}
              title="Motorbike rides (ojek)"
              body="Fast intra-city, parcel delivery, single passenger. Tarif per km."
            />
            <ServiceTile
              icon={<Car className="w-5 h-5" strokeWidth={2.5} />}
              title="Car rides &amp; rentals"
              body="Airport transfers, family trips, daily rental with or without driver, tours."
            />
          </div>
        </section>

        {/* ─── Final CTA + WA footer ──────────────────────────────── */}
        <section className="bg-[#0A0A0A] text-white">
          <div className="px-5 py-12 text-center">
            <h2 className="text-[24px] sm:text-[32px] font-black leading-tight">
              Need a ride right now?
            </h2>
            <p className="mt-3 text-[14px] sm:text-[16px] text-white/70 max-w-xl mx-auto">
              Pick a driver in your area, message them on WhatsApp, and
              you&apos;re on your way. No app install, no account.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
              <Link
                href="/cari"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#FACC15] text-[#0A0A0A] text-[14px] font-extrabold shadow-[0_8px_24px_rgba(250,204,21,0.55)] active:scale-[0.97] transition"
                style={{ minHeight: 48 }}
              >
                <Search className="w-4 h-4" strokeWidth={3} />
                Find a driver now
              </Link>
              <Link
                href="/drivers"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white/10 border border-white/25 text-white text-[14px] font-extrabold active:scale-[0.97] transition hover:bg-white/15"
                style={{ minHeight: 48 }}
              >
                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                Become a driver instead
              </Link>
            </div>

            <div className="mt-10 pt-6 border-t border-white/10 text-[12px] text-white/45 space-y-2">
              <p>
                CityRiders is a directory and profile management tool — not a
                ride-hailing app. Drivers and customers transact directly,
                off-platform.
              </p>
              <p>
                <a
                  href={`https://wa.me/${WA_HELP}?text=${encodeURIComponent(
                    'Hi, I need help with CityRiders.',
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-offset-2 hover:underline text-white/65 hover:text-white/85 transition"
                >
                  Need help? WhatsApp customer support · Bantuan? WhatsApp kami
                </a>
              </p>
            </div>
          </div>
        </section>

      </div>
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

function ServiceTile({
  icon, title, body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="rounded-2xl bg-white border border-black/10 p-5 hover:border-[#FACC15] hover:shadow-[0_8px_24px_rgba(250,204,21,0.18)] transition">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{ background: '#FACC15', color: '#0A0A0A' }}
      >
        {icon}
      </div>
      <h3 className="text-[15px] font-black leading-tight">{title}</h3>
      <p className="mt-2 text-[13px] text-black/65 leading-relaxed">{body}</p>
    </div>
  )
}
