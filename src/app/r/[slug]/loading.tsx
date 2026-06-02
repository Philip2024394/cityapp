// Skeleton matches the light /r/[slug] profile page so the transition
// from /cari (also light) is seamless. Previously this rendered a full
// black shell which felt like a broken navigation when the customer
// tapped a driver's Profile button.
export default function Loading() {
  return (
    <main className="min-h-[100dvh] px-4 pt-6" style={{ background: '#FFFFFF' }}>
      <div className="max-w-xl mx-auto space-y-3">
        <div className="rounded-2xl animate-pulse" style={{ background: '#F4F4F5', height: 260 }} />
        <div className="rounded-2xl animate-pulse" style={{ background: '#F4F4F5', height: 120 }} />
        <div className="rounded-2xl animate-pulse" style={{ background: '#F4F4F5', height: 80 }} />
      </div>
    </main>
  )
}
