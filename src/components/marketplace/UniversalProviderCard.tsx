'use client'
import Link from 'next/link'
import {
  Star, User,
  Home, Hotel, Building2,
  Clock, DollarSign, Scale, Truck, Sparkles,
  Bike, Fuel, Globe,
  Store,
  type LucideIcon,
} from 'lucide-react'

// String → lucide-component map. Callers pass an icon KEY (serializable
// across the server→client boundary), the card resolves it locally.
// Add a new entry here when a vertical needs an icon not yet listed.
const BOTTOM_ICON_MAP: Record<string, LucideIcon> = {
  home:        Home,
  hotel:       Hotel,
  villa:       Building2,
  clock:       Clock,
  dollar:      DollarSign,
  scale:       Scale,
  truck:       Truck,
  sparkles:    Sparkles,
  bike:        Bike,
  fuel:        Fuel,
  globe:       Globe,
  spa:         Store,   // physical salon / studio location
}
export type BottomIconKey = keyof typeof BOTTOM_ICON_MAP

// UniversalProviderCard — the polished dark-glass card extracted from
// beautician's marketplace. Generic data shape lets every vertical
// (handyman, laundry, massage, home-clean, tour-guide) feed it without
// per-vertical forks.
//
// Visual contract:
//   • Dark-glass body (rgba(15,15,18,0.62) + 12px blur)
//   • 110px cover-image hero strip with fade into body
//   • Theme-color left border (3px) + soft theme-tinted shadow
//   • Avatar overlaps the cover/body seam with a theme ring
//   • Status dot at avatar lower-right (with online pulse)
//   • Specialty pill (theme-tinted) inline with the name block
//   • Up to 3-thumb mini portfolio grid above the bottom row
//   • Bottom row: caller-provided icon+label items on the LEFT, Profile
//     CTA on the RIGHT
//   • Rating chip pinned top-right of the cover strip
//
// Caller responsibilities (keep the component dumb):
//   • Compute the effective availability dot state from operating_hours
//   • Provide the href (e.g. /handyman/{slug})
//   • Pick the specialty label (e.g. "Wash + Iron" for laundry,
//     "Plumbing" for handyman, "Balinese 90 min" for massage)
//   • Pre-flatten the 3 portfolio thumb URLs from whatever the vertical
//     uses (service_photos[primary] / gallery_image_urls / image_urls)
//   • Provide bottom-row pills (Home/Hotel/Villa for beautician + massage,
//     min-kg + turnaround for laundry, bike-brand for tour-guide, etc.)

export type UniversalProviderCardBottomItem = {
  key:    string
  /** Serializable icon key. Resolved to a lucide component inside the
   *  card so server components can pass these props without a
   *  server→client serialization error. See BOTTOM_ICON_MAP above. */
  icon?:  BottomIconKey
  label:  string
}

export type UniversalProviderCardProps = {
  /** Full URL to the provider's public profile (e.g. /beautician/dewi). */
  href:               string
  displayName:        string
  city?:              string | null
  /** Optional one-line note under the city (e.g. operating hours,
   *  turnaround time, years of experience). */
  subline?:           string | null
  /** 2-line clamped bio. Caller should collapse newlines upstream
   *  (replace `\s*\n\s*` with a space) so short sentences don't sit
   *  alone on their own line. */
  bio?:               string | null
  coverImageUrl?:     string | null
  profileImageUrl?:   string | null
  /** Pre-computed dot state. Caller folds operating_hours into this. */
  availabilityDot:    'online' | 'busy' | 'offline'
  rating?:            number | null
  /** Specialty / primary service label. Rendered as a uniform navy +
   *  yellow pill regardless of vertical or trade. */
  specialtyLabel?:    string | null
  /** Up to 3 image URLs for the mini portfolio strip. Caller may pass
   *  fewer; rows simply collapse. */
  portfolioThumbs?:   string[]
  /** Per-vertical brand accent. The marketplace consistently uses
   *  IndoCity yellow `#FACC15`, regardless of provider theme_color
   *  (per-provider colour lives on the public profile page itself). */
  themeColor?:        string
  /** Bottom-left items — caller-provided icon + label pills. Anything
   *  not relevant for a vertical simply gets an empty array. */
  bottomItems?:       UniversalProviderCardBottomItem[]
  /** Optional CTA label override (default "Profile"). */
  ctaLabel?:          string
  /** Surface variant. 'dark' (default) is the original dark-glass look
   *  used across every marketplace; 'light' is for pages painting on a
   *  white background — body becomes white with a subtle shadow + dark
   *  ink text + light scrim + lighter thumbnail wells. */
  variant?:           'dark' | 'light'
}

