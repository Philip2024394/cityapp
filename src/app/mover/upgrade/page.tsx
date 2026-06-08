import ProviderUpgradePage from '@/components/upgrade/ProviderUpgradePage'

export const metadata = { title: 'Upgrade · Mover · CityDrivers' }

export default function Page() {
  return (
    <ProviderUpgradePage
      verticalLabel="Mover"
      verticalSlug="mover"
      dashboardHref="/dashboard/mover"
      backHref="/dashboard/mover"
      inclusions={[
        'Listing profil di /mover — sampai 3 vehicle + services (Grandmax / Pickup / Box CDD / Wing / Tronton / rumah penuh / kantor / single furniture)',
        'Anchor price + paket rumah-penuh bebas atur, distance-tier (dalam kota / antar kota / antar provinsi) ditampilkan',
        'Client kontak via WhatsApp — quote pindahan + survey request + intake (jumlah barang / lantai / lift atau tangga)',
        'Armada & Pindahan sampai 12 foto per vehicle + service — armada Grandmax/Box/CDD + dokumentasi pindahan rumah + packing material',
      ]}
    />
  )
}
