import Link from 'next/link'
import { ChevronLeft, ExternalLink, FileText, Shield, Info } from 'lucide-react'

// Hub page for the public-facing legal info. Single entry point that
// links out to the 3 pillars: About (positioning), Terms, Privacy.
// Plus a short, public-facing summary of our regulatory posture.
export const metadata = {
  title: 'Legal info · City Rider',
  description: 'How City Rider operates as a software platform under Indonesian law.',
}

export default function LegalIndexPage() {
  return (
    <main className="min-h-screen pb-16">
      <header className="sticky top-0 z-40 glass-strong pt-safe">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center">
          <Link href="/" className="text-[13px] font-bold text-muted hover:text-ink flex items-center gap-1.5">
            <ChevronLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        <div>
          <h1 className="text-3xl font-extrabold">Legal information</h1>
          <p className="text-muted text-[14px] mt-2">
            How City Rider operates and what we are responsible for under Indonesian law.
          </p>
        </div>

        <Tile
          href="/about"
          icon={<Info className="w-5 h-5 text-brand" />}
          title="About City Rider"
          sub="What we are + what we're not"
        />
        <Tile
          href="/terms"
          icon={<FileText className="w-5 h-5 text-brand" />}
          title="Terms of Service"
          sub="The rules of using the platform — for riders + customers"
        />
        <Tile
          href="/privacy"
          icon={<Shield className="w-5 h-5 text-brand" />}
          title="Privacy Policy"
          sub="What data we collect, why, and your rights under UU 27/2022"
        />

        <section className="card p-5 space-y-3 text-[14px] leading-relaxed">
          <h2 className="font-extrabold text-[16px]">Our regulatory position</h2>
          <p className="text-ink/85">
            City Rider is a software listing platform for independent motorcycle couriers. We do
            not own vehicles, employ riders, set prices, dispatch trips, process payments, or
            take commission. Each rider on this directory is an independent business operator,
            solely responsible for their own licences, vehicle, insurance, taxes, and conduct.
          </p>
          <p className="text-ink/85">
            We operate as a registered Penyelenggara Sistem Elektronik (PSE Privat) and as a
            B2B software vendor. We are not classified as, and do not seek classification as, an
            Aplikasi Penyedia Jasa Transportasi (APJT) under Permenhub PM 12/2019, because we
            do not provide transportation services.
          </p>
        </section>

        <section className="card p-5 space-y-2 text-[14px] leading-relaxed">
          <h2 className="font-extrabold text-[16px]">External regulators</h2>
          <p className="text-ink/85">
            For matters beyond our platform:
          </p>
          <ul className="list-disc list-inside space-y-1 text-ink/85">
            <li>Personal data complaints: Lembaga Pelindungan Data Pribadi</li>
            <li>Consumer disputes with a rider: Yayasan Lembaga Konsumen Indonesia (YLKI)</li>
            <li>Transport safety incidents: Kepolisian Republik Indonesia + Kementerian Perhubungan</li>
            <li>Tax matters: Direktorat Jenderal Pajak (DJP)</li>
          </ul>
        </section>
      </div>
    </main>
  )
}

function Tile({ href, icon, title, sub }: { href: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <Link href={href} className="card card-interactive p-4 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-brand/10 border border-brand/22 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-[15px]">{title}</div>
        <div className="text-[13px] text-muted mt-0.5">{sub}</div>
      </div>
      <ExternalLink className="w-4 h-4 text-dim shrink-0" />
    </Link>
  )
}
