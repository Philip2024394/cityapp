'use client'
// ============================================================================
// FreeThemeRenderer — single client component that renders any of the
// 15 Free-tier templates from a { theme, profile } pair.
// ----------------------------------------------------------------------------
// Founder direction 2026-06-09: this is the founder's biggest visual
// investment yet — Free tier becomes 15 distinct one-page templates.
//
// Content rule (apply across EVERY theme): each Free page renders ONLY:
//   - profile photo
//   - display name
//   - bio
//   - WhatsApp CTA
//   - unlimited link buttons
//   - social icons row
//   - "Made with Kita2u" badge footer
// NO portfolio / services / before-after / QRIS / reviews — those stay
// behind Pro (the 23 vertical templates already shipping).
//
// Animation rule: all CSS animations honour
//   @media (prefers-reduced-motion: reduce) { animation: none !important; }
// at the bottom of the <style jsx> block.
//
// Performance rule: animations use `transform` and `opacity` only — no
// layout-thrashing properties.
//
// Bundle rule: no new npm deps. Pure React + Tailwind + lucide-react.
//
// Build status (per spec):
//   FULLY rendered:
//     - minimalist-mono (centered / flat / underline / serif / none)
//     - pastel-bloom    (centered / paper / pill / sans / petals-falling)
//     - neon-pulse      (centered / neon / outline / mono / heartbeat-socials)
//     - bento-studio    (bento    / flat / filled / sans / breathing-tiles)
//     - donut-dance     (centered / flat / pill / sans / dancing-donut)
//   STUB (falls back to minimalist-mono + "coming soon" banner):
//     - marble-editorial, tropical-bali, brutalist-block, glassmorphism,
//       vintage-paper, bubble-pop, magazine-grid, geometric-confetti,
//       watercolor-wash, cyberpunk-glitch
//
// TODO (founder priority order):
//   - TODO: build theme tropical-bali     (leaves-sway SVG + warm sunset)
//   - TODO: build theme glassmorphism     (backdrop-filter cards)
//   - TODO: build theme bubble-pop        (8 floating circle layer)
//   - TODO: build theme brutalist-block   (chunky borders + wobble-hover)
//   - TODO: build theme marble-editorial  (serif column + ink-bleed mask)
//   - TODO: build theme magazine-grid     (3-col grid + chips)
//   - TODO: build theme cyberpunk-glitch  (clip-path RGB-split avatar)
//   - TODO: build theme vintage-paper     (sepia + paper-curl corner)
//   - TODO: build theme geometric-confetti (8 drifting polygons)
//   - TODO: build theme watercolor-wash   (ink-bleed serif)
// ============================================================================

import React from 'react'
import {
  Instagram, Music2, Facebook, Youtube, Mail, MessageCircle,
} from 'lucide-react'
import {
  type FreeTheme, type FreeProfile, isThemeFullyRendered,
} from '@/lib/free-themes/library'
import MadeWithKita2uBadge from '@/components/branding/MadeWithKita2uBadge'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function fontClass(family: FreeTheme['fontFamily']): string {
  switch (family) {
    case 'serif':   return 'font-serif'
    case 'mono':    return 'font-mono'
    case 'display': return 'font-black tracking-tight'
    case 'sans':
    default:        return 'font-sans'
  }
}

function waHref(e164: string | null | undefined, displayName: string): string {
  if (!e164) return '#'
  const digits = e164.replace(/[^\d]/g, '')
  const text = encodeURIComponent(`Hi ${displayName}, I found you on Kita2u`)
  return `https://wa.me/${digits}?text=${text}`
}

// Lightweight X (Twitter) glyph since lucide doesn't ship one.
function XIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M18.244 2H21l-6.51 7.44L22 22h-6.91l-4.82-6.3L4.53 22H1.77l6.96-7.96L2 2h7.07l4.36 5.77L18.244 2zm-2.42 18h1.86L7.27 4H5.3l10.524 16z" />
    </svg>
  )
}

