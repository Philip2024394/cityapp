'use client'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

// /custom-domains — Marketing page for the bring-your-own-domain feature.
// Stub content — placeholder pricing in IDR; revisit when the feature
// is actually wired up server-side. DNS setup support is free, the
// connection fee + template-change fee are the paid components.

export const dynamic = 'force-dynamic'

export default function CustomDomainsPage() {
  return (
    <main className="min-h-[100dvh] bg-white text-black">
      <header className="px-5 sm:px-6 pt-4 pb-3 border-b border-gray-100">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-[14px] font-bold text-gray-700 hover:text-black"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="font-black text-[18px]">
              <span style={{ color: '#0A0A0A' }}>Kita</span>
              <span style={{ color: '#FACC15' }}>2u</span>
            </span>
          </Link>
        </div>
      </header>

      <section className="px-5 sm:px-6 py-10 max-w-2xl mx-auto space-y-6">
        <h1 className="text-[32px] sm:text-[40px] font-black leading-[1.05] tracking-tight">
          Use your own domain
        </h1>
        <p className="text-gray-700 text-[15px] leading-relaxed">
          Connect <strong>yourbusiness.com</strong> straight to your Kita2u page. Your visitors see your brand — Kita2u stays invisible behind the scenes.
        </p>

        <div className="space-y-3">
          <div className="font-extrabold text-[16px] text-[#0A0A0A]">How it works</div>
          <ol className="list-decimal list-inside space-y-2 text-[14px] text-gray-700 leading-relaxed">
            <li>You buy a domain (or use one you already own).</li>
            <li>We help you point it at your Kita2u page — free DNS setup support.</li>
            <li>Visitors land on <strong>yourbusiness.com</strong> and see your full Kita2u profile.</li>
          </ol>
        </div>

        <div
          className="rounded-2xl bg-white p-6 border border-gray-100 space-y-3"
          style={{ boxShadow: '0 2px 14px rgba(0,0,0,0.06)' }}
        >
          <div className="font-extrabold text-[16px] text-[#0A0A0A]">Pricing</div>
          <p className="text-[14px] text-gray-700 leading-relaxed">
            Custom domain pricing varies by country and registrar. Contact our admin team for availability and a quote tailored to your domain.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-full bg-black text-white px-5 py-2.5 text-[13px] font-extrabold uppercase tracking-wider hover:bg-gray-800 transition"
          >
            Contact admin
          </Link>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-1 text-[13px] font-bold text-gray-700 hover:text-black"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to home
        </Link>
      </section>
    </main>
  )
}
