import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { isAllowedImageUrl } from '@/lib/validation/images'
import { validateUniversalProfile } from '@/lib/validation/universalProfile'
// NOTE(phase-2): bike_rentals has live runtime columns (theme_color,
// hero_text, promo_text, services_offered, has_physical_location) that the
// regenerated typed schema is missing. Keep payload as Record<string,unknown>
// until those columns are added to src/types/supabase.ts (Phase 1 follow-up).

export const runtime = 'nodejs'

const HEX_RE              = /^#[0-9a-fA-F]{6}$/
const ALLOWED_HERO_EFFECT = new Set(['none','shimmer','dance','underline'])
const ALLOWED_BIKE_TYPES  = new Set([
  'matic','sport','adventure','bebek','vespa','classic','big_bike','electric',
])
const ALLOWED_RENTAL_MODES = new Set(['self_ride','with_driver','both'])
const ALLOWED_TRANSMISSION = new Set(['automatic','manual','semi_auto'])

type Body = {
  // Owner
  owner_name?:    string
  owner_company?: string | null
  whatsapp_e164?: string
  city?:          string
  // Bio / description
  description?:  string | null
  // Universal profile extras (mig 0072)
  cover_image_url?:    string | null
  gallery_image_urls?: string[]
  instagram_url?:      string | null
  tiktok_url?:         string | null
  facebook_url?:       string | null
  operating_hours?:    Record<string, string> | null
  certifications?:     string[]
  languages?:          string[]
  // Image gallery (bike_rentals-specific) — `image_urls`, not gallery.
  image_urls?: string[]
  // Vehicle specs
  brand?:        string
  model?:        string
  year?:         number | null
  cc?:           number | null
  transmission?: string
  color?:        string | null
  bike_type?:    string | null
  helmet_count?:   number | null
  raincoat_count?: number | null
  // Delivery toggles
  has_phone_holder?:  boolean
  has_phone_charger?: boolean
  has_delivery_box?:  boolean
  delivers_to_hotel?: boolean
  delivers_to_villa?: boolean
  pickup_dropoff?:    boolean
  // Pricing — required tier
  daily_price_idr?:      number | null
  weekly_price_idr?:     number | null
  monthly_price_idr?:    number | null
  security_deposit_idr?: number | null
  // Pricing — with-driver tier
  rental_mode?:            string
  driver_rate_per_day_idr?: number | null
  tour_3h_idr?: number | null
  tour_6h_idr?: number | null
  tour_8h_idr?: number | null
  // Location
  has_physical_location?: boolean
  lat?:        number | null
  lng?:        number | null
  // Catalog discriminator (mig 0129)
  services_offered?: string[]
  // Theme + hero (mig 0129)
  theme_color?: string | null
  hero_text?: {
    line1?:         string | null
    line2?:         string | null
    tagline?:       string | null
    color?:         string | null
    line1_color?:   string | null
    tagline_color?: string | null
    effect?:        string | null
  } | null
  promo_text?: string | null
}

