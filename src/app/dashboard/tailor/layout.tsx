// /dashboard/tailor layout — mounts BookingAlertProvider so the
// "You have a WhatsApp message" alert pops on every subpage. Also mounts
// TailorPageSwitcher (Studio tier multi-location chip, task 11/12)
// so the page selector is reachable from every subpage — info, services,
// edit, bookings, etc.

import { getCurrentUser } from '@/lib/supabase/server'
import BookingAlertProvider from '@/components/dashboard/BookingAlertProvider'
import TailorPageSwitcher from '@/components/dashboard/TailorPageSwitcher'

export default async function TailorDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  return (
    <>
      {user?.id && <TailorPageSwitcher />}
      {children}
      {user?.id && <BookingAlertProvider driverId={user.id} />}
    </>
  )
}
