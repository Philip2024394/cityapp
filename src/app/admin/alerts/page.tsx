import { getAdminSupabase } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/guard'
import { Bell } from 'lucide-react'
import AlertsClient from './AlertsClient'
import type { OpsAlertRow } from '@/app/api/admin/alerts/route'

// ============================================================================
// /admin/alerts — System Alerts surface
// ----------------------------------------------------------------------------
// Server component hydrates the initial alert list + unacked count, then
// hands off to <AlertsClient/> which handles filtering, auto-refresh, and
// per-row acknowledge actions.
//
// Brand: CityDrivers yellow (#FACC15) header gradient. 13px text floor,
// 44px tap targets — matches the conventions used elsewhere in /admin.
// ============================================================================

export const dynamic = 'force-dynamic'

export default async function AdminAlertsPage() {
  await requireAdmin()
  const admin = getAdminSupabase()
  if (!admin) {
    return <p className="text-muted text-[14px]">Server not configured.</p>
  }

  const [{ data: initialRows }, { count: unackedCount }] = await Promise.all([
    admin
      .from('ops_alerts')
      .select('id, created_at, source, severity, title, detail, acknowledged_at, acknowledged_by')
      .order('created_at', { ascending: false })
      .limit(100),
    admin
      .from('ops_alerts')
      .select('*', { count: 'exact', head: true })
      .is('acknowledged_at', null),
  ])

  const alerts = ((initialRows as OpsAlertRow[] | null) ?? [])
  const totalUnacked = unackedCount ?? 0

  return (
    <div className="space-y-4">
      {/* ============== Header card (yellow gradient) ============== */}
      <section
        className="rounded-2xl p-5 border"
        style={{
          background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)',
          borderColor: 'rgba(0,0,0,0.10)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(10,10,10,0.10)', border: '1px solid rgba(10,10,10,0.15)' }}
          >
            <Bell className="w-5 h-5" style={{ color: '#0A0A0A' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[18px] sm:text-[20px] font-extrabold tracking-tight leading-tight" style={{ color: '#0A0A0A' }}>
              System Alerts
            </div>
            <div className="text-[13px] leading-snug mt-0.5" style={{ color: 'rgba(10,10,10,0.75)' }}>
              Webhook failures, cron errors, and API issues from across the platform.
            </div>
          </div>
          <span
            className="shrink-0 inline-flex items-center justify-center px-3 py-1.5 rounded-full text-[13px] font-extrabold min-w-[44px] min-h-[28px]"
            style={{
              background: totalUnacked > 0 ? '#0A0A0A' : 'rgba(10,10,10,0.10)',
              color: totalUnacked > 0 ? '#FACC15' : '#0A0A0A',
            }}
          >
            {totalUnacked} unacked
          </span>
        </div>
      </section>

      {/* ============== Client island: filters + list + refresh ============== */}
      <AlertsClient initialAlerts={alerts} initialUnacked={totalUnacked} />
    </div>
  )
}
