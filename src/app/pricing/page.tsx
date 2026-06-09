import Link from 'next/link'
import { ChevronLeft, Check, X } from 'lucide-react'
import PriceTile from '@/components/pricing/PriceTile'
import {
  SUBSCRIPTION_MONTHLY_IDR,
  SUBSCRIPTION_YEARLY_IDR,
  STUDIO_MONTHLY_IDR,
  STUDIO_YEARLY_IDR,
  TRIAL_DAYS,
  FOUNDER_COHORT_CAP,
} from '@/lib/pricing/constants'

// ============================================================================
// /pricing — public marketing pricing page (Kita2u host serves the full
// marketplace tiers; citydrivers.id wouldn't surface this since the host-
// scope gate rewrites unknown routes there). Live as the header link on
// every Kita2u surface.
//
// Founder decision 2026-06-09: repositioning Kita2u against Linktree
// (USER TYPE split → SaaS PLAN split). Three tiers:
//   1. Free forever — lead-acquisition lever. Public profile, WA button,
//      0% commission, 3 photos / 3 services, "Made with Kita2u" badge.
//   2. Pro · Rp 38k/mo · Rp 350k/yr — workhorse tier, all 15 verticals,
//      custom domain, unlimited photos/services, QRIS checkout block.
//      Beats Linktree Pro (US$15/mo) by ~6×.
//   3. Studio · Rp 149k/mo · Rp 1.4M/yr — multi-location / agency, up
//      to 5 pages per seat, A/B testing, founder cohort price-lock.
//
// IDR is the canonical price. PriceTile auto-localises by detecting the
// visitor's country from the Vercel edge geo header and showing an FX
// equivalent (e.g. ≈ US$2.40) below the IDR figure. Charges still settle
// in IDR via QRIS.
//
// Hard constraint (this commit, presentation only): no DB schema for
// Free or Studio plans yet — that's a follow-up. The DB still only
// knows about the Pro subscription (drivers.paid_until).
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
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-14 flex items-center justify-between">
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

      <section className="px-5 sm:px-6 py-12 max-w-6xl mx-auto space-y-12">
        {/* ── Headline ─────────────────────────────────────────────────── */}
        <div className="space-y-3 max-w-3xl">
          <h1 className="text-[36px] sm:text-[48px] font-black leading-[1.05] tracking-tight" style={{ color: TEXT_INK }}>
            Built for businesses serious about growth.<br/>
            <span style={{ color: BRAND_YELLOW, WebkitTextStroke: `1px ${TEXT_INK}` }}>Priced to beat the giants.</span>
          </h1>
          <p className="text-[16px] sm:text-[18px] leading-relaxed" style={{ color: TEXT_MUTED }}>
            Start free forever. Upgrade only when you outgrow it. Every tier ships with 0% commission
            on customer transactions — Linktree Pro takes 9% on digital sales, we take nothing, at every tier.
          </p>
          <p className="text-[12.5px]" style={{ color: TEXT_MUTED }}>
            All prices listed in Indonesian Rupiah (IDR). We auto-show your local equivalent below the IDR figure for reference.
            Charges always settle in IDR via QRIS or international card.
          </p>
        </div>

        {/* ── Three-tier card grid ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-start">
          {/* Free tier — white card, gray border */}
          <FreeTier />

          {/* Pro tier — yellow gradient, visual hero */}
          <ProTier />

          {/* Studio tier — white card, gray border */}
          <StudioTier />
        </div>

        {/* ── 0% commission anchor banner ──────────────────────────────── */}
        <div
          className="rounded-3xl p-5 sm:p-6 border text-center"
          style={{
            background: TEXT_INK,
            borderColor: TEXT_INK,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          }}
        >
          <p className="text-[15px] sm:text-[17px] leading-relaxed font-bold" style={{ color: '#FFFFFF' }}>
            All tiers include{' '}
            <span style={{ color: BRAND_YELLOW }}>0% commission</span>{' '}
            on customer transactions. Always.<br className="hidden sm:block"/>
            <span className="text-[13px] sm:text-[14px] font-normal" style={{ color: '#A1A1AA' }}>
              Linktree Pro takes 9% on digital sales — we take nothing, at every tier.
            </span>
          </p>
        </div>

        {/* ── Feature comparison matrix ───────────────────────────────── */}
        <div className="space-y-3">
          <h2 className="text-[24px] sm:text-[32px] font-black leading-tight tracking-tight" style={{ color: TEXT_INK }}>
            Compare every tier
          </h2>
          <p className="text-[14px]" style={{ color: TEXT_MUTED }}>
            Scan the rows that matter. Upgrade when you hit a limit, not before.
          </p>
          <ComparisonTable />
        </div>

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
            Kita2u operates as a software directory under
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
            Start free — list your business
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
// FreeTier — lead-acquisition tier. No PriceTile (it's free); show "Free
// forever" prominently. White card, gray border. Aimed at small operators
// who want a public profile they can share via WhatsApp + Instagram bio.
// ----------------------------------------------------------------------------
function FreeTier() {
  return (
    <article
      className="rounded-3xl p-6 sm:p-7 border border-gray-200 bg-white flex flex-col h-full"
      style={{ boxShadow: '0 4px 22px rgba(0,0,0,0.05)' }}
    >
      <div className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: '#854D0E' }}>
        Free forever
      </div>
      <h2 className="text-[22px] sm:text-[24px] font-black mt-2 leading-tight" style={{ color: TEXT_INK }}>
        Start with a public page
      </h2>
      <p className="text-[13.5px] leading-relaxed mt-2" style={{ color: TEXT_MUTED }}>
        Get a Kita2u profile, a WhatsApp button, and a shareable link in under 60 seconds.
        Best for solo operators testing the waters.
      </p>

      <div className="mt-5 rounded-2xl p-5 border border-gray-200 bg-gray-50">
        <div className="text-[34px] sm:text-[40px] font-black leading-none tracking-tight" style={{ color: TEXT_INK }}>
          Free
        </div>
        <div className="text-[13px] mt-2" style={{ color: TEXT_MUTED }}>
          forever — no credit card
        </div>
      </div>

      <FeatureLists
        included={[
          'Your public profile page on kita2u.com/[your-slug]',
          'WhatsApp booking button',
          '1 vertical template (pick one of 15)',
          'Up to 3 portfolio photos',
          'Up to 3 services with prices',
          '0% commission on every customer transaction — always',
          '"Made with Kita2u" footer badge',
        ]}
        excluded={[
          'Custom domain (yourbusiness.com)',
          'Custom theme color',
          'Banner library access',
          'Portfolio carousel + before/after slider',
          'Advanced analytics (28-day retention only)',
          'Remove the "Made with Kita2u" badge',
        ]}
      />

      <div className="mt-6 pt-5 border-t border-gray-100">
        <Link
          href="/signup"
          className="inline-flex items-center justify-center w-full px-5 py-3 rounded-xl text-[14px] font-extrabold border border-gray-300 bg-white text-gray-900 active:scale-[0.97] transition"
          style={{ minHeight: 48 }}
        >
          Start free
        </Link>
      </div>
    </article>
  )
}

