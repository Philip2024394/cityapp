import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { ALL_SPECIALTIES, MAX_HANDYMAN_SPECIALTIES } from '@/lib/handyman/types'
import { isAllowedImageUrl, isValidKtpRef } from '@/lib/validation/images'
import { validateUniversalProfile } from '@/lib/validation/universalProfile'

export const runtime = 'nodejs'

const ALLOWED = new Set<string>(ALL_SPECIALTIES)
const MAX_SERVICE_PHOTOS = 12
const MAX_PHOTO_NAME     = 60
const MAX_PHOTO_DESC     = 500
const HEX_RE             = /^#[0-9a-fA-F]{6}$/
const DATE_RE            = /^\d{4}-\d{2}-\d{2}$/
const ALLOWED_HERO_EFFECT = new Set(['none','shimmer','dance','underline'])

type ServicePhotoIn = {
  url:                string
  name?:              string | null
  description?:       string | null
  price_idr?:         number | null
  before_image_url?:  string | null
  after_image_url?:   string | null
  object_position?:   string | null
}

type Body = {
  display_name?: string
  years_experience?: number
  bio?: string
  specialties?: string[]
  hourly_rate_idr?: number | null
  day_rate_idr?: number | null
  has_own_tools?: boolean
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
  // mig 0087 + 0089 + 0091 — profile-parity fields handyman gained for
  // the polished /handyman/[slug] page. All optional.
  theme_color?:           string | null
  service_photos?:        ServicePhotoIn[]
  hero_text?:             {
    line1?:         string | null
    line2?:         string | null
    tagline?:       string | null
    color?:         string | null
    line1_color?:   string | null
    tagline_color?: string | null
    effect?:        string | null
  } | null
  promo_text?:            string | null
  busy_dates?:            string[]
  has_physical_location?: boolean
  latitude?:              number | null
  longitude?:             number | null
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
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }

  const update: Record<string, unknown> = {}
  if (typeof body.display_name === 'string') {
    const v = body.display_name.trim()
    if (v.length < 2) return NextResponse.json({ error: 'name_too_short' }, { status: 400 })
    update.display_name = v
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
  if (Array.isArray(body.specialties)) {
    const valid = body.specialties
      .filter((s): s is string => typeof s === 'string' && ALLOWED.has(s))
      .slice(0, MAX_HANDYMAN_SPECIALTIES)
    if (valid.length === 0) return NextResponse.json({ error: 'at_least_one_specialty' }, { status: 400 })
    update.specialties = valid
  }
  for (const k of ['hourly_rate_idr','day_rate_idr'] as const) {
    const v = priceOrNull(body[k])
    if (v !== undefined) update[k] = v
  }
  if (typeof body.has_own_tools === 'boolean') update.has_own_tools = body.has_own_tools
  if (typeof body.whatsapp_e164 === 'string') {
    const wa = body.whatsapp_e164.replace(/\s|-/g, '')
    if (!/^\+?\d{8,15}$/.test(wa)) return NextResponse.json({ error: 'invalid_whatsapp' }, { status: 400 })
    update.whatsapp_e164 = wa
  }
  if (typeof body.city === 'string')               update.city = body.city.trim() || null
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

  // theme_color — hex string, mig 0087
  if (body.theme_color !== undefined) {
    if (body.theme_color === null) {
      update.theme_color = null
    } else if (typeof body.theme_color === 'string' && HEX_RE.test(body.theme_color)) {
      update.theme_color = body.theme_color.toUpperCase()
    } else {
      return NextResponse.json({ error: 'invalid_theme_color' }, { status: 400 })
    }
  }

  // service_photos — flat JSONB array (mig 0089). Validates per entry +
  // caps the list. Image URLs must be on the allowlist.
  if (body.service_photos !== undefined) {
    if (!Array.isArray(body.service_photos)) {
      return NextResponse.json({ error: 'invalid_service_photos' }, { status: 400 })
    }
    if (body.service_photos.length > MAX_SERVICE_PHOTOS) {
      return NextResponse.json({ error: 'too_many_service_photos' }, { status: 400 })
    }
    const cleaned: ServicePhotoIn[] = []
    for (const raw of body.service_photos) {
      if (!raw || typeof raw !== 'object') return NextResponse.json({ error: 'invalid_photo_entry' }, { status: 400 })
      const url = typeof raw.url === 'string' ? raw.url.trim() : ''
      if (!url || !isAllowedImageUrl(url)) return NextResponse.json({ error: 'invalid_photo_url' }, { status: 400 })
      const entry: ServicePhotoIn = { url }
      if (typeof raw.name === 'string') {
        const v = raw.name.trim()
        if (v.length > MAX_PHOTO_NAME) return NextResponse.json({ error: 'photo_name_too_long' }, { status: 400 })
        entry.name = v || null
      }
      if (typeof raw.description === 'string') {
        const v = raw.description.trim()
        if (v.length > MAX_PHOTO_DESC) return NextResponse.json({ error: 'photo_desc_too_long' }, { status: 400 })
        entry.description = v || null
      }
      if (raw.price_idr !== undefined && raw.price_idr !== null) {
        const n = typeof raw.price_idr === 'number' ? raw.price_idr : Number(raw.price_idr)
        if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: 'invalid_photo_price' }, { status: 400 })
        entry.price_idr = Math.round(n)
      } else if (raw.price_idr === null) {
        entry.price_idr = null
      }
      for (const k of ['before_image_url','after_image_url'] as const) {
        const v = raw[k]
        if (v === undefined) continue
        if (v === null) { entry[k] = null; continue }
        if (typeof v !== 'string') return NextResponse.json({ error: `invalid_${k}` }, { status: 400 })
        const trimmed = v.trim()
        if (trimmed && !isAllowedImageUrl(trimmed)) return NextResponse.json({ error: `invalid_${k}` }, { status: 400 })
        entry[k] = trimmed || null
      }
      if (typeof raw.object_position === 'string') {
        const v = raw.object_position.trim()
        if (v.length > 40) return NextResponse.json({ error: 'invalid_object_position' }, { status: 400 })
        entry.object_position = v || null
      }
      cleaned.push(entry)
    }
    update.service_photos = cleaned
  }

  // hero_text — JSONB shape (mig 0091). Pass null to clear back to defaults.
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
        if (trimmed.length > 60) return NextResponse.json({ error: `${k}_too_long` }, { status: 400 })
        if (trimmed) ht[k] = trimmed
      }
      for (const k of ['color','line1_color','tagline_color'] as const) {
        const v = src[k]
        if (v === undefined || v === null) continue
        if (typeof v !== 'string' || !HEX_RE.test(v)) return NextResponse.json({ error: `invalid_${k}` }, { status: 400 })
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

  // promo_text — marquee text, 280 char cap (mig 0089).
  if (body.promo_text !== undefined) {
    if (body.promo_text === null) {
      update.promo_text = null
    } else if (typeof body.promo_text === 'string') {
      const v = body.promo_text.trim()
      if (v.length > 280) return NextResponse.json({ error: 'promo_text_too_long' }, { status: 400 })
      update.promo_text = v || null
    } else {
      return NextResponse.json({ error: 'invalid_promo_text' }, { status: 400 })
    }
  }

  // busy_dates — YYYY-MM-DD strings (mig 0089). Empty array allowed.
  if (body.busy_dates !== undefined) {
    if (!Array.isArray(body.busy_dates)) return NextResponse.json({ error: 'invalid_busy_dates' }, { status: 400 })
    if (body.busy_dates.length > 365) return NextResponse.json({ error: 'too_many_busy_dates' }, { status: 400 })
    const cleaned: string[] = []
    for (const d of body.busy_dates) {
      if (typeof d !== 'string' || !DATE_RE.test(d)) return NextResponse.json({ error: 'invalid_busy_date_entry' }, { status: 400 })
      cleaned.push(d)
    }
    update.busy_dates = cleaned
  }

  // has_physical_location + lat/lng (mig 0089).
  if (typeof body.has_physical_location === 'boolean') update.has_physical_location = body.has_physical_location
  if (body.latitude !== undefined) {
    if (body.latitude === null) {
      update.latitude = null
    } else {
      const n = typeof body.latitude === 'number' ? body.latitude : Number(body.latitude)
      if (!Number.isFinite(n) || n < -90 || n > 90) return NextResponse.json({ error: 'invalid_latitude' }, { status: 400 })
      update.latitude = n
    }
  }
  if (body.longitude !== undefined) {
    if (body.longitude === null) {
      update.longitude = null
    } else {
      const n = typeof body.longitude === 'number' ? body.longitude : Number(body.longitude)
      if (!Number.isFinite(n) || n < -180 || n > 180) return NextResponse.json({ error: 'invalid_longitude' }, { status: 400 })
      update.longitude = n
    }
  }

  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 })
  update.updated_at = new Date().toISOString()

  const { error } = await admin.from('handyman_providers').update(update).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
