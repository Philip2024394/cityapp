import {
  renderSharedFlyer,
  type FlyerService,
} from '@/lib/_shared/flyer'

// 1080×1920 WhatsApp Status flyer for the laundry vertical. Laundry has
// no service_photos column — the three package columns are the only
// pricing surface, so we render them directly.
export type FlyerInput = {
  display_name:      string
  theme_color?:      string | null
  profile_image_url?: string | null
  city?:             string | null
  whatsapp_e164?:    string | null
  slug:              string
  price_wash_per_kg_idr?:      number | null
  price_wash_dry_per_kg_idr?:  number | null
  price_wash_iron_per_kg_idr?: number | null
}

export function renderFlyer(input: FlyerInput) {
  const services: FlyerService[] = []
  if (input.price_wash_per_kg_idr != null) {
    services.push({ label: 'Wash · per kg',       price: input.price_wash_per_kg_idr })
  }
  if (input.price_wash_dry_per_kg_idr != null) {
    services.push({ label: 'Wash + Dry · per kg', price: input.price_wash_dry_per_kg_idr })
  }
  if (input.price_wash_iron_per_kg_idr != null) {
    services.push({ label: 'Wash + Iron · per kg', price: input.price_wash_iron_per_kg_idr })
  }
  return renderSharedFlyer({
    vertical_slug:  'laundry',
    vertical_label: 'laundry',
    display_name:      input.display_name,
    theme_color:       input.theme_color,
    profile_image_url: input.profile_image_url,
    city:              input.city,
    whatsapp_e164:     input.whatsapp_e164,
    slug:              input.slug,
    services,
  })
}
