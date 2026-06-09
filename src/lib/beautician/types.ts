// Types for the Bike Beautician marketplace. Mirrors the massage types
// shape — same availability / status / subscription enums.

export type BeauticianGender = 'woman' | 'man'
export type BeauticianAvailability = 'online' | 'busy' | 'offline'
export type BeauticianStatus = 'pending' | 'active' | 'suspended' | 'removed'
export type BeauticianSubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled'

export interface BeauticianProvider {
  id: string
  user_id: string | null
  slug: string
  display_name: string

  gender: BeauticianGender
  years_experience: number
  bio: string

  price_makeup_idr: number | null
  price_nail_idr:   number | null
  price_hair_idr:   number | null

  city: string | null
  service_area_notes: string | null
  whatsapp_e164: string

  profile_image_url: string | null
  ktp_image_url: string | null

  availability: BeauticianAvailability
  status: BeauticianStatus
  verified_at: string | null
  verified_by: string | null
  rejected_reason: string | null

  subscription_status: BeauticianSubscriptionStatus
  trial_ends_at: string
  paid_until: string | null

  is_mock: boolean
  mock_hidden_at: string | null

  created_at: string
  updated_at: string

  // mig 0072 — universal extras (read/write via /api/beautician/me/profile)
  cover_image_url?:      string | null
  gallery_image_urls?:   string[] | null
  instagram_url?:        string | null
  tiktok_url?:           string | null
  facebook_url?:         string | null
  // mig 0130 — extra socials
  x_url?:                string | null
  snapchat_url?:         string | null
  website_url?:          string | null
  operating_hours?:      Record<string, string> | null
  certifications?:       string[] | null
  languages?:            string[] | null
  // mig 0137 — universal extras: contact-form opt-in
  contact_form_enabled?: boolean | null
  contact_email?:        string | null
}

// Marketplace-safe subset — no KTP, no internal verifier ids.
export type BeauticianProviderPublic = Pick<
  BeauticianProvider,
  | 'slug' | 'display_name'
  | 'gender' | 'years_experience' | 'bio'
  | 'price_makeup_idr' | 'price_nail_idr' | 'price_hair_idr'
  | 'city' | 'service_area_notes'
  | 'whatsapp_e164'
  | 'profile_image_url'
  | 'availability'
