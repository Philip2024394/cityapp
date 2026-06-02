// /drivers/truck — Truck driver recruitment landing page.
//
// Mirror of /drivers/car but tuned for truck drivers: copy emphasises
// daily-rate jobs (pindahan, distribusi), multi-day rentals, and large
// B2B parcel contracts for Shopee sellers / UMKM — very different
// economics from per-km ojek or hourly car work.
//
// All copy comes from messages/{id,en}.json under the `driversTruck`
// namespace.

import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import {
  ArrowRight,
  MessageCircle,
  Smartphone,
  Wallet,
  ShieldCheck,
  Sparkles,
  Truck,
  Package,
  Calendar,
  Building2,
  Boxes,
} from 'lucide-react'
import EarningModeCard from '@/components/recruitment/EarningModeCard'
import { getSupportWhatsApp } from '@/lib/support/contacts'
import {
  MONTHLY_PRICE_LABEL,
  YEARLY_PRICE_LABEL,
} from '@/lib/pricing/constants'

const HERO_URL =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2030,%202026,%2005_42_12%20AM.png'

const BRAND_LOGO_URL =
  'https://ik.imagekit.io/nepgaxllc/Untitledasdasdaasssdasdasd-removebg-preview.png?updatedAt=1780193517351'

const PAGE_URL = 'https://citydrivers.id/drivers/truck'

export async function generateMetadata() {
  const t = await getTranslations('driversTruck')
  return {
    title:       t('metaTitle'),
    description: t('metaDescription'),
    alternates:  { canonical: PAGE_URL },
    openGraph: {
      title:       t('metaTitle'),
      description: t('metaDescription'),
      type:        'website',
      url:         PAGE_URL,
      images:      [{ url: HERO_URL }],
    },
    twitter: {
      card:        'summary_large_image',
      title:       t('metaTitle'),
      description: t('metaDescription'),
      images:      [HERO_URL],
    },
  }
}

