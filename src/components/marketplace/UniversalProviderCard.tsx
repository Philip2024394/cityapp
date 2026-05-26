'use client'
import Link from 'next/link'
import { Star, User, type LucideIcon } from 'lucide-react'

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
  icon?:  LucideIcon
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
  /** Theme-tinted pill text — typically the primary service category. */
  specialtyLabel?:    string | null
  /** Up to 3 image URLs for the mini portfolio strip. Caller may pass
   *  fewer; rows simply collapse. */
  portfolioThumbs?:   string[]
  /** Per-vertical brand accent. The marketplace consistently uses
   *  CityRiders yellow `#FACC15`, regardless of provider theme_color
   *  (per-provider colour lives on the public profile page itself). */
  themeColor?:        string
  /** Bottom-left items — caller-provided icon + label pills. Anything
   *  not relevant for a vertical simply gets an empty array. */
  bottomItems?:       UniversalProviderCardBottomItem[]
  /** Optional CTA label override (default "Profile"). */
  ctaLabel?:          string
}

const BRAND_YELLOW = '#FACC15'

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
}: UniversalProviderCardProps) {
  const theme = themeColor
  const initials = displayName.charAt(0).toUpperCase()
  const hasRating = typeof rating === 'number' && rating > 0
  const safeThumbs = (portfolioThumbs ?? []).filter(Boolean).slice(0, 3)
  const items = bottomItems ?? []
  const dotColor = availabilityDot === 'online' ? '#22C55E'
                 : availabilityDot === 'busy'   ? '#F97316'
                 :                                '#9CA3AF'

  return (
    <div
      className="relative overflow-hidden rounded-2xl transition hover:-translate-y-0.5 hover:shadow-2xl"
      style={{
        background: 'rgba(15, 15, 18, 0.62)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderLeft: `3px solid ${theme}`,
        boxShadow: `0 6px 20px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06), 0 0 0 0.5px ${theme}40`,
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
              'linear-gradient(to bottom, rgba(15,15,18,0) 45%, rgba(15,15,18,0.95) 100%)',
          }}
        />
        {hasRating && (
          <div
            className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 px-2 py-1 rounded-full border shadow-md"
            style={{
              background: 'rgba(15, 15, 18, 0.78)',
              borderColor: 'rgba(255,255,255,0.18)',
            }}
          >
            <Star className="w-3.5 h-3.5" fill="#FACC15" stroke="none" />
            <span className="text-[13px] font-extrabold text-white tabular-nums leading-none">
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
                  className="w-16 h-16 rounded-2xl object-cover bg-black/40"
                  style={{
                    border: `3px solid ${theme}`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.5), 0 0 0 2px rgba(15,15,18,0.8)',
                  }}
                />
              : <div
                  className="w-16 h-16 rounded-2xl bg-black/40 flex items-center justify-center text-[22px] font-black text-white"
                  style={{
                    border: `3px solid ${theme}`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.5), 0 0 0 2px rgba(15,15,18,0.8)',
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
                  border: '2px solid #0F0F12',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
                }}
              />
            </span>
          </div>

          {/* Name + city + subline */}
          <div className="min-w-0 flex-1 pb-1">
            <div className="text-[17px] font-black text-white truncate leading-tight">
              {displayName}
            </div>
            {city && (
              <div className="text-[12px] text-white/70 flex items-center gap-1 mt-0.5">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: theme }}
                />
                <span className="truncate">{city}</span>
              </div>
            )}
            {subline && (
              <div className="text-[11px] text-white/55 truncate mt-0.5">
                {subline}
              </div>
            )}
          </div>

          {/* Themed specialty pill (top-right of name block) */}
          {specialtyLabel && (
            <div
              className="shrink-0 px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider"
              style={{
                background: `${theme}22`,
                color: theme,
                border: `1px solid ${theme}60`,
              }}
            >
              {specialtyLabel}
            </div>
          )}
        </div>

        {bio?.trim() && (
          <p
            className="text-[12.5px] leading-snug text-white/70 mb-3"
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
                className="relative aspect-[4/3] rounded-lg overflow-hidden bg-black/40"
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
              {items.map((it) => (
                <span
                  key={it.key}
                  className="inline-flex items-center gap-1.5 text-[13px] font-bold text-white/85"
                >
                  {it.icon && (
                    <it.icon
                      className="w-[16px] h-[16px]"
                      strokeWidth={2.25}
                      style={{ color: '#FFFFFF' }}
                    />
                  )}
                  {it.label}
                </span>
              ))}
            </div>
          ) : <span />}

          <Link
            href={href}
            aria-label={`View profile of ${displayName}`}
            className="rounded-full px-4 py-2 text-[12px] font-extrabold uppercase tracking-wider inline-flex items-center justify-center gap-1.5 shrink-0 hover:brightness-110 transition shadow-md"
            style={{
              background: theme,
              color: '#0A0A0A',
              boxShadow: `0 4px 14px ${theme}55`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <User className="w-3.5 h-3.5" strokeWidth={2.5} />
            {ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  )
}
