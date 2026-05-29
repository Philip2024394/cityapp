// Service-photo badge catalogue — drives the badge dropdown in the
// per-service photo editor + the corner-anchored glow overlay on the
// public profile. Lives in jsonb (service_photos[].badge), no schema
// migration required to add or remove badge types.

export type BadgeType =
  | 'discount'         // takes a numeric value (% off)
  | 'new_listing'      // value ignored
  | 'appointment_only' // value ignored
  | 'low_stock'        // value ignored
  | 'bridal_special'   // value ignored (beautician-flavoured)
  | 'trending'         // value ignored

export type ServicePhotoBadge = {
  type:   BadgeType
  /** Numeric value (1–99) for `discount` — ignored on every other type.
   *  Stored as integer percent so render is deterministic. */
  value?: number
  /** Optional colour override. When set, the badge renders in this
   *  colour family instead of the type's semantic default. Three
   *  high-contrast options surfaced in the picker. */
  color?: 'red' | 'yellow' | 'black'
}

/** High-contrast colour overrides — bg/text/glow tuned so each option
 *  pops on any photo. Used when `badge.color` is set; the type's
 *  semantic palette is the fallback when not set. */
export const BADGE_COLOR_OVERRIDES: Record<'red' | 'yellow' | 'black', {
  bg:   string
  text: string
  glow: string
}> = {
  red:    { bg: 'bg-red-500',     text: 'text-white', glow: 'rgba(239,68,68,0.65)' },
  yellow: { bg: 'bg-yellow-400',  text: 'text-black', glow: 'rgba(250,204,21,0.7)' },
  black:  { bg: 'bg-black',       text: 'text-white', glow: 'rgba(0,0,0,0.55)'    },
}

export type BadgeDef = {
  type:        BadgeType
  /** Human label shown in the editor dropdown. */
  label:       string
  /** Short uppercase text rendered ON the badge itself. Use `{value}`
   *  as a placeholder for the numeric value (discount only). */
  display:     string
  /** Tailwind background color class (used on the badge background). */
  bg:          string
  /** Tailwind text color class. */
  text:        string
  /** Tailwind ring / glow color class for the running-glow keyframe. */
  glow:        string
}

export const BADGE_CATALOGUE: ReadonlyArray<BadgeDef> = [
  {
    type: 'discount',
    label: 'Discount %',
    display: '{value}% OFF',
    bg: 'bg-red-500',
    text: 'text-white',
    glow: 'rgba(239,68,68,0.6)',
  },
  {
    type: 'new_listing',
    label: 'New Listing',
    display: 'NEW',
    bg: 'bg-emerald-500',
    text: 'text-white',
    glow: 'rgba(16,185,129,0.6)',
  },
  {
    type: 'appointment_only',
    label: 'Appointment Only',
    display: 'BY APPT',
    bg: 'bg-indigo-500',
    text: 'text-white',
    glow: 'rgba(99,102,241,0.6)',
  },
  {
    type: 'low_stock',
    label: 'Low Stock',
    display: 'LIMITED',
    bg: 'bg-amber-500',
    text: 'text-white',
    glow: 'rgba(245,158,11,0.6)',
  },
  {
    type: 'bridal_special',
    label: 'Bridal Special',
    display: 'BRIDAL',
    bg: 'bg-pink-500',
    text: 'text-white',
    glow: 'rgba(236,72,153,0.6)',
  },
  {
    type: 'trending',
    label: 'Trending',
    display: '🔥 TRENDING',
    bg: 'bg-purple-500',
    text: 'text-white',
    glow: 'rgba(168,85,247,0.6)',
  },
] as const

const BY_TYPE: Record<BadgeType, BadgeDef> = Object.fromEntries(
  BADGE_CATALOGUE.map((b) => [b.type, b]),
) as Record<BadgeType, BadgeDef>

/** Resolve the rich definition for a badge stored on a service photo.
 *  Returns null when the badge field is missing or its type isn't in
 *  the catalogue (defensive — keeps old rows from breaking the page
 *  if a badge type is removed from the catalogue later). When the
 *  badge carries a colour override, the returned `def` is rewritten
 *  to use the override's bg/text/glow so callers don't need a second
 *  lookup. */
export function resolveBadge(badge: ServicePhotoBadge | null | undefined): {
  def:     BadgeDef
  display: string
} | null {
  if (!badge?.type) return null
  const baseDef = BY_TYPE[badge.type]
  if (!baseDef) return null
  const def: BadgeDef = badge.color
    ? { ...baseDef, ...BADGE_COLOR_OVERRIDES[badge.color] }
    : baseDef
  const display = baseDef.display.replace('{value}', String(badge.value ?? 0))
  return { def, display }
}