> & {
  // mig 0072 — universal profile fields
  id?: string
  owner_user_id?: string  // mig 0193 — for client-side add-on widgets
  cover_image_url?:    string | null
  gallery_image_urls?: string[] | null
  languages?:          string[] | null
  instagram_url?:      string | null
  tiktok_url?:         string | null
  facebook_url?:       string | null
  // mig 0130 — extra socials + custom domain
  x_url?:              string | null
  snapchat_url?:       string | null
  website_url?:        string | null
  // mig 0131
  country_code?:            string | null
  custom_services_offered?: string[] | null
  // mig 0132 — chat handles
  telegram_handle?: string | null
  wechat_id?:       string | null
  line_id?:         string | null
  kakaotalk_id?:    string | null
  // mig 0137 — contact form opt-in
  contact_form_enabled?: boolean | null
  contact_email?:        string | null
  operating_hours?:    Record<string, string> | null
  certifications?:     string[] | null
  last_active_at?:     string | null
  created_at?:         string | null
  subscription_status?: BeauticianSubscriptionStatus | null
  is_mock?: boolean
  rating?: number | null
  rating_count?: number | null
  // mig 0073 — Services Offered catalog (independent of pricing)
  services_offered?: BeauticianServiceOffered[] | null
  // mig 0077 — Primary marketplace categories (max 3, subset of services_offered)
  marketplace_categories?: BeauticianServiceOffered[] | null
  // mig 0078 — Per-profile theme accent color (hex #RRGGBB).
  // NULL = use the global default pink at render time.
  theme_color?: string | null
  // mig 0202 — User-controlled button text color (hex #RRGGBB).
  // Replaces the auto-luminance inkForTheme() heuristic. Default
  // '#FFFFFF' is set at the DB level; this column also drives the
  // hero-button icon stroke color on the public profile page.
  button_text_color?: string | null
  // mig 0079 — Physical Visit Us location (opt-in)
  has_physical_location?: boolean
  latitude?:  number | null
  longitude?: number | null
  // mig 0081 — Customisable hero overlay text + effect.
  hero_text?: BeauticianHeroText | null
  // mig 0082 — Running marquee text under the portfolio carousel.
  promo_text?: string | null
  // mig 0085 — Self-marked busy dates (ISO YYYY-MM-DD) shown as
  // unavailable in the customer-side calendar.
  busy_dates?: string[] | null
  // mig 0086 — Subset of {'home','hotel','villa'} the beautician is
  // willing to travel to. Drives the location-icon row on the public
  // profile hero + the bottom-left icons on marketplace cards.
  service_locations?: Array<'home' | 'hotel' | 'villa'> | null
  // mig 0140 — Animation applied to the primary public-profile CTA
  // (the Contact / WhatsApp button under the portfolio). 'none' keeps
  // the existing static button. Effects honour prefers-reduced-motion.
  cta_button_effect?: 'none' | 'pulse' | 'glow' | 'shake' | null
  // mig 0141 — Animated ring style around the public-profile avatar.
  // 'none' keeps the existing static look; gradient/pulse/rainbow each
  // light up the prominent hero avatar in src/components/profile/
  // AvatarFrame.tsx.
  avatar_frame_style?: 'none' | 'gradient' | 'pulse' | 'rainbow' | null
  // mig 0142 — vendor's payment rail. 'none' = WhatsApp-only profile;
  // 'stripe' / 'midtrans' enable the cart + paid checkout CTA.
  payment_provider?: 'none' | 'stripe' | 'midtrans' | null
  // mig 0142 — vendor-authored FAQ. Renders as an accordion above the
  // contact form when faq_enabled is true AND faq_items is non-empty.
  faq_items?:   Array<{ q: string; a: string }> | null
  faq_enabled?: boolean | null
  // mig 0142 — vendor-authored legal pages. Plain-text, rendered in a
  // scrollable modal triggered by the contact-section footer links.
  legal_terms?:   string | null
  legal_privacy?: string | null
  // mig 0223 — owner's current Kita2u billing plan. Drives the
  // "Made with Kita2u" footer badge (Free tier only). Server fills
  // this in /api/beautician/[slug]/public; client never writes it.
  owner_plan?: 'free' | 'pro' | 'studio' | null
  // mig 0074 — Per-service photo gallery (max 4 photos per service).
  // Each entry may be a plain URL (legacy) or a rich object with
  // optional name/description/start price for richer carousel cards.
  service_photos?: Partial<Record<BeauticianServiceOffered, BeauticianServicePhoto[]>> | null
}

// mig 0081 — Hero text customisation. Every field optional so the
// public profile page falls back to sane defaults when not set.
// Refined, premium-feel effects. Old 'glow' / 'flyin' values from
// earlier iterations are gracefully treated as 'none' at render time.
export type BeauticianHeroEffect = 'none' | 'shimmer' | 'dance' | 'underline'
export type BeauticianHeroText = {
  line1?:         string  // small top text, default "Professional"
  line2?:         string  // bold middle line, default "Beautician"
  tagline?:       string  // small italic tagline below
  color?:         string  // hex for line2 (defaults to theme_color)
  line1_color?:   string  // hex for line1 (defaults to black)
  tagline_color?: string  // hex for tagline (defaults to black)
  effect?:        BeauticianHeroEffect
}