function priceOrNull(v: unknown): number | null | undefined {
  if (v === undefined) return undefined
  if (v === null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null
}

export async function POST(req: Request) {
  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })
  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  let body: Body
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}

  // Owner ----------------------------------------------------------------
  if (typeof body.owner_name === 'string') {
    const v = body.owner_name.trim()
    if (v.length < 2) return NextResponse.json({ error: 'name_too_short' }, { status: 400 })
    update.owner_name = v
  }
  if (body.owner_company !== undefined) {
    if (body.owner_company === null) update.owner_company = null
    else if (typeof body.owner_company === 'string') update.owner_company = body.owner_company.trim() || null
    else return NextResponse.json({ error: 'invalid_owner_company' }, { status: 400 })
  }
  if (typeof body.whatsapp_e164 === 'string') {
    const wa = body.whatsapp_e164.replace(/\s|-/g, '')
    if (!/^\+?\d{8,15}$/.test(wa)) return NextResponse.json({ error: 'invalid_whatsapp' }, { status: 400 })
    update.owner_whatsapp_e164 = wa
  }
  if (typeof body.city === 'string') {
    const v = body.city.trim()
    if (!v) return NextResponse.json({ error: 'invalid_city' }, { status: 400 })
    update.city = v
  }
  if (body.description !== undefined) {
    if (body.description === null) update.description = null
    else if (typeof body.description === 'string') {
      const v = body.description.trim()
      if (v.length > 500) return NextResponse.json({ error: 'description_too_long' }, { status: 400 })
      update.description = v || null
    } else {
      return NextResponse.json({ error: 'invalid_description' }, { status: 400 })
    }
  }

  // Universal extras (mig 0072) -----------------------------------------
  const universal = validateUniversalProfile(body)
  if (!universal.ok) return NextResponse.json({ error: universal.error }, { status: 400 })
  // bike_rentals has cover_image_url + socials + operating_hours +
  // certifications + languages, but NOT gallery_image_urls (it uses
  // image_urls instead). Strip the gallery key before merging.
  const universalFields = { ...universal.fields }
  delete universalFields.gallery_image_urls
  Object.assign(update, universalFields)

  // image_urls (bike_rentals' own gallery column) ------------------------
  if (body.image_urls !== undefined) {
    if (!Array.isArray(body.image_urls)) {
      return NextResponse.json({ error: 'invalid_image_urls' }, { status: 400 })
    }
    if (body.image_urls.length > 12) {
      return NextResponse.json({ error: 'image_urls_too_long' }, { status: 400 })
    }
    const cleaned: string[] = []
    for (const url of body.image_urls) {
      if (typeof url !== 'string') return NextResponse.json({ error: 'invalid_image_url_entry' }, { status: 400 })
      const v = url.trim()
      if (!v) continue
      if (!isAllowedImageUrl(v)) return NextResponse.json({ error: 'invalid_image_url_host' }, { status: 400 })
      cleaned.push(v)
    }
    update.image_urls = cleaned
  }

  // Vehicle specs -------------------------------------------------------
  if (typeof body.brand === 'string') {
    const v = body.brand.trim()
    if (!v) return NextResponse.json({ error: 'invalid_brand' }, { status: 400 })
    if (v.length > 60) return NextResponse.json({ error: 'brand_too_long' }, { status: 400 })
    update.brand = v
  }
  if (typeof body.model === 'string') {
    const v = body.model.trim()
    if (!v) return NextResponse.json({ error: 'invalid_model' }, { status: 400 })
    if (v.length > 60) return NextResponse.json({ error: 'model_too_long' }, { status: 400 })
    update.model = v
  }
  if (body.year !== undefined) {
    if (body.year === null) update.year = null
    else {
      const n = typeof body.year === 'number' ? body.year : Number(body.year)
      if (!Number.isFinite(n) || n < 1980 || n > 2100) {
        return NextResponse.json({ error: 'invalid_year' }, { status: 400 })
      }
      update.year = Math.round(n)
    }
  }
  if (body.cc !== undefined) {
    if (body.cc === null) update.cc = null
    else {
      const n = typeof body.cc === 'number' ? body.cc : Number(body.cc)
      if (!Number.isFinite(n) || n < 0 || n > 2500) {
        return NextResponse.json({ error: 'invalid_cc' }, { status: 400 })
      }
      update.cc = Math.round(n)
    }
  }
  if (typeof body.transmission === 'string') {
    if (!ALLOWED_TRANSMISSION.has(body.transmission)) {
      return NextResponse.json({ error: 'invalid_transmission' }, { status: 400 })
    }
    update.transmission = body.transmission
  }
  if (body.color !== undefined) {
    if (body.color === null) update.color = null
    else if (typeof body.color === 'string') update.color = body.color.trim() || null
    else return NextResponse.json({ error: 'invalid_color' }, { status: 400 })
  }
  if (body.bike_type !== undefined) {
    if (body.bike_type === null) update.bike_type = null
    else if (typeof body.bike_type === 'string' && ALLOWED_BIKE_TYPES.has(body.bike_type)) {
      update.bike_type = body.bike_type
    } else {
      return NextResponse.json({ error: 'invalid_bike_type' }, { status: 400 })
    }
  }
  for (const k of ['helmet_count','raincoat_count'] as const) {
    const v = body[k]
    if (v === undefined) continue
    if (v === null) { update[k] = null; continue }
    const n = typeof v === 'number' ? v : Number(v)
    if (!Number.isFinite(n) || n < 0 || n > 10) {
      return NextResponse.json({ error: `invalid_${k}` }, { status: 400 })
    }
    update[k] = Math.round(n)
  }

  // Delivery toggles ----------------------------------------------------
  for (const k of [
    'has_phone_holder','has_phone_charger','has_delivery_box',
    'delivers_to_hotel','delivers_to_villa','pickup_dropoff',
  ] as const) {
    const v = body[k]
    if (v === undefined) continue
    if (typeof v !== 'boolean') return NextResponse.json({ error: `invalid_${k}` }, { status: 400 })
    update[k] = v
  }

  // Pricing -------------------------------------------------------------
  for (const k of [
    'daily_price_idr','weekly_price_idr','monthly_price_idr',
    'security_deposit_idr','driver_rate_per_day_idr',
    'tour_3h_idr','tour_6h_idr','tour_8h_idr',
  ] as const) {
    const v = priceOrNull(body[k])
    if (v !== undefined) update[k] = v
  }

  if (typeof body.rental_mode === 'string') {
    if (!ALLOWED_RENTAL_MODES.has(body.rental_mode)) {
      return NextResponse.json({ error: 'invalid_rental_mode' }, { status: 400 })
    }
    update.rental_mode = body.rental_mode
  }

  // Location ------------------------------------------------------------
  if (typeof body.has_physical_location === 'boolean') {
    update.has_physical_location = body.has_physical_location
  }
  if (body.lat !== undefined) {
    if (body.lat === null) update.lat = null
    else {
      const n = typeof body.lat === 'number' ? body.lat : Number(body.lat)
      if (!Number.isFinite(n) || n < -90 || n > 90) {
        return NextResponse.json({ error: 'invalid_lat' }, { status: 400 })
      }
      update.lat = n
    }
  }
  if (body.lng !== undefined) {
    if (body.lng === null) update.lng = null
    else {
      const n = typeof body.lng === 'number' ? body.lng : Number(body.lng)
      if (!Number.isFinite(n) || n < -180 || n > 180) {
        return NextResponse.json({ error: 'invalid_lng' }, { status: 400 })
      }
      update.lng = n
    }
  }

  // services_offered (mig 0129) — single-element bike_type discriminator
  if (body.services_offered !== undefined) {
    if (!Array.isArray(body.services_offered)) {
      return NextResponse.json({ error: 'invalid_services_offered' }, { status: 400 })
    }
    const cleaned: string[] = []
    for (const s of body.services_offered) {
      if (typeof s !== 'string' || !ALLOWED_BIKE_TYPES.has(s)) {
        return NextResponse.json({ error: 'invalid_service_offered' }, { status: 400 })
      }
      if (!cleaned.includes(s)) cleaned.push(s)
    }
    if (cleaned.length > 1) {
      return NextResponse.json({ error: 'too_many_services_offered' }, { status: 400 })
    }
    update.services_offered = cleaned
  }

  // theme_color (mig 0129) ----------------------------------------------
  if (body.theme_color !== undefined) {
    if (body.theme_color === null || body.theme_color === '') {
      update.theme_color = null
    } else if (typeof body.theme_color === 'string' && HEX_RE.test(body.theme_color)) {
      update.theme_color = body.theme_color.toUpperCase()
    } else {
      return NextResponse.json({ error: 'invalid_theme_color' }, { status: 400 })
    }
  }

  // hero_text (mig 0129) ------------------------------------------------
  if (body.hero_text !== undefined) {
    if (body.hero_text === null) {
      update.hero_text = null
    } else if (typeof body.hero_text === 'object' && !Array.isArray(body.hero_text)) {
      const ht: Record<string, string> = {}
      const src = body.hero_text
      for (const k of ['line1','line2','tagline'] as const) {
        const v = src[k]
        if (v === undefined || v === null) continue
        if (typeof v !== 'string') return NextResponse.json({ error: `invalid_${k}` }, { status: 400 })
        const trimmed = v.trim()
        const max = k === 'tagline' ? 80 : 30
        if (trimmed.length > max) return NextResponse.json({ error: `${k}_too_long` }, { status: 400 })
        if (trimmed) ht[k] = trimmed
      }
      for (const k of ['color','line1_color','tagline_color'] as const) {
        const v = src[k]
        if (v === undefined || v === null) continue
        if (typeof v !== 'string' || !HEX_RE.test(v)) {
          return NextResponse.json({ error: `invalid_${k}` }, { status: 400 })
        }
        ht[k] = v.toUpperCase()
      }
      if (src.effect !== undefined && src.effect !== null) {
        if (typeof src.effect !== 'string' || !ALLOWED_HERO_EFFECT.has(src.effect)) {
          return NextResponse.json({ error: 'invalid_hero_effect' }, { status: 400 })
        }
        ht.effect = src.effect
      }
      update.hero_text = Object.keys(ht).length > 0 ? ht : null
    } else {
      return NextResponse.json({ error: 'invalid_hero_text' }, { status: 400 })
    }
  }

  // promo_text (mig 0129) -----------------------------------------------
  if (body.promo_text !== undefined) {
    if (body.promo_text === null || body.promo_text === '') {
      update.promo_text = null
    } else if (typeof body.promo_text === 'string') {
      const trimmed = body.promo_text.trim()
      if (trimmed.length > 500) return NextResponse.json({ error: 'promo_text_too_long' }, { status: 400 })
      update.promo_text = trimmed || null
    } else {
      return NextResponse.json({ error: 'invalid_promo_text' }, { status: 400 })
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 })
  }
  update.updated_at = new Date().toISOString()

  // Fetch the target listing row first — bike_rentals can have many rows
  // per owner so we always patch the most-recently-updated one (same row
  // /api/rent/me returns to the editor).
  const { data: target, error: fetchErr } = await admin
    .from('bike_rentals')
    .select('id')
    .eq('owner_user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (fetchErr) {
    return NextResponse.json({ error: 'fetch_failed', detail: fetchErr.message }, { status: 500 })
  }
  if (!target) {
    return NextResponse.json({ error: 'no_listing_found' }, { status: 404 })
  }

  const { error } = await admin
    .from('bike_rentals')
    .update(update)
    .eq('id', target.id)
    .eq('owner_user_id', user.id)
  if (error) return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