const BRAND_YELLOW = '#FACC15'

// All the surface-specific colours collected here so the JSX below stays
// readable. Switch the whole card between dark/light by changing one prop.
const SURFACE = {
  dark: {
    bodyBg:           'rgba(15, 15, 18, 0.62)',
    bodyBackdrop:     'blur(12px)',
    bodyShadow:       (theme: string) => `0 6px 20px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06), 0 0 0 0.5px ${theme}40`,
    coverFadeTo:      'rgba(15,15,18,0.95)',
    ratingChipBg:     'rgba(15, 15, 18, 0.78)',
    ratingChipBorder: 'rgba(255,255,255,0.18)',
    ratingChipText:   '#FFFFFF',
    avatarFallback:   'bg-black/40 text-white',
    avatarRingShadow: '0 2px 8px rgba(0,0,0,0.5), 0 0 0 2px rgba(15,15,18,0.8)',
    statusDotBorder:  '#0F0F12',
    nameText:         'text-white',
    cityText:         'text-white/70',
    sublineText:      'text-white/55',
    bioText:          'text-white/70',
    thumbBg:          'bg-black/40',
    bottomItemsText:  'text-white/85',
    bottomIconColor:  '#FFFFFF',
  },
  light: {
    bodyBg:           '#FFFFFF',
    bodyBackdrop:     'none',
    bodyShadow:       (theme: string) => `0 6px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.06), 0 0 0 0.5px ${theme}40`,
    coverFadeTo:      'rgba(255,255,255,0.95)',
    ratingChipBg:     'rgba(255, 255, 255, 0.92)',
    ratingChipBorder: 'rgba(0,0,0,0.10)',
    ratingChipText:   '#0A0A0A',
    avatarFallback:   'bg-gray-100 text-gray-800',
    avatarRingShadow: '0 2px 8px rgba(0,0,0,0.15), 0 0 0 2px #FFFFFF',
    statusDotBorder:  '#FFFFFF',
    nameText:         'text-black',
    cityText:         'text-black/70',
    sublineText:      'text-black/55',
    bioText:          'text-black/70',
    thumbBg:          'bg-gray-100',
    bottomItemsText:  'text-black/80',
    bottomIconColor:  '#1F2937',
  },
} as const

