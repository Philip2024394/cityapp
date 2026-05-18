import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import type { ProfileRow } from '@/types/database'

// ============================================================================
// Admin access guard
// ============================================================================
// `requireAdmin()` is for Server Components / route handlers running in an
// SSR context (cookies available). Non-admins are redirected away.
//
// `assertAdminFromCookies()` is for API routes that want a boolean check
// without a redirect — it returns the admin profile or null.
//
// All admin mutations should call `writeAudit()` to leave a trail in
// public.audit_log; RLS restricts that table to is_admin().
// ============================================================================

export async function requireAdmin(): Promise<ProfileRow> {
  const profile = (await getCurrentProfile()) as ProfileRow | null
  if (!profile) redirect('/login?next=/admin')
  if (profile.role !== 'admin') redirect('/')
  return profile
}

export async function assertAdminFromCookies(): Promise<ProfileRow | null> {
  const profile = (await getCurrentProfile()) as ProfileRow | null
  if (!profile || profile.role !== 'admin') return null
  return profile
}

export async function writeAudit(params: {
  actorId: string
  action: string
  entityType?: string
  entityId?: string
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
}) {
  const admin = getAdminSupabase()
  if (!admin) return
  await admin.from('audit_log').insert({
    actor_id: params.actorId,
    action: params.action,
    entity_type: params.entityType ?? null,
    entity_id: params.entityId ?? null,
    before_data: params.before ?? null,
    after_data: params.after ?? null,
  })
}
