import ProviderUpgradePage from '@/components/upgrade/ProviderUpgradePage'

export const metadata = { title: 'Upgrade · Massage · IndoCity' }

export default function Page() {
  return (
    <ProviderUpgradePage
      verticalLabel="Massage Therapist"
      verticalSlug="massage"
      dashboardHref="/dashboard/massage"
      backHref="/dashboard/massage"
      inclusions={[
        'Listing profil therapist di /massage tanpa batas',
        'Toggle availability online / busy / offline langsung dari dashboard',
        'Customer kontak via WhatsApp — kamu pegang 100% pembayaran',
        'Verifikasi KTP oleh admin untuk badge trust',
      ]}
    />
  )
}
