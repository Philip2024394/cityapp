// ============================================================================
// GET /api/addons/list
// ----------------------------------------------------------------------------
// Returns the full add-on catalog joined with the current user's enabled
// state. Anonymous visitors get the catalog only (enabled=false on every
// row) — used by the public /add-ons storefront to render the grid before
// the user logs in.
//
// Shape per row:
//   { id, slug, label, tagline, priceLabel, billing, available, enabled,
//     status, paidUntil }
//
// enabled / status / paidUntil reflect provider_addons row for the current
// user. Anonymous: enabled=false, status=null.
// ============================================================================

import { NextResponse } from 'next/server'
import { ADDONS, priceLabel } from '@/lib/addons/catalog'
import { getServerSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  const url = new URL(req.url)
  const locale: 'id' | 'en' = url.searchParams.get('locale') === 'en' ? 'en' : 'id'

  const supabase = await getServerSupabase()
  let enabledMap: Record<string, { status: string; paid_until: string | null }> = {}

  if (supabase) {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id
    if (userId) {
      const { data } = await supabase
        .from('provider_addons')
        .select('addon_id, status, paid_until')
        .eq('owner_user_id', userId)
      if (data) {
        for (const r of data) {
          enabledMap[r.addon_id] = { status: r.status, paid_until: r.paid_until }
        }
      }
    }
  }

  const items = ADDONS.map((a) => ({
    id:        a.id,
    slug:      a.slug,
    iconName:  a.iconName,
    label:     a.label[locale],
    tagline:   a.tagline[locale],
    priceLabel: priceLabel(a, locale),
    billing:   a.billing,
    available: a.available,
    enabled:   Boolean(enabledMap[a.id]),
    status:    enabledMap[a.id]?.status ?? null,
    paidUntil: enabledMap[a.id]?.paid_until ?? null,
  }))

  return NextResponse.json({ items })
}
