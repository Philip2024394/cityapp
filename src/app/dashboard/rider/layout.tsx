// /dashboard/rider layout — wraps every bike-rider subpage with the
// BookingAlertProvider so incoming WhatsApp-intent alerts pop over any
// page in the dashboard (not just the home). Mirrors /dashboard/car/layout.
//
// Provider mounts only for drivers whose subscription is still current
// (paid_until null or >= today) AND who have not toggled booking alerts
// off. Lapsed drivers are hidden from /cari and cannot receive intents,
// so the realtime channel is dead weight for them.

import { getCurrentUser } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import BookingAlertProvider from '@/components/dashboard/BookingAlertProvider'
import CityRidersBrandStrip from '@/components/dashboard/CityRidersBrandStrip'

export default async function RiderDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  const admin = user?.id ? getAdminSupabase() : null
  const { data: gate } = admin
    ? await admin
        .from('drivers')
        .select('paid_until, booking_alerts_enabled')
        .eq('user_id', user!.id)
        .maybeSingle()
    : { data: null }
  const today = new Date().toISOString().slice(0, 10)
  const shouldMount =
    !!user?.id &&
    !!gate &&
    (gate.paid_until == null || gate.paid_until >= today) &&
    gate.booking_alerts_enabled !== false
  return (
    <>
      <CityRidersBrandStrip subtitle="Bike rider dashboard" />
      {children}
      {shouldMount && <BookingAlertProvider driverId={user!.id} />}
    </>
  )
}