// ----------------------------------------------------------------------------
// ProTier — the workhorse / visual hero. Yellow gradient, the
// Recommended badge, two PriceTiles (monthly + yearly), all 15 templates.
// ----------------------------------------------------------------------------
function ProTier() {
  return (
    <article
      className="rounded-3xl p-6 sm:p-7 border flex flex-col h-full relative"
      style={{
        background:  `linear-gradient(160deg, ${BRAND_YELLOW} 0%, #FEF9C3 100%)`,
        borderColor: TEXT_INK,
        boxShadow:   '0 12px 36px rgba(250,204,21,0.45)',
      }}
    >
      <div
        className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider"
        style={{ background: TEXT_INK, color: BRAND_YELLOW }}
      >
        Most popular
      </div>

      <div className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: TEXT_INK }}>
        Pro
      </div>
      <h2 className="text-[22px] sm:text-[24px] font-black mt-2 leading-tight" style={{ color: TEXT_INK }}>
        The workhorse for serious businesses
      </h2>
      <p className="text-[13.5px] leading-relaxed mt-2" style={{ color: '#1F2937' }}>
        Everything you need to convert a profile visit into a paid booking. {TRIAL_DAYS}-day free trial,
        founder cohort lock for the first {FOUNDER_COHORT_CAP.toLocaleString('en-US')} subscribers.
      </p>

      <div className="grid grid-cols-1 gap-3 mt-5">
        <PriceTile
          idrAmount={SUBSCRIPTION_MONTHLY_IDR}
          unitLabel="per month"
        />
        <PriceTile
          idrAmount={SUBSCRIPTION_YEARLY_IDR}
          unitLabel="per year — save ~23%"
          highlight
        />
      </div>

      <FeatureLists
        included={[
          'Premium short + popular handles (yoga, bali, sari, …)',
          'Everything in Free',
          'Unlimited portfolio photos',
          'Unlimited services + prices',
          'Custom theme color + button-text picker',
          'Custom domain (yourbusiness.com)',
          'All 15 vertical templates (switch verticals anytime)',
          'Portfolio carousel + before/after slider',
          'Multi-language UI (Bahasa + English)',
          'Banner library (all banners)',
          'QRIS checkout block for deposits + digital products',
          'Advanced analytics (365-day retention)',
          '"Made with Kita2u" badge removed',
          `${TRIAL_DAYS}-day free trial — no credit card required`,
        ]}
        excluded={[
          'Multi-location (1 page per Pro account)',
          'Agency sub-accounts',
        ]}
        inkOverride={TEXT_INK}
      />

      <div className="mt-6 pt-5 border-t" style={{ borderColor: 'rgba(10,10,10,0.15)' }}>
        <Link
          href="/signup"
          className="inline-flex items-center justify-center w-full px-5 py-3 rounded-xl text-[14px] font-extrabold active:scale-[0.97] transition"
          style={{
            background: TEXT_INK,
            color: BRAND_YELLOW,
            minHeight: 48,
            boxShadow: '0 8px 20px rgba(10,10,10,0.25)',
          }}
        >
          Start {TRIAL_DAYS}-day free trial
        </Link>
        <p className="text-[11.5px] text-center mt-2" style={{ color: '#1F2937' }}>
          Founder cohort: first {FOUNDER_COHORT_CAP.toLocaleString('en-US')} subscribers locked at Rp 38,000/month for life.
        </p>
      </div>
    </article>
  )
}

