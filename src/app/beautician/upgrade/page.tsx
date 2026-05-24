import ProviderUpgradePage from '@/components/upgrade/ProviderUpgradePage'

export const metadata = { title: 'Upgrade · Beautician · City Rider' }

export default function Page() {
  return (
    <ProviderUpgradePage
      verticalLabel="Beautician"
      verticalSlug="beautician"
      dashboardHref="/dashboard/beautician"
      backHref="/dashboard/beautician"
      inclusions={[
        'Listing profil di /beautician — makeup · nail art · hair',
        'Per-paket pricing (makeup / nail / hair) bebas atur',
        'Customer kontak via WhatsApp — kamu pegang 100% pembayaran',
        'Verifikasi KTP oleh admin untuk badge trust',
      ]}
    />
  )
}
