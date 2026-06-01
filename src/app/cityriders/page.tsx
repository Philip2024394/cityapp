// /cityriders — Customer marketing homepage for CityDrivers.
//
// Single-viewport hero: brand mark + tagline + the 5-way vehicle picker.
// No scroll. Visitors either pick a vehicle, hit "Drive with us" to join,
// or tap the secondary Parcel buttons.

import Link from 'next/link'

// Customer hero pool — rotates daily so the landing doesn't feel static.
// All on-brand: young Indonesian + yellow vehicle imagery against Bali /
// golden-hour backdrops. The original launch hero stays in the pool.
const HERO_POOL: ReadonlyArray<string> = [
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2030,%202026,%2001_51_17%20AM.png',
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2002_59_07%20PM.png?updatedAt=1780214364056',
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2002_56_33%20PM.png?updatedAt=1780214206553',
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2002_55_58%20PM.png?updatedAt=1780214183700',
]

// Daily-seeded pick: stable for every visit within the same UTC day so
// SSR and client hydration agree (no Math.random() at render time), but
// rotates the next day so customers don't see the same image forever.
function dailyHero(): string {
  const now  = new Date()
  const seed = now.getUTCFullYear() * 10000 + (now.getUTCMonth() + 1) * 100 + now.getUTCDate()
  return HERO_POOL[seed % HERO_POOL.length]!
}

const BRAND_LOGO_URL =
  'https://ik.imagekit.io/nepgaxllc/Untitledasdasdaasssdasdasd-removebg-preview.png?updatedAt=1780193517351'

const PAGE_TITLE = 'CityDrivers — Local drivers. Direct WhatsApp. No app needed.'
const PAGE_DESCRIPTION =
  'Find local Indonesian drivers in Yogyakarta, Bali, and Jogja. Tap WhatsApp, agree the fare, get a ride. No app install, no surge pricing.'
const PAGE_URL = 'https://citydrivers.id/cityriders'

export const metadata = {
  title:       PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates:  { canonical: PAGE_URL },
  openGraph: {
    title:       PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    type:        'website',
    url:         PAGE_URL,
    images:      [{ url: HERO_POOL[0]! }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images:      [HERO_POOL[0]!],
  },
}

export default function CityDriversHomePage() {
  const heroUrl = dailyHero()
  return (
    <main
      className="relative h-[100dvh] overflow-hidden text-[#0A0A0A]"
      style={{
        background:
          'radial-gradient(circle at top, #FEF3C7 0%, #F5F5F4 70%, #E7E5E4 100%)',
      }}
    >
      <div className="mx-auto h-full bg-white lg:my-6 lg:max-w-[480px] lg:rounded-[32px] lg:shadow-[0_24px_80px_rgba(10,10,10,0.18)] lg:overflow-hidden">
        <section className="relative h-full">
          <div
            className="relative w-full h-full overflow-hidden"
            style={{ minHeight: 560 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroUrl}
              alt="Young Indonesian holding a phone between a yellow car and a yellow motorbike at golden hour"
              className="absolute inset-0 w-full h-full object-cover object-center"
              loading="eager"
            />

            {/* Top white gradient for brand contrast against sky */}
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 pointer-events-none"
              style={{
                height: 160,
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.90) 0%, rgba(255,255,255,0.50) 55%, rgba(255,255,255,0) 100%)',
              }}
            />
            {/* Bottom dark gradient for headline contrast */}
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
              {/* Header — brand left, Drive-with-us pill right. */}
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

                {/* Two primary CTAs. Vehicle picker lives one screen
                    forward, on /cari, so the customer's first decision is
                    the simpler "what kind of booking" question. */}
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Link
                    href="/cari?mode=ride"
                    className="inline-flex items-center justify-center px-4 py-3.5 rounded-2xl bg-[#FACC15] text-[#0A0A0A] text-[14px] font-extrabold shadow-[0_8px_24px_rgba(250,204,21,0.55)] active:scale-[0.97] transition"
                    style={{ minHeight: 52 }}
                  >
                    Book Ride
                  </Link>
                  <Link
                    href="/cari?mode=parcel"
                    className="inline-flex items-center justify-center px-4 py-3.5 rounded-2xl bg-[#FACC15] text-[#0A0A0A] text-[14px] font-extrabold shadow-[0_8px_24px_rgba(250,204,21,0.55)] active:scale-[0.97] transition"
                    style={{ minHeight: 52 }}
                  >
                    Book Parcel
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

