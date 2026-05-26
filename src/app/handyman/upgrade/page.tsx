import ProviderUpgradePage from '@/components/upgrade/ProviderUpgradePage'

export const metadata = { title: 'Upgrade · Handyman (Tukang) · IndoCity' }

export default function Page() {
  return (
    <ProviderUpgradePage
      verticalLabel="Handyman (Tukang)"
      verticalSlug="handyman"
      dashboardHref="/dashboard/handyman"
      backHref="/dashboard/handyman"
      inclusions={[
        'Listing profil di /handyman — sampai 3 spesialisasi',
        'Per-jam dan per-hari (8h) rate bebas atur',
        'Customer kontak via WhatsApp — kamu pegang 100% pembayaran',
        'Verifikasi KTP oleh admin untuk badge trust',
      ]}
    />
  )
}