function SocialsRow({
  socials,
  iconClass = 'w-5 h-5',
  containerClass = 'flex items-center justify-center gap-4',
  animated = false,
}: {
  socials: FreeProfile['socials']
  iconClass?: string
  containerClass?: string
  /** when true, wraps each icon in a span tagged `ft-heart` so the
   *  heartbeat-socials animation can target them. */
  animated?: boolean
}) {
  const items: Array<{ key: string; href: string; node: React.ReactNode }> = []
  if (socials.instagram) items.push({ key: 'ig', href: socials.instagram.startsWith('http') ? socials.instagram : `https://instagram.com/${socials.instagram.replace(/^@/, '')}`, node: <Instagram className={iconClass} strokeWidth={2} /> })
  if (socials.tiktok)    items.push({ key: 'tt', href: socials.tiktok.startsWith('http')    ? socials.tiktok    : `https://tiktok.com/@${socials.tiktok.replace(/^@/, '')}`,   node: <Music2 className={iconClass}    strokeWidth={2} /> })
  if (socials.facebook)  items.push({ key: 'fb', href: socials.facebook.startsWith('http')  ? socials.facebook  : `https://facebook.com/${socials.facebook}`,                 node: <Facebook className={iconClass}  strokeWidth={2} /> })
  if (socials.youtube)   items.push({ key: 'yt', href: socials.youtube.startsWith('http')   ? socials.youtube   : `https://youtube.com/@${socials.youtube.replace(/^@/, '')}`, node: <Youtube className={iconClass}   strokeWidth={2} /> })
  if (socials.x)         items.push({ key: 'x',  href: socials.x.startsWith('http')         ? socials.x         : `https://x.com/${socials.x.replace(/^@/, '')}`,             node: <XIcon className={iconClass} /> })
  if (socials.email)     items.push({ key: 'em', href: `mailto:${socials.email}`, node: <Mail className={iconClass} strokeWidth={2} /> })
  if (!items.length) return null
  return (
    <div className={containerClass}>
      {items.map((it) => (
        <a
          key={it.key}
          href={it.href}
          target="_blank"
          rel="noopener noreferrer"
          className={animated ? 'ft-heart inline-flex' : 'inline-flex'}
          aria-label={it.key}
        >
          {it.node}
        </a>
      ))}
    </div>
  )
}

