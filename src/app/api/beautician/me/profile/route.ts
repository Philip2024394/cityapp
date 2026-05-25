import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { isAllowedImageUrl, isValidKtpRef } from '@/lib/validation/images'
import { validateUniversalProfile } from '@/lib/validation/universalProfile'

export const runtime = 'nodejs'

type Body = {
  display_name?: string
  gender?: string
  years_experience?: number
  bio?: string
  price_makeup_idr?: number | null
  price_nail_idr?:   number | null
  price_hair_idr?:   number | null
  whatsapp_e164?: string
  city?: string
  service_area_notes?: string
  profile_image_url?: string
  ktp_image_url?: string
  // mig 0072 — universal profile extras
  cover_image_url?:    string | null
  gallery_image_urls?: string[]
  instagram_url?:      string | null
  tiktok_url?:         string | null
  facebook_url?:       string | null
  operating_hours?:    Record<string, string> | null
  certifications?:     string[]
  languages?:          string[]
  // mig 0073 services offered catalog
  services_offered?:   string[]
  // mig 0074 per-service photo gallery
  service_photos?:     Record<string, string[]>
}

const SERVICES_OFFERED_ALLOWLIST = new Set([
  'makeup','nails','hair','skin','lashes','brows',
  'waxing','facial','massage','henna','bridal','spa',
])

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
  if (typeof body.display_name === 'string') {
    const v = body.display_name.trim()
    if (v.length < 2) return NextResponse.json({ error: 'name_too_short' }, { status: 400 })
    update.display_name = v
  }
  if (body.gender === 'woman' || body.gender === 'man') update.gender = body.gender
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
  for (const k of ['price_makeup_idr','price_nail_idr','price_hair_idr'] as const) {
    const v = priceOrNull(body[k])
    if (v !== undefined) update[k] = v
  }
  if (typeof body.whatsapp_e164 === 'string') {
    const wa = body.whatsapp_e164.replace(/\s|-/g, '')
    if (!/^\+?\d{8,15}$/.test(wa)) return NextResponse.json({ error: 'invalid_whatsapp' }, { status: 400 })
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

  if (body.service_photos !== undefined) {
    const sp = body.service_photos
    if (sp === null || typeof sp !== 'object' || Array.isArray(sp)) {
      return NextResponse.json({ error: 'invalid_service_photos' }, { status: 400 })
    }
    const cleaned: Record<string, string[]> = {}
    for (const [k, v] of Object.entries(sp)) {
      if (!SERVICES_OFFERED_ALLOWLIST.has(k)) {
        return NextResponse.json({ error: 'invalid_service_photo_key' }, { status: 400 })
      }
      if (!Array.isArray(v)) {
        return NextResponse.json({ error: 'invalid_service_photo_array' }, { status: 400 })
      }
      if (v.length > 4) {
        return NextResponse.json({ error: 'too_many_photos_for_service' }, { status: 400 })
      }
      const urls: string[] = []
      for (const u of v) {
        if (typeof u !== 'string') {
          return NextResponse.json({ error: 'invalid_service_photo_url' }, { status: 400 })
        }
        const trimmed = u.trim()
        if (!trimmed) continue
        if (!isAllowedImageUrl(trimmed)) {
          return NextResponse.json({ error: 'invalid_service_photo_host' }, { status: 400 })
        }
        urls.push(trimmed)
      }
      if (urls.length > 0) cleaned[k] = urls
    }
    update.service_photos = cleaned
  }

  if (body.services_offered !== undefined) {
    if (!Array.isArray(body.services_offered)) {
      return NextResponse.json({ error: 'invalid_services_offered' }, { status: 400 })
    }
    if (body.services_offered.length > 12) {
      return NextResponse.json({ error: 'too_many_services_offered' }, { status: 400 })
    }
    const cleaned: string[] = []
    for (const s of body.services_offered) {
      if (typeof s !== 'string' || !SERVICES_OFFERED_ALLOWLIST.has(s)) {
        return NextResponse.json({ error: 'invalid_service_offered' }, { status: 400 })
      }
      if (!cleaned.includes(s)) cleaned.push(s)
    }
    update.services_offered = cleaned
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 })
  }
  update.updated_at = new Date().toISOString()

  const { error } = await admin
    .from('beautician_providers')
    .update(update)
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
