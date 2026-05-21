import { redirect } from 'next/navigation'
import { getMyAccount, isActiveRentalCompany } from '@/lib/auth/account'

// ============================================================================
// /cari layout — vendor-only guard
// ----------------------------------------------------------------------------
// Rental Bike Company accounts are vendor-only: they don't get to book bikes,
// food, or parcels. Hitting any /cari/* route bounces them to their listings
// dashboard. Anonymous and personal users pass through.
// ============================================================================

export const dynamic = 'force-dynamic'

export default async function CariLayout({ children }: { children: React.ReactNode }) {
  const result = await getMyAccount()
  if (result && isActiveRentalCompany(result.account)) {
    redirect('/dashboard/rentals')
  }
  return <>{children}</>
}
