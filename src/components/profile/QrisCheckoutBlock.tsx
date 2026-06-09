// mig 0228 — "Pay deposit via QRIS" block. Shared by every vertical's
// public profile page. Renders only when `qrUrl` is non-null. Kita2u
// never custodies funds — the customer scans the merchant's own QR and
// pays direct. Cross-border QRIS spans ID/MY/SG/TH/PH (~580M consumers).
// Structural moat vs Linktree / Stan Store / Beacons, none of which
// ship native QRIS.

type Props = {
  qrUrl:       string | null | undefined
  displayName: string | null | undefined
}

export default function QrisCheckoutBlock({ qrUrl, displayName }: Props) {
  if (!qrUrl) return null
  const name = displayName?.trim() || 'this vendor'
  return (
    <section
      className="rounded-2xl border p-5 sm:p-6"
      style={{
        background:   'linear-gradient(135deg, #FFFBEB 0%, #FFFFFF 100%)',
        borderColor:  '#FACC15',
        boxShadow:    '0 8px 22px rgba(250,204,21,0.18)',
      }}
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0">
          <img
            src={qrUrl}
            alt="QRIS"
            loading="lazy"
            className="w-32 h-32 sm:w-40 sm:h-40 object-contain rounded-xl border border-gray-200 bg-white p-2"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: '#854D0E' }}>
            Pay deposit via QRIS
          </div>
          <h3 className="text-[18px] sm:text-[22px] font-black leading-tight mt-1" style={{ color: '#0A0A0A' }}>
            Scan to lock your booking.
          </h3>
          <p className="text-[13px] sm:text-[14px] text-gray-700 leading-relaxed mt-2">
            Scan with any banking app or e-wallet — GoPay, OVO, DANA, ShopeePay, LinkAja, BCA, Mandiri, BRI, Maybank, KBank, DBS PayLah! Payment goes direct to {name}; Kita2u never custodies funds.
          </p>
          <p className="text-[11px] text-gray-500 italic mt-2">
            Cross-border: 🇮🇩 Indonesia · 🇹🇭 Thailand · 🇲🇾 Malaysia · 🇸🇬 Singapore · 🇵🇭 Philippines
          </p>
        </div>
      </div>
    </section>
  )
}
