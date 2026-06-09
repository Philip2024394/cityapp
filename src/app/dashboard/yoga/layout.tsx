// /dashboard/yoga layout — mounts BookingAlertProvider so the
// "You have a WhatsApp message" alert pops on every subpage. Also mounts
// YogaPageSwitcher (Studio tier multi-location chip, task 11/12)
// so the page selector is reachable from every subpage — info, services,
// edit, bookings, etc.

import { getCurrentUser } from '@/lib/supabase/server'
import BookingAlertProvider from '@/components/dashboard/BookingAlertProvider'
import YogaPageSwitcher from '@/components/dashboard/YogaPageSwitcher'

export default async function YogaDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  return (
    <>
      {user?.id && <YogaPageSwitcher />}
      {children}
      {user?.id && <BookingAlertProvider driverId={user.id} />}
    </>
  )
}
