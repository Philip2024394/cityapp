import Link from 'next/link'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'

export const metadata = {
  title: 'Listing submitted · City Rider',
}

export default function SubmittedPage() {
  return (
    <>
      <AppNav />
      <main className="max-w-xl mx-auto px-4 pt-12 pb-24 text-center">
        <div className="inline-flex w-16 h-16 rounded-full items-center justify-center bg-gradient-to-br from-brand to-brand2 border border-black/85 shadow-[0_8px_22px_rgba(250,204,21,0.40)] mb-5">
          <CheckCircle2 className="w-9 h-9 text-bg" strokeWidth={2.75} />
        </div>
        <h1 className="text-[24px] sm:text-[28px] font-extrabold tracking-tight leading-tight mb-2">
          Listing <span className="gradient-text">submitted</span>
        </h1>
        <p className="text-[14px] text-muted leading-snug mb-6">
          Terima kasih! Admin City Rider akan meninjau tempatmu dalam <strong className="text-ink">24–48 jam</strong>.
          Setelah disetujui kamu mendapat <strong className="text-ink">GRATIS 7 hari</strong> —
          lalu hanya <strong className="text-ink">Rp 30.000/bulan</strong> untuk tetap tayang.
          Kami akan menghubungi via WhatsApp + email yang kamu daftarkan.
        </p>
        <Link
          href="/places"
          className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-brand to-brand2 text-bg font-extrabold text-[13px] uppercase tracking-wider border border-black/85 shadow-[0_8px_22px_rgba(250,204,21,0.30)] active:scale-[0.99]"
        >
          Browse places
          <ArrowRight className="w-4 h-4" />
        </Link>
      </main>
    </>
  )
}
