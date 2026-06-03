import Link from 'next/link'
import { ChevronLeft, Check, X } from 'lucide-react'
import PriceTile from '@/components/pricing/PriceTile'
import {
  SUBSCRIPTION_MONTHLY_IDR,
  SUBSCRIPTION_YEARLY_IDR,
  TRIAL_DAYS,
  FOUNDER_COHORT_CAP,
} from '@/lib/pricing/constants'

// ============================================================================
// /pricing — public marketing pricing page (Kita2u host serves the full
// marketplace tiers; citydrivers.id wouldn't surface this since the host-
// scope gate rewrites unknown routes there). Live as the header link on
// every Kita2u surface.
//
// What's explained:
//   1. Free for customers — browse, message merchants + drivers on WA
//   2. Free for service-provider merchants (beautician, handyman, laundry,
//      etc.) — premium add-ons priced separately
//   3. CityDrivers driver subscription — Rp 38k/month or Rp 350k/year,
//      30-day free trial, founder cohort lock at Rp 38k for life for the
//      first 1000 Indonesian drivers
//   4. 0% commission — every flow is WhatsApp + cash/QRIS direct
//   5. How to pay — QRIS in Indonesia + SEA partners, Stripe card for
//      everyone else (Phase 2)
//
// IDR is the canonical price. PriceTile auto-localises by detecting the
// visitor's country from the Vercel edge geo header and showing an FX
// equivalent (e.g. ≈ US$2.40) below the IDR figure. Charges still settle
// in IDR via QRIS.
// ============================================================================

// 24h cache — pricing changes rarely, FX refresh handled inside PriceTile.
export const revalidate = 86_400

const BRAND_YELLOW = '#FACC15'
const TEXT_INK     = '#0A0A0A'
const TEXT_MUTED   = '#52525B'

