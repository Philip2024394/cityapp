import Link from 'next/link'
import { WifiOff, RefreshCw } from 'lucide-react'

// ============================================================================
// /offline — static fallback rendered by the service worker when the
// network is unreachable.
// ----------------------------------------------------------------------------
// Keep this page dependency-free (no client JS, no external fetches) so
// the SW can cache it once at install time and always have something to
// show when the radio is dead.
// ============================================================================

export const metadata = {
  title: 'Offline · Kita2u',
  description: 'You are offline. Reconnect to keep browsing Kita2u.',
  robots: { index: false, follow: false },
}

export default function OfflinePage() {
  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-4 py-12" style={{ background: '#0A0A0A' }}>
      <div className="w-full max-w-sm text-center space-y-5">
        <div
          className="mx-auto w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: 'rgba(250,204,21,0.10)',
            border: '1px solid rgba(250,204,21,0.30)',
          }}
        >
          <WifiOff className="w-10 h-10" style={{ color: '#FACC15' }} strokeWidth={2} />
        </div>

        <div>
          <h1 className="text-2xl font-extrabold text-ink">You&apos;re offline</h1>
          <p className="text-[14px] text-muted mt-2 leading-relaxed">
            Cek koneksi internet kamu — WiFi atau data seluler — lalu coba lagi.
            Kita2u butuh koneksi untuk menampilkan rider yang sedang online.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {/* No-JS reload — the browser handles this natively. */}
          <Link
            href="/"
            className="rounded-2xl py-3 inline-flex items-center justify-center gap-2 font-extrabold text-[14px] text-bg bg-gradient-to-r from-brand to-brand2 active:scale-95 transition"
            style={{ minHeight: 48 }}
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </Link>
          <Link
            href="/"
            className="rounded-2xl py-3 inline-flex items-center justify-center gap-2 font-extrabold text-[13px] transition"
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.70)',
              border: '1px solid rgba(255,255,255,0.10)',
              minHeight: 48,
            }}
          >
            Back to home
          </Link>
        </div>

        <p className="text-[11px] text-muted/60 pt-4">
          Kita2u · Marketplace kurir motor Indonesia
        </p>
      </div>
    </main>
  )
}
