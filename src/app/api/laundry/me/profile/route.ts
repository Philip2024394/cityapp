import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { isAllowedImageUrl, isValidKtpRef } from '@/lib/validation/images'
import { validateUniversalProfile } from '@/lib/validation/universalProfile'
import type { TableUpdate } from '@/lib/supabase/typed-helpers'
import type { Json } from '@/types/supabase'

export const runtime = 'nodejs'

type Body = {
  display_name?: string
  years_experience?: number
  bio?: string
  price_wash_per_kg_idr?:      number | null
  price_wash_dry_per_kg_idr?:  number | null
  price_wash_iron_per_kg_idr?: number | null
  min_kg?: number | null
  turnaround_hours?: number | null
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
  // mig 0087 per-profile theme accent
  theme_color?: string | null
  // mig 0106 feature parity with beautician (hero/promo copy)
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

  const update: TableUpdate<'laundry_providers'> = {}
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
  for (const k of ['price_wash_per_kg_idr','price_wash_dry_per_kg_idr','price_wash_iron_per_kg_idr'] as const) {
    const v = priceOrNull(body[k])
    if (v !== undefined) update[k] = v
  }
  if (body.min_kg !== undefined) {
    update.min_kg = (body.min_kg === null || !Number.isFinite(body.min_kg) || (body.min_kg as number) < 0) ? null : body.min_kg
  }
  if (body.turnaround_hours !== undefined) {
    const v = body.turnaround_hours
    update.turnaround_hours = (v === null || !Number.isFinite(v) || (v as number) <= 0 || (v as number) > 168) ? null : Math.round(v as number)
  }
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
      update.hero_text = (Object.keys(cleaned).length ? cleaned : null) as Json
    }
  }

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

  if (body.theme_color !== undefined) {
    if (body.theme_color === null || body.theme_color === '') {
      update.theme_color = null
    } else if (typeof body.theme_color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(body.theme_color)) {
      return NextResponse.json({ error: 'invalid_theme_color' }, { status: 400 })
    } else {
      update.theme_color = body.theme_color.toUpperCase()
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 })
  }
  update.updated_at = new Date().toISOString()

  const { error } = await admin
    .from('laundry_providers')
    .update(update)
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
