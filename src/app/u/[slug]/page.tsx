// ============================================================================
// /u/[slug] — Public Free-tier profile page
// ----------------------------------------------------------------------------
// Fetches public.free_profiles by slug, looks up the theme, and renders
// FreeThemeRenderer. 404s when slug doesn't exist. The "Made with Kita2u"
// badge is rendered inside every theme by FreeThemeRenderer — no need to
// add it here.
// ============================================================================

import { notFound } from 'next/navigation'
import { getServerSupabase } from '@/lib/supabase/server'
import FreeThemeRenderer from '@/components/free-themes/FreeThemeRenderer'
import { findTheme, type FreeProfile } from '@/lib/free-themes/library'

export const dynamic = 'force-dynamic'

export default async function FreeProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug: rawSlug } = await params
  const slug = (rawSlug || '').toLowerCase().trim()
  if (!/^[a-z0-9-]{1,32}$/.test(slug)) return notFound()

  const supabase = await getServerSupabase()
  if (!supabase) return notFound()

  const { data } = await supabase
    .from('free_profiles')
    .select('slug, display_name, bio, profile_image_url, cover_image_url, page_background_image_url, brand_color, button_text_color, whatsapp_e164, avatar_placement, show_url_under_avatar, free_theme_id, links, socials')
    .eq('slug', slug)
    .maybeSingle()

  if (!data) return notFound()

  const row = data as Record<string, unknown>
  const profile: FreeProfile = {
    slug:                       String(row.slug),
    display_name:               String(row.display_name),
    bio:                        (row.bio as string | null) ?? null,
    profile_image_url:          (row.profile_image_url as string | null) ?? null,
    cover_image_url:            (row.cover_image_url as string | null) ?? null,
    page_background_image_url:  (row.page_background_image_url as string | null) ?? null,
    brand_color:                (row.brand_color as string | null) ?? '#FACC15',
    button_text_color:          (row.button_text_color as string | null) ?? '#0A0A0A',
    whatsapp_e164:              (row.whatsapp_e164 as string | null) ?? null,
    avatar_placement:           (row.avatar_placement as 'center' | 'top-left' | 'bottom-left' | null) ?? 'center',
    show_url_under_avatar:      (row.show_url_under_avatar as boolean | null) ?? false,
    free_theme_id:              (row.free_theme_id as string | null) ?? 'minimalist-mono',
    links:                      Array.isArray(row.links) ? (row.links as Array<{ title: string; url: string }>) : [],
    socials:                    (row.socials as FreeProfile['socials']) ?? {},
  }

  const theme = findTheme(profile.free_theme_id)

  return <FreeThemeRenderer theme={theme} profile={profile} />
}