// ----------------------------------------------------------------------------
// StudioTier — multi-location / agency. White card, gray border. Two
// PriceTiles. No excluded list — Studio is the top tier.
// ----------------------------------------------------------------------------
function StudioTier() {
  return (
    <article
      className="rounded-3xl p-6 sm:p-7 border border-gray-200 bg-white flex flex-col h-full"
      style={{ boxShadow: '0 4px 22px rgba(0,0,0,0.05)' }}
    >
      <div className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: '#854D0E' }}>
        Studio
      </div>
      <h2 className="text-[22px] sm:text-[24px] font-black mt-2 leading-tight" style={{ color: TEXT_INK }}>
        Multi-location, sub-brands, and agencies
      </h2>
      <p className="text-[13.5px] leading-relaxed mt-2" style={{ color: TEXT_MUTED }}>
        For operators running multiple branches or agencies managing several client pages
        under one billing seat.
      </p>

      <div className="grid grid-cols-1 gap-3 mt-5">
        <PriceTile
          idrAmount={STUDIO_MONTHLY_IDR}
          unitLabel="per month"
        />
        <PriceTile
          idrAmount={STUDIO_YEARLY_IDR}
          unitLabel="per year — save ~22%"
          highlight
        />
      </div>

      <FeatureLists
        included={[
          'Everything in Pro',
          'Up to 5 pages under one billing seat (multi-location, sub-brands, agency clients)',
          'A/B testing per link',
          'Password-protected drafts',
          'Priority WhatsApp template setup by the Kita2u team',
          `Founder-cohort lifetime price-lock for the first ${FOUNDER_COHORT_CAP.toLocaleString('en-US')} Studio subscribers`,
        ]}
        excluded={[]}
      />

      <div className="mt-6 pt-5 border-t border-gray-100">
        <Link
          href="/signup"
          className="inline-flex items-center justify-center w-full px-5 py-3 rounded-xl text-[14px] font-extrabold border border-gray-900 bg-gray-900 text-white active:scale-[0.97] transition"
          style={{ minHeight: 48 }}
        >
          Start with Studio
        </Link>
      </div>
    </article>
  )
}

