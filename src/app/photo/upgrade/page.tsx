import ProviderUpgradePage from '@/components/upgrade/ProviderUpgradePage'

export const metadata = { title: 'Upgrade · Photo · CityDrivers' }

export default function Page() {
  return (
    <ProviderUpgradePage
      verticalLabel="Photographer"
      verticalSlug="photo"
      dashboardHref="/dashboard/photo"
      backHref="/dashboard/photo"
      inclusions={[
        'Listing profil di /photo — sampai 3 genre andalan',
        'Package + full-day rate bebas atur, deposit policy ditampilkan',
        'Client kontak via WhatsApp — booking + konsultasi langsung',
        'Portfolio gallery sampai 12 foto per genre',
      ]}
    />
  )
}
