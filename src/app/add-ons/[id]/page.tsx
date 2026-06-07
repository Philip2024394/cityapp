import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { findAddon, priceLabel } from '@/lib/addons/catalog'
import AddonDetailClient from './AddonDetailClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params
  const a = findAddon(id)
  if (!a) return { title: 'Tambahan tidak ditemukan · Kita2u' }
  return {
    title:       `${a.label.id} · Tambahan Kita2u`,
    description: a.tagline.id,
    alternates:  { canonical: `https://kita2u.com/add-ons/${a.slug}` },
  }
}

export default async function AddonDetailPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const a = findAddon(id)
  if (!a) notFound()

  return (
    <main className="min-h-[100dvh] bg-white text-[#0A0A0A]">
      <header className="relative z-30 pt-safe border-b border-[#F1F1F1]">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-2">
          <Link
            href="/add-ons"
            aria-label="Kembali"
            className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center hover:bg-gray-100 active:scale-95 transition"
          >
            <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
          </Link>
          <Link
            href="/"
            aria-label="Kita2u home"
            className="inline-flex items-center hover:opacity-85 transition"
          >
            <span className="font-black tracking-tight text-[20px] sm:text-[22px] leading-none" style={{ color: '#0A0A0A', letterSpacing: '-0.02em' }}>Kita</span>
            <span className="font-black tracking-tight text-[20px] sm:text-[22px] leading-none" style={{ color: '#FACC15', letterSpacing: '-0.02em' }}>2u</span>
          </Link>
        </div>
      </header>

      <AddonDetailClient
        id={a.id}
        slug={a.slug}
        iconName={a.iconName}
        label={a.label.id}
        tagline={a.tagline.id}
        description={a.description.id}
        priceLabel={priceLabel(a, 'id')}
        billingKind={a.billing.kind}
        available={a.available}
      />
    </main>
  )
}
