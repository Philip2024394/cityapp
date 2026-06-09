import {
  pickFromKeyedPhotos,
  renderSharedFlyer,
} from '@/lib/_shared/flyer'

// 1080×1920 WhatsApp Status flyer for the home-clean vertical.
// service_photos is Partial<Record<HomeCleanService, HomeCleanServicePhoto[]>>
// (keyed-object shape mirroring beautician mig 0074). Falls back to
// hourly/day rate columns when no entries exist.
export type FlyerInput = {
  display_name:      string
  theme_color?:      string | null
  profile_image_url?: string | null
  city?:             string | null
  whatsapp_e164?:    string | null
  slug:              string
  service_photos?:   Record<string, Array<{ name?: string; price_idr?: number | null }>> | null
  hourly_rate_idr?:  number | null
  day_rate_idr?:     number | null
}

const SERVICE_LABELS: Record<string, string> = {
  general:  'General clean',
  deep:     'Deep clean',
  move_in:  'Move-in clean',
  move_out: 'Move-out clean',
  office:   'Office clean',
  kitchen:  'Kitchen clean',
  bathroom: 'Bathroom clean',
  windows:  'Window clean',
}

function labelFor(k: string): string {
  return SERVICE_LABELS[k] ?? k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function renderFlyer(input: FlyerInput) {
  let services = pickFromKeyedPhotos(input.service_photos, labelFor, () => null)
  if (services.length === 0) {
    if (input.hourly_rate_idr != null) {
      services.push({ label: 'Per hour', price: input.hourly_rate_idr })
    }
    if (input.day_rate_idr != null) {
      services.push({ label: 'Per day · 8h', price: input.day_rate_idr })
    }
  }
  return renderSharedFlyer({
    vertical_slug:  'home-clean',
    vertical_label: 'home clean',
    display_name:      input.display_name,
    theme_color:       input.theme_color,
    profile_image_url: input.profile_image_url,
    city:              input.city,
    whatsapp_e164:     input.whatsapp_e164,
    slug:              input.slug,
    services,
  })
}
