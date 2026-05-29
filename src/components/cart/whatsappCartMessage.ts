// =============================================================================
// formatWhatsAppCartMessage — pure helper that builds the Indonesian-style
// order body the cart sheet hands off to a vendor's WhatsApp.
//
// Mirrors the exact shape PlaceCartSheet was emitting before the cart
// generalization (header line → blank → line items → blank → total →
// "Alamat saya" + "Catatan" placeholders). The customer fills in the
// last two lines inside WhatsApp itself; we never auto-detect address.
//
// Pure function — no React, no DOM. Safe to call from any client or
// server context, easy to unit test.
// =============================================================================

import type { VendorCartItem } from './useVendorCart'

// Exact-rupiah formatter — never abbreviate inside the order body. The
// customer needs to see the precise amount they're agreeing to pay
// (Rp 102,000, not "Rp 102k").
function formatRpExact(amount: number, currencySymbol: string): string {
  if (!Number.isFinite(amount) || amount <= 0) return `${currencySymbol} 0`
  return `${currencySymbol} ${Math.round(amount).toLocaleString('id-ID')}`
}

export function formatWhatsAppCartMessage(
  items:          VendorCartItem[],
  totalIdr:       number,
  currencySymbol: string,
  vendorName:     string,
): string {
  const linesArr = items.map((it) => {
    const unit = formatRpExact(it.price_idr,           currencySymbol)
    const line = formatRpExact(it.price_idr * it.qty,  currencySymbol)
    return `• ${it.name}  ×${it.qty}  (${unit}) — ${line}`
  })
  return [
    `Halo! Saya pesan dari Kita2u · ${vendorName}`,
    '',
    ...linesArr,
    '',
    `Total: ${formatRpExact(totalIdr, currencySymbol)}`,
    'Alamat saya: ____________',
    'Catatan: ____________',
  ].join('\n')
}