export default async function TruckDriversLandingPage() {
  const t = await getTranslations('driversTruck')
  return (
    <main
      className="relative min-h-[100dvh] text-[#0A0A0A]"
      style={{
        background:
          'radial-gradient(circle at top, #FEF3C7 0%, #F5F5F4 70%, #E7E5E4 100%)',
      }}
    >
      <div className="mx-auto bg-white lg:my-6 lg:max-w-[480px] lg:rounded-[32px] lg:shadow-[0_24px_80px_rgba(10,10,10,0.18)] lg:overflow-hidden">
      <section className="relative">
        <div
          className="relative w-full overflow-hidden"
          style={{ height: '100dvh', minHeight: 560 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO_URL}
            alt={t('heroAlt')}
            className="absolute inset-0 w-full h-full object-cover object-center"
            loading="eager"
          />

          <div
            aria-hidden
            className="absolute inset-x-0 top-0 pointer-events-none"
            style={{
              height: 160,
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.90) 0%, rgba(255,255,255,0.50) 55%, rgba(255,255,255,0) 100%)',
            }}
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 pointer-events-none"
            style={{
              height: '55%',
              background:
                'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.95) 100%)',
            }}
          />

          <div className="absolute inset-0 z-10 flex flex-col">
            <header
              className="shrink-0 flex items-center justify-between gap-2 px-3 pb-2"
              style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 32px)' }}
            >
              <Link
                href="/cityriders"
                className="inline-flex items-center gap-2 active:scale-[0.97] transition"
                aria-label="CityDrivers home"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={BRAND_LOGO_URL}
                  alt=""
                  className="h-11 w-auto rounded-xl object-contain"
                />
                <span
                  className="font-black text-[18px] tracking-tight leading-none"
                  style={{ color: '#0A0A0A' }}
                >
                  CityDrivers
                </span>
              </Link>
              <VehicleSwitcher
                active="truck"
                labels={{
                  bike:  t('vehicleBike'),
                  car:   t('vehicleCar'),
                  bus:   t('vehicleBus'),
                  truck: t('vehicleTruck'),
                  jeep:  t('vehicleJeep'),
                }}
              />
            </header>

            <div className="flex-1 min-h-0" aria-hidden />

            <div
              className="shrink-0 px-5 pt-6"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 40px)' }}
            >
              <h1 className="text-[26px] xs:text-[28px] sm:text-[32px] font-black leading-[1.08] tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]">
                {t('h1Line1')}<br />
                <span style={{ color: '#FACC15' }}>{t('h1Line2')}</span>
              </h1>
              <p className="mt-2.5 text-[13px] text-white/85 leading-relaxed">
                {t('heroParagraph')}
              </p>

              <div className="mt-4 flex flex-col gap-2">
                <Link
                  href="/signup/truck"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#FACC15] text-[#0A0A0A] text-[14px] font-extrabold shadow-[0_8px_24px_rgba(250,204,21,0.55)] active:scale-[0.97] transition"
                  style={{ minHeight: 48 }}
                >
                  {t('ctaSignUp')}
                  <ArrowRight className="w-4 h-4" strokeWidth={3} />
                </Link>
                <a
                  href={`https://wa.me/${getSupportWhatsApp()}?text=${encodeURIComponent(t('waMessage'))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-[13px] font-extrabold active:scale-[0.97] transition"
                  style={{
                    background: 'rgba(255,255,255,0.10)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255,255,255,0.30)',
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                    minHeight: 42,
                  }}
                >
                  <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
                  {t('ctaWhatsApp')}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-12">
        <div className="text-center mb-10">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#EAB308] mb-2">
            {t('offerLabel')}
          </div>
          <h2 className="text-[24px] sm:text-[32px] font-black leading-tight">
            {t('offerTitle')}
          </h2>
          <p className="mt-3 text-[14px] text-black/65 max-w-xl mx-auto">
            {t('offerIntro')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <UseCase
            icon={<Truck className="w-5 h-5" strokeWidth={2.5} />}
            title={t('useCase1Title')}
            body={t('useCase1Body')}
          />
          <UseCase
            icon={<Building2 className="w-5 h-5" strokeWidth={2.5} />}
            title={t('useCase2Title')}
            body={t('useCase2Body')}
          />
          <UseCase
            icon={<Boxes className="w-5 h-5" strokeWidth={2.5} />}
            title={t('useCase3Title')}
            body={t('useCase3Body')}
          />
          <UseCase
            icon={<Calendar className="w-5 h-5" strokeWidth={2.5} />}
            title={t('useCase4Title')}
            body={t('useCase4Body')}
          />
        </div>
      </section>

      <section className="bg-[#FFFBEA] border-y border-[#FACC15]/30">
        <div className="px-5 py-12">
          <div className="text-center mb-10">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#EAB308] mb-2">
              {t('howLabel')}
            </div>
            <h2 className="text-[24px] sm:text-[32px] font-black leading-tight">
              {t('howTitle')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <Step n={1} stepLabel={t('stepLabel')} icon={<Smartphone className="w-5 h-5" strokeWidth={2.5} />} title={t('step1Title')}>
              {t('step1Body')}
            </Step>
            <Step n={2} stepLabel={t('stepLabel')} icon={<Sparkles className="w-5 h-5" strokeWidth={2.5} />} title={t('step2Title')}>
              {t('step2Body')}
            </Step>
            <Step n={3} stepLabel={t('stepLabel')} icon={<Wallet className="w-5 h-5" strokeWidth={2.5} />} title={t('step3Title')}>
              {t('step3Body')}
            </Step>
          </div>
        </div>
      </section>

      <section className="px-5 py-12">
        <div className="text-center mb-10">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#EAB308] mb-2">
            {t('whyLabel')}
          </div>
          <h2 className="text-[24px] sm:text-[32px] font-black leading-tight">
            {t('whyTitle')}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Differentiator
            icon={<Wallet className="w-5 h-5" strokeWidth={2.5} />}
            title={t('diff1Title')}
            body={t('diff1Body', { price: MONTHLY_PRICE_LABEL })}
          />
          <Differentiator
            icon={<Calendar className="w-5 h-5" strokeWidth={2.5} />}
            title={t('diff2Title')}
            body={t('diff2Body')}
          />
          <Differentiator
            icon={<ShieldCheck className="w-5 h-5" strokeWidth={2.5} />}
            title={t('diff3Title')}
            body={t('diff3Body')}
          />
          <Differentiator
            icon={<Sparkles className="w-5 h-5" strokeWidth={2.5} />}
            title={t('diff4Title')}
            body={t('diff4Body')}
          />
        </div>
      </section>

      {/* ─── Typical day ────────────────────────────────────────────── */}
      <section className="px-5 py-12 bg-white">
        <div className="text-center mb-8">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#EAB308] mb-2">
            {t('typicalLabel')}
          </div>
          <h2 className="text-[24px] sm:text-[32px] font-black leading-tight">
            {t('typicalTitle')}
          </h2>
          <p className="mt-2 text-[13px] sm:text-[14px] text-black/70 max-w-md mx-auto">
            {t('typicalSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-md sm:max-w-2xl mx-auto">
          <MetricCard
            label={t('metric1Label')}
            value={t('metric1Value')}
            sub={t('metric1Sub')}
          />
          <MetricCard
            label={t('metric2Label')}
            value={t('metric2Value')}
            sub={t('metric2Sub')}
          />
          <MetricCard
            label={t('metric3Label')}
            value={t('metric3Value')}
            sub={t('metric3Sub')}
          />
        </div>
      </section>

      <section className="px-5 py-12 bg-[#FFFBEA]">
        <div className="text-center mb-8">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#EAB308] mb-2">
            {t('earnLabel')}
          </div>
          <h2 className="text-[24px] sm:text-[32px] font-black leading-tight">
            {t('earnTitle')}
          </h2>
          <p className="mt-2 text-[13px] sm:text-[14px] text-black/70 max-w-md mx-auto">
            {t('earnSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md sm:max-w-2xl mx-auto">
          <EarningModeCard
            icon={<Truck className="w-5 h-5" strokeWidth={2.5} />}
            title={t('earnPassengerTitle')}
            subtitle={t('earnPassengerSubtitle')}
            body={t('earnPassengerBody')}
          />
          <EarningModeCard
            icon={<Package className="w-5 h-5" strokeWidth={2.5} />}
            title={t('earnParcelTitle')}
            subtitle={t('earnParcelSubtitle')}
            body={t('earnParcelBody')}
          />
        </div>

        <p className="mt-6 text-center text-[12px] text-black/55 max-w-md mx-auto">
          {t('earnFooter')}
        </p>
      </section>

      <section className="px-5 py-12">
        <div className="rounded-3xl border-2 border-[#FACC15] bg-white p-6 sm:p-8 shadow-[0_16px_48px_rgba(250,204,21,0.18)]">
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFBEA] border border-[#FACC15] text-[11px] font-extrabold uppercase tracking-wider text-[#0A0A0A] mb-3">
              <Sparkles className="w-3.5 h-3.5" strokeWidth={2.5} style={{ color: '#EAB308' }} />
              {t('pricingBadge')}
            </div>
            <div className="text-[44px] sm:text-[56px] font-black leading-none">
              {MONTHLY_PRICE_LABEL}
              <span className="text-[16px] font-bold text-black/55">{t('pricingPerMonth')}</span>
            </div>
            <div className="text-[13px] text-black/60 mt-2">
              {t('pricingYearly', { price: YEARLY_PRICE_LABEL })}
            </div>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0A0A0A] text-white text-[12px] font-extrabold">
              <Sparkles className="w-3.5 h-3.5" strokeWidth={2.5} style={{ color: '#FACC15' }} />
              {t('pricingTrial')}
            </div>
          </div>

          <ul className="mt-6 space-y-2.5 text-[13px] sm:text-[14px] text-black/80">
            <Bullet>{t('pricingBullet1')}</Bullet>
            <Bullet>{t('pricingBullet2')}</Bullet>
            <Bullet>{t('pricingBullet3')}</Bullet>
            <Bullet>{t('pricingBullet4')}</Bullet>
            <Bullet>{t('pricingBullet5')}</Bullet>
            <Bullet>{t('pricingBullet6')}</Bullet>
          </ul>

          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <Link
              href="/signup/truck"
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#FACC15] text-[#0A0A0A] text-[14px] font-extrabold shadow-[0_8px_24px_rgba(250,204,21,0.45)] active:scale-[0.97] transition"
              style={{ minHeight: 48 }}
            >
              {t('pricingCta')}
              <ArrowRight className="w-4 h-4" strokeWidth={3} />
            </Link>
          </div>
          <p className="mt-3 text-center text-[11px] text-black/45">
            {t('pricingFine')}
          </p>
        </div>
      </section>

      <section className="bg-[#0A0A0A] text-white">
        <div className="px-5 py-12 text-center">
          <h2 className="text-[24px] sm:text-[32px] font-black leading-tight">
            {t('finalTitle')}
          </h2>
          <p className="mt-3 text-[14px] sm:text-[16px] text-white/70 max-w-xl mx-auto">
            {t('finalBody', { price: MONTHLY_PRICE_LABEL })}
          </p>
          <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/signup/truck"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#FACC15] text-[#0A0A0A] text-[14px] font-extrabold shadow-[0_8px_24px_rgba(250,204,21,0.55)] active:scale-[0.97] transition"
              style={{ minHeight: 48 }}
            >
              {t('finalCta')}
              <ArrowRight className="w-4 h-4" strokeWidth={3} />
            </Link>
            <a
              href={`https://wa.me/${getSupportWhatsApp()}?text=${encodeURIComponent(t('waMessage'))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white/10 border border-white/25 text-white text-[14px] font-extrabold active:scale-[0.97] transition hover:bg-white/15"
              style={{ minHeight: 48 }}
            >
              <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
              {t('finalWa')}
            </a>
          </div>

          <div className="mt-10 pt-6 border-t border-white/10 text-[12px] text-white/45">
            {t('footerDisclaimer')}
          </div>
        </div>
      </section>
      </div>{/* /phone-frame wrapper */}
    </main>
  )
}

