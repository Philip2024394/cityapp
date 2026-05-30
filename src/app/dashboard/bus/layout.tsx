// /dashboard/bus layout — mounts BookingAlertProvider so the
// "You have a WhatsApp message" alert pops on the bus driver page.

import { getCurrentUser } from '@/lib/supabase/server'
import BookingAlertProvider from '@/components/dashboard/BookingAlertProvider'
import CityRidersBrandStrip from '@/components/dashboard/CityRidersBrandStrip'

export default async function BusDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  return (
    <>
      <CityRidersBrandStrip subtitle="Bus driver dashboard" />
      {children}
      {user?.id && <BookingAlertProvider driverId={user.id} />}
    </>
  )
}