export default function UniversalProviderCard({
  href,
  displayName,
  city,
  subline,
  bio,
  coverImageUrl,
  profileImageUrl,
  availabilityDot,
  rating,
  specialtyLabel,
  portfolioThumbs,
  themeColor = BRAND_YELLOW,
  bottomItems,
  ctaLabel = 'Profile',
  variant = 'dark',
}: UniversalProviderCardProps) {
  const theme    = themeColor
  const s = SURFACE[variant]
  const initials = displayName.charAt(0).toUpperCase()
  const hasRating = typeof rating === 'number' && rating > 0
  const safeThumbs = (portfolioThumbs ?? []).filter(Boolean).slice(0, 3)
  const items = bottomItems ?? []
  const dotColor = availabilityDot === 'online' ? '#22C55E'
                 : availabilityDot === 'busy'   ? '#F97316'
                 :                                '#9CA3AF'

  return (
    <Link
      href={href}
      prefetch
      aria-label={`View profile of ${displayName}`}
      className="relative overflow-hidden rounded-2xl transition hover:-translate-y-0.5 hover:shadow-2xl block focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{
        background: s.bodyBg,
        backdropFilter: s.bodyBackdrop,
        WebkitBackdropFilter: s.bodyBackdrop,
        borderLeft: `3px solid ${theme}`,
        boxShadow: s.bodyShadow(theme),
      }}
    >
      {/* HERO STRIP — cover image (or themed gradient fallback) with
          a smooth fade into the dark body so the avatar + name area
          stays readable on any backdrop. */}
      <div
        className="relative h-[110px]"
        style={{ background: `linear-gradient(135deg, ${theme}25, ${theme}08)` }}
      >
        {coverImageUrl && (
          <img
            src={coverImageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        )}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              `linear-gradient(to bottom, rgba(255,255,255,0) 45%, ${s.coverFadeTo} 100%)`,
          }}
        />
        {hasRating && (
          <div
            className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 px-2 py-1 rounded-full border shadow-md"
            style={{
              background: s.ratingChipBg,
              borderColor: s.ratingChipBorder,
            }}
          >
            <Star className="w-3.5 h-3.5" fill="#FACC15" stroke="none" />
            <span
              className="text-[13px] font-extrabold tabular-nums leading-none"
              style={{ color: s.ratingChipText }}
            >
              {rating.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* BODY — pulled up 24px so the avatar bridges cover + body. */}
      <div className="px-4 pb-4 -mt-6 relative z-10">
        <div className="flex items-end gap-3 mb-2">
          {/* Avatar with theme ring + status dot */}
          <div className="relative shrink-0">
            {profileImageUrl
              ? <img
                  src={profileImageUrl}
                  alt={displayName}
                  className={`w-16 h-16 rounded-2xl object-cover ${s.thumbBg}`}
                  style={{
                    border: `3px solid ${theme}`,
                    boxShadow: s.avatarRingShadow,
                  }}
                />
              : <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center text-[22px] font-black ${s.avatarFallback}`}
                  style={{
                    border: `3px solid ${theme}`,
                    boxShadow: s.avatarRingShadow,
                  }}
                >{initials}</div>}
            <span
              aria-label={availabilityDot === 'online' ? 'Online · available' : 'Busy / outside hours'}
              className="absolute -bottom-1 -right-1"
              style={{ width: 14, height: 14 }}
            >
              {availabilityDot === 'online' && (
                <>
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{ background: 'rgba(34,197,94,0.55)', animationDuration: '1.6s' }}
                  />
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{ background: 'rgba(34,197,94,0.75)', animationDuration: '1s' }}
                  />
                </>
              )}
              <span
                className="absolute inset-0 rounded-full"
                style={{
                  background: dotColor,
                  border: `2px solid ${s.statusDotBorder}`,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
                }}
              />
            </span>
          </div>

          {/* Name + city + subline — pb-3 lifts the visible text block
              up off the flex bottom edge so the name sits higher next
              to the avatar (cleaner alignment with the cover seam). */}
          <div className="min-w-0 flex-1 pb-3">
            <div className={`text-[20px] font-black truncate leading-tight ${s.nameText}`}>
              {displayName}
            </div>
            {city && (
              <div className={`text-[12px] flex items-center gap-1 mt-0.5 ${s.cityText}`}>
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: theme }}
                />
                <span className="truncate">{city}</span>
              </div>
            )}
            {subline && (
              <div className={`text-[12px] truncate mt-0.5 ${s.sublineText}`}>
                {subline}
              </div>
            )}
          </div>

          {/* Specialty pill — dark navy chip with brand-yellow text.
              Uniform across every trade / vertical for visual consistency. */}
          {specialtyLabel && (
            <div
              className="shrink-0 px-2.5 py-1 rounded-full text-[12px] font-black uppercase tracking-wider"
              style={{
                background: '#1E3A8A',                  // navy (blue-900)
                color:      '#FACC15',                  // brand yellow
                border:     '1px solid rgba(250,204,21,0.45)',
              }}
            >
              {specialtyLabel}
            </div>
          )}
        </div>

        {bio?.trim() && (
          <p
            className={`text-[12.5px] leading-snug mb-3 ${s.bioText}`}
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {bio}
          </p>
        )}

        {safeThumbs.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {safeThumbs.map((url, i) => (
              <div
                key={url + i}
                className={`relative aspect-[4/3] rounded-lg overflow-hidden ${s.thumbBg}`}
                style={{ boxShadow: `inset 0 0 0 1px ${theme}40` }}
              >
                <img
                  src={url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          {items.length > 0 ? (
            <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
              {items.map((it) => {
                const Ico = it.icon ? BOTTOM_ICON_MAP[it.icon] : null
                return (
                  <span
                    key={it.key}
                    className={`inline-flex items-center gap-1.5 text-[13px] font-bold ${s.bottomItemsText}`}
                  >
                    {Ico && (
                      <Ico
                        className="w-[16px] h-[16px]"
                        strokeWidth={2.25}
                        style={{ color: s.bottomIconColor }}
                      />
                    )}
                    {it.label}
                  </span>
                )
              })}
            </div>
          ) : <span />}

          {/* Profile pill — visual affordance only. The whole card is the
              tap target (outer <Link>), so this stays as a styled <span>
              to signal "this card leads somewhere" without nesting an
              interactive element inside another. Keeps min-44px height
              via py-2 + line-height for WCAG tap-target parity. */}
          <span
            aria-hidden="true"
            className="rounded-full px-4 py-2 text-[12px] font-extrabold uppercase tracking-wider inline-flex items-center justify-center gap-1.5 shrink-0 transition shadow-md"
            style={{
              background: theme,
              color: '#0A0A0A',
              boxShadow: `0 4px 14px ${theme}55`,
            }}
          >
            <User className="w-3.5 h-3.5" strokeWidth={2.5} />
            {ctaLabel}
          </span>
        </div>
      </div>
    </Link>
  )
}
