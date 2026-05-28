'use client'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

// /pricing — Marketing pricing page (public, no auth).
// Stub content — replace with real plans + pricing tiers when ready.
// The driver-side pricing-settings page moved to /dashboard/pricing.

export const dynamic = 'force-dynamic'

export default function PricingPage() {
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
          Pricing
        </h1>
        <p className="text-gray-700 text-[15px] leading-relaxed">
          Placeholder page. Plans &amp; pricing details coming soon.
        </p>
        <div
          className="rounded-2xl bg-white p-6 border border-gray-100"
          style={{ boxShadow: '0 2px 14px rgba(0,0,0,0.06)' }}
        >
          <div className="font-extrabold text-[16px] text-[#0A0A0A]">Free to start</div>
          <p className="text-[13px] text-gray-600 leading-snug mt-2">
            Get your Kita2u page, profile, and direct WhatsApp bookings at no cost. Premium add-ons (custom domain, branded templates) are priced separately.
          </p>
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
