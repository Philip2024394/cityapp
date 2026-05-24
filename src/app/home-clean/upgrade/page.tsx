import ProviderUpgradePage from '@/components/upgrade/ProviderUpgradePage'

export const metadata = { title: 'Upgrade · Home Clean · City Rider' }

export default function Page() {
  return (
    <ProviderUpgradePage
      verticalLabel="Bike Home Clean"
      verticalSlug="home_clean"
      dashboardHref="/dashboard/home-clean"
      backHref="/dashboard/home-clean"
      inclusions={[
        'Listing profil di /home-clean — bersih rumah per jam atau per hari',
        'Per-jam dan per-hari (8h) rate bebas atur',
        'Customer kontak via WhatsApp — kamu pegang 100% pembayaran',
        'Verifikasi KTP oleh admin untuk badge trust',
      ]}
    />
  )
}
