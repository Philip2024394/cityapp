'use client'
import Link from 'next/link'
import { ChevronLeft, Zap, Link2, Smartphone } from 'lucide-react'

// /how-it-works — Marketing "How it works" page (public, no auth).
// Stub content — flesh out the full walkthrough when ready. Re-uses the
// 3 feature pillars (Fast setup / Share everywhere / Built for mobile)
// that were originally inline on the landing.

export const dynamic = 'force-dynamic'

export default function HowItWorksPage() {
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
          How it works
        </h1>
        <p className="text-gray-700 text-[15px] leading-relaxed">
          Three steps to turn your social audience into direct customers.
        </p>

        <div className="divide-y divide-gray-100">
          <div className="flex items-start gap-3 py-4">
            <div
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(250,204,21,0.15)', border: '1px solid rgba(250,204,21,0.35)' }}
              aria-hidden
            >
              <Zap className="w-5 h-5" strokeWidth={2.25} style={{ color: '#0A0A0A' }} />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-[16px] text-[#0A0A0A] leading-tight">Fast setup</div>
              <div className="text-[13px] text-gray-600 leading-snug mt-1">
                Create your profile in minutes — add your content, products &amp; booking options.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 py-4">
            <div
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(250,204,21,0.15)', border: '1px solid rgba(250,204,21,0.35)' }}
              aria-hidden
            >
              <Link2 className="w-5 h-5" strokeWidth={2.25} style={{ color: '#0A0A0A' }} />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-[16px] text-[#0A0A0A] leading-tight">Share everywhere</div>
              <div className="text-[13px] text-gray-600 leading-snug mt-1">
                One link across all your social platforms — TikTok, Instagram, Facebook &amp; WhatsApp.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 py-4">
            <div
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(250,204,21,0.15)', border: '1px solid rgba(250,204,21,0.35)' }}
              aria-hidden
            >
              <Smartphone className="w-5 h-5" strokeWidth={2.25} style={{ color: '#0A0A0A' }} />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-[16px] text-[#0A0A0A] leading-tight">Built for mobile</div>
              <div className="text-[13px] text-gray-600 leading-snug mt-1">
                Designed for creators &amp; businesses on the go — every page works on a phone first.
              </div>
            </div>
          </div>
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
