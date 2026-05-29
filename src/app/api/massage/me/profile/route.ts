import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { isAllowedImageUrl, isValidKtpRef } from '@/lib/validation/images'
import { validateUniversalProfile } from '@/lib/validation/universalProfile'

// POST /api/massage/me/profile
// Owner-only update of editable profile fields. NEVER touches status,
// verified_*, subscription_*, slug, user_id — those are admin-controlled
// or set at signup. Slug is intentionally locked after creation (it lives
// in URLs / WhatsApp shares).

export const runtime = 'nodejs'

type Body = {
  display_name?: string
  gender?: string
  years_experience?: number
  bio?: string
  massage_type?: string
  price_60min_idr?: number
  price_90min_idr?: number
  price_120min_idr?: number
  whatsapp_e164?: string
  city?: string
  service_area_notes?: string
  profile_image_url?: string
  ktp_image_url?: string
  cover_image_url?:    string | null
  gallery_image_urls?: string[]
  instagram_url?:      string | null
  tiktok_url?:         string | null
  facebook_url?:       string | null
  operating_hours?:    Record<string, string> | null
  certifications?:     string[]
  languages?:          string[]
  // mig 0088 — service modes
  service_locations?:     Array<'home' | 'hotel' | 'villa'>
  has_physical_location?: boolean
  latitude?:              number | null
  longitude?:             number | null
  // mig 0087 per-profile theme accent color
  theme_color?: string | null
  // mig 0104 — feature parity with beautician
  hero_text?: {
    line1?:         string
    line2?:         string
    tagline?:       string
    color?:         string
    line1_color?:   string
    tagline_color?: string
    effect?:        string
  } | null
  promo_text?: string | null
  marketplace_categories?: string[]
  busy_dates?: string[]
  service_photos?: Record<string, Array<string | {
    url:          string
    name?:        string
    description?: string
    price_idr?:   number | null
  }>>
}

const ALLOWED_MASSAGE_TYPES = [
  'balinese','javanese','lulur','pijat_tradisional','refleksi',
  'thai','shiatsu','tui_na',
  'swedish','deep_tissue','sports','aromatherapy','hot_stone',
  'trigger_point','lymphatic','prenatal','myofascial',
  // mig 0124 — trending & traditional additions
  'cupping','couples','gua_sha',
  'other',
] as const

