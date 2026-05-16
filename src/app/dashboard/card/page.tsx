'use client'
import Link from 'next/link'
import { ChevronLeft, Printer, Download, Share2 } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import DashboardNav from '@/components/layout/DashboardNav'
import QRBusinessCard from '@/components/rider/QRBusinessCard'
import { MOCK_RIDERS } from '@/data/mockRiders'
import { useHaptic } from '@/hooks/useHaptic'

const ME = MOCK_RIDERS[0]!

export default function BusinessCardPage() {
  const haptic = useHaptic()

  // Production: use NEXT_PUBLIC_APP_URL + slug. Dev fallback uses window.location.
  const profileUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/r/${ME.slug}`
      : `https://cityrider.id/r/${ME.slug}`

  function onPrint() {
    haptic.impact()
    window.print()
  }

  async function onShare() {
    haptic.tap()
    const shareData = {
      title: `${ME.name} · City Rider`,
      text: `Kurir motor di ${ME.city} · ${ME.bike.make} ${ME.bike.model}. Pesan langsung lewat WhatsApp.`,
      url: profileUrl,
    }
    if (navigator.share) {
      try { await navigator.share(shareData) } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(profileUrl)
        alert('Link tersalin — paste di WhatsApp / Instagram / FB')
      } catch { /* clipboard blocked */ }
    }
  }

  return (
    <>
      <AppNav />
      <main className="min-h-screen pb-32">
        <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
          <Link href="/dashboard" className="text-[13px] text-muted hover:text-ink font-bold flex items-center gap-1 no-print">
            <ChevronLeft className="w-4 h-4" />
            Dashboard
          </Link>

          <header className="space-y-1 no-print">
            <h1 className="text-2xl font-extrabold">Kartu nama digital</h1>
            <p className="text-muted text-[14px]">
              Print, gunting, tempel di motor / box kamu. Customer scan QR → masuk ke profilmu → pesan langsung via WhatsApp.
            </p>
          </header>

          {/* The card itself */}
          <div className="print-area py-2">
            <QRBusinessCard rider={ME} profileUrl={profileUrl} />
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2 no-print">
            <button onClick={onPrint} className="btn-primary w-full">
              <Printer className="w-4 h-4" />
              Print kartu
            </button>
            <button onClick={onShare} className="btn-secondary w-full">
              <Share2 className="w-4 h-4" />
              Share link
            </button>
          </div>

          {/* Tips */}
          <div className="card p-4 border-brand/20 bg-brand/5 no-print">
            <div className="text-[13px] text-ink/85 leading-relaxed space-y-2">
              <div>📌 <strong className="text-brand">Cara pakai:</strong></div>
              <ol className="list-decimal list-inside space-y-1 text-muted">
                <li>Tap <strong className="text-ink">Print kartu</strong> → A4 → simpan PDF atau print di warnet (Rp 2.000-3.000)</li>
                <li>Gunting di garis kartu, laminating biar tahan hujan</li>
                <li>Tempel di box motor, kasih ke customer langganan, sebarkan di warung sekitar</li>
              </ol>
              <div className="text-dim mt-2">
                💡 Atau tap <strong className="text-ink">Share link</strong> untuk kirim ke teman / posting di Facebook & Instagram Story.
              </div>
            </div>
          </div>

          {/* Past customers prompt */}
          <Link href="/dashboard/customers" className="card card-interactive p-4 flex items-center justify-between no-print">
            <div>
              <div className="font-extrabold text-[15px]">Punya pelanggan langganan?</div>
              <div className="text-[13px] text-muted mt-0.5">Kabari mereka kartumu sudah jadi di Customer Book →</div>
            </div>
            <ChevronLeft className="w-5 h-5 text-brand rotate-180" />
          </Link>
        </div>
      </main>
      <DashboardNav />

      {/* Print-only styles */}
      <style jsx global>{`
        @media print {
          body { background: #fff !important; }
          .no-print, header, footer, nav { display: none !important; }
          main { padding: 0 !important; }
          .print-area { margin: 0 auto; padding: 12px; }
        }
      `}</style>
    </>
  )
}
