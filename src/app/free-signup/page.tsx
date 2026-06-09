// ============================================================================
// /free-signup — Free-tier profile setup (auth-gated)
// ----------------------------------------------------------------------------
// Server component reads ?handle=&theme= and delegates to the client
// component. The Free signup is a single-page form with a live preview
// on the right using FreeThemeRenderer.
// ============================================================================

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import FreeSignupClient from './FreeSignupClient'
import { findTheme } from '@/lib/free-themes/library'

export const dynamic = 'force-dynamic'

export default async function FreeSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ handle?: string; theme?: string }>
}) {
  const sp = await searchParams
  const rawHandle = (sp?.handle || '').trim().toLowerCase()
  const handle = /^[a-z0-9-]{1,32}$/.test(rawHandle) ? rawHandle : ''
  const theme = findTheme(sp?.theme)

  return (
    <main className="min-h-[100dvh] bg-white text-[#0A0A0A]">
      <header className="sticky top-0 z-30 bg-white/92 backdrop-blur-sm border-b border-gray-100 px-5 sm:px-6 pt-4 pb-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <Link
            href={`/themes${handle ? `?handle=${handle}` : ''}`}
            className="inline-flex items-center gap-1 text-[14px] font-bold text-gray-700 hover:text-black transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="font-black text-[18px] tracking-tight">
              <span style={{ color: '#0A0A0A' }}>Kita</span>
              <span style={{ color: '#FACC15' }}>2u</span>
            </span>
          </Link>
          <div className="text-[12px] font-bold text-gray-500">
            {theme.name}
          </div>
        </div>
      </header>

      <FreeSignupClient initialHandle={handle} initialThemeId={theme.id} />
    </main>
  )
}
