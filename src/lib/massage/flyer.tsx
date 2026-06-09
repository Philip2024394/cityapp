import {
  pickFromKeyedPhotos,
  renderSharedFlyer,
  type FlyerService,
} from '@/lib/_shared/flyer'

// 1080×1920 WhatsApp Status flyer for the massage vertical. Massage
// uses Record<tier, photoUrl[]> for service_photos — entries are bare
// URLs, so labels come from the key (60min / 90min / 120min) and
// prices come from the three tier columns.
export type FlyerInput = {
  display_name:      string
  theme_color?:      string | null
  profile_image_url?: string | null
  city?:             string | null
  whatsapp_e164?:    string | null
  slug:              string
  service_photos?:   Record<string, string[]> | null
  price_60min_idr?:  number | null
  price_90min_idr?:  number | null
  price_120min_idr?: number | null
}

function tierLabel(k: string): string {
  const m: Record<string, string> = {
    '60min':  '60 min',
    '90min':  '90 min',
    '120min': '120 min',
  }
  return m[k] ?? k
}

export function renderFlyer(input: FlyerInput) {
  function priceFor(key: string): number | null {
    if (key === '60min')  return input.price_60min_idr  ?? null
    if (key === '90min')  return input.price_90min_idr  ?? null
    if (key === '120min') return input.price_120min_idr ?? null
    return null
  }

  let services = pickFromKeyedPhotos(input.service_photos, tierLabel, priceFor)
  if (services.length === 0) {
    const fb: FlyerService[] = []
    if (input.price_60min_idr  != null) fb.push({ label: '60 min',  price: input.price_60min_idr })
    if (input.price_90min_idr  != null) fb.push({ label: '90 min',  price: input.price_90min_idr })
    if (input.price_120min_idr != null) fb.push({ label: '120 min', price: input.price_120min_idr })
    services = fb.slice(0, 3)
  }

  return renderSharedFlyer({
    vertical_slug:  'massage',
    vertical_label: 'massage',
    display_name:      input.display_name,
    theme_color:       input.theme_color,
    profile_image_url: input.profile_image_url,
    city:              input.city,
    whatsapp_e164:     input.whatsapp_e164,
    slug:              input.slug,
    services,
  })
}
