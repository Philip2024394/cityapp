'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { capturePartnerFromUrl } from '@/lib/partners/attribution'

// QR-scan landing page. Guests scan a hotel/villa's printed QR and arrive
// here. We capture the slug into localStorage (24h attribution window) and
// then forward into the rider search flow. When they book a driver via
// /api/contact/ping, the partner_slug rides along and credits this partner
// with the 8% commission.

type PartnerInfo = { name: string; partner_type: string; city: string | null }

export default function PartnerLandingPage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const [info, setInfo] = useState<PartnerInfo | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const slug = String(params?.slug || '').toLowerCase()
    if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
      setNotFound(true)
      return
    }

    // Push the slug into the querystring so capturePartnerFromUrl picks it
    // up. This keeps a single canonical capture pathway across QR landing,
    // direct partner links (?partner=slug), and pasted URLs.
    const url = new URL(window.location.href)
    url.searchParams.set('partner', slug)
    window.history.replaceState({}, '', url.toString())
    capturePartnerFromUrl()

    // Best-effort partner lookup — don't block the forward if the API fails;
    // attribution is already captured client-side.
    fetch(`/api/partners/${encodeURIComponent(slug)}/public`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { partner?: PartnerInfo } | null) => {
        if (j?.partner) setInfo(j.partner)
        else setNotFound(true)
      })
      .catch(() => { /* attribution survives, partner card just won't show */ })

    const t = setTimeout(() => router.replace('/cari/rider'), 1500)
    return () => clearTimeout(t)
  }, [params?.slug, router])

  if (notFound) {
    return (
      <main className="min-h-screen bg-bg text-ink flex flex-col items-center justify-center p-8 text-center">
        <p className="text-[14px] font-bold mb-2">Mitra tidak ditemukan</p>
        <p className="text-[12px] text-ink/60 mb-6">Link ini tidak terdaftar atau sudah tidak aktif.</p>
        <button
          onClick={() => router.replace('/cari/rider')}
          className="rounded-full bg-brand text-bg px-5 py-2 text-[13px] font-extrabold"
        >
          Cari pengemudi
        </button>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-bg text-ink flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-brand flex items-center justify-center mb-6 animate-pulse">
        <svg className="w-8 h-8 text-bg" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-[18px] font-extrabold mb-1">Selamat datang!</h1>
      <p className="text-[13px] text-ink/70 max-w-xs">
        {info?.name
          ? <>Anda dirujuk oleh <strong className="text-ink">{info.name}</strong></>
          : 'Mencari pengemudi terbaik untuk Anda...'}
      </p>
      {info?.city && (
        <p className="text-[11px] text-ink/40 mt-1">{info.city}</p>
      )}
      <p className="text-[11px] text-ink/40 mt-6">Membuka pencarian ojek…</p>
    </main>
  )
}
