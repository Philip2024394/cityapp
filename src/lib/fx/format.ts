// ============================================================================
// Foreign-currency display formatter
// ----------------------------------------------------------------------------
// Converts a canonical IDR amount into an approximate local-currency
// string for display ONLY. Charges still settle in IDR.
//
// Conventions:
//   - Show "≈" prefix so the user knows it's approximate.
//   - Currencies with conventional 2-decimal display (USD, EUR, GBP)
//     round to nearest 0.10 and show 1 decimal (e.g. "≈ US$2.40").
//   - Zero-decimal currencies (JPY, KRW, IDR, VND) round to nearest
//     whole unit (e.g. "≈ ¥365").
//   - Below-USD-0.01 amounts get a leading "<" instead of "0.00"
//     ("≈ < $0.01" — defensive guard against rendering "$0").
// ============================================================================

import type { FxRates } from './rates'

const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'IDR', 'VND', 'LAK', 'MMK', 'KHR'])

// Canonical symbol for currencies whose ISO code != usual display glyph.
// Falls back to the ISO code when no glyph is set.
const SYMBOLS: Record<string, string> = {
  USD: 'US$',
  EUR: '€',
  GBP: '£',
  AUD: 'A$',
  SGD: 'S$',
  MYR: 'RM',
  THB: '฿',
  VND: '₫',
  PHP: '₱',
  JPY: '¥',
  KRW: '₩',
  CNY: '¥',
  HKD: 'HK$',
  TWD: 'NT$',
  INR: '₹',
  CAD: 'C$',
  NZD: 'NZ$',
  CHF: 'CHF ',
  AED: 'AED ',
  SAR: 'SAR ',
  NOK: 'kr ',
  SEK: 'kr ',
  DKK: 'kr ',
  IDR: 'Rp ',
}

/** Convert an IDR amount to a target currency display string.
 *
 *  Returns null when:
 *    - Target currency is IDR (caller should display the IDR figure as-is).
 *    - We don't have a rate for the target currency in the rates table.
 */
export function formatLocalEquivalent(
  idrAmount: number,
  targetCurrency: string,
  rates: FxRates,
): string | null {
  const cur = targetCurrency.toUpperCase()
  if (cur === 'IDR') return null
  const rate = rates.rates[cur]
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) return null

  const converted = idrAmount * rate
  if (converted <= 0) return null

  const symbol = SYMBOLS[cur] ?? `${cur} `
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(cur)

  if (converted < 0.01 && !isZeroDecimal) {
    return `≈ ${symbol}< 0.01`
  }

  // Standard 2-decimal currencies — round to nearest 0.10 so the
  // approximate nature is visually obvious ($2.40 reads as "round
  // number" while $2.37 reads as "exact, billed amount").
  const rounded = isZeroDecimal
    ? Math.round(converted)
    : Math.round(converted * 10) / 10
  const display = isZeroDecimal
    ? rounded.toLocaleString('en-US')
    : rounded.toFixed(1)

  return `≈ ${symbol}${display}`
}
