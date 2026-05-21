import AppImageBackground from '@/components/layout/AppImageBackground'

// ============================================================================
// /dashboard layout — overrides the global MapBackground with the shared
// AppImageBackground for the driver console + its child routes.
//
// Per-page redirects for Rental Company accounts live in the individual
// dashboard pages (and the client redirect on /dashboard/page.tsx). The
// layout stays neutral so /dashboard/rentals remains reachable for vendors.
// ============================================================================

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppImageBackground />
      {children}
    </>
  )
}
