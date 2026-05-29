// ============================================================================
// CityRiders social share banner library
// ----------------------------------------------------------------------------
// Pre-composed marketing banners drivers + affiliates can share to their
// own WhatsApp / Instagram / Facebook / TikTok. Banners carry the
// CityRiders brand mark + URL on them already; the driver/affiliate is
// not personally identified in the image. This intentionally keeps the
// composer dead simple (pick + share, no canvas overlay) while still
// giving the sharer credit via the URL parameter on the landing page.
//
// Structure mirrors the existing BannerLibrary shape from
// @/lib/banners/library so the SAME categories can be surfaced in the
// driver dashboard composer AND the affiliate Banner Studio (which
// lives in the StreetLocal landing app and reads banner data over HTTP
// — once that's wired, this file becomes the single source of truth).
//
// Categories are keyed by lowercase-kebab IDs but display the
// human-readable label in pickers.
// ============================================================================

export type SocialBannerCategoryId =
  | 'ride-and-car-service-booking'  // public ride+car-service promotion + recruitment

export type SocialBanner = {
  id:          string             // stable slug — used in quota + tracking
  category:    SocialBannerCategoryId
  url:         string             // imagekit URL
  aspect:      '16:9' | '4:5' | '1:1' | '9:16'
  intent:      'customer' | 'driver_recruit' | 'community'
  // Short caption the driver can paste alongside the image on WhatsApp /
  // Instagram. Bilingual (Indonesian first, English fallback).
  caption_id:  string
  caption_en:  string
  // Brief admin-side label so the picker shows a sensible name.
  label:       string
}

// Display labels for the categories — used in pickers + affiliate
// Banner Studio.
export const SOCIAL_BANNER_CATEGORY_LABELS: Record<SocialBannerCategoryId, string> = {
  'ride-and-car-service-booking': 'Ride and Car service booking',
}

export const SOCIAL_BANNERS: ReadonlyArray<SocialBanner> = [
  {
    id:         'cr-customer-komunitas-motor-1',
    category:   'ride-and-car-service-booking',
    url:        'https://ik.imagekit.io/nepgaxllc/banner1.png?updatedAt=1780079737307',
    aspect:     '16:9',
    intent:     'customer',
    label:      'Komunitas Motor, Untuk Indonesia',
    caption_id: 'Pesan motor untuk antar paket, jemput penumpang, dan order makanan langsung via WhatsApp — tanpa aplikasi. www.cityriders.id',
    caption_en: 'Book a motorbike for parcel delivery, passenger pickup, or food orders — direct via WhatsApp, no app needed. www.cityriders.id',
  },
  {
    id:         'cr-recruit-gabung-driver-1',
    category:   'ride-and-car-service-booking',
    url:        'https://ik.imagekit.io/nepgaxllc/banner2.png?updatedAt=1780079802610',
    aspect:     '16:9',
    intent:     'driver_recruit',
    label:      'Gabung Jadi Driver City Rider',
    caption_id: 'Gabung jadi driver City Rider! Penghasilan maksimal tanpa komisi, tentukan harga sendiri, bebas waktu. www.cityriders.id',
    caption_en: 'Drive with City Rider! Keep 100% of earnings, set your own prices, work on your schedule. www.cityriders.id',
  },
  {
    id:         'cr-community-motor-lokal-1',
    category:   'ride-and-car-service-booking',
    url:        'https://ik.imagekit.io/nepgaxllc/banner3.png?updatedAt=1780079888381',
    aspect:     '16:9',
    intent:     'community',
    label:      'Motor, Lokal, Kebanggaan Nasional',
    caption_id: 'Dukung pengendara motor Indonesia. Tanpa komisi, komunitas solid. www.cityriders.id',
    caption_en: 'Support Indonesian motorbike riders. No platform commission, strong community. www.cityriders.id',
  },
]

// Group banners by category — pickers iterate this for the section
// headers. Empty categories are pre-declared so the picker can show
// "Coming soon" slots when we expand the library.
export function getBannersByCategory(): Record<SocialBannerCategoryId, SocialBanner[]> {
  const out: Record<SocialBannerCategoryId, SocialBanner[]> = {
    'ride-and-car-service-booking': [],
  }
  for (const b of SOCIAL_BANNERS) {
    out[b.category].push(b)
  }
  return out
}

// Monthly quota cap. Free with the driver's Rp 38.000 subscription.
export const SOCIAL_QUOTA_MONTHLY = 20
