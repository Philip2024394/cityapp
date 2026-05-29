// Social platform specs for the promo Share preview modal — image
// aspect ratios, character limits, hashtag conventions, and OG-card
// shapes. Single source of truth so the AI prompt + ImageKit crop +
// mockup rendering all agree.
//
// Ratios source: each platform's 2026 published guidelines (Instagram
// Help Center, X Media specs, etc.). Tweaked toward the safest "won't
// get cropped on any device" shape rather than the maximum allowed.

export type PlatformId =
  | 'instagram_feed'
  | 'instagram_story'
  | 'tiktok'
  | 'facebook'
  | 'x'
  | 'snapchat'
  | 'whatsapp'

export type PlatformSpec = {
  id:           PlatformId
  label:        string
  /** Image aspect ratio as a tuple — used to build the ImageKit crop. */
  ratio:        [number, number]
  /** Output width hint for ImageKit. ImageKit auto-derives height
   *  from the aspect ratio so we don't have to. */
  width:        number
  /** Caption character limit. 0 = no practical limit. */
  captionMax:   number
  /** Recommended hashtag count, used by the AI prompt + modal copy. */
  hashtagCount: number
  /** Hint string shown on the modal under the mockup. */
  hint:         string
  /** Use the short caption (ai_caption_short) instead of the body. */
  useShort:     boolean
  /** Sharing pattern: 'image' = post the image directly (TikTok / IG),
   *  'link' = paste the promo URL into the platform (WhatsApp / X). */
  sharePattern: 'image' | 'link'
}

export const PLATFORMS: ReadonlyArray<PlatformSpec> = [
  {
    id: 'instagram_feed',
    label: 'Instagram Feed',
    ratio: [1, 1],
    width: 1080,
    captionMax: 2200,
    hashtagCount: 5,
    hint: 'Square 1:1. Post the image, paste the caption + hashtags.',
    useShort: false,
    sharePattern: 'image',
  },
  {
    id: 'instagram_story',
    label: 'Instagram Story',
    ratio: [9, 16],
    width: 1080,
    captionMax: 120,
    hashtagCount: 2,
    hint: '9:16 vertical. Post + add a Link sticker so taps go to the promo page.',
    useShort: true,
    sharePattern: 'image',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    ratio: [9, 16],
    width: 1080,
    captionMax: 300,
    hashtagCount: 5,
    hint: '9:16 vertical. Drop the link in your bio — TikTok strips links in captions.',
    useShort: false,
    sharePattern: 'image',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    ratio: [1.91, 1],
    width: 1200,
    captionMax: 0,
    hashtagCount: 0,
    hint: 'Landscape 1.91:1. Paste the promo URL — Facebook unfurls the card automatically.',
    useShort: false,
    sharePattern: 'link',
  },
  {
    id: 'x',
    label: 'X (Twitter)',
    ratio: [1.91, 1],
    width: 1200,
    captionMax: 280,
    hashtagCount: 2,
    hint: 'Large image card. 280 char limit including the URL.',
    useShort: true,
    sharePattern: 'link',
  },
  {
    id: 'snapchat',
    label: 'Snapchat',
    ratio: [9, 16],
    width: 1080,
    captionMax: 80,
    hashtagCount: 0,
    hint: '9:16 vertical. Add a Link sticker — Snapchat doesn\'t use hashtags.',
    useShort: true,
    sharePattern: 'image',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    ratio: [1, 1],
    width: 600,
    captionMax: 0,
    hashtagCount: 0,
    hint: 'Paste the promo link in chat or Status — WhatsApp shows the OG card preview.',
    useShort: true,
    sharePattern: 'link',
  },
] as const

/** Lookup by id with fallback so callers don't need null-checks. */
export function getPlatform(id: PlatformId): PlatformSpec {
  return PLATFORMS.find((p) => p.id === id) ?? PLATFORMS[0]
}

// ─────────────────────────────────────────────────────────────────────
// ImageKit transformation helper
// ─────────────────────────────────────────────────────────────────────
//
// All provider photos live at ik.imagekit.io/nepgaxllc/<file>. ImageKit
// accepts a `?tr=` query string with comma-separated transformations.
// We pass aspect ratio + width; ImageKit calculates the height + crops
// from the centre by default (good enough for portrait-of-person shots).
//
// Non-ImageKit URLs are returned unmodified — Supabase storage URLs
// don't support these params; the mockup falls back to the original.

const IK_HOST = 'ik.imagekit.io'

export function imagekitCrop(url: string, ratio: [number, number], width: number): string {
  if (!url) return url
  try {
    const u = new URL(url)
    if (u.hostname !== IK_HOST) return url
    const tr = [
      `ar-${ratio[0]}-${ratio[1]}`,
      `w-${width}`,
      'c-maintain_ratio',
      'fo-center',
    ].join(',')
    u.searchParams.set('tr', tr)
    return u.toString()
  } catch {
    return url
  }
}
