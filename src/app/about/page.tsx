import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getLegalEntity } from '@/lib/legal/entity'

// What Kita2u is + isn't. Anchors our SaaS positioning publicly.
// Plain HTML, no client components — readable + crawlable by search +
// regulators alike. Reachable on kita2u.com only (citydrivers.id has
// its own /about scoped under the cityriders gate in middleware).
export const metadata = {
  title: 'About · Kita2u — One link for creators and small businesses',
  description:
    'Kita2u is a listing + booking page for creators, small businesses, and independent service providers in Indonesia. One shareable link, 0% commission on customer transactions, direct WhatsApp contact.',
}

export default function AboutPage() {
  const entity = getLegalEntity()
  return (
    <main className="min-h-[100dvh] pb-16">
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
            What <span style={{ color: '#0A0A0A' }}>Kita</span><span style={{ color: '#FACC15' }}>2u</span> is
          </h1>
          <p className="text-muted text-[14px] mt-2">
            One shareable page for creators, small businesses, and local service providers.
            Sell, list, and take bookings — all from a single link.
          </p>
        </div>

        <Section title="We are software">
          <p>
            Kita2u is a Software-as-a-Service (SaaS) listing platform. Creators, small businesses,
            and independent service providers get a public profile, product / menu / booking
            tools, a customer database, and WhatsApp-driven lead capture. That is the entire
            product. We ship one shareable page that handles content, products, and bookings —
            replacing the need for a separate website, link-in-bio service, or marketplace
            listing.
          </p>
        </Section>

        <Section title="We are NOT a marketplace operator">
          <ul className="list-disc list-inside space-y-1.5">
            <li>We do not stock, ship, or fulfil any product</li>
            <li>We do not employ creators or service providers — each runs their own business</li>
            <li>We do not set prices — every page owner sets their own rates</li>
            <li>Customers contact the business directly — we never auto-assign or route</li>
            <li>We do not process payments — customers pay the business directly</li>
            <li>We do not take a per-transaction commission — page owners keep 100% of what their customers pay</li>
            <li>We do not control listings, hours, service quality, or fulfilment</li>
          </ul>
          <p className="text-muted mt-2">
            All goods and services on Kita2u pages are provided by independent businesses. Kita2u
            provides only the software and the directory link.
          </p>
        </Section>

        <Section title="Regulatory positioning">
          <p>
            Kita2u operates as a registered Indonesian Penyelenggara Sistem Elektronik (PSE
            Privat) and as a B2B software vendor. We do not operate as a marketplace under
            Kemenkominfo PMSE rules because we do not hold transaction records, do not custody
            funds, and do not intermediate orders. Each business on Kita2u is responsible for
            its own tax, consumer-protection, and category-specific compliance as an independent
            operator.
          </p>
        </Section>

        <Section title="Revenue model">
          <p>
            Kita2u runs on a monthly subscription with a 7-day free trial. Every feature is
            unlocked during the trial. After day 7, page owners continue on the plan they
            choose, or cancel from the side drawer in their dashboard in one tap — no email
            loop, no waiting period, no win-back script.
          </p>
          <p className="mt-2">
            We never charge per-trip, per-sale, or per-booking commission, and we do not take
            a cut of any transaction between a customer and a page owner. Our only revenue is
            the subscription fee, billed via Midtrans (QRIS, bank transfer, e-wallet). Custom
            domains, premium templates, and a one-of-a-kind app built to your requirements are
            available as paid add-ons.
          </p>
        </Section>

        <Section title="If you are a customer">
          <p>
            When you order, book, or message a business through a Kita2u page, you are entering a
            direct service agreement with that independent business — not with Kita2u. The
            business sets the price, fulfils the service, handles payment, and is responsible
            for the outcome.
          </p>
          <p className="mt-2">
            For complaints about a specific business, contact the business directly via WhatsApp.
            We cannot mediate, refund, or compel the business&apos;s behaviour because we are not
            their employer or agent.
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
            Kita2u · part of the StreetLocal family of apps · Yogyakarta, Indonesia<br />
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