export default function PricingPage() {
  return (
    <main className="min-h-[100dvh] bg-white text-black">
      {/* Slim header — Kita2u wordmark left, no other chrome. */}
      <header className="border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-[14px] font-bold text-gray-700 hover:text-black"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="font-black text-[20px] tracking-tight">
              <span style={{ color: TEXT_INK }}>Kita</span>
              <span style={{ color: BRAND_YELLOW }}>2u</span>
            </span>
          </Link>
          <Link
            href="/signup"
            className="text-[13px] font-extrabold px-4 py-2 rounded-full active:scale-[0.97] transition"
            style={{ background: BRAND_YELLOW, color: TEXT_INK }}
          >
            Get started
          </Link>
        </div>
      </header>

      <section className="px-5 sm:px-6 py-12 max-w-3xl mx-auto space-y-12">
        {/* ── Headline ─────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <h1 className="text-[36px] sm:text-[48px] font-black leading-[1.05] tracking-tight" style={{ color: TEXT_INK }}>
            Simple, honest pricing.
          </h1>
          <p className="text-[16px] sm:text-[18px] leading-relaxed" style={{ color: TEXT_MUTED }}>
            Free for customers. Free for service merchants. Drivers pay a flat monthly subscription
            to keep their listing live — 0% commission on any booking. No surge pricing. No middleman fee.
          </p>
          <p className="text-[12.5px]" style={{ color: TEXT_MUTED }}>
            All prices listed in Indonesian Rupiah (IDR). We auto-show your local equivalent below the IDR figure for reference.
            Charges always settle in IDR via QRIS or international card.
          </p>
        </div>

        {/* ── Tier 1: Customers ────────────────────────────────────────── */}
        <Tier
          eyebrow="Customers"
          title="Free, always"
          summary="Browse every merchant and driver. Message them on WhatsApp. No account required to discover; one tap to sign up if you want to save favourites or leave a review."
          included={[
            'Search merchants + drivers in your city',
            'Tap WhatsApp to message direct — no platform middleman',
            'See published prices upfront (no hidden fees)',
            'Optional account to save favourites + post reviews',
          ]}
          excluded={[
            'We never see your card or hold your payment',
            'No subscription, no surcharge, no ad chase',
          ]}
        />

        {/* ── Tier 2: Service-provider merchants ───────────────────────── */}
        <Tier
          eyebrow="Service-provider merchants"
          title="Free, with paid add-ons"
          summary="Beauticians, handymen, laundries, masseurs, home-clean, facial, skincare, tour guides, bike-rental operators — list on Kita2u at no cost. Premium add-ons are priced separately when you want them."
          included={[
            'Your own page with logo, photos, prices, hours',
            'WhatsApp + email contact buttons',
            'Shareable link for socials (Instagram, TikTok, WhatsApp Status)',
            'Listing in your city/category search results',
            '0% commission on every customer booking',
          ]}
          excluded={[
            'Custom domain (your-business.com) — priced add-on',
            'Branded page templates — priced add-on',
            'Subscription billing for your own clients — priced add-on',
          ]}
        />

        {/* ── Tier 3: CityDrivers driver subscription ─────────────────── */}
        <Tier
          eyebrow="CityDrivers driver subscription"
          title="Rp 38,000 / month — or Rp 350,000 / year (save ~23%)"
          summary={`Bike, car, truck, minibus, and jeep drivers list on CityDrivers for a flat monthly subscription. ${TRIAL_DAYS}-day free trial. Founder cohort: the first ${FOUNDER_COHORT_CAP.toLocaleString('en-US')} Indonesian drivers are locked at Rp 38,000/month for life — that rate never goes up for you.`}
          priceTiles={[
            { idr: SUBSCRIPTION_MONTHLY_IDR, label: 'per month' },
            { idr: SUBSCRIPTION_YEARLY_IDR,  label: 'per year — save ~23%', highlight: true },
          ]}
          included={[
            `${TRIAL_DAYS}-day free trial — your listing is live the moment you complete signup`,
            'Founder cohort lock (first 1,000 Indonesian drivers, Rp 38,000/month for life)',
            '0% commission on every trip — customers pay you direct via cash or QRIS',
            'Customer reaches you on WhatsApp — no platform middleman',
            'Self-publish your own rates (per-km, min-fee, hourly, tour packages)',
            'Pause / resume any time — billing only continues while active',
          ]}
          excluded={[
            'No commission ever taken from your trips',
            'No platform-set fares — you publish the rate, customer agrees direct',
          ]}
        />

        {/* ── Payment methods + geographic coverage ────────────────────── */}
        <div className="rounded-3xl p-6 sm:p-7 border" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
          <div className="text-[12px] font-extrabold uppercase tracking-wider" style={{ color: '#854D0E' }}>
            How payment works
          </div>
          <h3 className="text-[24px] sm:text-[28px] font-black mt-2 leading-tight" style={{ color: TEXT_INK }}>
            QRIS for Indonesia + 4 SEA neighbours.<br/>International card everywhere else.
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
            <div className="bg-white rounded-2xl p-5 border border-gray-200">
              <div className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: '#854D0E' }}>
                QRIS (Bank Indonesia)
              </div>
              <div className="text-[15px] font-black mt-1" style={{ color: TEXT_INK }}>
                🇮🇩 Indonesia &nbsp;·&nbsp; 🇹🇭 Thailand &nbsp;·&nbsp; 🇲🇾 Malaysia &nbsp;·&nbsp; 🇸🇬 Singapore
              </div>
              <p className="text-[13px] leading-snug mt-2" style={{ color: TEXT_MUTED }}>
                Scan our QRIS code with any banking app or e-wallet — GoPay, OVO, DANA, ShopeePay,
                LinkAja, BCA, Mandiri, BRI, Maybank, KBank, DBS PayLah!, etc. Pays direct in your local
                currency, auto-converts to IDR.
              </p>
              <p className="text-[11px] mt-2 italic" style={{ color: TEXT_MUTED }}>
                Coming via partner expansion: South Korea, China UnionPay, Japan JPQR, India UPI, Philippines.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-gray-200">
              <div className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: '#854D0E' }}>
                International card (Coming soon)
              </div>
              <div className="text-[15px] font-black mt-1" style={{ color: TEXT_INK }}>
                Visa &nbsp;·&nbsp; Mastercard &nbsp;·&nbsp; Amex
              </div>
              <p className="text-[13px] leading-snug mt-2" style={{ color: TEXT_MUTED }}>
                For customers in the US, UK, EU, Australia, Canada, Japan, and anywhere outside the
                QRIS network. Hosted Stripe Checkout — your card never touches our servers. Settles in
                your local currency at the bank&apos;s daily FX rate.
              </p>
              <p className="text-[11px] mt-2 italic" style={{ color: TEXT_MUTED }}>
                Stripe wiring lands in the next deploy — until then, contact us for a manual invoice.
              </p>
            </div>
          </div>
        </div>

        {/* ── Compliance footnote ─────────────────────────────────────── */}
        <div className="rounded-2xl p-5 border border-gray-200 bg-gray-50">
          <div className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: TEXT_MUTED }}>
            Legal posture
          </div>
          <p className="text-[12.5px] leading-relaxed mt-2" style={{ color: TEXT_MUTED }}>
            CityDrivers and Kita2u operate as software directories under
            <strong> Permenhub PM 12/2019</strong>. We never appoint trips, never set fares, never custody
            payments. Every booking is a direct agreement between the customer and the merchant/driver
            via WhatsApp; the platform&apos;s role is discovery and contact handoff only.
          </p>
        </div>

        {/* ── Footer CTA ──────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-6 py-3 rounded-2xl text-[14px] font-extrabold active:scale-[0.97] transition"
            style={{
              background: BRAND_YELLOW,
              color: TEXT_INK,
              boxShadow: '0 8px 24px rgba(250,204,21,0.45)',
              minHeight: 48,
            }}
          >
            List your business — free
          </Link>
          <Link
            href="/cari"
            className="inline-flex items-center justify-center px-6 py-3 rounded-2xl text-[14px] font-extrabold bg-black text-white active:scale-[0.97] transition"
            style={{ minHeight: 48 }}
          >
            Browse Kita2u
          </Link>
        </div>
      </section>
    </main>
  )
}

// ----------------------------------------------------------------------------
// Tier — one card per pricing tier. Renders the optional PriceTile pair,
// the included list (green checks), and the excluded list (amber x's
// labelled as "We don't" so the contrast is honesty-as-a-feature, not
// scarcity-as-a-feature).
// ----------------------------------------------------------------------------
function Tier({
  eyebrow, title, summary, priceTiles, included, excluded,
}: {
  eyebrow:    string
  title:      string
  summary:    string
  priceTiles?: { idr: number; label: string; highlight?: boolean }[]
  included:    string[]
  excluded:    string[]
}) {
  return (
    <section className="rounded-3xl p-6 sm:p-7 border border-gray-200 bg-white" style={{ boxShadow: '0 4px 22px rgba(0,0,0,0.05)' }}>
      <div className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: '#854D0E' }}>
        {eyebrow}
      </div>
      <h2 className="text-[22px] sm:text-[26px] font-black mt-2 leading-tight" style={{ color: TEXT_INK }}>
        {title}
      </h2>
      <p className="text-[14px] leading-relaxed mt-3" style={{ color: TEXT_MUTED }}>
        {summary}
      </p>

      {priceTiles && priceTiles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
          {priceTiles.map((t) => (
            <PriceTile
              key={`${t.idr}-${t.label}`}
              idrAmount={t.idr}
              unitLabel={t.label}
              highlight={t.highlight}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-wider mb-2" style={{ color: '#065F46' }}>
            What you get
          </div>
          <ul className="space-y-1.5">
            {included.map((line) => (
              <li key={line} className="flex items-start gap-2 text-[13.5px] leading-snug" style={{ color: TEXT_INK }}>
                <Check className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={3} style={{ color: '#10B981' }} />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
        {excluded.length > 0 && (
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider mb-2" style={{ color: '#92400E' }}>
              What we don&apos;t do
            </div>
            <ul className="space-y-1.5">
              {excluded.map((line) => (
                <li key={line} className="flex items-start gap-2 text-[13.5px] leading-snug" style={{ color: TEXT_MUTED }}>
                  <X className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={3} style={{ color: '#92400E' }} />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
