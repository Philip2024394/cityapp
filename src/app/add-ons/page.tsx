import type { Metadata } from 'next'
import Link from 'next/link'
import AddonsStoreClient from './AddonsStoreClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Tambahan · Kita2u',
  description:
    'Tambahan untuk membuat profil Kita2u kamu bekerja lebih keras — ' +
    'tanya & jawab, pembayaran online, auto-post sosial media.',
  alternates: { canonical: 'https://kita2u.com/add-ons' },
}

export default function AddonsStorePage() {
  return (
    <main className="min-h-[100dvh] bg-white text-[#0A0A0A]">
      <header className="relative z-30 pt-safe border-b border-[#F1F1F1]">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            aria-label="Kita2u home"
            className="inline-flex items-center hover:opacity-85 transition"
          >
            <span
              className="font-black tracking-tight text-[24px] sm:text-[28px] leading-none"
              style={{ color: '#0A0A0A', letterSpacing: '-0.02em' }}
            >
              Kita
            </span>
            <span
              className="font-black tracking-tight text-[24px] sm:text-[28px] leading-none"
              style={{ color: '#FACC15', letterSpacing: '-0.02em' }}
            >
              2u
            </span>
          </Link>
          <Link
            href="/login"
            className="text-[13px] font-bold text-[#0A0A0A] hover:underline min-h-[44px] flex items-center"
          >
            Masuk →
          </Link>
        </div>
      </header>

      <AddonsStoreClient />
    </main>
  )
}
