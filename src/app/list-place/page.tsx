import Link from 'next/link'
import { ArrowLeft, CheckCircle2, MapPin, Camera, Clock, CreditCard } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'

// Stub page — entry point for owners who tap "List your place" from the
// /places header or the city drawer. The full submission form + Midtrans
// checkout flow isn't built yet; this page sells the value prop and
// captures interest. Replace the WhatsApp link with a real form route
// once the schema migrations + form components ship.

export const metadata = {
  title: 'List Your Place · City Rider',
  description:
    'Daftarkan tempat usahamu di City Rider. GRATIS 7 hari pertama, lalu Rp 30.000/bulan — listing langsung tampil di area kotamu.',
}

const STEPS = [
  {
    Icon: MapPin,
    title: 'Lokasi & detail',
    body: 'Nama tempat, alamat, kategori, dan deskripsi singkat. Pin lokasi di peta.',
  },
  {
    Icon: Camera,
    title: 'Foto & jam buka',
    body: 'Upload 1–5 foto + atur jam buka mingguan. Foto akan tampil di kartu pelanggan.',
  },
  {
    Icon: Clock,
    title: 'Kontak & verifikasi',
    body: 'Nama pemilik, WhatsApp, dan email untuk konfirmasi listing.',
  },
  {
    Icon: CreditCard,
    title: 'Bayar via Midtrans',
    body: 'GRATIS 7 hari pertama, lalu Rp 30.000/bulan via transfer bank, e-wallet, atau QRIS — listing tayang setelah disetujui admin.',
  },
] as const

export default function ListPlacePage() {
  return (
    <>
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 pt-3 pb-24">
        <Link
          href="/places"
          className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-ink mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to places
        </Link>

        <header className="mb-6">
          <h1 className="text-[26px] sm:text-[32px] font-extrabold tracking-tight leading-tight">
            List your <span className="gradient-text">place</span>
          </h1>
          <p className="mt-2 text-[14px] text-muted leading-snug">
            Tampilkan tempat usahamu di City Rider dan biarkan pelanggan kami yang sedang booking
            rider langsung menemukan tempatmu. <strong className="text-ink">GRATIS 7 hari</strong> — lalu hanya
            <strong className="text-ink"> Rp 30.000/bulan</strong>, satu listing per tempat.
          </p>
        </header>

        <div className="space-y-3 mb-8">
          {STEPS.map(({ Icon, title, body }, i) => (
            <div
              key={title}
              className="flex items-start gap-3 p-3 rounded-2xl bg-black/55 border border-white/10"
            >
              <span
                className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-brand to-brand2 border border-black/85"
                aria-hidden
              >
                <Icon className="w-5 h-5 text-bg" strokeWidth={2.5} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand">
                    Step {i + 1}
                  </span>
                </div>
                <h3 className="text-[15px] font-extrabold text-ink leading-tight mt-0.5">
                  {title}
                </h3>
                <p className="mt-1 text-[13px] text-muted leading-snug">{body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-4 bg-gradient-to-br from-brand to-brand2 text-bg shadow-[0_8px_22px_rgba(250,204,21,0.30)] border border-black/85">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5" strokeWidth={2.5} />
            <span className="text-[14px] font-extrabold uppercase tracking-wider">
              Ready to list
            </span>
          </div>
          <p className="text-[13px] font-bold leading-snug">
            Isi detail tempatmu, upload foto, dan kirim — admin City Rider akan meninjau dalam
            24–48 jam. Setelah disetujui kamu mendapat GRATIS 7 hari, lalu Rp 30.000/bulan untuk tetap tayang.
          </p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Link
              href="/list-place/new"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-bg text-brand font-extrabold text-[13px] uppercase tracking-wider hover:bg-black transition"
            >
              Start listing
            </Link>
            <Link
              href="/r/andi-pratama-yogya?utm_source=list-place-demo"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-bg text-bg font-extrabold text-[13px] uppercase tracking-wider hover:bg-bg/10 transition"
            >
              See live demo →
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
