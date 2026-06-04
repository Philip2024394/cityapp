import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { ChevronLeft, Search as SearchIcon } from 'lucide-react'
import SearchResultsClient from './SearchResultsClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Search · Kita2u',
  description: 'Cari penyedia jasa & tempat di seluruh kategori Kita2u.',
}

// ============================================================================
// /search — Cross-vertical results page (Phase 2 of the explore-search
// rollout). Hands the query to /api/search and renders mixed results
// from every provider table in a single list.
//
// Two render branches:
// - `?q=<query>` → fetch + render result rows
// - empty/missing  → render a minimal "type to search" stub. We don't fall
//   through to the /explore intent dropdown here because the page is
//   reached only when the user explicitly tapped "search across all
//   categories" — so showing nothing on an empty query is the correct
//   "you got here without typing anything" state.
// ============================================================================

export default function SearchPage() {
  return (
    <main className="min-h-[100dvh] bg-white text-[#0A0A0A]">
      <header className="sticky top-0 z-20 bg-white border-b border-[#F1F1F1]">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-2">
          <Link
            href="/explore"
            aria-label="Kembali"
            className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center hover:bg-gray-100 active:scale-95 transition"
          >
            <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
          </Link>
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <SearchIcon className="w-5 h-5 text-gray-400 shrink-0" strokeWidth={2.25} aria-hidden />
            <h1 className="font-black text-[16px] tracking-tight truncate">Hasil Pencarian</h1>
          </div>
        </div>
      </header>

      <Suspense fallback={<LoadingShell />}>
        <SearchResultsClient />
      </Suspense>
    </main>
  )
}

function LoadingShell() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="text-[13px] text-[#71717A] font-bold">Memuat hasil…</div>
    </div>
  )
}
