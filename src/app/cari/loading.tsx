// Streaming Suspense fallback rendered while /cari is server-fetching
// (geocoder calls, GPS pickup pre-fill). Light theme to match the
// destination /cari page (white marketplace shell) — the previous
// black fallback was visually jarring when navigating from the
// landing page.

export default function Loading() {
  return (
    <main className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#FFFFFF' }}>
      <div className="text-center space-y-3">
        <div className="mx-auto w-12 h-12 rounded-full animate-pulse" style={{ background: 'rgba(250,204,21,0.35)' }} />
        <div className="text-[12px] uppercase tracking-wider font-extrabold opacity-70" style={{ color: '#0A0A0A' }}>
          Loading…
        </div>
      </div>
    </main>
  )
}