// ─── Small presentational helpers ───────────────────────────────────

function VehicleSwitcher({
  active,
  labels,
}: {
  active: 'bike' | 'car' | 'bus' | 'truck' | 'jeep'
  labels: Record<'bike' | 'car' | 'bus' | 'truck' | 'jeep', string>
}) {
  const items: { key: 'bike' | 'car' | 'bus' | 'truck' | 'jeep'; href: string }[] = [
    { key: 'bike',  href: '/drivers' },
    { key: 'car',   href: '/drivers/car' },
    { key: 'bus',   href: '/drivers/bus' },
    { key: 'truck', href: '/drivers/truck' },
    { key: 'jeep',  href: '/drivers/jeep' },
  ]
  return (
    <div
      className="inline-flex items-center gap-1 px-1 py-1 rounded-full"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        border: '1px solid rgba(0,0,0,0.10)',
      }}
    >
      {items.map((it) =>
        it.key === active ? (
          <span
            key={it.key}
            className="px-2 py-0.5 rounded-full text-[11px] font-extrabold"
            style={{ color: '#0A0A0A', background: '#FACC15' }}
            aria-current="page"
          >
            {labels[it.key]}
          </span>
        ) : (
          <Link
            key={it.key}
            href={it.href}
            className="px-2 py-0.5 rounded-full text-[11px] font-extrabold transition active:scale-[0.97]"
            style={{ color: '#0A0A0A' }}
          >
            {labels[it.key]}
          </Link>
        ),
      )}
    </div>
  )
}

