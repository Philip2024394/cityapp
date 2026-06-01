// /dashboard layout — neutral pass-through. The global PageBackground
// (solid white) is already applied at the root layout, so dashboard
// pages render on white by default.
//
// All dashboard routes are auth-gated (sub-layouts call `cookies()` via
// `getCurrentUser`). Marking the whole subtree dynamic here so we never
// accidentally cache a signed-in user's dashboard at the CDN.
export const dynamic = 'force-dynamic'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
