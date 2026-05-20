import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

// Privacy Policy — anchors UU 27/2022 (UU PDP — Indonesia's Personal Data
// Protection Law) compliance. Covers what we collect, why, with whom we
// share, retention, user rights, and contact for data subject requests.
//
// Includes the explicit background-location disclosure required by
// Google Play Store review for apps declaring ACCESS_BACKGROUND_LOCATION
// in their AndroidManifest.
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

        <Section title="Background location (Android app only)">
          <p>
            The City Rider Android app collects your device&apos;s GPS location
            <strong className="text-ink"> in the background</strong> — meaning while the app is
            not visible on screen, while the phone is locked, or while you are using other apps.
            This applies <strong className="text-ink">only to riders</strong> who have completed
            onboarding and tapped &quot;Go Online&quot; in the driver dashboard. It never applies
            to customers.
          </p>
          <p className="font-bold text-ink/90 mt-3">Why:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>To keep your live position visible to customers searching the marketplace</li>
            <li>To compute accurate distance and ETA for nearby customers</li>
            <li>To detect movement so we can mark you &quot;busy&quot; (mid-trip) vs &quot;online&quot; (available)</li>
          </ul>
          <p className="font-bold text-ink/90 mt-3">What we do NOT do with background location:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>We do not store a history of where you have been — only your most recent position is kept</li>
            <li>We do not share your location with any third party other than the customers searching the directory</li>
            <li>We do not use location for advertising, profiling, or analytics beyond the marketplace</li>
            <li>We do not track location while you are offline — the moment you tap &quot;Go Offline&quot; the foreground location service stops</li>
          </ul>
          <p className="font-bold text-ink/90 mt-3">Your control:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Tap &quot;Go Offline&quot; in the dashboard to stop all location collection immediately</li>
            <li>Revoke the Android &quot;Allow all the time&quot; location permission in Android Settings → Apps → City Rider → Permissions</li>
            <li>Uninstall the app to remove all stored location data along with your subscription cancellation</li>
          </ul>
          <p className="text-muted text-[13px] mt-3">
            While location is active, Android displays a persistent notification (&quot;City
            Rider is online&quot;) as a system-level reminder — this notification is required by
            Android and cannot be hidden while the foreground location service is running.
          </p>
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
            To exercise these rights, use the{' '}
            <Link href="/contact" className="text-brand hover:underline">Contact</Link> page —
            we respond to all UU PDP data-subject requests within 14 days.
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
