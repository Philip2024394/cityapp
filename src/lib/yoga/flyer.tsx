import {
  pickFromFlatPhotos,
  renderSharedFlyer,
  type FlatPhotoEntry,
} from '@/lib/_shared/flyer'

// 1080×1920 WhatsApp Status flyer for the yoga vertical.
export type FlyerInput = {
  display_name:      string
  theme_color?:      string | null
  profile_image_url?: string | null
  city?:             string | null
  whatsapp_e164?:    string | null
  slug:              string
  service_photos?:   FlatPhotoEntry[] | null
  hourly_rate_idr?:  number | null
  day_rate_idr?:     number | null
}

export function renderFlyer(input: FlyerInput) {
  const services = pickFromFlatPhotos(input.service_photos, {
    hourly: input.hourly_rate_idr,
    day:    input.day_rate_idr,
    hourlyLabel: 'Drop-in class',
    dayLabel:    'Monthly unlimited',
  })
  return renderSharedFlyer({
    vertical_slug:  'yoga',
    vertical_label: 'yoga',
    display_name:      input.display_name,
    theme_color:       input.theme_color,
    profile_image_url: input.profile_image_url,
    city:              input.city,
    whatsapp_e164:     input.whatsapp_e164,
    slug:              input.slug,
    services,
  })
}
