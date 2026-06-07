'use client'
// ============================================================================
// AuthShell — shared light-theme chrome for /login + /signup
// ----------------------------------------------------------------------------
// Replaces the old dark-glass auth surfaces with a production-grade light
// theme matching the redesigned dashboards (white cards, gray #E4E4E7
// borders, yellow #FACC15 accents, charcoal #0A0A0A text).
//
// Layout:
//   [brand header strip]              ← sticky top, CityDrivers wordmark left
//   ─────────────────────────────────
//          [main content card]        ← centred, max-w-md, soft shadow
//   ─────────────────────────────────
//   [footer text + Terms/Privacy/Help]← bottom strip, muted
//
// Background: soft radial gradient from a warm-cream apex into white into
// a faint stone tint, giving the page a premium-but-clean feel without
// stealing focus from the form card.
// ============================================================================
import Link from 'next/link'

type Brand = 'kita2u' | 'citydrivers'

export default function AuthShell({
  children,
  backgroundImage,
  hideHeader,
  solidWhite,
  brand = 'kita2u',
}: {
  children:        React.ReactNode
  /** Optional full-bleed hero image rendered fixed behind the form. The
   *  /signup root uses the bike landing hero; per-vehicle signup flows
   *  set their own. Falls back to the soft radial gradient when null. */
  backgroundImage?: string
  /** Suppresses the white sticky CityDrivers wordmark header. Signup
   *  flows set this so they can paint the landing-style logo + brand
   *  inline over the hero backdrop instead. */
  hideHeader?:      boolean
  /** Paint the page pure white — no image, no gradient. Kita2u signup
   *  uses this for a clean creator-first surface. */
  solidWhite?:      boolean
  /** Which brand chrome to render. Default 'kita2u' — Kita2u is now
   *  the primary brand on this codebase. Pass 'citydrivers' on driver
   *  verticals (signup with ?vertical=rider/car/truck/bus/jeep) and on
   *  the citydrivers.id-hosted CityDrivers landing surfaces. */
  brand?:           Brand
}) {
  return (
    <main
      className="relative min-h-[100dvh] flex flex-col"
      style={{
        background: backgroundImage
          ? undefined
          : (solidWhite
              ? '#FFFFFF'
              : 'radial-gradient(circle at top, #FFFBEA 0%, #FFFFFF 50%, #F5F5F4 100%)'),
        color: '#0A0A0A',
      }}
    >
      {backgroundImage && (
        <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={backgroundImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center"
            loading="eager"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.40) 0%, rgba(255,255,255,0.88) 38%, rgba(255,255,255,0.98) 65%)',
            }}
          />
        </div>
      )}

      <div className="relative z-10 flex flex-col flex-1">
        {!hideHeader && <AuthHeader brand={brand} />}

        {/* Centred content slot — vertically centres the card when the
            viewport has room, but allows scroll on short screens. */}
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full" style={{ maxWidth: 420 }}>
            <div
              className="rounded-3xl bg-white border p-6 sm:p-7"
              style={{
                borderColor: '#E4E4E7',
                boxShadow: '0 12px 32px rgba(15,23,42,0.08)',
              }}
            >
              {children}
            </div>
          </div>
        </div>

        <AuthFooter brand={brand} />
      </div>
    </main>
  )
}

// ----------------------------------------------------------------------------
// Brand header — wordmark, brand-aware. CityDrivers gets the "City" +
// yellow-pin + "Drivers" mark; Kita2u gets the "Kita" + yellow "2u"
// wordmark matching the landing. Right side intentionally empty — auth
// pages keep the focus on the form, no nav distractions.
// ----------------------------------------------------------------------------
function AuthHeader({ brand }: { brand: Brand }) {
  return (
    <header
      className="sticky top-0 z-40 pt-safe"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
        {brand === 'kita2u' ? (
          <Link
            href="/"
            className="inline-flex items-center hover:opacity-85 transition"
            aria-label="Kita2u home"
          >
            <span
              className="font-black tracking-tight text-[24px] sm:text-[28px] leading-none"
              style={{ color: '#0A0A0A', letterSpacing: '-0.02em' }}
            >
              Kita
            </span>
            <span
              className="font-black tracking-tight text-[24px] sm:text-[28px] leading-none"
              style={{ color: '#FACC15', letterSpacing: '-0.02em' }}
            >
              2u
            </span>
          </Link>
        ) : (
          <Link
            href="/cityriders"
            className="inline-flex items-center hover:opacity-85 transition"
            aria-label="CityDrivers home"
          >
            <span
              className="font-black tracking-tight text-[24px] sm:text-[28px] leading-none"
              style={{ color: '#0A0A0A', letterSpacing: '-0.02em' }}
            >
              City
            </span>
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              className="w-[20px] h-[20px] sm:w-[24px] sm:h-[24px] mx-[1px] translate-y-[3px]"
            >
              <path
                d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"
                fill="#FACC15"
              />
              <circle cx="12" cy="10" r="3" fill="#FFFFFF" />
            </svg>
            <span
              className="font-black tracking-tight text-[24px] sm:text-[28px] leading-none"
              style={{ color: '#0A0A0A', letterSpacing: '-0.02em' }}
            >
              Drivers
            </span>
          </Link>
        )}
        <div aria-hidden />
      </div>
    </header>
  )
}

// ----------------------------------------------------------------------------
// Footer — muted, centred, three lines, brand-aware. Kita2u variant
// drops every driver / "local business directory" / "PM 12/2019" string.
// Help link routes to /contact for both brands so we don't leak the
// CityDrivers / StreetLocal inboxes onto Kita2u creator surfaces.
// ----------------------------------------------------------------------------
function AuthFooter({ brand }: { brand: Brand }) {
  const isKita2u = brand === 'kita2u'
  return (
    <footer
      className="pb-safe"
      style={{ borderTop: '1px solid rgba(0,0,0,0.06)', background: 'rgba(255,255,255,0.6)' }}
    >
      <div className="max-w-3xl mx-auto px-4 py-5 text-center space-y-1.5">
        <p className="text-[13px] text-[#71717A] leading-snug">
          {isKita2u
            ? 'Built for creators worldwide · kita2u.com'
            : "Indonesia's local business directory · citydrivers.id"}
        </p>
        <p className="text-[13px] leading-snug">
          <Link href="/terms" className="font-bold text-[#0A0A0A] hover:underline">Terms</Link>
          <span className="text-[#A1A1AA] mx-2">|</span>
          <Link href="/privacy" className="font-bold text-[#0A0A0A] hover:underline">Privacy</Link>
          <span className="text-[#A1A1AA] mx-2">|</span>
          <Link href="/contact" className="font-bold text-[#0A0A0A] hover:underline">Help</Link>
        </p>
        <p className="text-[13px] text-[#71717A] leading-snug">
          {isKita2u
            ? '© 2026 Kita2u · Creator marketplace'
            : '© 2026 CityDrivers · PM 12/2019 software directory'}
        </p>
      </div>
    </footer>
  )
}
