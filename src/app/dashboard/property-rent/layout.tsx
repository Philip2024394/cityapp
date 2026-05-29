// /dashboard/property-rent layout — mounts BookingAlertProvider.

import { getCurrentUser } from '@/lib/supabase/server'
import BookingAlertProvider from '@/components/dashboard/BookingAlertProvider'

export default async function PropertyRentDashboardLayout({
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
