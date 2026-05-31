// /dashboard/jeep layout — mounts BookingAlertProvider so the
// "You have a WhatsApp message" alert pops on the jeep driver page.
//
// Provider mounts only for drivers whose subscription is still current
// (paid_until null or >= today) AND who have not toggled booking alerts
// off. Lapsed drivers are hidden from /cari and cannot receive intents.

import { getCurrentUser } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import BookingAlertProvider from '@/components/dashboard/BookingAlertProvider'
import CityDriversBrandStrip from '@/components/dashboard/CityDriversBrandStrip'

export default async function JeepDashboardLayout({
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
      <CityDriversBrandStrip subtitle="Jeep driver dashboard" />
      {children}
      {shouldMount && <BookingAlertProvider driverId={user!.id} />}
    </>
  )
}
