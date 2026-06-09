// ============================================================================
// /themes — Free + Premium theme picker
// ----------------------------------------------------------------------------
// Server component reads ?handle=<handle> from the URL and hands it to
// ThemePickerClient. Sticky Kita2u wordmark header mirrors /how-it-works.
// ============================================================================

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import ThemePickerClient from './ThemePickerClient'

export const dynamic = 'force-dynamic'

export default async function ThemesPage({
  searchParams,
}: {
  searchParams: Promise<{ handle?: string }>
}) {
  const sp = await searchParams
  const rawHandle = (sp?.handle || '').trim().toLowerCase()
  const handle = /^[a-z0-9-]{1,32}$/.test(rawHandle) ? rawHandle : ''

  return (
    <main className="min-h-[100dvh] bg-white text-[#0A0A0A]">
      <header className="sticky top-0 z-30 bg-white/92 backdrop-blur-sm border-b border-gray-100 px-5 sm:px-6 pt-4 pb-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-[14px] font-bold text-gray-700 hover:text-black transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="font-black text-[18px] tracking-tight">
              <span style={{ color: '#0A0A0A' }}>Kita</span>
              <span style={{ color: '#FACC15' }}>2u</span>
            </span>
          </Link>
          <Link
            href="/pricing"
            className="hidden sm:inline-flex items-center gap-1.5 text-[13px] font-extrabold text-[#0A0A0A] hover:text-brand transition"
          >
            See plans
          </Link>
        </div>
      </header>

      <ThemePickerClient handle={handle} />
    </main>
  )
}