export async function POST(req: Request) {
  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  let body: Body
  try { body = (await req.json()) as Body } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}

  if (typeof body.display_name === 'string') {
    const v = body.display_name.trim()
    if (v.length < 2) return NextResponse.json({ error: 'name_too_short' }, { status: 400 })
    update.display_name = v
  }
  if (body.gender === 'woman' || body.gender === 'man') update.gender = body.gender
  if (typeof body.massage_type === 'string' &&
      (ALLOWED_MASSAGE_TYPES as ReadonlyArray<string>).includes(body.massage_type)) {
    update.massage_type = body.massage_type
  }
  if (typeof body.bio === 'string') {
    const v = body.bio.trim()
    if (v.length > 300) return NextResponse.json({ error: 'bio_too_long' }, { status: 400 })
    update.bio = v
  }
  if (typeof body.years_experience === 'number') {
    if (body.years_experience < 0 || body.years_experience > 60) {
      return NextResponse.json({ error: 'invalid_years' }, { status: 400 })
    }
    update.years_experience = Math.round(body.years_experience)
  }
  for (const k of ['price_60min_idr','price_90min_idr','price_120min_idr'] as const) {
    const v = body[k]
    if (typeof v === 'number') {
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: 'invalid_price' }, { status: 400 })
      }
      update[k] = Math.round(v)
    }
  }
  if (typeof body.whatsapp_e164 === 'string') {
    const wa = body.whatsapp_e164.replace(/\s|-/g, '')
    if (!/^\+?\d{8,15}$/.test(wa)) {
      return NextResponse.json({ error: 'invalid_whatsapp' }, { status: 400 })
    }
    update.whatsapp_e164 = wa
  }
  if (typeof body.city === 'string') update.city = body.city.trim() || null
  if (typeof body.service_area_notes === 'string') update.service_area_notes = body.service_area_notes.trim() || null
  if (typeof body.profile_image_url === 'string') {
    const v = body.profile_image_url.trim() || null
    if (v && !isAllowedImageUrl(v)) return NextResponse.json({ error: 'invalid_image_url' }, { status: 400 })
    update.profile_image_url = v
  }
  if (typeof body.ktp_image_url === 'string') {
    const v = body.ktp_image_url.trim() || null
    if (v && !isValidKtpRef(v, user.id)) return NextResponse.json({ error: 'invalid_ktp' }, { status: 400 })
    update.ktp_image_url = v
  }

  const universal = validateUniversalProfile(body)
  if (!universal.ok) return NextResponse.json({ error: universal.error }, { status: 400 })
  Object.assign(update, universal.fields)

  // Service modes (mig 0088) — service_locations array + spa toggle + lat/lng.
  if (body.service_locations !== undefined) {
    if (!Array.isArray(body.service_locations)) {
      return NextResponse.json({ error: 'invalid_service_locations' }, { status: 400 })
    }
    const allowed = new Set(['home','hotel','villa'])
    const cleaned: string[] = []
    for (const v of body.service_locations) {
      if (typeof v !== 'string' || !allowed.has(v)) {
        return NextResponse.json({ error: 'invalid_service_location_entry' }, { status: 400 })
      }
      if (!cleaned.includes(v)) cleaned.push(v)
    }
    update.service_locations = cleaned
  }
  if (typeof body.has_physical_location === 'boolean') {
    update.has_physical_location = body.has_physical_location
  }
  if (body.latitude !== undefined) {
    if (body.latitude === null) update.latitude = null
    else {
      const n = typeof body.latitude === 'number' ? body.latitude : Number(body.latitude)
      if (!Number.isFinite(n) || n < -90 || n > 90) {
        return NextResponse.json({ error: 'invalid_latitude' }, { status: 400 })
      }
      update.latitude = n
    }
  }
  if (body.longitude !== undefined) {
    if (body.longitude === null) update.longitude = null
    else {
      const n = typeof body.longitude === 'number' ? body.longitude : Number(body.longitude)
      if (!Number.isFinite(n) || n < -180 || n > 180) {
        return NextResponse.json({ error: 'invalid_longitude' }, { status: 400 })
      }
      update.longitude = n
    }
  }

  // theme_color — per-profile accent (mig 0087)
  if (body.theme_color !== undefined) {
    if (body.theme_color === null || body.theme_color === '') {
      update.theme_color = null
    } else if (typeof body.theme_color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(body.theme_color)) {
      return NextResponse.json({ error: 'invalid_theme_color' }, { status: 400 })
    } else {
      update.theme_color = body.theme_color.toUpperCase()
    }
  }

  // hero_text (mig 0104 — mirrors beautician mig 0081)
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

  // promo_text (mig 0104 — running marquee)
  if (body.promo_text !== undefined) {
    if (body.promo_text === null || body.promo_text === '') {
      update.promo_text = null
    } else if (typeof body.promo_text !== 'string') {
      return NextResponse.json({ error: 'invalid_promo_text' }, { status: 400 })
    } else {
      const trimmed = body.promo_text.trim()
      if (trimmed.length > 500) {
        return NextResponse.json({ error: 'promo_text_too_long' }, { status: 400 })
      }
      update.promo_text = trimmed || null
    }
  }

  // marketplace_categories — subset of allowed MassageType values, max 3.
  if (body.marketplace_categories !== undefined) {
    if (!Array.isArray(body.marketplace_categories)) {
      return NextResponse.json({ error: 'invalid_marketplace_categories' }, { status: 400 })
    }
    if (body.marketplace_categories.length > 3) {
      return NextResponse.json({ error: 'too_many_marketplace_categories' }, { status: 400 })
    }
    const allowed = new Set<string>(ALLOWED_MASSAGE_TYPES as ReadonlyArray<string>)
    const cleaned: string[] = []
    for (const c of body.marketplace_categories) {
      if (typeof c !== 'string' || !allowed.has(c)) {
        return NextResponse.json({ error: 'invalid_marketplace_category' }, { status: 400 })
      }
      if (!cleaned.includes(c)) cleaned.push(c)
    }
    update.marketplace_categories = cleaned
  }

  // busy_dates — array of ISO YYYY-MM-DD strings.
  if (body.busy_dates !== undefined) {
    if (!Array.isArray(body.busy_dates)) {
      return NextResponse.json({ error: 'invalid_busy_dates' }, { status: 400 })
    }
    const cleaned: string[] = []
    for (const d of body.busy_dates) {
      if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        return NextResponse.json({ error: 'invalid_busy_date' }, { status: 400 })
      }
      if (!cleaned.includes(d)) cleaned.push(d)
    }
    update.busy_dates = cleaned
  }

  // service_photos — Record<categoryId, photo[]> (mirrors beautician mig 0074).
  if (body.service_photos !== undefined) {
    const sp = body.service_photos
    if (sp === null || typeof sp !== 'object' || Array.isArray(sp)) {
      return NextResponse.json({ error: 'invalid_service_photos' }, { status: 400 })
    }
    const allowedCats = new Set<string>(ALLOWED_MASSAGE_TYPES as ReadonlyArray<string>)
    const cleaned: Record<string, Array<Record<string, unknown>>> = {}
    for (const [k, v] of Object.entries(sp)) {
      if (!allowedCats.has(k)) {
        return NextResponse.json({ error: 'invalid_service_photo_key' }, { status: 400 })
      }
      if (!Array.isArray(v)) {
        return NextResponse.json({ error: 'invalid_service_photo_array' }, { status: 400 })
      }
      if (v.length > 4) {
        return NextResponse.json({ error: 'too_many_photos_for_service' }, { status: 400 })
      }
      const entries: Array<Record<string, unknown>> = []
      for (const raw of v) {
        let url: string, name: string | undefined, description: string | undefined, price: number | null | undefined
        if (typeof raw === 'string') {
          url = raw.trim()
        } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
          const o = raw as Record<string, unknown>
          if (typeof o.url !== 'string') {
            return NextResponse.json({ error: 'invalid_service_photo_url' }, { status: 400 })
          }
          url = o.url.trim()
          if (o.name !== undefined) {
            if (typeof o.name !== 'string') return NextResponse.json({ error: 'invalid_photo_name' }, { status: 400 })
            const n = o.name.trim()
            if (n.length > 60) return NextResponse.json({ error: 'photo_name_too_long' }, { status: 400 })
            name = n || undefined
          }
          if (o.description !== undefined) {
            if (typeof o.description !== 'string') return NextResponse.json({ error: 'invalid_photo_description' }, { status: 400 })
            const d = o.description.trim()
            if (d.length > 500) return NextResponse.json({ error: 'photo_description_too_long' }, { status: 400 })
            description = d || undefined
          }
          if (o.price_idr !== undefined && o.price_idr !== null) {
            if (typeof o.price_idr !== 'number' || !Number.isFinite(o.price_idr) || o.price_idr < 0) {
              return NextResponse.json({ error: 'invalid_photo_price' }, { status: 400 })
            }
            price = Math.round(o.price_idr)
          } else if (o.price_idr === null) {
            price = null
          }
        } else {
          return NextResponse.json({ error: 'invalid_service_photo_entry' }, { status: 400 })
        }
        if (!url) continue
        if (!isAllowedImageUrl(url)) {
          return NextResponse.json({ error: 'invalid_service_photo_host' }, { status: 400 })
        }
        const entry: Record<string, unknown> = { url }
        if (name)                entry.name = name
        if (description)         entry.description = description
        if (price !== undefined) entry.price_idr = price
        entries.push(entry)
      }
      if (entries.length > 0) cleaned[k] = entries
    }
    update.service_photos = cleaned
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 })
  }
  update.updated_at = new Date().toISOString()

  const { data, error } = await admin
    .from('massage_providers')
    .update(update)
    .eq('user_id', user.id)
    .select('id, slug')
    .single()

  if (error) {
    console.error('[massage/me/profile] update failed', error)
    return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'no_provider_row' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
