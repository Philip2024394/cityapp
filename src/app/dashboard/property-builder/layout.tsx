// /dashboard/property-builder layout — mounts BookingAlertProvider.

import { getCurrentUser } from '@/lib/supabase/server'
import BookingAlertProvider from '@/components/dashboard/BookingAlertProvider'

export default async function PropertyBuilderDashboardLayout({
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