// Carousel entry. URL is required; the rest is optional so older rows
// (mig 0074 v1, just string URLs) still render.
import type { BadgeType } from '@/lib/badges'
export type BeauticianServicePhoto = {
  url:          string
  name?:        string         // header — e.g. "Nail Art"
  description?: string         // ≤500 chars including spaces
  price_idr?:   number | null  // start price, IDR
  /** CSS object-position override for the carousel card crop. Use
   *  values like "center", "bottom", "top", "50% 75%". Useful when
   *  a portrait photo's subject sits below center and the default
   *  center-crop hides it. */
  object_position?: string
  /** Optional before / after pair shown as thumbnails in the View
   *  Details popup. Tapping a thumb swaps it into the main image
   *  slot. Either field may be set independently; missing ones
   *  simply don't render. */
  before_image_url?: string
  after_image_url?:  string
  /** Optional promo badge (mig 0131). Rendered top-left on the public
   *  card with a slow corner-glow animation. Six types live in
   *  src/lib/badges: discount, new_listing, appointment_only,
   *  low_stock, bridal_special, trending. */
  badge?: { type: BadgeType; value?: number } | null
}

export const SERVICE_LABELS = {
  makeup: 'Makeup',
  nail:   'Nail Art',
  hair:   'Hair',
} as const

export type BeauticianService = keyof typeof SERVICE_LABELS

// ─────────────────────────────────────────────────────────────────────────
// Services Offered catalog (mig 0073) — independent of pricing. Used on
// the public profile page as "Services Provided" badges. DB CHECK
// constraint mirrors this list, so adding here requires re-running 0073
// with the new entry appended to the allowlist.
// ─────────────────────────────────────────────────────────────────────────
export const BEAUTICIAN_SERVICES_OFFERED = [
  { id: 'makeup',           label: 'Make Up'          },
  { id: 'nails',            label: 'Nails'            },
  { id: 'hair',             label: 'Hair'             },
  { id: 'skin',             label: 'Skin'             },
  { id: 'lashes',           label: 'Lashes'           },
  { id: 'brows',            label: 'Brows'            },
  { id: 'waxing',           label: 'Waxing'           },
  { id: 'facial',           label: 'Facial'           },
  { id: 'massage',          label: 'Massage'          },
  { id: 'henna',            label: 'Henna'            },
  { id: 'bridal',           label: 'Bridal'           },
  { id: 'spa',              label: 'Spa'              },
  // mig 0077 — additional Indonesian beauty services
  { id: 'whitening',        label: 'Whitening'        },
  { id: 'microblading',     label: 'Microblading'     },
  { id: 'smoothing',        label: 'Smoothing'        },
  { id: 'permanent_makeup', label: 'Permanent Makeup' },
  // mig 0133 — "Mixed services" catch-all. When a beautician picks
  // this, the dashboard banner picker shows every category with
  // banners (not just those matching the beautician's other picked
  // services). Lets do-it-all beauticians opt out of the filter
  // without ticking every chip.
  { id: 'mixed',            label: 'Mixed services'   },
] as const

export type BeauticianServiceOffered = typeof BEAUTICIAN_SERVICES_OFFERED[number]['id']

export const SERVICE_OFFERED_LABELS: Record<BeauticianServiceOffered, string> =
  Object.fromEntries(
    BEAUTICIAN_SERVICES_OFFERED.map((s) => [s.id, s.label]),
  ) as Record<BeauticianServiceOffered, string>