function Step({
  n, stepLabel, icon, title, children,
}: {
  n: number
  stepLabel: string
  icon: React.ReactNode
  title: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl bg-white border border-black/10 p-5 sm:p-6 hover:border-[#FACC15] hover:shadow-[0_8px_24px_rgba(250,204,21,0.18)] transition">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-[#0A0A0A]"
          style={{ background: '#FFFBEA', border: '1px solid #FACC15' }}
        >
          {icon}
        </div>
        <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#EAB308]">
          {stepLabel} {n}
        </span>
      </div>
      <h3 className="text-[16px] sm:text-[18px] font-black leading-tight">{title}</h3>
      <p className="mt-2 text-[13px] sm:text-[14px] text-black/65 leading-relaxed">
        {children}
      </p>
    </div>
  )
}

function UseCase({
  icon, title, body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="rounded-2xl bg-white border border-black/10 p-5 hover:border-[#FACC15] hover:shadow-[0_8px_24px_rgba(250,204,21,0.18)] transition">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
        style={{ background: '#FACC15' }}
      >
        {icon}
      </div>
      <h3 className="text-[14px] sm:text-[15px] font-black leading-tight">{title}</h3>
      <p className="mt-2 text-[12.5px] sm:text-[13px] text-black/65 leading-relaxed">{body}</p>
    </div>
  )
}

function Differentiator({
  icon, title, body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="rounded-2xl bg-white border border-[#FACC15]/40 p-5">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
        style={{ background: '#FACC15' }}
      >
        {icon}
      </div>
      <h3 className="text-[14px] sm:text-[15px] font-black leading-tight">{title}</h3>
      <p className="mt-2 text-[12.5px] sm:text-[13px] text-black/65 leading-relaxed">{body}</p>
    </div>
  )
}

function MetricCard({
  label, value, sub,
}: {
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="rounded-2xl bg-white border border-black/10 p-5 text-center hover:border-[#FACC15] hover:shadow-[0_8px_24px_rgba(250,204,21,0.18)] transition">
      <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#EAB308] mb-1.5">
        {label}
      </div>
      <div className="text-[20px] sm:text-[22px] font-black leading-tight text-[#0A0A0A]">
        {value}
      </div>
      <div className="mt-1.5 text-[12px] text-black/60 leading-relaxed">{sub}</div>
    </div>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        aria-hidden
        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
        style={{ background: '#FACC15', color: '#0A0A0A' }}
      >
        <span className="block w-2 h-2 rounded-full bg-[#0A0A0A]" />
      </span>
      <span>{children}</span>
    </li>
  )
}
