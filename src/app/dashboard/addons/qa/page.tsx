import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import QaEditorClient from './QaEditorClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Tanya & Jawab · Pengaturan · Kita2u',
}

// /dashboard/addons/qa — settings page for the Q&A add-on. Users land
// here after activating the addon. We deliberately keep this page minimal
// so the rest of the dashboard remains "data entry only" per founder
// direction 2026-06-07.
export default function QaAddonSettingsPage() {
  return (
    <main className="min-h-[100dvh] bg-white text-[#0A0A0A]">
      <header className="sticky top-0 z-20 bg-white border-b border-[#F1F1F1]">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-2">
          <Link
            href="/dashboard"
            aria-label="Kembali ke dashboard"
            className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center hover:bg-gray-100 active:scale-95 transition"
          >
            <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
          </Link>
          <h1 className="font-black text-[16px] tracking-tight">Tanya & Jawab</h1>
        </div>
      </header>

      <QaEditorClient />
    </main>
  )
}
