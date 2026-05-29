'use client'
import { useId } from 'react'

// Animated ring around a profile avatar. Used on the prominent
// public-profile hero info card (src/app/beautician/[slug]/page.tsx).
// Migration 0141 added `avatar_frame_style` on beautician_providers;
// this component is its renderer.
//
// Outer container is `size + 6px` wide so a 3px ring on every side
// surrounds the inner image (size px square). The inner image is a
// round <img> when `src` is set, falling back to a circular initial
// avatar coloured by `themeColor` with a white capital initial.
//
// Effects:
//   none     → solid 2px ring in themeColor
//   gradient → static IG-style conic-gradient (pink → orange → yellow
//              → orange → pink), 3px wide
//   pulse    → solid themeColor ring with a 2s box-shadow pulse
//              (0 → 12px blur, fade back to nothing then repeat)
//   rainbow  → 3px conic-gradient (red → orange → yellow → green →
//              blue → purple → red) rotating 360deg / 8s linear. The
//              inner image is rendered ON TOP of an absolutely-
//              positioned rotating layer so the photo stays upright
//              while only the ring spins.
//
// All keyframes are inlined in a single <style> so the component is
// self-contained and works inside Next.js server pages without a
// separate stylesheet entry. Class names are namespaced (cr-avatar-*)
// to avoid collisions with the existing cr-hero-* / cr-cta-* keyframes
// defined elsewhere in the public profile.
//
// prefers-reduced-motion disables the pulse + rainbow animations
// (they fall back to a static solid / gradient ring). The static
// gradient + none variants are unaffected.

export type AvatarFrameStyle = 'none' | 'gradient' | 'pulse' | 'rainbow'

export default function AvatarFrame({
  src,
  alt,
  size = 56,
  style,
  themeColor,
  fallbackInitial,
}: {
  src: string | null
  alt: string
  size?: number
  style: AvatarFrameStyle
  themeColor: string
  fallbackInitial?: string
}) {
  // Unique suffix so multiple AvatarFrame instances on the same page
  // don't clash on keyframe / class names. useId returns something like
  // ":r1:" — strip the colons because CSS selectors can't include them.
  const rawId = useId()
  const uid   = rawId.replace(/[^a-zA-Z0-9_-]/g, '')
  const outerSize = size + 6
  const innerSize = size

  // Inner content: rounded image OR a circular initial avatar. Both
  // share the same square footprint so the ring renders cleanly.
  const inner = src ? (
    <img
      src={src}
      alt={alt}
      width={innerSize}
      height={innerSize}
      className="rounded-full object-cover block"
      style={{ width: innerSize, height: innerSize }}
    />
  ) : (
    <div
      className="rounded-full flex items-center justify-center text-white font-black select-none"
      style={{
        width: innerSize,
        height: innerSize,
        background: themeColor,
        fontSize: Math.round(innerSize * 0.42),
        lineHeight: 1,
      }}
      aria-label={alt}
    >
      {fallbackInitial || alt.charAt(0).toUpperCase()}
    </div>
  )

  // Outer container is non-rotating so the image always stays upright.
  // The ring layer underneath is absolutely positioned and (for rainbow)
  // rotates independently. We pad by ringWidth on every side so the
  // ring is visible around the inner content.
  const ringWidth = style === 'none' ? 2 : 3

  // Ring background per style. Conic gradients give us the IG-style and
  // rainbow without needing SVG. `none` and `pulse` use a solid theme
  // colour ring; pulse additionally animates a box-shadow on the outer
  // container.
  let ringBackground: string
  if (style === 'gradient') {
    ringBackground = 'conic-gradient(from 0deg, #FF1493, #FF8C00, #FFD700, #FF8C00, #FF1493)'
  } else if (style === 'rainbow') {
    ringBackground = 'conic-gradient(from 0deg, #EF4444, #F97316, #FACC15, #22C55E, #3B82F6, #A855F7, #EF4444)'
  } else {
    ringBackground = themeColor
  }

  const pulseClass   = style === 'pulse'   ? `cr-avatar-pulse-${uid}`   : ''
  const rainbowClass = style === 'rainbow' ? `cr-avatar-rainbow-${uid}` : ''

  return (
    <div
      className={`relative shrink-0 rounded-full inline-flex items-center justify-center ${pulseClass}`}
      style={{
        width: outerSize,
        height: outerSize,
        // pulse animates the box-shadow on this container directly so
        // the glow extends OUTSIDE the avatar. Other variants leave
        // box-shadow alone.
      }}
    >
      <style>{`
        @keyframes cr-avatar-pulse {
          0%   { box-shadow: 0 0 0 0    ${themeColor}99; }
          70%  { box-shadow: 0 0 12px 4px ${themeColor}00; }
          100% { box-shadow: 0 0 0 0    ${themeColor}00; }
        }
        @keyframes cr-avatar-rainbow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .cr-avatar-pulse-${uid} {
          border-radius: 9999px;
          animation: cr-avatar-pulse 2s ease-out infinite;
        }
        .cr-avatar-rainbow-${uid} {
          animation: cr-avatar-rainbow 8s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .cr-avatar-pulse-${uid},
          .cr-avatar-rainbow-${uid} {
            animation: none !important;
          }
        }
      `}</style>

      {/* Ring layer — absolutely positioned so the rainbow variant can
          rotate without spinning the photo. For non-rainbow styles the
          rotation class is omitted and the ring stays static. */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 rounded-full ${rainbowClass}`}
        style={{ background: ringBackground }}
      />

      {/* Inner image / initial avatar, sitting above the ring with a
          ringWidth-px gap on every side so the ring shows through. */}
      <div
        className="relative rounded-full bg-white"
        style={{
          width: innerSize,
          height: innerSize,
          margin: ringWidth,
        }}
      >
        {inner}
      </div>
    </div>
  )
}
