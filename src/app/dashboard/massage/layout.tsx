// /dashboard/massage layout — mounts BookingAlertProvider so the
// "You have a WhatsApp message" alert pops on every subpage. Also mounts
// MassagePageSwitcher (Studio tier multi-location chip, task 11/12)
// so the page selector is reachable from every subpage — info, services,
// edit, bookings, etc.

import { getCurrentUser } from '@/lib/supabase/server'
import BookingAlertProvider from '@/components/dashboard/BookingAlertProvider'
import MassagePageSwitcher from '@/components/dashboard/MassagePageSwitcher'

export default async function MassageDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  return (
    <>
      {user?.id && <MassagePageSwitcher />}
      {children}
      {user?.id && <BookingAlertProvider driverId={user.id} />}
    </>
  )
}
