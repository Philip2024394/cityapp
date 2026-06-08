import ProviderUpgradePage from '@/components/upgrade/ProviderUpgradePage'

export const metadata = { title: 'Upgrade · Tailor · CityDrivers' }

export default function Page() {
  return (
    <ProviderUpgradePage
      verticalLabel="Tailor"
      verticalSlug="tailor"
      dashboardHref="/dashboard/tailor"
      backHref="/dashboard/tailor"
      inclusions={[
        'Listing profil di /tailor — sampai 3 garment specialties (Kebaya / Jas / Kemeja / Gaun / Seragam / Vermak / Streetwear / Muslim wear)',
        'Anchor price + paket bridal/seragam bebas atur, fabric-supply toggle (bahan dari customer atau bahan dari kami) ditampilkan',
        'Client kontak via WhatsApp — quote jahitan + measurement appointment + intake (ukuran / referensi design / lead time)',
        'Galeri Jahitan sampai 12 foto per garment — kebaya bridal + jas pria + seragam kantor + dokumentasi fitting + before/after vermak',
      ]}
    />
  )
}
