// /dashboard/barber layout — mounts BookingAlertProvider so the
// "You have a WhatsApp message" alert pops on every subpage. Also mounts
// BarberPageSwitcher (Studio tier multi-location chip, task 11/12)
// so the page selector is reachable from every subpage — info, services,
// edit, bookings, etc.

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getCurrentUser } from '@/lib/supabase/server'
import BookingAlertProvider from '@/components/dashboard/BookingAlertProvider'
import BarberPageSwitcher from '@/components/dashboard/BarberPageSwitcher'

export default async function BarberDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  return (
    <>
      {user?.id && <BarberPageSwitcher />}
      
      <header className="sticky top-0 z-30 bg-white/92 backdrop-blur-sm border-b border-gray-100 px-5 sm:px-6 pt-4 pb-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-1 text-[14px] font-bold text-gray-700 hover:text-black transition">
            <ChevronLeft className="w-4 h-4" />
            <span className="font-black text-[18px] tracking-tight">
              <span style={{ color: '#0A0A0A' }}>Kita</span>
              <span style={{ color: '#FACC15' }}>2u</span>
            </span>
          </Link>
        </div>
      </header>
      {children}
      {user?.id && <BookingAlertProvider driverId={user.id} />}
    </>
  )
}
