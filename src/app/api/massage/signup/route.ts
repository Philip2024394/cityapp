import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { slugify } from '@/lib/massage/slug'
import { isAllowedImageUrl, isValidKtpRef } from '@/lib/validation/images'

// POST /api/massage/signup
// Creates a massage_providers row owned by the authenticated user. Status
// starts at 'pending' until an admin verifies the uploaded KTP.

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

  const name   = (body.display_name || '').trim()
  const bio    = (body.bio          || '').trim()
  const gender = body.gender
  const wa     = (body.whatsapp_e164 || '').trim()

  if (!name || name.length < 2) return NextResponse.json({ error: 'name_required' }, { status: 400 })
  if (gender !== 'woman' && gender !== 'man') return NextResponse.json({ error: 'gender_required' }, { status: 400 })
  if (!bio) return NextResponse.json({ error: 'bio_required' }, { status: 400 })
  if (bio.length > 300) return NextResponse.json({ error: 'bio_too_long' }, { status: 400 })
  if (!wa || !/^\+?\d{8,15}$/.test(wa.replace(/\s|-/g, ''))) {
    return NextResponse.json({ error: 'whatsapp_required' }, { status: 400 })
  }

  const yrs = Number(body.years_experience ?? 0)
  if (!Number.isFinite(yrs) || yrs < 0 || yrs > 60) {
    return NextResponse.json({ error: 'invalid_years' }, { status: 400 })
  }

  const massageType = (ALLOWED_MASSAGE_TYPES as ReadonlyArray<string>).includes(body.massage_type ?? '')
    ? (body.massage_type as string)
    : 'balinese'

  const p60  = Number(body.price_60min_idr  ?? 0)
  const p90  = Number(body.price_90min_idr  ?? 0)
  const p120 = Number(body.price_120min_idr ?? 0)
  for (const v of [p60, p90, p120]) {
    if (!Number.isFinite(v) || v < 0) {
      return NextResponse.json({ error: 'invalid_price' }, { status: 400 })
    }
  }

  if (body.profile_image_url && !isAllowedImageUrl(body.profile_image_url)) {
    return NextResponse.json({ error: 'invalid_image_url' }, { status: 400 })
  }
  if (body.ktp_image_url && !isValidKtpRef(body.ktp_image_url, user.id)) {
    return NextResponse.json({ error: 'invalid_ktp' }, { status: 400 })
  }

  // Generate a unique slug — append -2, -3 on collision.
  const base = slugify(name)
  let slug = base
  for (let i = 2; i <= 9; i++) {
    const { data: existing } = await admin
      .from('massage_providers').select('id').eq('slug', slug).maybeSingle()
    if (!existing) break
    slug = `${base}-${i}`
    if (i === 9) return NextResponse.json({ error: 'slug_collision' }, { status: 409 })
  }

  const { data, error } = await admin
    .from('massage_providers')
    .insert({
      user_id:          user.id,
      slug,
      display_name:     name,
      gender,
      years_experience: yrs,
      bio,
      massage_type:     massageType,
      price_60min_idr:  Math.round(p60),
      price_90min_idr:  Math.round(p90),
      price_120min_idr: Math.round(p120),
      whatsapp_e164:    wa.replace(/\s|-/g, ''),
      city:               (body.city || '').trim() || null,
      service_area_notes: (body.service_area_notes || '').trim() || null,
      profile_image_url:  (body.profile_image_url || '').trim() || null,
      ktp_image_url:      (body.ktp_image_url || '').trim() || null,
      availability: 'offline',
      status: 'pending',
    })
    .select('id, slug, status')
    .single()

  if (error) {
    console.error('[massage/signup] insert failed', { code: error.code, message: error.message, details: error.details })
    if (error.code === '23505') {
      return NextResponse.json({ error: 'already_registered' }, { status: 409 })
    }
    return NextResponse.json({ error: 'insert_failed', detail: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, provider: data })
}
