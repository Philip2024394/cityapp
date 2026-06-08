import ProviderUpgradePage from '@/components/upgrade/ProviderUpgradePage'

export const metadata = { title: 'Upgrade · Cake · CityDrivers' }

export default function Page() {
  return (
    <ProviderUpgradePage
      verticalLabel="Cake & bakery business"
      verticalSlug="cake"
      dashboardHref="/dashboard/cake"
      backHref="/dashboard/cake"
      inclusions={[
        'Listing profil di /cake — sampai 3 spesialisasi (birthday / Korean bento / dessert table)',
        'Per-cake + paket bundle bebas atur, lead time + minimum order ditampilkan',
        'Client kontak via WhatsApp — pesan custom design + konsultasi rasa langsung',
        'Cake gallery sampai 12 foto kue per kategori — clients pilih by foto',
      ]}
    />
  )
}
