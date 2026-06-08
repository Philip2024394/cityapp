import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { slugify } from '@/lib/barber/slug'
import { ALL_SPECIALTIES, MAX_BARBER_SPECIALTIES, type BarberSpecialty } from '@/lib/barber/types'
import { isAllowedImageUrl, isValidKtpRef } from '@/lib/validation/images'

export const runtime = 'nodejs'

const ALLOWED = new Set<string>(ALL_SPECIALTIES)

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
}

function priceOrNull(v: number | null | undefined): number | null {
  if (v === null || v === undefined) return null
  return Number.isFinite(v) && v >= 0 ? Math.round(v) : null
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

  const name = (body.display_name || '').trim()
  const bio  = (body.bio || '').trim()
  const wa   = (body.whatsapp_e164 || '').trim()
  if (!name || name.length < 2) return NextResponse.json({ error: 'name_required' }, { status: 400 })
  if (!bio || bio.length > 300)  return NextResponse.json({ error: 'bio_required' }, { status: 400 })
  if (!wa || !/^\+?\d{8,15}$/.test(wa.replace(/\s|-/g, ''))) {
    return NextResponse.json({ error: 'whatsapp_required' }, { status: 400 })
  }
  const yrs = Number(body.years_experience ?? 0)
  if (!Number.isFinite(yrs) || yrs < 0 || yrs > 60) {
    return NextResponse.json({ error: 'invalid_years' }, { status: 400 })
  }

  const specialties = (body.specialties ?? [])
    .filter((s): s is string => typeof s === 'string')
    .filter((s) => ALLOWED.has(s))
    .slice(0, MAX_BARBER_SPECIALTIES) as BarberSpecialty[]
  if (specialties.length === 0) {
    return NextResponse.json({ error: 'at_least_one_specialty' }, { status: 400 })
  }

  // Pricing — per-cut flat fee and/or combo (cut + beard + hot towel).
  // CHECK enforces at least one is set.
  const hourly = priceOrNull(body.hourly_rate_idr ?? null)
  const day    = priceOrNull(body.day_rate_idr    ?? null)
  if (hourly === null && day === null) {
    return NextResponse.json({ error: 'at_least_one_price' }, { status: 400 })
  }

  if (body.profile_image_url && !isAllowedImageUrl(body.profile_image_url)) {
    return NextResponse.json({ error: 'invalid_image_url' }, { status: 400 })
  }
  if (body.ktp_image_url && !isValidKtpRef(body.ktp_image_url, user.id)) {
    return NextResponse.json({ error: 'invalid_ktp' }, { status: 400 })
  }

  const base = slugify(name)
  let slug = base
  for (let i = 2; i <= 9; i++) {
    const { data: existing } = await admin
      .from('barber_providers').select('id').eq('slug', slug).maybeSingle()
    if (!existing) break
    slug = `${base}-${i}`
    if (i === 9) return NextResponse.json({ error: 'slug_collision' }, { status: 409 })
  }

  const { data, error } = await admin
    .from('barber_providers')
    .insert({
      user_id: user.id,
      slug,
      display_name: name,
      years_experience: yrs,
      bio,
      specialties,
      hourly_rate_idr: hourly,
      day_rate_idr:   day,
      has_own_tools:  body.has_own_tools !== false,
      whatsapp_e164:  wa.replace(/\s|-/g, ''),
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
    console.error('[barber/signup] insert failed', { code: error.code, message: error.message })
    if (error.code === '23505') return NextResponse.json({ error: 'already_registered' }, { status: 409 })
    return NextResponse.json({ error: 'insert_failed', detail: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, provider: data })
}
