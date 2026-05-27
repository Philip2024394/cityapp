// /dashboard layout — neutral pass-through. The global PageBackground
// (solid white) is already applied at the root layout, so dashboard
// pages render on white by default.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
