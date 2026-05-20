import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getLegalEntity } from '@/lib/legal/entity'

// What City Rider is + isn't. Anchors our SaaS positioning publicly.
// Plain HTML, no client components — readable + crawlable by search +
// regulators alike.
export const metadata = {
  title: 'About · City Rider — Booking software for independent riders',
  description: 'City Rider is booking software for independent Indonesian motorcycle riders. Each rider runs their own business; we are not a transportation service provider.',
}

export default function AboutPage() {
  const entity = getLegalEntity()
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

      <article className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold leading-tight">
            What <span className="gradient-text">City Rider</span> is
          </h1>
          <p className="text-muted text-[14px] mt-2">
            Booking software for independent Indonesian motorcycle riders. Each rider runs their own local business.
          </p>
        </div>

        <Section title="We are software">
          <p>
            City Rider is a Software-as-a-Service (SaaS) listing platform. Independent motorcycle
            couriers subscribe for Rp 38,000/month to get a public profile, GPS-marketplace
            visibility, a customer database, business tools, and WhatsApp-driven lead capture.
            That is the entire product.
          </p>
        </Section>

        <Section title="We are NOT a transportation service">
          <ul className="list-disc list-inside space-y-1.5">
            <li>We do not own vehicles</li>
            <li>We do not employ riders — every rider is an independent business</li>
            <li>We do not set prices — riders set their own per-km rates</li>
            <li>Customers choose their rider manually — we never auto-assign</li>
            <li>We do not process payments — customers pay riders directly</li>
            <li>We do not take commission — riders keep 100% of their earnings</li>
            <li>We do not control rider conduct, hours, vehicles, or service quality</li>
          </ul>
          <p className="text-muted mt-2">
            All transportation services on this platform are provided by individual independent
            couriers. City Rider provides only the software and directory.
          </p>
        </Section>

        <Section title="Regulatory positioning">
          <p>
            City Rider operates as a registered Indonesian Penyelenggara Sistem Elektronik (PSE
            Privat) and as a B2B software vendor. We do not operate as an Aplikasi Penyedia Jasa
            Transportasi (APJT) under Permenhub PM 12/2019, because we do not provide
            transportation services, do not control pricing, do not process payments, and do not
            assign customers to riders. Each rider on this platform is responsible for compliance
            with their own local transport, tax, and safety regulations as an independent business.
          </p>
        </Section>

        <Section title="Revenue model">
          <p>
            Our only revenue is the rider subscription fee (Rp 38,000/month, billed via Midtrans).
            We never charge per-trip fees, commission, payment-processing fees, or take a cut of
            any transaction between a customer and a rider. Our financial relationship is with the
            rider as a software subscriber, not with the customer.
          </p>
        </Section>

        <Section title="If you are a customer">
          <p>
            When you contact a rider through this directory, you are entering a direct service
            agreement with that independent rider — not with City Rider. The rider sets the price,
            performs the service, handles payment, and is responsible for any aspect of the trip.
          </p>
          <p className="mt-2">
            For complaints about a specific rider, contact the rider directly via WhatsApp. We
            cannot mediate, refund, or compel rider behavior because we are not their employer or
            agent.
          </p>
        </Section>

        {(entity.name || entity.npwp || entity.address || entity.pseNumber) && (
          <Section title="Registered entity">
            <div className="space-y-1">
              {entity.name && <p className="font-bold text-ink">{entity.name}</p>}
              {entity.address && <p className="whitespace-pre-line text-ink/85">{entity.address}</p>}
              {entity.npwp && <p className="text-muted text-[13px]">NPWP: {entity.npwp}</p>}
              {entity.pseNumber && <p className="text-muted text-[13px]">PSE Privat: {entity.pseNumber}</p>}
            </div>
          </Section>
        )}

        <Section title="Contact">
          <p>
            City Rider · part of the StreetLocal family of apps · Yogyakarta, Indonesia<br />
            All inquiries (support, data requests, business): <Link href="/contact" className="text-brand hover:underline">contact page</Link>
          </p>
        </Section>
      </article>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 space-y-3 text-[14px] leading-relaxed text-ink/90">
      <h2 className="font-extrabold text-[16px]">{title}</h2>
      {children}
    </section>
  )
}
