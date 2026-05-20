import AppImageBackground from '@/components/layout/AppImageBackground'

// ============================================================================
// /profile layout — same image background as the dashboard so the driver
// experience feels visually unified across console + profile editing.
// ============================================================================

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppImageBackground />
      {children}
    </>
  )
}
