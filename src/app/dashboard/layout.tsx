import AppImageBackground from '@/components/layout/AppImageBackground'

// ============================================================================
// /dashboard layout — overrides the global MapBackground with the shared
// AppImageBackground for the driver console + its child routes.
// ============================================================================

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppImageBackground />
      {children}
    </>
  )
}
