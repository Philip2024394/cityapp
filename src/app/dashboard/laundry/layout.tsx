// /dashboard/laundry layout — mounts BookingAlertProvider so the
// "You have a WhatsApp message" alert pops on every subpage. Also mounts
// LaundryPageSwitcher (Studio tier multi-location chip, task 11/12)
// so the page selector is reachable from every subpage — info, services,
// edit, bookings, etc.

import { getCurrentUser } from '@/lib/supabase/server'
import BookingAlertProvider from '@/components/dashboard/BookingAlertProvider'
import LaundryPageSwitcher from '@/components/dashboard/LaundryPageSwitcher'

export default async function LaundryDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  return (
    <>
      {user?.id && <LaundryPageSwitcher />}
      {children}
      {user?.id && <BookingAlertProvider driverId={user.id} />}
    </>
  )
}
