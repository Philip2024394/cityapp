import { withGateway, ok, fail } from '@/lib/admin/gateway'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// GET /api/admin/gateway/members?since=<iso>&type=<all|driver|rental_company|customer|admin>
// ----------------------------------------------------------------------------
// Mirrors /admin/members but readable cross-app from landing/Admin.jsx.
// Joins auth.users + profiles + drivers + user_accounts + subscriptions
// into a single row per user with the derived account_type + status badge.
// ============================================================================

export const dynamic = 'force-dynamic'

type AuthUserLite = {
  id: string
  email: string | null
  phone: string | null
  created_at: string
  user_metadata: Record<string, unknown>
}

const SINCE_DEFAULT_DAYS = 90

export const GET = withGateway(async (req) => {
  const admin = getAdminSupabase()
  if (!admin) return fail('Server not configured', 500)

  const url = new URL(req.url)
  const typeFilter = (url.searchParams.get('type') ?? 'all') as
    'all' | 'driver' | 'rental_company' | 'customer' | 'admin'
  const sinceParam = url.searchParams.get('since')
  const since = sinceParam
    ? new Date(sinceParam)
    : new Date(Date.now() - SINCE_DEFAULT_DAYS * 24 * 60 * 60 * 1000)

  const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const users = (usersData?.users ?? []) as unknown as AuthUserLite[]

  const [profilesRes, driversRes, accountsRes, subsRes] = await Promise.all([
    admin.from('profiles').select('id, full_name, role'),
    admin.from('drivers').select('user_id, business_name, whatsapp_e164, status'),
    admin.from('user_accounts').select('user_id, account_type, subscription_status, subscription_expires_at, tour_guide_status, tour_guide_expires_at'),
    admin.from('subscriptions').select('driver_id, status, current_period_end'),
  ])

  const profiles = new Map<string, { full_name: string | null; role: string | null }>()
  for (const p of (profilesRes.data ?? []) as Array<{ id: string; full_name: string | null; role: string | null }>) {
    profiles.set(p.id, p)
  }
  const drivers = new Map<string, { business_name: string | null; whatsapp_e164: string | null; status: string | null }>()
  for (const d of (driversRes.data ?? []) as Array<{ user_id: string; business_name: string | null; whatsapp_e164: string | null; status: string | null }>) {
    drivers.set(d.user_id, d)
  }
  const accounts = new Map<string, { account_type: string; subscription_status: string; tour_guide_status: string }>()
  for (const a of (accountsRes.data ?? []) as Array<{ user_id: string; account_type: string; subscription_status: string; tour_guide_status: string }>) {
    accounts.set(a.user_id, a)
  }
  const subs = new Map<string, { status: string }>()
  for (const s of (subsRes.data ?? []) as Array<{ driver_id: string; status: string }>) {
    subs.set(s.driver_id, s)
  }

  const rows = users
    .filter((u) => new Date(u.created_at).getTime() >= since.getTime())
    .map((u) => {
      const profile = profiles.get(u.id)
      const driver  = drivers.get(u.id)
      const acct    = accounts.get(u.id)
      const sub     = subs.get(u.id)

      let type: 'driver' | 'rental_company' | 'customer' | 'admin' | 'unknown' = 'unknown'
      let status = ''
      let name = profile?.full_name
        || (u.user_metadata?.full_name as string | undefined)
        || (u.user_metadata?.name as string | undefined)
        || u.email?.split('@')[0]
        || 'Unknown'
      let whatsapp: string | null = null

      if (acct?.account_type === 'rental_company') {
        type = 'rental_company'
        status = acct.subscription_status
      } else if (driver) {
        type = 'driver'
        if (driver.business_name) name = driver.business_name
        whatsapp = driver.whatsapp_e164
        status = sub?.status ?? driver.status ?? 'unknown'
      } else if (profile?.role === 'admin') {
        type = 'admin'
        status = 'Admin'
      } else {
        type = 'customer'
        status = profile ? 'Active' : 'Pending profile'
      }

      if (!whatsapp && u.phone) whatsapp = '+' + u.phone

      return {
        user_id: u.id,
        name,
        whatsapp,
        email: u.email,
        account_type: type,
        tour_guide_status: acct?.tour_guide_status ?? 'inactive',
        status,
        created_at: u.created_at,
      }
    })
    .filter((r) => typeFilter === 'all' || r.account_type === typeFilter)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return ok({ members: rows, since: since.toISOString() })
})

export const OPTIONS = withGateway(async () => ok({}))
