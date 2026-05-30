// Shared API handlers for the property dashboard variants — each
// /api/property-{sale,rent,builder}/me + /profile route is a thin
// wrapper that calls these factories with its listing_type. Behavior
// mirrors /api/beautician/me + /api/beautician/me/profile, scoped to
// the matching property_listings row(s) for the signed-in user.

import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { isAllowedImageUrl, isValidKtpRef } from '@/lib/validation/images'
import { validateUniversalProfile } from '@/lib/validation/universalProfile'
import {
  CERTIFICATE_OPTIONS,
  FURNISHED_OPTIONS,
  WATER_SOURCE_OPTIONS,
  FLOOD_ZONE_OPTIONS,
  PROPERTY_TYPE_ALLOWLIST,
  type PropertyVariant,
} from '@/lib/property/variants'
// NOTE(phase-2): property_listings has typed Json columns (hero_text,
// service_photos) and nullable-vs-required nuances (city, whatsapp_e164)
// that the looser builder pattern handles correctly at runtime. Keep payload
// as Record<string,unknown> until the schema/types reconcile (Phase 1 follow-up).

const CERT_SET  = new Set<string>(CERTIFICATE_OPTIONS)
const FURN_SET  = new Set<string>(FURNISHED_OPTIONS)
const WATER_SET = new Set<string>(WATER_SOURCE_OPTIONS)
const FLOOD_SET = new Set<string>(FLOOD_ZONE_OPTIONS)

