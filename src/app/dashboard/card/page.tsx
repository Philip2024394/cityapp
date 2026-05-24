'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Printer, Share2, Loader2 } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import DashboardNav from '@/components/layout/DashboardNav'
import QRBusinessCard from '@/components/rider/QRBusinessCard'
import { fetchMyDriverBrowser } from '@/lib/drivers/queries'
import { useHaptic } from '@/hooks/useHaptic'
import type { Rider } from '@/types/rider'

export default function BusinessCardPage() {
  const haptic = useHaptic()
  const [ME, setME] = useState<Rider | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchMyDriverBrowser().then((me) => {
      if (cancelled) return
      setME(me)
      setLoaded(true)
    })
    return () => { cancelled = true }
  }, [])

  // Production: use NEXT_PUBLIC_APP_URL + slug. Dev fallback uses window.location.
  const profileUrl = ME
    ? (typeof window !== 'undefined'
        ? `${window.location.origin}/r/${ME.slug}`
        : `https://cityriders.id/r/${ME.slug}`)
    : ''

  function onPrint() {
    haptic.impact()
    window.print()
  }

  async function onShare() {
    if (!ME) return
    haptic.tap()
    const shareData = {
      title: `${ME.name} · City Rider`,
      text: `Motorcycle courier in ${ME.city} · ${ME.bike.make} ${ME.bike.model}. Book directly via WhatsApp.`,
      url: profileUrl,
    }
    if (navigator.share) {
      try { await navigator.share(shareData) } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(profileUrl)
        alert('Link copied — paste in WhatsApp / Instagram / FB')
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
            <h1 className="text-2xl font-extrabold">Digital business card</h1>
            <p className="text-muted text-[14px]">
              Print, cut, stick on your bike / box. Customers scan the QR → go to your profile → book directly on WhatsApp.
            </p>
          </header>

          {/* The card itself — only renders once the rider is loaded so
              every driver prints their OWN QR, never a mock placeholder. */}
          {!loaded && (
            <div className="card p-8 flex items-center justify-center text-muted">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}
          {loaded && !ME && (
            <div className="card p-8 text-center text-muted">
              Sign in as a driver to print your business card.
            </div>
          )}
          {ME && (
            <>
              <div className="print-area py-2">
                <QRBusinessCard rider={ME} profileUrl={profileUrl} />
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2 no-print">
                <button onClick={onPrint} className="btn-primary w-full">
                  <Printer className="w-4 h-4" />
                  Print card
                </button>
                <button onClick={onShare} className="btn-secondary w-full">
                  <Share2 className="w-4 h-4" />
                  Share link
                </button>
              </div>
            </>
          )}

          {/* Tips */}
          <div className="card p-4 border-brand/20 bg-brand/5 no-print">
            <div className="text-[13px] text-ink/85 leading-relaxed space-y-2">
              <div>📌 <strong className="text-brand">How to use:</strong></div>
              <ol className="list-decimal list-inside space-y-1 text-muted">
                <li>Tap <strong className="text-ink">Print card</strong> → A4 → save PDF or print at a warnet (Rp 2.000-3.000)</li>
                <li>Cut along the card edge, laminate to make rain-proof</li>
                <li>Stick to your bike box, give to regular customers, spread around nearby warungs</li>
              </ol>
              <div className="text-dim mt-2">
                💡 Or tap <strong className="text-ink">Share link</strong> to send to friends / post on Facebook & Instagram Story.
              </div>
            </div>
          </div>

          {/* Past customers prompt */}
          <Link href="/dashboard/customers" className="card card-interactive p-4 flex items-center justify-between no-print">
            <div>
              <div className="font-extrabold text-[15px]">Got regular customers?</div>
              <div className="text-[13px] text-muted mt-0.5">Let them know your card is ready in Customer Book →</div>
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
