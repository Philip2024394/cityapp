import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

// Terms of Service — anchors the SaaS positioning + independent-contractor
// status of riders + customer-rider relationship.
//
// Structured along Indonesian commercial T&C conventions: definitions,
// scope, parties' roles, payment, liability, data, termination, jurisdiction.
export const metadata = {
  title: 'Terms of Service · City Rider',
  description: 'Terms of Service for the City Rider software platform.',
}

export default function TermsPage() {
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

      <article className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        <div>
          <h1 className="text-3xl font-extrabold">Terms of Service</h1>
          <p className="text-muted text-[14px] mt-2">
            Effective from launch. By using City Rider, you agree to these terms.
          </p>
        </div>

        <Clause n="1" title="Definitions">
          <ul className="list-disc list-inside space-y-1">
            <li><strong>City Rider</strong> — the software directory platform operated under the StreetLocal family of apps</li>
            <li><strong>Subscriber</strong> — an independent motorcycle courier who pays the monthly fee to be listed</li>
            <li><strong>Customer</strong> — any person who uses the directory to find or contact a Subscriber</li>
            <li><strong>Software</strong> — the website, app, dashboards, and APIs we operate</li>
            <li><strong>Service</strong> — the act of transporting goods or passengers, performed solely by Subscribers</li>
          </ul>
        </Clause>

        <Clause n="2" title="What City Rider provides">
          City Rider provides software: a public profile, marketplace listing, GPS visibility,
          customer database, business tools, lead notifications, analytics, and business-card
          printing. We do not provide transportation services, vehicles, drivers, insurance, or
          payment processing.
        </Clause>

        <Clause n="3" title="Subscribers are independent businesses">
          Each Subscriber is an independent business operator. No employer-employee, principal-
          agent, partnership, or franchise relationship exists between City Rider and any
          Subscriber. Subscribers set their own prices, choose their own hours, accept or decline
          any job, manage their own customers, and are solely responsible for their conduct,
          vehicles, licensing, insurance, taxes, and compliance with local law.
        </Clause>

        <Clause n="4" title="Customer-Subscriber transactions">
          When a Customer contacts a Subscriber through the directory, they enter a direct service
          agreement with that Subscriber. City Rider is not a party to that agreement, does not
          process the payment, does not guarantee performance, and does not mediate disputes. The
          Customer agrees to settle any matters arising from a trip directly with the Subscriber.
        </Clause>

        <Clause n="5" title="Payments">
          The only payment City Rider receives is the Subscriber's monthly subscription fee
          (Rp 38,000), processed by Midtrans. City Rider never charges Customers, never holds
          deposits, never processes trip fares, and never takes commission on transactions
          between Customers and Subscribers.
        </Clause>

        <Clause n="6" title="No transportation liability">
          City Rider is not liable for any loss, damage, injury, delay, theft, accident, or other
          incident arising from a transportation service provided by a Subscriber. Subscribers
          warrant they hold valid SIM C (motorcycle licence), STNK (vehicle registration), and
          any local permits required, and that their vehicle is roadworthy and insured to the
          extent required by Indonesian law.
        </Clause>

        <Clause n="7" title="Subscriber obligations">
          Subscribers agree to: (a) operate only under valid Indonesian licences and permits;
          (b) maintain accurate, truthful profile information; (c) not impersonate City Rider or
          claim affiliation beyond being a subscriber; (d) not engage in fraud, harassment, or
          illegal activity; (e) cancel their subscription if they no longer meet the requirements
          of section 6.
        </Clause>

        <Clause n="8" title="Customer obligations">
          Customers agree to: (a) use the directory in good faith; (b) treat Subscribers with
          respect; (c) settle agreed fares promptly with the Subscriber; (d) not use the platform
          to harass, defame, or commit illegal acts.
        </Clause>

        <Clause n="9" title="Termination">
          Either party may end the subscription at any time. Customers may use the directory
          without an account; we may restrict use for abuse. Subscriber cancellation runs until
          the end of the paid period, after which the profile is hidden from the directory.
        </Clause>

        <Clause n="10" title="Data + privacy">
          See <Link href="/privacy" className="text-brand hover:underline">Privacy Policy</Link>.
          City Rider complies with UU 27/2022 (Personal Data Protection Law).
        </Clause>

        <Clause n="11" title="Governing law + jurisdiction">
          These terms are governed by the laws of the Republic of Indonesia. Disputes are subject
          to the exclusive jurisdiction of the District Court of Yogyakarta (Pengadilan Negeri
          Yogyakarta), without prejudice to any mandatory consumer-protection forums.
        </Clause>

        <Clause n="12" title="Changes">
          We may update these terms; material changes will be announced to active Subscribers via
          their dashboard at least 14 days before taking effect. Continued use after the effective
          date constitutes acceptance.
        </Clause>
      </article>
    </main>
  )
}

function Clause({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="font-extrabold text-[15px]">
        <span className="text-brand">{n}.</span> {title}
      </h2>
      <div className="text-[14px] leading-relaxed text-ink/85 mt-2">{children}</div>
    </section>
  )
}