function intOrNull(v: unknown): number | null | undefined {
  if (v === undefined) return undefined
  if (v === null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? Math.round(n) : null
}
function numOrNull(v: unknown): number | null | undefined {
  if (v === undefined) return undefined
  if (v === null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}
function bigintOrNull(v: unknown): number | null | undefined {
  if (v === undefined) return undefined
  if (v === null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null
}

export function makeMeGET(variant: PropertyVariant) {
  return async function GET() {
    const userClient = await getServerSupabase()
    const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
    if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

    const admin = getAdminSupabase()
    if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

    const { data, error } = await admin
      .from('property_listings')
      .select('*')
      .eq('user_id', user.id)
      .eq('listing_type', variant)
      .maybeSingle()

    if (error) return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
    return NextResponse.json({ provider: data ?? null })
  }
}

export function makeProfilePOST(variant: PropertyVariant) {
  return async function POST(req: Request) {
    const userClient = await getServerSupabase()
    const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
    if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

    const admin = getAdminSupabase()
    if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

    let body: Record<string, unknown>
    try { body = await req.json() as Record<string, unknown> } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
    }

    const update: Record<string, unknown> = {}

    if (typeof body.display_name === 'string') {
      const v = (body.display_name as string).trim()
      if (v.length < 2) return NextResponse.json({ error: 'name_too_short' }, { status: 400 })
      update.display_name = v
    }
    if (typeof body.business_name === 'string') {
      update.business_name = (body.business_name as string).trim() || null
    }
    if (typeof body.bio === 'string') {
      const v = (body.bio as string).trim()
      if (v.length > 300) return NextResponse.json({ error: 'bio_too_long' }, { status: 400 })
      update.bio = v
    }
    if (typeof body.whatsapp_e164 === 'string') {
      const wa = (body.whatsapp_e164 as string).replace(/\s|-/g, '')
      if (!/^\+?\d{8,15}$/.test(wa)) return NextResponse.json({ error: 'invalid_whatsapp' }, { status: 400 })
      update.whatsapp_e164 = wa
    }
    if (typeof body.city === 'string') update.city = (body.city as string).trim() || null
    if (typeof body.address === 'string') update.address = (body.address as string).trim() || null
    if (typeof body.kelurahan === 'string') update.kelurahan = (body.kelurahan as string).trim() || null
    if (typeof body.kecamatan === 'string') update.kecamatan = (body.kecamatan as string).trim() || null
    if (typeof body.profile_image_url === 'string') {
      const v = (body.profile_image_url as string).trim() || null
      if (v && !isAllowedImageUrl(v)) return NextResponse.json({ error: 'invalid_image_url' }, { status: 400 })
      update.profile_image_url = v
    }
    if (typeof body.ktp_image_url === 'string') {
      const v = (body.ktp_image_url as string).trim() || null
      if (v && !isValidKtpRef(v, user.id)) return NextResponse.json({ error: 'invalid_ktp' }, { status: 400 })
      update.ktp_image_url = v
    }

    const universal = validateUniversalProfile(body)
    if (!universal.ok) return NextResponse.json({ error: universal.error }, { status: 400 })
    Object.assign(update, universal.fields)

    // services_offered → [property_type] single-element array.
    if (body.services_offered !== undefined) {
      if (!Array.isArray(body.services_offered)) {
        return NextResponse.json({ error: 'invalid_services_offered' }, { status: 400 })
      }
      const cleaned: string[] = []
      for (const s of body.services_offered) {
        if (typeof s !== 'string' || !PROPERTY_TYPE_ALLOWLIST.has(s)) {
          return NextResponse.json({ error: 'invalid_property_type' }, { status: 400 })
        }
        if (!cleaned.includes(s)) cleaned.push(s)
      }
      if (cleaned.length > 1) {
        return NextResponse.json({ error: 'too_many_property_types' }, { status: 400 })
      }
      if (cleaned[0]) update.property_type = cleaned[0]
    }
    if (typeof body.property_type === 'string') {
      const v = body.property_type as string
      if (!PROPERTY_TYPE_ALLOWLIST.has(v)) {
        return NextResponse.json({ error: 'invalid_property_type' }, { status: 400 })
      }
      update.property_type = v
    }

    // hero_text — identical shape to beautician.
    if (body.hero_text !== undefined) {
      if (body.hero_text === null) {
        update.hero_text = null
      } else if (typeof body.hero_text !== 'object' || Array.isArray(body.hero_text)) {
        return NextResponse.json({ error: 'invalid_hero_text' }, { status: 400 })
      } else {
        const ht = body.hero_text as Record<string, unknown>
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
          const v = ht[k]
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
        const trimmed = (body.promo_text as string).trim()
        if (trimmed.length > 280) {
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
        update.theme_color = (body.theme_color as string).toUpperCase()
      }
    }

    // service_photos — keyed-object shape, same validator as beautician but
    // keys must be property_type ids (single key in practice).
    if (body.service_photos !== undefined) {
      const sp = body.service_photos as unknown
      if (sp === null || typeof sp !== 'object' || Array.isArray(sp)) {
        return NextResponse.json({ error: 'invalid_service_photos' }, { status: 400 })
      }
      const cleaned: Record<string, Array<Record<string, unknown>>> = {}
      for (const [k, v] of Object.entries(sp as Record<string, unknown>)) {
        if (!PROPERTY_TYPE_ALLOWLIST.has(k)) {
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
          let url: string
          let name: string | undefined
          let description: string | undefined
          let price: number | null | undefined
          let objectPosition: string | undefined
          let beforeUrl: string | undefined
          let afterUrl: string | undefined
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
            if (o.object_position !== undefined) {
              if (typeof o.object_position !== 'string') {
                return NextResponse.json({ error: 'invalid_object_position' }, { status: 400 })
              }
              const op = o.object_position.trim()
              if (op.length > 40 || !/^[a-zA-Z0-9 %.-]*$/.test(op)) {
                return NextResponse.json({ error: 'invalid_object_position' }, { status: 400 })
              }
              objectPosition = op || undefined
            }
            if (o.before_image_url !== undefined) {
              if (typeof o.before_image_url !== 'string') {
                return NextResponse.json({ error: 'invalid_before_image_url' }, { status: 400 })
              }
              const u = o.before_image_url.trim()
              if (u && !isAllowedImageUrl(u)) {
                return NextResponse.json({ error: 'invalid_before_image_host' }, { status: 400 })
              }
              beforeUrl = u || undefined
            }
            if (o.after_image_url !== undefined) {
              if (typeof o.after_image_url !== 'string') {
                return NextResponse.json({ error: 'invalid_after_image_url' }, { status: 400 })
              }
              const u = o.after_image_url.trim()
              if (u && !isAllowedImageUrl(u)) {
                return NextResponse.json({ error: 'invalid_after_image_host' }, { status: 400 })
              }
              afterUrl = u || undefined
            }
          } else {
            return NextResponse.json({ error: 'invalid_service_photo_entry' }, { status: 400 })
          }
          if (!url) continue
          if (!isAllowedImageUrl(url)) {
            return NextResponse.json({ error: 'invalid_service_photo_host' }, { status: 400 })
          }
          const entry: Record<string, unknown> = { url }
          if (name)           entry.name = name
          if (description)    entry.description = description
          if (price !== undefined) entry.price_idr = price
          if (objectPosition) entry.object_position = objectPosition
          if (beforeUrl)      entry.before_image_url = beforeUrl
          if (afterUrl)       entry.after_image_url  = afterUrl
          entries.push(entry)
        }
        if (entries.length > 0) cleaned[k] = entries
      }
      update.service_photos = cleaned
    }

    // ─── Variant-specific pricing ─────────────────────────────────────
    if (variant === 'for_sale') {
      const p = bigintOrNull(body.price_idr)
      if (p !== undefined) update.price_idr = p
      if (body.price_negotiable !== undefined) {
        if (typeof body.price_negotiable !== 'boolean') {
          return NextResponse.json({ error: 'invalid_price_negotiable' }, { status: 400 })
        }
        update.price_negotiable = body.price_negotiable
      }
      if (body.price_on_request !== undefined) {
        if (typeof body.price_on_request !== 'boolean') {
          return NextResponse.json({ error: 'invalid_price_on_request' }, { status: 400 })
        }
        update.price_on_request = body.price_on_request
      }
    } else if (variant === 'for_rent') {
      for (const k of ['daily_rent_idr','weekly_rent_idr','monthly_rent_idr','deposit_idr'] as const) {
        const v = bigintOrNull(body[k])
        if (v !== undefined) update[k] = v
      }
      const ml = intOrNull(body.min_lease_months)
      if (ml !== undefined) update.min_lease_months = ml
    } else if (variant === 'new_construction') {
      for (const k of ['starting_price_idr','nup_idr'] as const) {
        const v = bigintOrNull(body[k])
        if (v !== undefined) update[k] = v
      }
      for (const k of ['units_total','units_available'] as const) {
        const v = intOrNull(body[k])
        if (v !== undefined) update[k] = v
      }
      if (typeof body.developer_name === 'string') {
        update.developer_name = (body.developer_name as string).trim() || null
      }
      if (body.completion_date !== undefined) {
        if (body.completion_date === null || body.completion_date === '') {
          update.completion_date = null
        } else if (typeof body.completion_date !== 'string'
                || !/^\d{4}-\d{2}-\d{2}$/.test(body.completion_date)) {
          return NextResponse.json({ error: 'invalid_completion_date' }, { status: 400 })
        } else {
          update.completion_date = body.completion_date
        }
      }
    }

    // ─── Property Details section ─────────────────────────────────────
    for (const k of ['bedrooms','bathrooms','floors','year_built','parking_cars','parking_bikes','electricity_va','leasehold_years_remaining'] as const) {
      const v = intOrNull(body[k])
      if (v !== undefined) update[k] = v
    }
    for (const k of ['land_size_sqm','building_size_sqm'] as const) {
      const v = numOrNull(body[k])
      if (v !== undefined) update[k] = v
    }
    if (typeof body.facing_direction === 'string') {
      update.facing_direction = (body.facing_direction as string).trim() || null
    }
    if (body.certificate_type !== undefined) {
      if (body.certificate_type === null || body.certificate_type === '') {
        update.certificate_type = null
      } else if (typeof body.certificate_type !== 'string' || !CERT_SET.has(body.certificate_type)) {
        return NextResponse.json({ error: 'invalid_certificate_type' }, { status: 400 })
      } else {
        update.certificate_type = body.certificate_type
      }
    }
    if (body.furnished !== undefined) {
      if (body.furnished === null || body.furnished === '') {
        update.furnished = null
      } else if (typeof body.furnished !== 'string' || !FURN_SET.has(body.furnished)) {
        return NextResponse.json({ error: 'invalid_furnished' }, { status: 400 })
      } else {
        update.furnished = body.furnished
      }
    }
    if (body.water_source !== undefined) {
      if (body.water_source === null || body.water_source === '') {
        update.water_source = null
      } else if (typeof body.water_source !== 'string' || !WATER_SET.has(body.water_source)) {
        return NextResponse.json({ error: 'invalid_water_source' }, { status: 400 })
      } else {
        update.water_source = body.water_source
      }
    }
    for (const k of ['has_pool','has_garden'] as const) {
      if (body[k] !== undefined) {
        if (typeof body[k] !== 'boolean') {
          return NextResponse.json({ error: `invalid_${k}` }, { status: 400 })
        }
        update[k] = body[k]
      }
    }

    // ─── Compliance section ───────────────────────────────────────────
    if (typeof body.agent_license_no === 'string') {
      update.agent_license_no = (body.agent_license_no as string).trim() || null
    }
    if (body.kpr_eligible !== undefined) {
      if (typeof body.kpr_eligible !== 'boolean') {
        return NextResponse.json({ error: 'invalid_kpr_eligible' }, { status: 400 })
      }
      update.kpr_eligible = body.kpr_eligible
    }
    if (body.expat_friendly !== undefined) {
      if (typeof body.expat_friendly !== 'boolean') {
        return NextResponse.json({ error: 'invalid_expat_friendly' }, { status: 400 })
      }
      update.expat_friendly = body.expat_friendly
    }
    if (body.flood_zone !== undefined) {
      if (body.flood_zone === null || body.flood_zone === '') {
        update.flood_zone = null
      } else if (typeof body.flood_zone !== 'string' || !FLOOD_SET.has(body.flood_zone)) {
        return NextResponse.json({ error: 'invalid_flood_zone' }, { status: 400 })
      } else {
        update.flood_zone = body.flood_zone
      }
    }
    for (const k of ['drone_url','virtual_tour_url','video_url'] as const) {
      if (typeof body[k] === 'string') {
        const v = (body[k] as string).trim()
        if (v && !/^https?:\/\//i.test(v)) {
          return NextResponse.json({ error: `invalid_${k}` }, { status: 400 })
        }
        update[k] = v || null
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 })
    }
    update.updated_at = new Date().toISOString()

    const { error } = await admin
      .from('property_listings')
      .update(update)
      .eq('user_id', user.id)
      .eq('listing_type', variant)
    if (error) return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }
}
