import { withGateway, ok, fail } from '@/lib/admin/gateway'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// GET /api/admin/gateway/rentals?status=<all|pending|approved|rejected|paused>
// ----------------------------------------------------------------------------
// Read-only bike_rentals listing for the cross-app admin.
// ============================================================================

export const dynamic = 'force-dynamic'

export const GET = withGateway(async (req) => {
  const admin = getAdminSupabase()
  if (!admin) return fail('Server not configured', 500)

  const url = new URL(req.url)
  const status = url.searchParams.get('status') ?? 'all'

  let q = admin
    .from('bike_rentals')
    .select('id, slug, owner_user_id, owner_name, brand, model, cc, year, city, address, daily_price_idr, status, listing_tier, available_now, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(500)
  if (status !== 'all') q = q.eq('status', status)

  const { data, error } = await q
  if (error) return fail(error.message, 500)
  return ok({ rentals: data ?? [] })
})

export const OPTIONS = withGateway(async () => ok({}))
