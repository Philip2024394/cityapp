// /dashboard/beautician layout — mounts BookingAlertProvider so the
// "You have a WhatsApp message" alert pops on every subpage. Mirrors
// /dashboard/car and /dashboard/rider.
//
// Also mounts BeauticianPageSwitcher (Studio tier multi-location chip,
// task 11/12) so the page selector is reachable from every beautician
// subpage — info, services, edit, bookings, etc. — not just the hub.

import { getCurrentUser } from '@/lib/supabase/server'
import BookingAlertProvider from '@/components/dashboard/BookingAlertProvider'
import BeauticianPageSwitcher from '@/components/dashboard/BeauticianPageSwitcher'

export default async function BeauticianDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  return (
    <>
      {user?.id && <BeauticianPageSwitcher />}
      {children}
      {user?.id && <BookingAlertProvider driverId={user.id} />}
    </>
  )
}
