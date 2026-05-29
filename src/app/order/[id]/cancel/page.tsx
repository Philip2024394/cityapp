'use client'
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { XCircle, ArrowLeft } from 'lucide-react'

// /order/[id]/cancel — customer-facing cancel landing. Stripe + Midtrans
// both bounce the user here on abandon. We hit /api/orders/[id] only to
// learn the vendor's display_name + slug so the "back to vendor" button
// goes somewhere meaningful. If the order id is bogus we still render
// the page with a generic "back to home" CTA.

type Vendor = { display_name: string; slug: string | null }

function vendorHref(vendorType: string | null, slug: string | null): string {
  if (!slug || !vendorType) return '/'
  switch (vendorType) {
    case 'beautician':  return `/beautician/${slug}`
    case 'handyman':    return `/handyman/${slug}`
    case 'laundry':     return `/laundry/${slug}`
    case 'massage':     return `/massage/${slug}`
    case 'home-clean':  return `/home-clean/${slug}`
    case 'tour-guide':  return `/tour/${slug}`
    case 'rentals':     return `/rent/${slug}`
    case 'place':       return `/places/${slug}`
    case 'facial':      return `/facial/${slug}`
    case 'skincare':    return `/skincare/${slug}`
    default:            return '/'
  }
}

export default function OrderCancelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [vendor,     setVendor]     = useState<Vendor | null>(null)
  const [vendorType, setVendorType] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const r = await fetch(`/api/orders/${id}`, { cache: 'no-store' })
        if (!r.ok) return
        const j = await r.json() as { vendor: Vendor; order: { vendor_type: string } }
        if (cancelled) return
        setVendor(j.vendor)
        setVendorType(j.order.vendor_type)
      } catch { /* silent — fallback CTA is fine */ }
    }
    void load()
    return () => { cancelled = true }
  }, [id])

  const back = vendorHref(vendorType, vendor?.slug ?? null)
  const label = vendor?.display_name ?? 'home'

  return (
    <main className="relative min-h-[100dvh] bg-gradient-to-b from-white via-white to-gray-50 text-black">
      <div className="max-w-md mx-auto px-4 pt-20 pb-12 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-rose-100 text-rose-500 mb-5">
          <XCircle size={48} strokeWidth={2.2} />
        </div>
        <h1 className="text-[24px] font-black text-black leading-tight">Payment cancelled</h1>
        <p className="mt-2 text-[13px] text-black/60 leading-snug max-w-sm mx-auto">
          No problem — your cart is still saved. Pop back over when you&rsquo;re ready and we&rsquo;ll pick up right where you left off.
        </p>

        <Link
          href={back}
          className="mt-8 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-black text-white px-6 py-3 text-[13px] font-extrabold uppercase tracking-wider min-h-[44px] transition active:scale-[0.98]"
        >
          <ArrowLeft size={14} strokeWidth={3} />
          Back to {label}
        </Link>

        <p className="mt-6 text-[11px] text-black/40 leading-snug">
          You haven&rsquo;t been charged. Any saved items are still in your cart on the vendor&rsquo;s page.
        </p>
      </div>
    </main>
  )
}
