import ProviderUpgradePage from '@/components/upgrade/ProviderUpgradePage'

export const metadata = { title: 'Upgrade · Florist · CityDrivers' }

export default function Page() {
  return (
    <ProviderUpgradePage
      verticalLabel="Florist business"
      verticalSlug="florist"
      dashboardHref="/dashboard/florist"
      backHref="/dashboard/florist"
      inclusions={[
        'Listing profil di /florist — sampai 3 spesialisasi (hand bouquet / standing flower / box arrangement)',
        'Per-arrangement + premium bundle bebas atur, same-day delivery cutoff + minimum order ditampilkan',
        'Client kontak via WhatsApp — konsultasi screenshot / design custom + kartu ucapan langsung',
        'Arrangement gallery sampai 12 foto per kategori — clients pilih by foto',
      ]}
    />
  )
}
