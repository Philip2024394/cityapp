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
  cover_image_url?:    string | null
  gallery_image_urls?: string[] | null
  languages?:          string[] | null
  instagram_url?:      string | null
  tiktok_url?:         string | null
  facebook_url?:       string | null
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
  // mig 0079 — Physical Visit Us location (opt-in)
  has_physical_location?: boolean
  latitude?:  number | null
  longitude?: number | null
  // mig 0081 — Customisable hero overlay text + effect.
  hero_text?: BeauticianHeroText | null
  // mig 0082 — Running marquee text under the portfolio carousel.
  promo_text?: string | null
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
export type BeauticianServicePhoto = {
  url:          string
  name?:        string         // header — e.g. "Nail Art"
  description?: string         // ≤500 chars including spaces
  price_idr?:   number | null  // start price, IDR
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
export type BannerLibraryEntry = string | { url: string; premium?: boolean; price_idr?: number }

/** Resolve any entry to its canonical { url, premium, price_idr } object. */
export function resolveBanner(entry: BannerLibraryEntry): { url: string; premium: boolean; price_idr: number } {
  if (typeof entry === 'string') return { url: entry, premium: false, price_idr: 0 }
  return { url: entry.url, premium: !!entry.premium, price_idr: entry.price_idr ?? 100000 }
}

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

/** Stable per-URL number 1–9999 (djb2 hash). Same URL always returns the
 *  same number, so the admin can tell us "make #452 premium" and we can
 *  find the exact entry by hashing each URL until the match. */
export function bannerNumber(url: string): number {
  let h = 5381
  for (let i = 0; i < url.length; i++) {
    h = ((h << 5) + h + url.charCodeAt(i)) | 0
  }
  return (Math.abs(h) % 9999) + 1
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
