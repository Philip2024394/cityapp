import {
  pickFromKeyedPhotos,
  renderSharedFlyer,
  type FlyerService,
} from '@/lib/_shared/flyer'

// 1080×1920 WhatsApp Status flyer for the facial vertical. Facial
// reuses BeauticianServicePhoto so service_photos is
// Partial<Record<FacialServiceOffered, BeauticianServicePhoto[]>>.
// Falls back to 60/90/120-min tier prices when no entries exist.
export type FlyerInput = {
  display_name:      string
  theme_color?:      string | null
  profile_image_url?: string | null
  city?:             string | null
  whatsapp_e164?:    string | null
  slug:              string
  service_photos?:   Record<string, Array<{ name?: string; price_idr?: number | null }>> | null
  price_60min_idr?:  number | null
  price_90min_idr?:  number | null
  price_120min_idr?: number | null
}

const SERVICE_LABELS: Record<string, string> = {
  basic:      'Basic facial',
  deep:       'Deep cleansing',
  hydrating:  'Hydrating facial',
  anti_aging: 'Anti-aging',
  acne:       'Acne treatment',
  brightening:'Brightening',
  collagen:   'Collagen',
  peel:       'Chemical peel',
  microderm:  'Microdermabrasion',
}

function labelFor(k: string): string {
  return SERVICE_LABELS[k] ?? k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function renderFlyer(input: FlyerInput) {
  let services = pickFromKeyedPhotos(input.service_photos, labelFor, () => null)
  if (services.length === 0) {
    const fb: FlyerService[] = []
    if (input.price_60min_idr  != null) fb.push({ label: '60 min',  price: input.price_60min_idr  })
    if (input.price_90min_idr  != null) fb.push({ label: '90 min',  price: input.price_90min_idr  })
    if (input.price_120min_idr != null) fb.push({ label: '120 min', price: input.price_120min_idr })
    services = fb.slice(0, 3)
  }
  return renderSharedFlyer({
    vertical_slug:  'facial',
    vertical_label: 'facial',
    display_name:      input.display_name,
    theme_color:       input.theme_color,
    profile_image_url: input.profile_image_url,
    city:              input.city,
    whatsapp_e164:     input.whatsapp_e164,
    slug:              input.slug,
    services,
  })
}
