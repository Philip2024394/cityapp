import AppImageBackground from '@/components/layout/AppImageBackground'

// ============================================================================
// /rent layout — applies the shared driver-image background to every
// rental route (/rent, /rent/[slug], /rent/list/*). Keeps the bike-side
// pages visually consistent with the dashboard + profile.
// ============================================================================

export default function RentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppImageBackground />
      {children}
    </>
  )
}
