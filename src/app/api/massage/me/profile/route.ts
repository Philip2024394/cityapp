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
}

const ALLOWED_MASSAGE_TYPES = [
  'balinese','javanese','lulur','pijat_tradisional','refleksi',
  'thai','shiatsu','tui_na',
  'swedish','deep_tissue','sports','aromatherapy','hot_stone',
  'trigger_point','lymphatic','prenatal','myofascial',
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
