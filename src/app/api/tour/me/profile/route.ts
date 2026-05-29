import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { isAllowedImageUrl } from '@/lib/validation/images'
import { validateUniversalProfile } from '@/lib/validation/universalProfile'
import { TOUR_SERVICE_IDS, MAX_TOUR_SERVICES } from '@/data/tourServices'

// /api/tour/me/profile — partial-update PATCH-as-POST for the signed-in
// user's tour_guide_listings row. Mirrors /api/beautician/me/profile but
// only validates the fields the tour WYSIWYG editor + service-defaults
// section actually send (hero_text, theme_color, cover_image_url,
// promo_text, services, name, notes, day_rate_idr, lat/lng,
// fuel_included, bike_brand, image_urls).

export const runtime = 'nodejs'

type HeroText = {
  line1?:         string
  line2?:         string
  tagline?:       string
  color?:         string
  line1_color?:   string
  tagline_color?: string
  effect?:        string
}

type Body = {
  name?:           string
  notes?:          string | null
  whatsapp_e164?:  string
  city?:           string
  address?:        string | null
  lat?:            number | null
  lng?:            number | null
  day_rate_idr?:   number | null
  services?:       string[]
  image_urls?:     string[]
  cover_image_url?: string | null
  theme_color?:    string | null
  hero_text?:      HeroText | null
  promo_text?:     string | null
  fuel_included?:  boolean
  bike_brand?:     string
  // Universal profile extras (mig 0072) — validated by the shared helper.
  gallery_image_urls?: string[]
  instagram_url?:      string | null
  tiktok_url?:         string | null
  facebook_url?:       string | null
  operating_hours?:    Record<string, string> | null
  certifications?:     string[]
  languages?:          string[]
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
  try { body = await req.json() as Body } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}

  if (typeof body.name === 'string') {
    const v = body.name.trim()
    if (v.length < 2) return NextResponse.json({ error: 'name_too_short' }, { status: 400 })
    update.name = v
  }
  if (body.notes !== undefined) {
    if (body.notes === null) {
      update.notes = null
    } else if (typeof body.notes !== 'string') {
      return NextResponse.json({ error: 'invalid_notes' }, { status: 400 })
    } else {
      const v = body.notes.trim()
      if (v.length > 240) return NextResponse.json({ error: 'notes_too_long' }, { status: 400 })
      update.notes = v || null
    }
  }
  if (typeof body.whatsapp_e164 === 'string') {
    const wa = body.whatsapp_e164.replace(/\s|-/g, '')
    if (!/^\+?\d{8,15}$/.test(wa)) return NextResponse.json({ error: 'invalid_whatsapp' }, { status: 400 })
    update.whatsapp_e164 = wa
  }
  if (typeof body.city === 'string') update.city = body.city.trim() || null
  if (body.address !== undefined) {
    if (body.address === null) update.address = null
    else if (typeof body.address !== 'string') return NextResponse.json({ error: 'invalid_address' }, { status: 400 })
    else update.address = body.address.trim() || null
  }

  // Coordinates — keep lat + lng paired, derive PostGIS point when both present.
  if (body.lat !== undefined) {
    if (body.lat === null) update.lat = null
    else if (typeof body.lat !== 'number' || !Number.isFinite(body.lat) || body.lat < -90 || body.lat > 90) {
      return NextResponse.json({ error: 'invalid_lat' }, { status: 400 })
    } else update.lat = body.lat
  }
  if (body.lng !== undefined) {
    if (body.lng === null) update.lng = null
    else if (typeof body.lng !== 'number' || !Number.isFinite(body.lng) || body.lng < -180 || body.lng > 180) {
      return NextResponse.json({ error: 'invalid_lng' }, { status: 400 })
    } else update.lng = body.lng
  }
  if (typeof update.lat === 'number' && typeof update.lng === 'number') {
    update.location = `SRID=4326;POINT(${update.lng} ${update.lat})`
  }

  const dr = priceOrNull(body.day_rate_idr)
  if (dr !== undefined) update.day_rate_idr = dr

  if (body.services !== undefined) {
    if (!Array.isArray(body.services)) return NextResponse.json({ error: 'invalid_services' }, { status: 400 })
    const allowed = new Set<string>(TOUR_SERVICE_IDS as readonly string[])
    const cleaned: string[] = []
    for (const s of body.services) {
      if (typeof s !== 'string' || !allowed.has(s)) {
        return NextResponse.json({ error: 'invalid_service' }, { status: 400 })
      }
      if (!cleaned.includes(s)) cleaned.push(s)
    }
    if (cleaned.length > MAX_TOUR_SERVICES) cleaned.length = MAX_TOUR_SERVICES
    update.services = cleaned
  }

  if (body.image_urls !== undefined) {
    if (!Array.isArray(body.image_urls)) return NextResponse.json({ error: 'invalid_image_urls' }, { status: 400 })
    if (body.image_urls.length > 12) return NextResponse.json({ error: 'too_many_images' }, { status: 400 })
    const cleaned: string[] = []
    for (const u of body.image_urls) {
      if (typeof u !== 'string') return NextResponse.json({ error: 'invalid_image_entry' }, { status: 400 })
      const v = u.trim()
      if (!v) continue
      if (!isAllowedImageUrl(v)) return NextResponse.json({ error: 'invalid_image_host' }, { status: 400 })
      cleaned.push(v)
    }
    update.image_urls = cleaned
  }

  if (body.cover_image_url !== undefined) {
    if (body.cover_image_url === null || body.cover_image_url === '') {
      update.cover_image_url = null
    } else if (typeof body.cover_image_url !== 'string') {
      return NextResponse.json({ error: 'invalid_cover_url' }, { status: 400 })
    } else {
      const v = body.cover_image_url.trim()
      if (!isAllowedImageUrl(v)) return NextResponse.json({ error: 'invalid_cover_host' }, { status: 400 })
      update.cover_image_url = v
    }
  }

  // Universal extras (gallery_image_urls / socials / hours / certs /
  // languages). Tour guides own their own languages list elsewhere — we
  // still accept the universal field here so the editor stays generic.
  const universal = validateUniversalProfile(body)
  if (!universal.ok) return NextResponse.json({ error: universal.error }, { status: 400 })
  // Don't let the universal validator clobber cover_image_url we already validated.
  const { cover_image_url: _univCover, ...universalRest } = universal.fields as Record<string, unknown>
  void _univCover
  Object.assign(update, universalRest)

  if (body.theme_color !== undefined) {
    if (body.theme_color === null || body.theme_color === '') {
      update.theme_color = null
    } else if (typeof body.theme_color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(body.theme_color)) {
      return NextResponse.json({ error: 'invalid_theme_color' }, { status: 400 })
    } else {
      update.theme_color = body.theme_color.toUpperCase()
    }
  }

  if (body.hero_text !== undefined) {
    if (body.hero_text === null) {
      update.hero_text = null
    } else if (typeof body.hero_text !== 'object' || Array.isArray(body.hero_text)) {
      return NextResponse.json({ error: 'invalid_hero_text' }, { status: 400 })
    } else {
      const ht = body.hero_text
      const ALLOWED_EFFECTS = new Set(['none','shimmer','dance','underline'])
      const cleaned: Record<string, unknown> = {}
      if (ht.line1 !== undefined) {
        if (typeof ht.line1 !== 'string') return NextResponse.json({ error: 'invalid_hero_line1' }, { status: 400 })
        const v = ht.line1.trim()
        if (v.length > 30) return NextResponse.json({ error: 'hero_line1_too_long' }, { status: 400 })
        if (v) cleaned.line1 = v
      }
      if (ht.line2 !== undefined) {
        if (typeof ht.line2 !== 'string') return NextResponse.json({ error: 'invalid_hero_line2' }, { status: 400 })
        const v = ht.line2.trim()
        if (v.length > 30) return NextResponse.json({ error: 'hero_line2_too_long' }, { status: 400 })
        if (v) cleaned.line2 = v
      }
      if (ht.tagline !== undefined) {
        if (typeof ht.tagline !== 'string') return NextResponse.json({ error: 'invalid_hero_tagline' }, { status: 400 })
        const v = ht.tagline.trim()
        if (v.length > 80) return NextResponse.json({ error: 'hero_tagline_too_long' }, { status: 400 })
        if (v) cleaned.tagline = v
      }
      if (ht.color !== undefined) {
        if (typeof ht.color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(ht.color)) {
          return NextResponse.json({ error: 'invalid_hero_color' }, { status: 400 })
        }
        cleaned.color = ht.color.toUpperCase()
      }
      for (const k of ['line1_color','tagline_color'] as const) {
        const v = (ht as Record<string, unknown>)[k]
        if (v === undefined) continue
        if (typeof v !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(v)) {
          return NextResponse.json({ error: `invalid_${k}` }, { status: 400 })
        }
        cleaned[k] = v.toUpperCase()
      }
      if (ht.effect !== undefined) {
        if (typeof ht.effect !== 'string' || !ALLOWED_EFFECTS.has(ht.effect)) {
          return NextResponse.json({ error: 'invalid_hero_effect' }, { status: 400 })
        }
        cleaned.effect = ht.effect
      }
      update.hero_text = Object.keys(cleaned).length ? cleaned : null
    }
  }

  if (body.promo_text !== undefined) {
    if (body.promo_text === null || body.promo_text === '') {
      update.promo_text = null
    } else if (typeof body.promo_text !== 'string') {
      return NextResponse.json({ error: 'invalid_promo_text' }, { status: 400 })
    } else {
      const trimmed = body.promo_text.trim()
      if (trimmed.length > 500) return NextResponse.json({ error: 'promo_text_too_long' }, { status: 400 })
      update.promo_text = trimmed || null
    }
  }

  if (body.fuel_included !== undefined) {
    if (typeof body.fuel_included !== 'boolean') {
      return NextResponse.json({ error: 'invalid_fuel_included' }, { status: 400 })
    }
    update.fuel_included = body.fuel_included
  }
  if (body.bike_brand !== undefined) {
    if (typeof body.bike_brand !== 'string') {
      return NextResponse.json({ error: 'invalid_bike_brand' }, { status: 400 })
    }
    const v = body.bike_brand.trim()
    if (v.length > 40) return NextResponse.json({ error: 'bike_brand_too_long' }, { status: 400 })
    update.bike_brand = v || 'Honda'
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 })
  }
  update.updated_at = new Date().toISOString()

  const { error } = await admin
    .from('tour_guide_listings')
    .update(update)
    .eq('owner_user_id', user.id)
  if (error) return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
