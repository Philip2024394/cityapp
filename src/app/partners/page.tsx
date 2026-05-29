import Link from 'next/link'
import AppNav from '@/components/layout/AppNav'
import PartnerProgramCTA from '@/components/partners/PartnerProgramCTA'

// Public marketing page for the Partner Program. Linked from the landing
// site footer ("For Partners") and shown when hotels/villas land here
// directly from search / referral. Sign-up CTA lives at /partners/signup.
//
// AppNav is mounted so this page (matched by PARTNER_ROUTE_PREFIXES in
// AppNav) renders the partner side drawer + brand header — gives the
// visitor a way back to dashboard, bookings, and signup.

export const metadata = {
  title: 'Partner Program — IndoCity',
  description: 'Hotels, villas and businesses earn 8% commission when your guests book a IndoCity via your QR or link. Free to join, paid weekly by the driver directly. No platform fee.',
}

export default function PartnersLanding() {
  return (
    <main className="relative min-h-[100dvh] text-ink overflow-hidden">
      <AppNav />
      <section className="max-w-3xl mx-auto px-5 pt-12 pb-12">
        <div className="inline-block bg-brand text-bg text-[11px] font-extrabold uppercase tracking-[0.15em] px-3 py-1 rounded-full mb-5">
          Partner Program
        </div>
        <h1 className="text-[34px] sm:text-[42px] font-black leading-[1.05] tracking-tight mb-4">
          Your guests need rides.<br />Earn 8% on every booking.
        </h1>
        <p className="text-[15px] text-ink/70 leading-relaxed max-w-xl mb-8">
          Hotels, villas, restaurants and cafés: print our QR code, hand out the link,
          and earn a referral commission on every IndoCity booking your guests make.
          Free to join. No fees. Driver pays you directly.
        </p>
        <PartnerProgramCTA variant="top" />
      </section>

      <section className="max-w-3xl mx-auto px-5 pb-6">
        <div className="rounded-2xl bg-black/85 border border-white/10 p-6 shadow-card">
          <h2 className="text-[22px] font-black mb-6">How it works</h2>
          <ol className="space-y-5">
            <Step n={1} title="Sign up free">
              Tell us your name, email and partner type. Active within minutes — no contracts, no fees.
            </Step>
            <Step n={2} title="Get your QR + link">
              Download a printable QR card for rooms / lobbies and a shareable link for your website.
              Each guest who scans is tagged to you for 24 hours.
            </Step>
            <Step n={3} title="Guest books a rider">
              When a tagged guest contacts a driver through IndoCity, we add an 8% commission
              line to your dashboard.
            </Step>
            <Step n={4} title="Driver pays you weekly">
              Drivers settle directly with you each week (cash, GoPay, transfer — your choice).
              IndoCity never holds money — we&apos;re just the ledger.
            </Step>
            <Step n={5} title="Unpaid? Driver loses access">
              If a driver doesn&apos;t settle within 7 days, they&apos;re suspended from the partner program
              until they pay. You will never be routed to defaulters.
            </Step>
          </ol>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-5 pb-6">
        <div className="rounded-2xl bg-black/85 border border-white/10 p-6 shadow-card">
          <h2 className="text-[22px] font-black mb-6">Why it&apos;s safe</h2>
          <div className="space-y-3 text-[14px] text-ink/80 leading-relaxed">
            <p><strong className="text-ink">IndoCity is software only.</strong> We never hold funds, never take a cut of the 8%, and never touch the money between you and the driver.</p>
            <p><strong className="text-ink">Compliant with Perpres 27/2026.</strong> The 8% you earn is a B2B referral commission, not an aplikator commission deducted from the fare. The full 92% still goes to the driver.</p>
            <p><strong className="text-ink">You control your QR.</strong> Print it, place it where you want, change rates within the policy cap.</p>
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-5 pb-20">
        <div className="rounded-2xl bg-black/85 border border-white/10 p-6 shadow-card">
          <PartnerProgramCTA variant="bottom" />
        </div>
      </section>
    </main>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <div className="shrink-0 w-9 h-9 rounded-full bg-brand text-bg flex items-center justify-center font-black text-[15px]">
        {n}
      </div>
      <div>
        <div className="font-extrabold text-[15px] text-ink mb-1">{title}</div>
        <p className="text-[13px] text-ink/70 leading-relaxed">{children}</p>
      </div>
    </li>
  )
}
