import Link from 'next/link'
import { ChevronLeft, AlertCircle } from 'lucide-react'

// Privacy Policy — anchors UU 27/2022 (UU PDP — Indonesia's Personal Data
// Protection Law) compliance. Covers what we collect, why, with whom we
// share, retention, user rights, and contact for data subject requests.
//
// DRAFT — Indonesian counsel review required before production use.
export const metadata = {
  title: 'Privacy Policy · City Rider',
  description: 'How City Rider handles your personal data, under UU 27/2022.',
}

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-extrabold">Privacy Policy</h1>
          <p className="text-muted text-[14px] mt-2">
            How City Rider collects, uses, and protects your personal data.
            Compliant with UU 27/2022 (Indonesia&apos;s Personal Data Protection Law).
          </p>
        </div>

        <div className="card p-4 border-brand/25 bg-brand/5 flex gap-3 text-[13px]">
          <AlertCircle className="w-4 h-4 text-brand shrink-0 mt-0.5" />
          <div className="text-ink/85 leading-relaxed">
            <strong className="text-brand">Draft notice:</strong> This policy is a working draft
            for review by Indonesian counsel before production.
          </div>
        </div>

        <Section title="What we collect">
          <p className="font-bold text-ink/90">From riders (Subscribers):</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Name, email, password (hashed), WhatsApp number</li>
            <li>Profile photo, bio, area, city</li>
            <li>Bike details (make, model, year, colour, plate)</li>
            <li>Per-km pricing + minimum fee + pit-stop fee</li>
            <li>Service preferences (parcel / food / passenger)</li>
            <li>Real-time GPS location (only when online + opt-in)</li>
            <li>Subscription + payment status from Midtrans (we do not store card numbers)</li>
          </ul>
          <p className="font-bold text-ink/90 mt-3">From customers (visitors):</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>GPS location (only with browser permission, used to find nearby riders)</li>
            <li>Anonymous session ID for analytics (no PII)</li>
            <li>Quote events: pickup / dropoff coordinates + distance + estimated fare per tap</li>
          </ul>
        </Section>

        <Section title="Why we collect it">
          <ul className="list-disc list-inside space-y-1">
            <li>To show online riders on the directory</li>
            <li>To enable customers to find the nearest available rider</li>
            <li>To generate WhatsApp message links</li>
            <li>To process subscription payments via Midtrans</li>
            <li>To send notifications (incoming-order modal, app updates)</li>
            <li>To compute platform analytics (zone demand, ROI dashboard)</li>
          </ul>
        </Section>

        <Section title="What we DO NOT collect">
          <ul className="list-disc list-inside space-y-1">
            <li>The content of WhatsApp conversations between riders and customers</li>
            <li>Customer payment details or trip transaction records (we never touch money)</li>
            <li>Rider bank accounts</li>
            <li>Government IDs (KTP, SIM, NPWP) — riders self-declare compliance</li>
            <li>Browsing history outside the City Rider app</li>
          </ul>
        </Section>

        <Section title="Sharing">
          <p>We share only as needed:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Rider profile data (name, photo, WhatsApp, pricing, GPS) is shown on the public directory and to customers — that&apos;s the product</li>
            <li>Payment data is processed by Midtrans under their own data agreement</li>
            <li>Hosting and tile data: Vercel (Next.js hosting), OpenFreeMap (map tiles)</li>
            <li>Analytics: aggregated, anonymous</li>
          </ul>
          <p className="mt-2">We do not sell personal data to third parties. We do not share customer GPS with any party other than the customer&apos;s own browser session.</p>
        </Section>

        <Section title="Retention">
          <ul className="list-disc list-inside space-y-1">
            <li>Rider profile data: retained while subscription is active + 30 days after cancellation, then deleted unless legally required to keep longer</li>
            <li>Quote events: 12 months for rider analytics, then anonymised</li>
            <li>GPS location: only the latest position is kept; not stored as history</li>
            <li>Logs: 90 days for security + debugging</li>
          </ul>
        </Section>

        <Section title="Your rights (UU PDP)">
          <p>Under Indonesia&apos;s UU 27/2022 you have the right to:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Access your personal data we hold</li>
            <li>Correct inaccurate data</li>
            <li>Delete your data (right to be forgotten) — subject to legal retention requirements</li>
            <li>Restrict or object to processing</li>
            <li>Data portability — export your data in a common format</li>
            <li>Withdraw consent at any time (cancel subscription)</li>
            <li>File a complaint with Lembaga Pelindungan Data Pribadi</li>
          </ul>
          <p className="mt-2">
            To exercise these rights, contact us via the email listed on the{' '}
            <Link href="/about" className="text-brand hover:underline">About</Link> page. We respond within 14 days.
          </p>
        </Section>

        <Section title="Security">
          <p>
            Passwords are hashed (never stored in plain text). All traffic uses HTTPS. Payment
            data lives inside Midtrans (PCI-DSS compliant). We follow industry-standard practices
            for the SaaS platform itself but cannot guarantee absolute security; users should use
            strong unique passwords.
          </p>
        </Section>

        <Section title="Cookies + storage">
          <p>
            We use localStorage to remember your language preference and your anonymous customer
            session ID. No third-party advertising cookies. No tracking pixels.
          </p>
        </Section>

        <Section title="Children">
          <p>
            City Rider is not directed at users under 18. Riders must be 18+ to subscribe (legal
            age to operate a motorcycle commercially in Indonesia). Customers using the directory
            must be of legal age to enter service contracts.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            Material changes will be announced to active Subscribers via their dashboard at least
            14 days before taking effect.
          </p>
        </Section>
      </article>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 space-y-2 text-[14px] leading-relaxed text-ink/90">
      <h2 className="font-extrabold text-[16px]">{title}</h2>
      {children}
    </section>
  )
}
