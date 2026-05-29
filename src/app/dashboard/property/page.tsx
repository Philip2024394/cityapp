import Link from 'next/link'

// /dashboard/property — placeholder hub for the new property category.
// The fully styled editor lives at /dashboard/property/edit (shared
// ProviderDashboard component). When the property signup flow ships this
// page will host a real provider overview like /dashboard/beautician.
export default function PropertyDashboardHome() {
  return (
    <main className="min-h-[100dvh] bg-bg text-ink px-4 pt-10 pb-32">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-[22px] font-black mb-1">Property dashboard</h1>
        <p className="text-[12px] text-ink/65 leading-snug mb-6">
          New category — schema landed via migration 0126. Signup &amp; overview UI ships in a follow-up.
        </p>
        <Link
          href="/dashboard/property/edit"
          className="inline-block rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold"
        >
          Open editor
        </Link>
      </div>
    </main>
  )
}
