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
  title: 'Privacy Policy · IndoCity',
  description: 'How IndoCity handles your personal data, under UU 27/2022.',
}

export default function PrivacyPage() {
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

      <article className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        <div>
          <h1 className="text-3xl font-extrabold">Privacy Policy</h1>
          <p className="text-muted text-[14px] mt-2">
            How IndoCity collects, uses, and protects your personal data.
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
            <li>Contact-tap events: anonymous ID + driver ID + page name when you tap the Contact button on a driver listing (used to alert the driver and to rate-limit duplicate taps)</li>
          </ul>
          <p className="font-bold text-ink/90 mt-3">From riders who opt in to booking alerts or tour-guide service:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Device push-notification token (FCM token) — required to deliver the loud booking-alert sound when a customer taps Contact</li>
            <li>Acknowledgement timestamp when the rider taps the in-app alert (used for response-time metrics on the public B2B score)</li>
            <li>Tour-guide opt-in fields: day rate (Rp/8h), spoken languages, optional pitch notes — shown on /places when displayed</li>
          </ul>
          <p className="font-bold text-ink/90 mt-3">From service providers (massage, beautician, laundry, handyman, home clean):</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Display name, bio, profile photo URL, years of experience</li>
            <li>WhatsApp number (visible publicly so customers can contact you direct)</li>
            <li>City + service-area notes (where you operate)</li>
            <li>Service-specific fields: massage type + duration prices, beautician package prices, laundry per-kg rates, handyman trade list + hour/day rates, cleaner hour/day rates</li>
            <li>Availability (online / busy / offline) toggled from your dashboard</li>
            <li><strong className="text-ink">KTP photo (government ID)</strong> — uploaded direct to a <strong className="text-ink">private</strong> Supabase Storage bucket (<code className="text-[12px] bg-white/5 px-1 rounded">ktp-images</code>), scoped to your own folder by row-level security. Visible only to admin verifiers; never returned by the public marketplace. Required to flip your profile from <em>pending</em> to <em>active</em>. Stored in Singapore region.</li>
          </ul>
          <p className="font-bold text-ink/90 mt-3">From partner venues (hotels, villas, restaurants):</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Venue name, type (hotel/villa/restaurant/etc.), address, city, lat/lng</li>
            <li>Owner contact email, phone, WhatsApp — stored privately, used for payout coordination</li>
            <li>Payout method + account details (bank account, QRIS, e-wallet) — stored privately, visible only to drivers who have an outstanding commission with you, and to admin support</li>
            <li>Commission rate (default 8%, capped at 15%)</li>
          </ul>
        </Section>

        <Section title="Customer accounts + saved places (optional)">
          <p>
            Customers can use IndoCity without creating an account — browse drivers, tap Contact,
            message on WhatsApp. No signup required for booking.
          </p>
          <p className="mt-2">
            If a customer chooses to <strong className="text-ink">save places</strong> (Home,
            Office, etc.) via the Saved chip on the booking page, we ask them to create an account
            so the saved places sync across their devices. The account collects:
          </p>
          <ul className="list-disc list-inside space-y-0.5 mt-2">
            <li>Phone number (verified via OTP — also the customer&apos;s WhatsApp number)</li>
            <li>Display name</li>
            <li>Saved drop-off places: name, emoji, latitude/longitude, optional address label</li>
          </ul>
          <p className="font-bold text-ink/90 mt-3">Limits + retention:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Maximum 20 saved places per account</li>
            <li>Retained while the account is active; deleted instantly on account deletion</li>
            <li>Never shared with drivers or third parties — purely a personal convenience feature</li>
          </ul>
          <p className="mt-2">
            Delete your account + all saved places anytime via{' '}
            <Link href="/account/delete" className="text-brand hover:underline">/account/delete</Link>{' '}
            or Dashboard → Delete my account.
          </p>
        </Section>

        <Section title="Push notification alerts (driver-side, opt-in)">
          <p>
            Drivers who enable &quot;Loud booking alerts&quot; on the dashboard authorise us to
            deliver a high-priority push notification to their device the instant a customer taps
            Contact on their listing. Delivery is routed through Google&apos;s Firebase Cloud
            Messaging (FCM) service. We send the alert title, a short body, and a small data
            payload (the ping ID + source page) — never the customer&apos;s identity or message
            content.
          </p>
          <p className="font-bold text-ink/90 mt-3">Your control:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Toggle &quot;Loud booking alerts&quot; OFF on the dashboard at any time — delivery stops immediately</li>
            <li>Revoke the Android notification permission in Settings → Apps → IndoCity → Notifications</li>
            <li>Sign out of a specific device to remove its registered FCM token</li>
            <li>Delete your account to remove every registered token across every device</li>
          </ul>
        </Section>

        <Section title="Background location (Android app only)">
          <p>
            The IndoCity Android app collects your device&apos;s GPS location
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
            <li>Revoke the Android &quot;Allow all the time&quot; location permission in Android Settings → Apps → IndoCity → Permissions</li>
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
            <li>Rider bank accounts (we don&apos;t need them — drivers are paid by customers direct on WhatsApp)</li>
            <li>SIM (driver licence) or NPWP (tax ID) — drivers self-declare compliance with local transport rules</li>
            <li>Browsing history outside the IndoCity app</li>
          </ul>
          <p className="text-muted text-[13px] mt-2">
            Note on KTP: we DO collect a KTP photo from service providers (massage, beautician,
            laundry, handyman, home clean) as anti-fraud / identity verification. It is stored
            privately as described above and is never visible on the marketplace. We do not
            collect KTP from riders, customers, or partner venues.
          </p>
        </Section>

        <Section title="Sharing + third-party processors">
          <p>We share only as needed, with these named processors:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong className="text-ink">Customers browsing the directory</strong> — see rider profile data (name, photo, WhatsApp, pricing, GPS); that&apos;s the product</li>
            <li><strong className="text-ink">Midtrans (PT Midtrans)</strong> — payment processing under their own data agreement; PCI-DSS compliant</li>
            <li><strong className="text-ink">Vercel</strong> — Next.js hosting (servers in Singapore region)</li>
            <li><strong className="text-ink">Supabase</strong> — managed PostgreSQL database + auth; storage region Singapore</li>
            <li><strong className="text-ink">Google LLC (Firebase Cloud Messaging)</strong> — delivers driver booking-alert push notifications; receives only the alert title, body, and our internal ping ID — never customer identity</li>
            <li><strong className="text-ink">Sentry</strong> — crash reporting + error telemetry; configured to redact PII, no session replay enabled</li>
            <li><strong className="text-ink">OpenFreeMap</strong> — public map tiles (no per-user tracking)</li>
            <li><strong className="text-ink">Nominatim (OpenStreetMap Foundation)</strong> — reverse geocoding for place names</li>
          </ul>
          <p className="mt-2">We do not sell personal data to third parties. We do not share customer GPS with any party other than the customer&apos;s own browser session.</p>
        </Section>

        <Section title="Retention">
          <ul className="list-disc list-inside space-y-1">
            <li>Rider profile data: retained while subscription is active + 30 days after cancellation, then deleted unless legally required to keep longer</li>
            <li>Service-provider profile data (massage / beautician / laundry / handyman / home clean): same as riders — active subscription + 30 days, then deleted</li>
            <li><strong className="text-ink">KTP photos:</strong> retained while the provider account is active; deleted from the private bucket within 7 days of account deletion or as soon as the provider replaces it during signup. Verifiers may keep a hashed audit trail of the verification decision (no image) for fraud-defence purposes.</li>
            <li>Partner venue data: retained while the partner status is &quot;active&quot;; listings (name, city, lat/lng) survive owner deletion as anonymised public records since they aren&apos;t personal data; payout + contact fields are deleted with the owner&apos;s account</li>
            <li>Quote events: 12 months for rider analytics, then anonymised</li>
            <li>Contact-ping events: 90 days for B2B response-time metric, then deleted</li>
            <li>Push notification tokens: pruned automatically after 90 days of inactivity; removed immediately on sign-out, app uninstall, or token rotation by the OS</li>
            <li>GPS location: only the latest position is kept; not stored as history</li>
            <li>Sentry crash reports: 30 days, then deleted</li>
            <li>Logs: 90 days for security + debugging</li>
          </ul>
        </Section>

        <Section title="Deleting your account">
          <p>
            You can permanently delete your account at any time:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong className="text-ink">From inside the app:</strong> Dashboard → scroll to the bottom → &quot;Delete my account&quot; → type DELETE to confirm</li>
            <li><strong className="text-ink">From a browser:</strong> visit <Link href="/account/delete" className="text-brand hover:underline">/account/delete</Link> for full step-by-step instructions</li>
            <li><strong className="text-ink">If you have lost access:</strong> email <a href="mailto:streetlocallive@gmail.com" className="text-brand hover:underline">streetlocallive@gmail.com</a> from your registered address — processed within 14 days</li>
          </ul>
          <p className="mt-2 text-[13px] text-muted">
            Deletion removes your auth record, profile, listings, push tokens, subscription, and the reviews you authored. Reviews other users wrote about you remain visible but display your profile as &quot;[deleted account]&quot;. Tax records may be retained per Indonesian tax law (up to 10 years).
          </p>
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
            IndoCity is not directed at users under 18. Riders must be 18+ to subscribe (legal
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