// ─────────────────────────────────────────────────────────────────────────
// Theme-specific banner library (mig 0078 — theme_color drives selection)
// ─────────────────────────────────────────────────────────────────────────
// Curated cover-image URLs grouped first by theme accent color hex
// (uppercase) then by service category. Beautician picks a banner that
// matches both their theme AND one of their service categories, or
// uploads their own via the existing cover_image_url flow.
//
// When a banner is picked, the row's `cover_image_url` is set to that URL.
// All banners must be on the image-host allowlist (ik.imagekit.io,
// *.supabase.co) to pass validation in /api/beautician/me/profile.
//
// To add banners: append URLs to the matching [theme][category] slot.
// Theme colors:
//   #EC4899 → Pink     (Dewi)
//   #FACC15 → Yellow   (Mira)
//   #F97316 → Orange   (Ayu)
//   #B91C1C → Dark Red (Rina)
//   #9333EA → Purple   (preset, no demo)
//   #0D9488 → Teal     (preset, no demo)
// Banner library entry. String shape is legacy / free banners; the
// object shape adds the premium flag + price for paid exclusivity.
// Type + resolver live in src/lib/banners/library.ts so handyman / other
// verticals can share the same banner-picker UI. We import locally AND
// re-export so existing `import ... from '@/lib/beautician/types'` callers
// keep working.
import type { BannerLibraryEntry } from '@/lib/banners/library'
export type { BannerLibraryEntry }
export { resolveBanner, bannerNumber } from '@/lib/banners/library'

