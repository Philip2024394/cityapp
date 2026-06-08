import ProviderUpgradePage from '@/components/upgrade/ProviderUpgradePage'

export const metadata = { title: 'Upgrade · Video · CityDrivers' }

export default function Page() {
  return (
    <ProviderUpgradePage
      verticalLabel="Videographer"
      verticalSlug="video"
      dashboardHref="/dashboard/video"
      backHref="/dashboard/video"
      inclusions={[
        'Listing profil di /video — sampai 3 genre andalan',
        'Package + full-day rate bebas atur, deposit policy ditampilkan',
        'Client kontak via WhatsApp — booking + konsultasi paket langsung',
        'Showreel + portfolio gallery sampai 12 video per genre',
      ]}
    />
  )
}
