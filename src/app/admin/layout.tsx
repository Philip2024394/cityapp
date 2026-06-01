import { requireAdmin } from '@/lib/admin/guard'
import AdminNav from './AdminNav'

// Admin is auth-gated end-to-end and reads cookies on every render via
// `requireAdmin`. Force dynamic so CDN never caches an admin page.
export const dynamic = 'force-dynamic'

// Server-side gate — non-admins are redirected to / (or /login if signed out)
// before any admin page renders.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin()
  return (
    <div className="min-h-[100dvh]">
      <AdminNav adminName={profile.full_name || profile.phone} />
      <main className="max-w-5xl mx-auto px-4 pt-4 pb-16">
        {children}
      </main>
    </div>
  )
}
