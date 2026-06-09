// /dashboard/florist layout — mounts BookingAlertProvider so the
// "You have a WhatsApp message" alert pops on every subpage. Also mounts
// FloristPageSwitcher (Studio tier multi-location chip, task 11/12)
// so the page selector is reachable from every subpage — info, services,
// edit, bookings, etc.

import { getCurrentUser } from '@/lib/supabase/server'
import BookingAlertProvider from '@/components/dashboard/BookingAlertProvider'
import FloristPageSwitcher from '@/components/dashboard/FloristPageSwitcher'

export default async function FloristDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  return (
    <>
      {user?.id && <FloristPageSwitcher />}
      {children}
      {user?.id && <BookingAlertProvider driverId={user.id} />}
    </>
  )
}
