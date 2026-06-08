'use client'

// Per-vertical error boundary. Without this file, an uncaught error in any
// /parcel page bubbles up to the global layout and can render the whole
// marketplace blank. With this boundary, only the /parcel segment renders
// the fallback — beautician, handyman, tattoo, cake, florist etc. keep running.
//
// One template per vertical; intentionally identical so a fix to the
// fallback only needs to be applied here and cloned.

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function ParcelError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[parcel] segment error:', error)
    }
  }, [error])

  return (
    <main className="min-h-[100dvh] bg-white text-[#0A0A0A] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center py-12">
        <div className="mx-auto w-14 h-14 rounded-full bg-[#FEF3C7] flex items-center justify-center mb-5">
          <AlertTriangle className="w-7 h-7 text-[#B45309]" strokeWidth={2.25} aria-hidden />
        </div>
        <h1 className="text-[20px] sm:text-[22px] font-black tracking-tight leading-tight mb-2">
          Something went wrong loading Parcel
        </h1>
        <p className="text-[13px] text-[#52525B] leading-relaxed mb-6">
          The rest of the marketplace is unaffected. Try again, or head back home.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#0A0A0A] text-white text-[13px] font-bold hover:opacity-90 transition min-h-[44px]"
          >
            <RotateCcw className="w-4 h-4" aria-hidden /> Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-full border border-[#E4E4E7] text-[13px] font-bold hover:border-[#0A0A0A] transition min-h-[44px]"
          >
            Go home
          </Link>
        </div>
        {error.digest && (
          <p className="mt-6 text-[11px] text-[#A1A1AA] font-mono">ref: {error.digest}</p>
        )}
      </div>
    </main>
  )
}
