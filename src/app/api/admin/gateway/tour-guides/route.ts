import { withGateway, ok, fail } from '@/lib/admin/gateway'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// GET /api/admin/gateway/tour-guides?status=<all|pending|approved|rejected|paused>
// ----------------------------------------------------------------------------
// Read-only tour_guide_listings list for the cross-app admin.
// ============================================================================

export const dynamic = 'force-dynamic'

export const GET = withGateway(async (req) => {
  const admin = getAdminSupabase()
  if (!admin) return fail('Server not configured', 500)

  const url = new URL(req.url)
  const status = url.searchParams.get('status') ?? 'all'

  let q = admin
    .from('tour_guide_listings')
    .select('id, slug, owner_user_id, name, whatsapp_e164, city, address, services, languages, day_rate_idr, status, available_now, rating, review_count, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(500)
  if (status !== 'all') q = q.eq('status', status)

  const { data, error } = await q
  if (error) return fail(error.message, 500)
  return ok({ tour_guides: data ?? [] })
})

export const OPTIONS = withGateway(async () => ok({}))
