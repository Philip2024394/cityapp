// /dashboard/tutoring layout — mounts BookingAlertProvider so the
// "You have a WhatsApp message" alert pops on every subpage.

import { getCurrentUser } from '@/lib/supabase/server'
import BookingAlertProvider from '@/components/dashboard/BookingAlertProvider'

export default async function TutoringDashboardLayout({
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
