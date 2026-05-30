// /dashboard/car layout — wraps every car-driver subpage with the
// BookingAlertProvider so incoming WhatsApp-intent alerts pop over any
// page in the dashboard (not just the home). Server component: reads the
// signed-in user id and hands it to the client provider as a prop.

import { getCurrentUser } from '@/lib/supabase/server'
import BookingAlertProvider from '@/components/dashboard/BookingAlertProvider'
import CityRidersBrandStrip from '@/components/dashboard/CityRidersBrandStrip'

export default async function CarDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  return (
    <>
      <CityRidersBrandStrip subtitle="Car driver dashboard" />
      {children}
      {user?.id && <BookingAlertProvider driverId={user.id} />}
    </>
  )
}
