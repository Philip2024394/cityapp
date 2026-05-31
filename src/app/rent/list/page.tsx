import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Bike, Camera, Banknote, MapPin } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import ContractTemplates from '@/components/rent/ContractTemplates'

export const metadata = {
  title: 'List Your Bike · CityDrivers',
  description:
    'Daftarkan motormu untuk disewakan di CityDrivers. GRATIS 7 hari pertama, lalu Rp 38.000/bulan atau Rp 350.000/tahun — ' +
    'tayang setelah ditinjau admin.',
}

const STEPS = [
  {
    Icon: Bike,
    title: 'Detail motor',
    body: 'Brand, model, tahun, CC, transmisi, dan kondisi motor.',
  },
  {
    Icon: Camera,
    title: 'Foto + kelengkapan',
    body: '1–5 foto motor + helmet, raincoat, phone holder/charger, box.',
  },
  {
    Icon: Banknote,
    title: 'Harga & deposit',
    body: 'Harian / mingguan / bulanan + deposit. Self ride atau dengan driver.',
  },
  {
    Icon: MapPin,
    title: 'Lokasi & kontak',
    body: 'Kota, alamat pickup, dan WhatsApp untuk pelanggan menghubungi langsung.',
  },
] as const

export default function ListBikePage() {
  return (
    <>
      <AppNav />
      <main className="max-w-2xl mx-auto px-4 pt-3 pb-24">
        <Link
          href="/rent"
          className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-ink mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to rentals
        </Link>

        <header className="mb-6">
          <h1 className="text-[26px] sm:text-[32px] font-extrabold tracking-tight leading-tight">
            List your <span className="gradient-text">bike</span>
          </h1>
          <p className="mt-2 text-[14px] text-muted leading-snug">
            Punya motor yang nganggur saat kamu nggak kerja? Sewakan di CityDrivers dan dapatkan
            passive income. <strong className="text-ink">GRATIS 7 hari pertama</strong> — lalu hanya
            <strong className="text-ink"> Rp 38.000/bulan</strong> atau <strong className="text-ink">Rp 350.000/tahun</strong> per listing, tayang setelah ditinjau admin.
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
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand">
                  Step {i + 1}
                </span>
                <h3 className="text-[15px] font-extrabold text-ink leading-tight mt-0.5">{title}</h3>
                <p className="mt-1 text-[13px] text-muted leading-snug">{body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-4 bg-gradient-to-br from-brand to-brand2 text-bg shadow-[0_8px_22px_rgba(250,204,21,0.30)] border border-black/85">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5" strokeWidth={2.5} />
            <span className="text-[14px] font-extrabold uppercase tracking-wider">Ready to list</span>
          </div>
          <p className="text-[13px] font-bold leading-snug">
            Isi detail motormu, upload foto, dan kirim — admin CityDrivers akan meninjau dalam
            24–48 jam.
          </p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Link
              href="/rent/list/auth"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-bg text-brand font-extrabold text-[13px] uppercase tracking-wider hover:bg-black transition"
            >
              Start listing
            </Link>
            <Link
              href="/r/andi-pratama-yogya?utm_source=rent-list-demo"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-bg text-bg font-extrabold text-[13px] uppercase tracking-wider hover:bg-bg/10 transition"
            >
              See live demo →
            </Link>
          </div>
        </div>

        <div className="mt-10">
          <ContractTemplates />
        </div>
      </main>
    </>
  )
}
