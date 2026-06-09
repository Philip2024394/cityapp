// ============================================================================
// POST /api/free-profile — upsert the authenticated user's Free profile
// ----------------------------------------------------------------------------
// Writes to public.free_profiles (mig 0230). Sets user_accounts.free_theme_id
// at the same time so the dashboard knows which Free template is active.
//
// Validation enforces the Free content contract: no portfolio / services /
// before-after / QRIS / reviews fields are accepted — only profile photo +
// display name + bio + WhatsApp + links + socials + theme.
// ============================================================================

import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { FREE_THEMES } from '@/lib/free-themes/library'

export const runtime = 'nodejs'

type Link_ = { title: string; url: string }
type Socials = {
  instagram?: string; tiktok?: string; facebook?: string;
  youtube?: string;   x?: string;      email?: string;
}

type Body = {
  slug?: string
  display_name?: string
  bio?: string | null
  profile_image_url?: string | null
  page_background_image_url?: string | null
  brand_color?: string | null
  button_text_color?: string | null
  whatsapp_e164?: string | null
  avatar_placement?: 'center' | 'top-left' | 'bottom-left'
  show_url_under_avatar?: boolean
  free_theme_id?: string
  links?: Link_[]
  socials?: Socials
}

const SLUG_RE   = /^[a-z0-9-]{1,32}$/
const COLOR_RE  = /^#[0-9A-Fa-f]{3,8}$/
const URL_RE    = /^https?:\/\//
const PLACEMENT = new Set(['center', 'top-left', 'bottom-left'])

const THEME_IDS = new Set(FREE_THEMES.map((t) => t.id))

function sanitiseLinks(input: unknown): Link_[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((x): x is Link_ => !!x && typeof x === 'object' && 'title' in x && 'url' in x)
    .map((x) => ({
      title: String(x.title || '').slice(0, 80).trim(),
      url:   String(x.url   || '').slice(0, 500).trim(),
    }))
    .filter((x) => x.title && x.url)
    .slice(0, 50)
}

function sanitiseSocials(input: unknown): Socials {
  if (!input || typeof input !== 'object') return {}
  const o = input as Record<string, unknown>
  const out: Socials = {}
  for (const k of ['instagram', 'tiktok', 'facebook', 'youtube', 'x', 'email'] as const) {
    const v = o[k]
    if (typeof v === 'string' && v.trim()) out[k] = v.trim().slice(0, 200)
  }
  return out
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

  const slug = String(body.slug || '').trim().toLowerCase()
  const displayName = String(body.display_name || '').trim()
  if (!SLUG_RE.test(slug))              return NextResponse.json({ error: 'invalid_slug' }, { status: 400 })
  if (!displayName || displayName.length < 1) return NextResponse.json({ error: 'name_required' }, { status: 400 })
  if (displayName.length > 64)          return NextResponse.json({ error: 'name_too_long' }, { status: 400 })

  const bio = body.bio ? String(body.bio).slice(0, 240) : null
  const wa  = body.whatsapp_e164 ? String(body.whatsapp_e164).replace(/\s|-/g, '').slice(0, 20) : null
  if (wa && !/^\+?\d{8,15}$/.test(wa)) {
    return NextResponse.json({ error: 'invalid_whatsapp' }, { status: 400 })
  }

  const brandColor      = body.brand_color       && COLOR_RE.test(body.brand_color)       ? body.brand_color       : '#FACC15'
  const buttonTextColor = body.button_text_color && COLOR_RE.test(body.button_text_color) ? body.button_text_color : '#0A0A0A'
  const placement = PLACEMENT.has(body.avatar_placement || '') ? (body.avatar_placement as 'center' | 'top-left' | 'bottom-left') : 'center'
  const themeId = body.free_theme_id && THEME_IDS.has(body.free_theme_id as never) ? body.free_theme_id : 'minimalist-mono'

  const profileImage = body.profile_image_url && URL_RE.test(body.profile_image_url) ? body.profile_image_url : null
  const bgImage      = body.page_background_image_url && URL_RE.test(body.page_background_image_url) ? body.page_background_image_url : null

  const links = sanitiseLinks(body.links)
  const socials = sanitiseSocials(body.socials)

  // Ensure the slug isn't already taken by ANOTHER user.
  const { data: existing } = await admin
    .from('free_profiles')
    .select('user_id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing && (existing as { user_id?: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'slug_taken' }, { status: 409 })
  }

  const { error: upsertErr } = await admin
    .from('free_profiles')
    .upsert({
      user_id: user.id,
      slug,
      display_name: displayName,
      bio,
      profile_image_url: profileImage,
      page_background_image_url: bgImage,
      brand_color: brandColor,
      button_text_color: buttonTextColor,
      whatsapp_e164: wa,
      avatar_placement: placement,
      show_url_under_avatar: !!body.show_url_under_avatar,
      free_theme_id: themeId,
      links,
      socials,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (upsertErr) {
    return NextResponse.json({ error: 'save_failed', detail: upsertErr.message }, { status: 500 })
  }

  // Mirror free_theme_id onto user_accounts so the dashboard knows which
  // Free template the user picked without a JOIN.
  await admin
    .from('user_accounts')
    .update({ free_theme_id: themeId })
    .eq('user_id', user.id)

  return NextResponse.json({ ok: true, slug })
}
