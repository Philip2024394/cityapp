// /dashboard/truck layout — mounts BookingAlertProvider so the
// "You have a WhatsApp message" alert pops on the truck driver page.

import { getCurrentUser } from '@/lib/supabase/server'
import BookingAlertProvider from '@/components/dashboard/BookingAlertProvider'

export default async function TruckDashboardLayout({
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