// ----------------------------------------------------------------------------
// FeatureLists — the included (green checks) + excluded (amber x's) lists
// shared by all three tier cards. The Pro card overrides ink colour so
// text reads cleanly on the yellow gradient.
// ----------------------------------------------------------------------------
function FeatureLists({
  included, excluded, inkOverride,
}: {
  included:    string[]
  excluded:    string[]
  inkOverride?: string
}) {
  const inkColor = inkOverride ?? TEXT_INK
  return (
    <div className="mt-5 space-y-4">
      <div>
        <div className="text-[11px] font-extrabold uppercase tracking-wider mb-2" style={{ color: '#065F46' }}>
          What you get
        </div>
        <ul className="space-y-1.5">
          {included.map((line) => (
            <li key={line} className="flex items-start gap-2 text-[13px] leading-snug" style={{ color: inkColor }}>
              <Check className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={3} style={{ color: '#10B981' }} />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
      {excluded.length > 0 && (
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-wider mb-2" style={{ color: '#92400E' }}>
            Not included
          </div>
          <ul className="space-y-1.5">
            {excluded.map((line) => (
              <li
                key={line}
                className="flex items-start gap-2 text-[13px] leading-snug"
                style={{ color: inkOverride ? '#3F3F46' : TEXT_MUTED }}
              >
                <X className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={3} style={{ color: '#92400E' }} />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------
// ComparisonTable — per-tier feature matrix. Rows chosen to drive upgrade
// decisions (photos/services limits, custom domain, A/B testing, etc.).
// The commission row anchors at the bottom because it's identical across
// tiers — but it's the bold copy that beats Linktree's 9% take.
// ----------------------------------------------------------------------------
function ComparisonTable() {
  const rows: { label: string; free: string; pro: string; studio: string; bold?: boolean }[] = [
    { label: 'Portfolio photos',            free: '3',        pro: 'Unlimited', studio: 'Unlimited' },
    { label: 'Services & prices',           free: '3',        pro: 'Unlimited', studio: 'Unlimited' },
    { label: 'Vertical templates',          free: '1',        pro: 'All 15',    studio: 'All 15' },
    { label: 'Custom theme',                free: '—',        pro: 'Yes',       studio: 'Yes' },
    { label: 'Custom domain',               free: '—',        pro: 'Yes',       studio: 'Yes' },
    { label: 'Premium short + popular handles', free: '—',    pro: 'Yes',       studio: 'Yes' },
    { label: 'Pages per account',           free: '1',        pro: '1',         studio: '5' },
    { label: 'A/B testing',                 free: '—',        pro: '—',         studio: 'Yes' },
    { label: 'Analytics retention',         free: '28 days',  pro: '365 days',  studio: '365 days' },
    { label: 'Commission on customer txns', free: '0%',       pro: '0%',        studio: '0%', bold: true },
  ]

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200">
      <table className="w-full border-collapse text-[13px] sm:text-[14px]">
        <thead>
          <tr style={{ background: '#FAFAFA' }}>
            <th
              className="text-left px-4 py-3 font-extrabold uppercase tracking-wider text-[11px]"
              style={{ color: TEXT_MUTED }}
            >
              Feature
            </th>
            <th
              className="text-center px-4 py-3 font-extrabold uppercase tracking-wider text-[11px]"
              style={{ color: TEXT_MUTED }}
            >
              Free
            </th>
            <th
              className="text-center px-4 py-3 font-extrabold uppercase tracking-wider text-[11px]"
              style={{ color: TEXT_INK, background: BRAND_YELLOW }}
            >
              Pro
            </th>
            <th
              className="text-center px-4 py-3 font-extrabold uppercase tracking-wider text-[11px]"
              style={{ color: TEXT_MUTED }}
            >
              Studio
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.label}
              className="border-t border-gray-100"
              style={{ background: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}
            >
              <td className="px-4 py-3 font-bold" style={{ color: TEXT_INK }}>
                {row.label}
              </td>
              <td className="px-4 py-3 text-center" style={{ color: TEXT_MUTED, fontWeight: row.bold ? 800 : 500 }}>
                {row.bold ? <strong style={{ color: TEXT_INK }}>{row.free}</strong> : row.free}
              </td>
              <td
                className="px-4 py-3 text-center"
                style={{
                  background: 'rgba(250,204,21,0.10)',
                  color: TEXT_INK,
                  fontWeight: row.bold ? 800 : 600,
                }}
              >
                {row.pro}
              </td>
              <td className="px-4 py-3 text-center" style={{ color: TEXT_INK, fontWeight: row.bold ? 800 : 500 }}>
                {row.studio}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