function Avatar({
  url, alt, size = 'lg',
}: { url: string | null; alt: string; size?: 'sm' | 'lg' }) {
  const sz = size === 'lg' ? 'w-28 h-28 sm:w-32 sm:h-32' : 'w-20 h-20'
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={alt}
        className={`${sz} rounded-full object-cover border-4 border-white shadow-[0_6px_22px_rgba(0,0,0,0.18)]`}
      />
    )
  }
  const initial = (alt || '?').trim().charAt(0).toUpperCase()
  return (
    <div className={`${sz} rounded-full flex items-center justify-center text-3xl font-black bg-gray-200 text-gray-500 border-4 border-white shadow-[0_6px_22px_rgba(0,0,0,0.18)]`}>
      {initial}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Theme renderers
// ---------------------------------------------------------------------------

function MinimalistMono({ profile }: { profile: FreeProfile }) {
  // Pure typography. Black on white. Underline-only link affordance.
  const brand = profile.brand_color || '#0A0A0A'
  return (
    <div className="min-h-[100dvh] w-full" style={{ background: profile.page_background_image_url ? `url("${profile.page_background_image_url}") center/cover` : '#FFFFFF' }}>
      <div className="min-h-[100dvh] w-full" style={{ background: profile.page_background_image_url ? 'rgba(255,255,255,0.88)' : 'transparent' }}>
        <main className={`max-w-md mx-auto px-6 py-12 font-serif text-[#0A0A0A] flex flex-col items-center text-center gap-6`}>
          <Avatar url={profile.profile_image_url} alt={profile.display_name} />
          <h1 className="text-[28px] sm:text-[32px] font-black leading-tight" style={{ color: brand }}>
            {profile.display_name}
          </h1>
          {profile.show_url_under_avatar && (
            <div className="text-[12px] uppercase tracking-[0.2em] text-gray-500 -mt-3">
              kita2u.com/{profile.slug}
            </div>
          )}
          {profile.bio && (
            <p className="text-[15px] leading-relaxed text-gray-700 max-w-sm">{profile.bio}</p>
          )}
          {profile.whatsapp_e164 && (
            <a
              href={waHref(profile.whatsapp_e164, profile.display_name)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[15px] font-bold underline underline-offset-4 decoration-2"
              style={{ color: brand }}
            >
              <MessageCircle className="w-4 h-4" strokeWidth={2.5} /> WhatsApp
            </a>
          )}
          <div className="w-full flex flex-col items-stretch gap-3 pt-2">
            {profile.links.map((ln, i) => (
              <a
                key={i}
                href={ln.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center py-3 text-[15px] font-bold underline underline-offset-4 decoration-2 hover:opacity-70 transition"
                style={{ color: brand }}
              >
                {ln.title}
              </a>
            ))}
          </div>
          <SocialsRow socials={profile.socials} containerClass="flex items-center justify-center gap-5 pt-2" />
          <div className="pt-6">
            <MadeWithKita2uBadge plan="free" />
          </div>
        </main>
      </div>
    </div>
  )
}

function PastelBloom({ profile }: { profile: FreeProfile }) {
  // Paper cards on pink. Falling petals.
  const brand = profile.brand_color || '#EC4899'
  const btnTxt = profile.button_text_color || '#FFFFFF'
  return (
    <div className="min-h-[100dvh] w-full relative overflow-hidden" style={{ background: profile.page_background_image_url ? `url("${profile.page_background_image_url}") center/cover` : '#FCE7F3' }}>
      {/* Petals layer — 8 ❀ glyphs falling from top, staggered. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={i}
            className="ft-petal absolute text-[20px]"
            style={{
              left: `${(i * 12 + 5) % 100}%`,
              top: '-10%',
              animationDelay: `${i * 0.7}s`,
              color: brand,
            }}
          >
            ❀
          </span>
        ))}
      </div>
      <main className={`relative z-10 max-w-md mx-auto px-6 py-12 ${fontClass('sans')} text-[#0A0A0A] flex flex-col items-center text-center gap-5`}>
        <Avatar url={profile.profile_image_url} alt={profile.display_name} />
        <h1 className="text-[26px] font-extrabold">{profile.display_name}</h1>
        {profile.bio && (
          <p className="text-[14px] leading-relaxed text-gray-700 max-w-sm">{profile.bio}</p>
        )}
        {profile.whatsapp_e164 && (
          <a
            href={waHref(profile.whatsapp_e164, profile.display_name)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-[14px] font-extrabold shadow-[0_6px_18px_rgba(236,72,153,0.35)] transition active:scale-95"
            style={{ background: brand, color: btnTxt }}
          >
            <MessageCircle className="w-4 h-4" strokeWidth={2.5} /> Chat on WhatsApp
          </a>
        )}
        <div className="w-full flex flex-col gap-3 pt-2">
          {profile.links.map((ln, i) => (
            <a
              key={i}
              href={ln.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block py-3.5 rounded-full text-center text-[14px] font-extrabold border bg-white/80 backdrop-blur shadow-[0_2px_10px_rgba(0,0,0,0.06)] hover:scale-[1.01] transition"
              style={{ borderColor: brand, color: brand }}
            >
              {ln.title}
            </a>
          ))}
        </div>
        <SocialsRow socials={profile.socials} containerClass="flex items-center justify-center gap-5 pt-3" />
        <div className="pt-4">
          <MadeWithKita2uBadge plan="free" />
        </div>
      </main>
      <style jsx>{`
        @keyframes ft-fall {
          0%   { transform: translateY(0) rotate(0deg);   opacity: 0; }
          10%  { opacity: 0.7; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
        }
        .ft-petal {
          animation: ft-fall 9s linear infinite;
          will-change: transform, opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .ft-petal { animation: none !important; opacity: 0 !important; }
        }
      `}</style>
    </div>
  )
}

function NeonPulse({ profile }: { profile: FreeProfile }) {
  // Dark canvas, neon outlines, heartbeat-pulse on the socials row.
  const brand = profile.brand_color || '#00FF88'
  return (
    <div className="min-h-[100dvh] w-full" style={{ background: profile.page_background_image_url ? `url("${profile.page_background_image_url}") center/cover` : '#0A0A0A' }}>
      <div className="min-h-[100dvh] w-full" style={{ background: profile.page_background_image_url ? 'rgba(10,10,10,0.85)' : 'transparent' }}>
        <main className={`max-w-md mx-auto px-6 py-12 ${fontClass('mono')} text-white flex flex-col items-center text-center gap-5`}>
          <Avatar url={profile.profile_image_url} alt={profile.display_name} />
          <h1 className="text-[28px] font-black uppercase tracking-widest" style={{ color: brand, textShadow: `0 0 14px ${brand}` }}>
            {profile.display_name}
          </h1>
          {profile.bio && (
            <p className="text-[13px] leading-relaxed text-gray-300 max-w-sm uppercase tracking-wider">{profile.bio}</p>
          )}
          {profile.whatsapp_e164 && (
            <a
              href={waHref(profile.whatsapp_e164, profile.display_name)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md text-[13px] font-bold uppercase tracking-widest transition active:scale-95"
              style={{ border: `2px solid ${brand}`, color: brand, boxShadow: `0 0 14px ${brand}55, inset 0 0 14px ${brand}22` }}
            >
              <MessageCircle className="w-4 h-4" strokeWidth={2.5} /> WhatsApp
            </a>
          )}
          <div className="w-full flex flex-col gap-3 pt-2">
            {profile.links.map((ln, i) => (
              <a
                key={i}
                href={ln.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block py-3.5 rounded-md text-center text-[13px] font-bold uppercase tracking-widest transition hover:scale-[1.01]"
                style={{ border: `1.5px solid ${brand}`, color: brand, boxShadow: `0 0 8px ${brand}33` }}
              >
                {ln.title}
              </a>
            ))}
          </div>
          <SocialsRow socials={profile.socials} animated containerClass="flex items-center justify-center gap-5 pt-3" />
          <div className="pt-4">
            <MadeWithKita2uBadge plan="free" />
          </div>
        </main>
      </div>
      <style jsx global>{`
        @keyframes ft-heartbeat {
          0%, 100% { transform: scale(1.0); }
          25%      { transform: scale(1.10); }
          50%      { transform: scale(1.0); }
          75%      { transform: scale(1.05); }
        }
        .ft-heart { animation: ft-heartbeat 1.5s ease-in-out infinite; will-change: transform; display: inline-flex; }
        @media (prefers-reduced-motion: reduce) {
          .ft-heart { animation: none !important; }
        }
      `}</style>
    </div>
  )
}

function BentoStudio({ profile }: { profile: FreeProfile }) {
  // Grid-first: 2-col bento tiles. Each tile breathes gently.
  const brand = profile.brand_color || '#0A0A0A'
  const btnTxt = profile.button_text_color || '#FFFFFF'
  // Pair-alternate the animation delay so adjacent tiles inhale on
  // opposite phases — feels more alive than every tile pulsing in sync.
  return (
    <div className="min-h-[100dvh] w-full" style={{ background: profile.page_background_image_url ? `url("${profile.page_background_image_url}") center/cover` : '#F5F5F4' }}>
      <main className={`max-w-2xl mx-auto px-5 py-10 ${fontClass('sans')} text-[#0A0A0A]`}>
        {/* Hero tile spans both columns. */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 ft-tile rounded-3xl bg-white p-6 flex items-center gap-5 shadow-[0_4px_18px_rgba(0,0,0,0.06)]">
            <Avatar url={profile.profile_image_url} alt={profile.display_name} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="text-[22px] font-black leading-tight">{profile.display_name}</div>
              {profile.bio && <p className="text-[13px] text-gray-600 leading-snug mt-1 line-clamp-2">{profile.bio}</p>}
            </div>
          </div>

          {/* WhatsApp full-width tile. */}
          {profile.whatsapp_e164 && (
            <a
              href={waHref(profile.whatsapp_e164, profile.display_name)}
              target="_blank"
              rel="noopener noreferrer"
              className="col-span-2 ft-tile rounded-3xl p-5 flex items-center justify-center gap-2 text-[14px] font-extrabold shadow-[0_4px_18px_rgba(0,0,0,0.06)] active:scale-[0.99] transition"
              style={{ background: brand, color: btnTxt, animationDelay: '0.3s' }}
            >
              <MessageCircle className="w-5 h-5" strokeWidth={2.5} /> Chat on WhatsApp
            </a>
          )}

          {/* Links as alternating-width tiles. */}
          {profile.links.map((ln, i) => (
            <a
              key={i}
              href={ln.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${i % 3 === 0 ? 'col-span-2' : 'col-span-1'} ft-tile rounded-3xl bg-white p-5 flex items-center justify-center text-center text-[13.5px] font-extrabold shadow-[0_4px_18px_rgba(0,0,0,0.06)] hover:bg-gray-50 transition`}
              style={{ animationDelay: `${0.6 + i * 0.15}s`, color: brand }}
            >
              {ln.title}
            </a>
          ))}

          {/* Socials tile — full width footer. */}
          <div className="col-span-2 ft-tile rounded-3xl bg-white p-5 shadow-[0_4px_18px_rgba(0,0,0,0.06)] flex flex-col items-center gap-3" style={{ animationDelay: '1.5s' }}>
            <SocialsRow socials={profile.socials} containerClass="flex items-center justify-center gap-5" />
            <MadeWithKita2uBadge plan="free" />
          </div>
        </div>
      </main>
      <style jsx>{`
        @keyframes ft-breathe {
          0%, 100% { transform: scale(1.0); }
          50%      { transform: scale(1.02); }
        }
        .ft-tile {
          animation: ft-breathe 3s ease-in-out infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .ft-tile { animation: none !important; }
        }
      `}</style>
    </div>
  )
}

function DonutDance({ profile }: { profile: FreeProfile }) {
  // Playful yellow page. A 🍩 emoji dances at bottom-left.
  const brand = profile.brand_color || '#FACC15'
  const btnTxt = profile.button_text_color || '#0A0A0A'
  return (
    <div className="min-h-[100dvh] w-full relative overflow-hidden" style={{ background: profile.page_background_image_url ? `url("${profile.page_background_image_url}") center/cover` : '#FFFBEB' }}>
      <span aria-hidden className="ft-donut absolute text-[64px] sm:text-[80px] left-2 bottom-2 select-none pointer-events-none">
        🍩
      </span>
      <main className={`relative z-10 max-w-md mx-auto px-6 py-12 ${fontClass('sans')} text-[#0A0A0A] flex flex-col items-center text-center gap-5`}>
        <Avatar url={profile.profile_image_url} alt={profile.display_name} />
        <h1 className="text-[28px] font-black leading-tight">{profile.display_name}</h1>
        {profile.bio && (
          <p className="text-[14px] leading-relaxed text-gray-700 max-w-sm">{profile.bio}</p>
        )}
        {profile.whatsapp_e164 && (
          <a
            href={waHref(profile.whatsapp_e164, profile.display_name)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-[14px] font-extrabold shadow-[0_6px_18px_rgba(250,204,21,0.45)] transition active:scale-95"
            style={{ background: brand, color: btnTxt }}
          >
            <MessageCircle className="w-4 h-4" strokeWidth={2.5} /> WhatsApp
          </a>
        )}
        <div className="w-full flex flex-col gap-3 pt-2">
          {profile.links.map((ln, i) => (
            <a
              key={i}
              href={ln.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block py-3.5 rounded-full text-center text-[14px] font-extrabold bg-white border-2 hover:scale-[1.01] transition shadow-[0_2px_10px_rgba(0,0,0,0.05)]"
              style={{ borderColor: brand, color: '#0A0A0A' }}
            >
              {ln.title}
            </a>
          ))}
        </div>
        <SocialsRow socials={profile.socials} containerClass="flex items-center justify-center gap-5 pt-2" />
        <div className="pt-4">
          <MadeWithKita2uBadge plan="free" />
        </div>
      </main>
      <style jsx>{`
        @keyframes ft-dance {
          0%   { transform: translate(0, 0)      rotate(-8deg); }
          25%  { transform: translate(8px, -10px) rotate(4deg); }
          50%  { transform: translate(-4px, 6px)  rotate(-6deg); }
          75%  { transform: translate(10px, -4px) rotate(8deg); }
          100% { transform: translate(0, 0)      rotate(-8deg); }
        }
        .ft-donut {
          animation: ft-dance 4s ease-in-out infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .ft-donut { animation: none !important; }
        }
      `}</style>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stub fallback — used for the 10 themes not yet built. Renders
// Minimalist Mono with a slim "Theme arrives next week — using Minimalist
// Mono until then." banner across the top.
// ---------------------------------------------------------------------------

function StubBanner({ themeName }: { themeName: string }) {
  return (
    <div className="w-full" style={{ background: '#0A0A0A', color: '#FACC15' }}>
      <div className="max-w-md mx-auto px-5 py-2.5 text-center text-[12px] font-extrabold leading-snug">
        {themeName} arrives next week — using Minimalist Mono until then.
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Top-level switch
// ---------------------------------------------------------------------------

export default function FreeThemeRenderer({
  theme,
  profile,
}: {
  theme: FreeTheme
  profile: FreeProfile
}) {
  // Always-on shared style block — covers every keyframe used by the
  // active theme renderers. Scoped via <style jsx global> so each
  // renderer can reference these class names.
  const fullyBuilt = isThemeFullyRendered(theme.id)
  if (!fullyBuilt) {
    return (
      <>
        <StubBanner themeName={theme.name} />
        <MinimalistMono profile={profile} />
      </>
    )
  }
  switch (theme.id) {
    case 'minimalist-mono': return <MinimalistMono profile={profile} />
    case 'pastel-bloom':    return <PastelBloom   profile={profile} />
    case 'neon-pulse':      return <NeonPulse     profile={profile} />
    case 'bento-studio':    return <BentoStudio   profile={profile} />
    case 'donut-dance':     return <DonutDance    profile={profile} />
    // TODO: build theme tropical-bali
    // TODO: build theme glassmorphism
    // TODO: build theme bubble-pop
    // TODO: build theme brutalist-block
    // TODO: build theme marble-editorial
    // TODO: build theme magazine-grid
    // TODO: build theme cyberpunk-glitch
    // TODO: build theme vintage-paper
    // TODO: build theme geometric-confetti
    // TODO: build theme watercolor-wash
    default:
      return (
        <>
          <StubBanner themeName={theme.name} />
          <MinimalistMono profile={profile} />
        </>
      )
  }
}
