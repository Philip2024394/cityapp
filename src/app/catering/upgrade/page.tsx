import ProviderUpgradePage from '@/components/upgrade/ProviderUpgradePage'

export const metadata = { title: 'Upgrade · Catering · CityDrivers' }

export default function Page() {
  return (
    <ProviderUpgradePage
      verticalLabel="Catering business"
      verticalSlug="catering"
      dashboardHref="/dashboard/catering"
      backHref="/dashboard/catering"
      inclusions={[
        'Listing profil di /catering — sampai 3 menu / cuisine andalan',
        'Per-pax + paket bundle bebas atur, minimum order + uang muka 50% ditampilkan',
        'Client kontak via WhatsApp — pesan menu + konsultasi paket langsung',
        'Menu carousel sampai 12 foto makanan per kategori',
      ]}
    />
  )
}
