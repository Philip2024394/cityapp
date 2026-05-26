// Streaming Suspense fallback rendered while /cari is server-fetching
// (geocoder calls, GPS pickup pre-fill). Keeps the dark-themed shell
// visible immediately on 3G so the user doesn't stare at a white flash.

export default function Loading() {
  return (
    <main className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#0A0A0A' }}>
      <div className="text-center space-y-3">
        <div className="mx-auto w-12 h-12 rounded-full animate-pulse" style={{ background: 'rgba(250,204,21,0.18)' }} />
        <div className="text-[12px] uppercase tracking-wider font-extrabold text-brand opacity-70">
          Loading…
        </div>
      </div>
    </main>
  )
}
