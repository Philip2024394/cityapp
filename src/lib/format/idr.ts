// Indonesian Rupiah formatter — dot thousand separator, no decimals.
// Rp 12.500 (not Rp 12,500). This is the convention locally.
export function idr(n: number): string {
  if (!Number.isFinite(n)) return 'Rp 0'
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`
}

export function idrShort(n: number): string {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`
  if (n >= 1_000) return `Rp ${Math.round(n / 1000)}k`
  return idr(n)
}
