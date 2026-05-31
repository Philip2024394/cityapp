'use client'
import { ShieldCheck, BadgeCheck, Star } from 'lucide-react'

// Universal hero — cover image fills the top, avatar overlaps at bottom-left,
// name/badges/rating sit beside the avatar. Mobile-first; the cover scales
// to viewport width, never exceeds 320px tall. Falls back to a brand
// gradient when no cover_image_url is set.

export type ProfileHeroProps = {
  coverUrl?:    string | null
  avatarUrl?:   string | null
  name:         string
  /** Short category label rendered as a themed pill above the name. */
  categoryLabel?: string
  rating?:      number | null
  reviewCount?: number | null
  /** Verification flags — only true ones render a badge. */
  idVerified?:    boolean
  phoneVerified?: boolean
  /** Online / busy / offline — shown as a pulse dot beside name. */
  availability?: 'online' | 'busy' | 'offline'
  /** Optional absolutely-positioned overlay rendered in the top-left of
   *  the cover. Lets a per-vertical page sit branded text (e.g.
   *  "Professional Beautician") on the hero without touching the kit. */
  overlayLeft?: React.ReactNode
  /** Per-provider accent hex — drives the category-label pill, rating
   *  star fill, and the cover gradient when no coverUrl is set.
   *  Defaults to CityDrivers brand yellow. */
  themeColor?: string
}

const DEFAULT_THEME = '#FACC15'

function gradientFor(hex: string): string {
  // Lazy "lighter → darker" gradient — same hex twice with a brightness
  // shift. Avoids pulling a colour library; visually fine for hero fallbacks.
  return `linear-gradient(135deg, ${hex} 0%, ${hex}CC 100%)`
}

export default function ProfileHero({
  coverUrl, avatarUrl, name,
  categoryLabel, rating, reviewCount,
  idVerified, phoneVerified, availability,
  overlayLeft,
  themeColor = DEFAULT_THEME,
}: ProfileHeroProps) {
  const initial = name?.charAt(0)?.toUpperCase() || '?'
  const themeGradient = gradientFor(themeColor)
  return (
    <div className="relative">
      {/* Cover */}
      <div
        className="relative w-full overflow-hidden bg-black"
        style={{ aspectRatio: '16 / 9', maxHeight: 320 }}
      >
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0" style={{ background: themeGradient }} />
        )}
        {/* Bottom scrim so the avatar + name read against any photo */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-32"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)' }}
        />
        {overlayLeft}
      </div>

      {/* Avatar + identity overlap */}
      <div className="px-4 -mt-10 relative z-10 flex items-end gap-3">
        <div className="relative shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-20 h-20 rounded-2xl object-cover bg-black"
              style={{
                border: `3px solid ${themeColor}`,
                boxShadow: `0 8px 20px rgba(0,0,0,0.45), 0 0 0 1.5px #0A0A0A inset`,
              }}
            />
          ) : (
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-[28px] font-black text-bg"
              style={{
                background: themeGradient,
                border: `3px solid ${themeColor}`,
                boxShadow: '0 8px 20px rgba(0,0,0,0.45)',
              }}
            >
              {initial}
            </div>
          )}
          {availability && (
            <span
              aria-label={availability}
              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ring-2 ring-bg ${
                availability === 'online' ? 'bg-green-500 animate-pulse-online' :
                availability === 'busy'   ? 'bg-orange-500' :
                                            'bg-gray-500'
              }`}
            />
          )}
        </div>

        {/* Right-of-avatar text — pads to clear bottom scrim. */}
        <div className="pb-1 min-w-0 flex-1">
          {categoryLabel && (
            <div
              className="inline-block text-bg text-[10px] font-extrabold uppercase tracking-[0.15em] px-2 py-0.5 rounded mb-1"
              style={{ background: themeColor }}
            >
              {categoryLabel}
            </div>
          )}
          <h1 className="text-[20px] sm:text-[22px] font-black leading-tight truncate text-white drop-shadow">
            {name}
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {rating != null && (
              <span className="inline-flex items-center gap-1 text-[12px] font-extrabold text-white">
                <Star
                  className="w-3.5 h-3.5"
                  strokeWidth={0}
                  style={{ fill: themeColor, color: themeColor }}
                />
                {rating.toFixed(1)}
                {reviewCount ? <span className="text-white/65 font-bold">· {reviewCount}</span> : null}
              </span>
            )}
            {idVerified && (
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-300 bg-emerald-500/15 border border-emerald-500/40 rounded-full px-2 py-0.5">
                <ShieldCheck className="w-3 h-3" strokeWidth={2.5} />
                ID verified
              </span>
            )}
            {phoneVerified && (
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-sky-300 bg-sky-500/15 border border-sky-500/40 rounded-full px-2 py-0.5">
                <BadgeCheck className="w-3 h-3" strokeWidth={2.5} />
                Phone verified
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
