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

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="relative min-h-[100dvh] flex flex-col"
      style={{
        background:
          'radial-gradient(circle at top, #FFFBEA 0%, #FFFFFF 50%, #F5F5F4 100%)',
        color: '#0A0A0A',
      }}
    >
      <AuthHeader />

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

      <AuthFooter />
    </main>
  )
}

// ----------------------------------------------------------------------------
// Brand header — CityDrivers wordmark on the left ("Ind" + yellow pin SVG +
// "City"). Inline SVG copied from /places/page.tsx so the mark matches
// across the app pixel-for-pixel. Right side intentionally empty: auth
// pages keep the focus on the form, no nav distractions.
// ----------------------------------------------------------------------------
function AuthHeader() {
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
        <Link
          href="/"
          className="inline-flex items-center hover:opacity-85 transition"
          aria-label="CityDrivers home"
        >
          <span
            className="font-black tracking-tight text-[24px] sm:text-[28px] leading-none"
            style={{ color: '#0A0A0A', letterSpacing: '-0.02em' }}
          >
            Ind
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
            City
          </span>
        </Link>
        <div aria-hidden />
      </div>
    </header>
  )
}

// ----------------------------------------------------------------------------
// Footer — muted, centred, three lines. Pipe-separated Terms / Privacy /
// Help links use font-bold charcoal so they read as actionable without
// stealing the form's spotlight. iOS home-indicator safe-area padding so
// the copy never tucks under the gesture bar.
// ----------------------------------------------------------------------------
function AuthFooter() {
  return (
    <footer
      className="pb-safe"
      style={{ borderTop: '1px solid rgba(0,0,0,0.06)', background: 'rgba(255,255,255,0.6)' }}
    >
      <div className="max-w-3xl mx-auto px-4 py-5 text-center space-y-1.5">
        <p className="text-[13px] text-[#71717A] leading-snug">
          Indonesia&apos;s local business directory · citydrivers.id
        </p>
        <p className="text-[13px] leading-snug">
          <Link href="/terms" className="font-bold text-[#0A0A0A] hover:underline">Terms</Link>
          <span className="text-[#A1A1AA] mx-2">|</span>
          <Link href="/privacy" className="font-bold text-[#0A0A0A] hover:underline">Privacy</Link>
          <span className="text-[#A1A1AA] mx-2">|</span>
          <a
            href="mailto:streetlocallive@gmail.com"
            className="font-bold text-[#0A0A0A] hover:underline"
          >
            Help
          </a>
        </p>
        <p className="text-[13px] text-[#71717A] leading-snug">
          © 2026 CityDrivers · PM 12/2019 software directory
        </p>
      </div>
    </footer>
  )
}
