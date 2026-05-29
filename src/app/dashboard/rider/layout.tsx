// /dashboard/rider layout — wraps every bike-rider subpage with the
// BookingAlertProvider so incoming WhatsApp-intent alerts pop over any
// page in the dashboard (not just the home). Mirrors /dashboard/car/layout.

import { getCurrentUser } from '@/lib/supabase/server'
import BookingAlertProvider from '@/components/dashboard/BookingAlertProvider'

export default async function RiderDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  return (
    <>
      {children}
      {user?.id && <BookingAlertProvider driverId={user.id} />}
    </>
  )
}