export const BANNER_LIBRARY: Record<string, Partial<Record<BeauticianServiceOffered, BannerLibraryEntry[]>>> = {
  '#EC4899': {
    makeup: [
      { url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2025,%202026,%2003_13_30%20PM.png?updatedAt=1779696825678', premium: true, price_idr: 100000 },
      { url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2025,%202026,%2003_12_21%20PM.png?updatedAt=1779696757728', premium: true, price_idr: 100000 },
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2026,%202026,%2012_45_35%20AM.png',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2025,%202026,%2002_59_45%20PM.png?updatedAt=1779696002126',
      'https://ik.imagekit.io/nepgaxllc/Untitledasdadasddsdasdasdsadasdsdads.png',
      'https://ik.imagekit.io/nepgaxllc/Untitledasdadasddsdasdasdsadasd.png',
      'https://ik.imagekit.io/nepgaxllc/Untitledasdadasddsdasdasd.png',
      'https://ik.imagekit.io/nepgaxllc/Untitledasdadasdds.png',
      'https://ik.imagekit.io/7grri5v7d/phil%201.png?updatedAt=1771624598125',
      'https://ik.imagekit.io/7grri5v7d/phil%202.png?updatedAt=1771624569672',
      'https://ik.imagekit.io/7grri5v7d/phil%203.png?updatedAt=1771624551780',
      'https://ik.imagekit.io/7grri5v7d/phil%205.png?updatedAt=1771624516872',
      'https://ik.imagekit.io/7grri5v7d/beauty%20woman.png?updatedAt=1773339036755',
      // 2026-06-08 — founder upload batch
      'https://ik.imagekit.io/pinky/ChatGPT%20Image%20Jun%208,%202026,%2012_37_59%20PM.png',
      'https://ik.imagekit.io/pinky/ChatGPT%20Image%20Jun%208,%202026,%2012_12_38%20PM.png',
      'https://ik.imagekit.io/pinky/ChatGPT%20Image%20Jun%208,%202026,%2012_11_04%20PM.png',
      'https://ik.imagekit.io/pinky/ChatGPT%20Image%20Jun%208,%202026,%2012_05_01%20PM.png',
      'https://ik.imagekit.io/pinky/ChatGPT%20Image%20Jun%208,%202026,%2012_04_32%20PM.png',
    ],
    nails: [
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2025,%202026,%2003_57_21%20PM.png?updatedAt=1779699457510',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2025,%202026,%2003_51_08%20PM.png?updatedAt=1779699090837',
      { url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2025,%202026,%2003_48_55%20PM.png?updatedAt=1779698955570', premium: true, price_idr: 100000 },
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2025,%202026,%2003_06_29%20PM.png?updatedAt=1779696404070',
      { url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2026,%202026,%2012_00_53%20AM.png?updatedAt=1779731173099', premium: true, price_idr: 100000 },
      'https://ik.imagekit.io/nepgaxllc/Untitleddasdasdasdasdasdsdadsdddsasddsdassd.png',
      'https://ik.imagekit.io/nepgaxllc/Untitleddasdasdasdasdasdsdadsdd.png',
      'https://ik.imagekit.io/nepgaxllc/Untitleddasdasdasdasdasdsdads.png',
      'https://ik.imagekit.io/nepgaxllc/Untitleddasdasdasdasdasd.png',
    ],
    hair: [
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2026,%202026,%2003_35_40%20AM.png',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2026,%202026,%2003_30_59%20AM.png',
      'https://ik.imagekit.io/nepgaxllc/Untitledasdadasddsdasdasdsadasdsdadsasdads.png',
      { url: 'https://ik.imagekit.io/nepgaxllc/Untitledsdasdasdasdasdasd.png?updatedAt=1779742990970', premium: true, price_idr: 100000 },
      { url: 'https://ik.imagekit.io/nepgaxllc/Untitledsdasdasdasd.png?updatedAt=1779742951105', premium: true, price_idr: 100000 },
      'https://ik.imagekit.io/nepgaxllc/Untitledasdadasddsdasdasdsadasdsdadsasdadssada.png?updatedAt=1779742541665',
      'https://ik.imagekit.io/nepgaxllc/Untitleddasdasdasdasdasdsdadsdddsasddsdassddasdaddsdsdasdasdasdasdd.png',
      'https://ik.imagekit.io/nepgaxllc/Untitleddasdasdasdasdasdsdadsdddsasddsdassddasdaddsdsdasdasdasdasddasd.png',
      'https://ik.imagekit.io/nepgaxllc/Untitleddasdasdasdasdasdsdadsdddsasddsdassddasdaddsdsdasdasdasdasddasdasdasd.png',
    ],
    whitening: [
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2025,%202026,%2003_25_02%20PM.png?updatedAt=1779697518329',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2025,%202026,%2003_21_50%20PM.png?updatedAt=1779697327386',
      'https://ik.imagekit.io/nepgaxllc/Untitledddsssssasdasddasdasd.png?updatedAt=1779696665376',
      'https://ik.imagekit.io/nepgaxllc/Untitleddasdasdasdasdasdsdadsdddsasddsdassddasdadd.png',
      'https://ik.imagekit.io/nepgaxllc/Untitleddasdasdasdasdasdsdadsdddsasddsdassddasdaddsds.png',
      { url: 'https://ik.imagekit.io/nepgaxllc/Untitleddasdasdasdasdasdsdadsdddsasddsdassddasdaddsdsdasd.png', premium: true, price_idr: 100000 },
      'https://ik.imagekit.io/nepgaxllc/Untitleddasdasdasdasdasdsdadsdddsasddsdassddasdaddsdsdasdasdasd.png',
    ],
    waxing: [
      { url: 'https://ik.imagekit.io/nepgaxllc/waxddddddddd.png', premium: true, price_idr: 100000 },
      'https://ik.imagekit.io/nepgaxllc/waxdddddd.png',
      'https://ik.imagekit.io/nepgaxllc/waxdddd.png',
      'https://ik.imagekit.io/nepgaxllc/waxdd.png',
      'https://ik.imagekit.io/nepgaxllc/waxd.png',
      'https://ik.imagekit.io/nepgaxllc/wax.png',
    ],
  },
  '#FACC15': {},
  '#F97316': {},
  '#B91C1C': {},
  '#9333EA': {},
  '#0D9488': {},
}

// ─────────────────────────────────────────────────────────────────────────
// "About" decorative image — auto-picked from the beautician's theme
// color. Each entry is the same illustration recoloured per palette
// family. When the theme hex falls outside the supported families
// (e.g. an unusual custom hex), aboutImageForTheme falls back to
// the gray variant so the section never renders empty.
// ─────────────────────────────────────────────────────────────────────────
export const ABOUT_IMAGE_BY_FAMILY = {
  red:    'https://ik.imagekit.io/nepgaxllc/red.png',
  orange: 'https://ik.imagekit.io/nepgaxllc/Untitledasdasdasdasdaaaa.png',
  yellow: 'https://ik.imagekit.io/nepgaxllc/Untitleddddas.png',
  green:  'https://ik.imagekit.io/nepgaxllc/Untitledasdasdasdaaaa.png',
  blue:   'https://ik.imagekit.io/nepgaxllc/Untitledccccc.png',
  purple: 'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadaaa.png',
  pink:   'https://ik.imagekit.io/nepgaxllc/Untitleddasdasdasdasdasdasdas.png',
  cream:  'https://ik.imagekit.io/nepgaxllc/da.png',
  gray:   'https://ik.imagekit.io/nepgaxllc/Untitleddasdaaaaaa.png',
} as const

/** Classify a hex into the broadest color family using HSL. Tuned so
 *  the entire Tailwind-style palette (Pink/Rose/Fuchsia/Purple/Violet/
 *  Blue/Sky/Cyan/Teal/Emerald/Green/Lime/Yellow/Amber/Orange/Red, plus
 *  Stone/Gray neutrals) lands on a sensible family. Returns null only
 *  when the hex string is malformed. */
export function classifyColorFamily(hex: string | null | undefined):
  keyof typeof ABOUT_IMAGE_BY_FAMILY | null {
  if (typeof hex !== 'string') return null
  const m = /^#([0-9A-Fa-f]{6})$/.exec(hex.trim())
  if (!m) return null
  const r = parseInt(m[1].slice(0, 2), 16) / 255
  const g = parseInt(m[1].slice(2, 4), 16) / 255
  const b = parseInt(m[1].slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  let h = 0
  let s = 0
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break
      case g: h = ((b - r) / d + 2) * 60; break
      case b: h = ((r - g) / d + 4) * 60; break
    }
  }
  // Neutrals first — desaturated colors don't read as any hue.
  if (s < 0.10) return 'gray'
  // Cream — warm pastel beige (high lightness, low-to-mid saturation,
  // hue in the orange/yellow band).
  if (l >= 0.82 && s <= 0.45 && h >= 20 && h <= 60) return 'cream'
  // Hue-based families. Pink is split off red so light-rose tones land
  // on the pink illustration instead of the red one.
  if (h >= 305 && h <= 345) return 'pink'
  if (h >= 260 && h <  305) return 'purple'
  if (h >= 170 && h <  260) return 'blue'
  if (h >=  72 && h <  170) return 'green'
  if (h >=  45 && h <   72) return 'yellow'
  if (h >=  18 && h <   45) return 'orange'
  // Red zone wraps around 0°. Light-end goes to pink, dark/strong to red.
  return l > 0.70 ? 'pink' : 'red'
}

/** Pick the About-section decorative image for a given theme hex.
 *  Falls back to the gray variant whenever the hex is missing or
 *  classifies outside the supported families. */
export function aboutImageForTheme(hex: string | null | undefined): string {
  const fam = classifyColorFamily(hex)
  if (!fam) return ABOUT_IMAGE_BY_FAMILY.gray
  return ABOUT_IMAGE_BY_FAMILY[fam]
}

/** All banners across categories for a theme color hex (case-insensitive). */
export function bannersForTheme(themeHex: string | null | undefined): string[] {
  if (!themeHex) return []
  const buckets = BANNER_LIBRARY[themeHex.toUpperCase()]
  if (!buckets) return []
  return Object.values(buckets).flat()
    .map((entry) => (typeof entry === 'string' ? entry : entry.url))
}

/** Banners for a specific theme + category combo (URL list only). */
export function bannersForThemeCategory(
  themeHex: string | null | undefined,
  category: BeauticianServiceOffered,
): string[] {
  if (!themeHex) return []
  const arr = BANNER_LIBRARY[themeHex.toUpperCase()]?.[category] ?? []
  return arr.map((entry) => (typeof entry === 'string' ? entry : entry.url))
}
