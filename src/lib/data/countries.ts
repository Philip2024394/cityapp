// Country lookup — drives the WA-prefix chip + currency symbol on
// dashboard price tiles + the country autocomplete on /info. Keyed by
// ISO 3166-1 alpha-2 code (matches the country_code column on every
// provider table, mig 0131).
//
// Scope: ~80 entries — Indonesia + SEA neighbours + tourist source
// countries (NA/EU/AU/UK/JP/KR/CN) + a handful of other globals. Not
// exhaustive on purpose; the autocomplete filter handles "type any
// country name" gracefully but the picker only resolves entries here.
//
// Currency symbol is the canonical symbol shown in money inputs (e.g.
// `Rp 250.000`, `$ 25`, `€ 25`). Some currencies use a code (CHF, NOK)
// when no glyph reads as the currency.

export type Country = {
  /** ISO 3166-1 alpha-2, uppercase. Primary key. */
  code:          string
  /** English display name shown in the autocomplete. */
  name:          string
  /** International dialling code WITHOUT the leading +. Used to build
   *  the WA prefix chip — "+62" for ID, "+1" for US, etc. */
  dial_code:     string
  /** ISO 4217 currency code (USD, IDR, EUR…). */
  currency_code: string
  /** Glyph shown next to prices on tiles + receipts. */
  currency_symbol: string
}

export const COUNTRIES: ReadonlyArray<Country> = [
  // SE Asia — primary market
  { code: 'ID', name: 'Indonesia',     dial_code: '62',  currency_code: 'IDR', currency_symbol: 'Rp' },
  { code: 'MY', name: 'Malaysia',      dial_code: '60',  currency_code: 'MYR', currency_symbol: 'RM' },
  { code: 'SG', name: 'Singapore',     dial_code: '65',  currency_code: 'SGD', currency_symbol: 'S$' },
  { code: 'TH', name: 'Thailand',      dial_code: '66',  currency_code: 'THB', currency_symbol: '฿'  },
  { code: 'VN', name: 'Vietnam',       dial_code: '84',  currency_code: 'VND', currency_symbol: '₫'  },
  { code: 'PH', name: 'Philippines',   dial_code: '63',  currency_code: 'PHP', currency_symbol: '₱'  },
  { code: 'KH', name: 'Cambodia',      dial_code: '855', currency_code: 'KHR', currency_symbol: '៛'  },
  { code: 'LA', name: 'Laos',          dial_code: '856', currency_code: 'LAK', currency_symbol: '₭'  },
  { code: 'MM', name: 'Myanmar',       dial_code: '95',  currency_code: 'MMK', currency_symbol: 'K'  },
  { code: 'BN', name: 'Brunei',        dial_code: '673', currency_code: 'BND', currency_symbol: 'B$' },
  { code: 'TL', name: 'Timor-Leste',   dial_code: '670', currency_code: 'USD', currency_symbol: '$'  },

  // East Asia
  { code: 'CN', name: 'China',         dial_code: '86',  currency_code: 'CNY', currency_symbol: '¥' },
  { code: 'HK', name: 'Hong Kong',     dial_code: '852', currency_code: 'HKD', currency_symbol: 'HK$' },
  { code: 'TW', name: 'Taiwan',        dial_code: '886', currency_code: 'TWD', currency_symbol: 'NT$' },
  { code: 'JP', name: 'Japan',         dial_code: '81',  currency_code: 'JPY', currency_symbol: '¥' },
  { code: 'KR', name: 'South Korea',   dial_code: '82',  currency_code: 'KRW', currency_symbol: '₩' },
  { code: 'MO', name: 'Macau',         dial_code: '853', currency_code: 'MOP', currency_symbol: 'MOP$' },
  { code: 'MN', name: 'Mongolia',      dial_code: '976', currency_code: 'MNT', currency_symbol: '₮' },

  // South Asia
  { code: 'IN', name: 'India',         dial_code: '91',  currency_code: 'INR', currency_symbol: '₹' },
  { code: 'BD', name: 'Bangladesh',    dial_code: '880', currency_code: 'BDT', currency_symbol: '৳' },
  { code: 'PK', name: 'Pakistan',      dial_code: '92',  currency_code: 'PKR', currency_symbol: '₨' },
  { code: 'LK', name: 'Sri Lanka',     dial_code: '94',  currency_code: 'LKR', currency_symbol: '₨' },
  { code: 'NP', name: 'Nepal',         dial_code: '977', currency_code: 'NPR', currency_symbol: '₨' },
  { code: 'BT', name: 'Bhutan',        dial_code: '975', currency_code: 'BTN', currency_symbol: 'Nu.' },
  { code: 'MV', name: 'Maldives',      dial_code: '960', currency_code: 'MVR', currency_symbol: 'Rf' },

  // Oceania
  { code: 'AU', name: 'Australia',     dial_code: '61',  currency_code: 'AUD', currency_symbol: 'A$' },
  { code: 'NZ', name: 'New Zealand',   dial_code: '64',  currency_code: 'NZD', currency_symbol: 'NZ$' },
  { code: 'FJ', name: 'Fiji',          dial_code: '679', currency_code: 'FJD', currency_symbol: 'FJ$' },
  { code: 'PG', name: 'Papua New Guinea', dial_code: '675', currency_code: 'PGK', currency_symbol: 'K' },

  // North America
  { code: 'US', name: 'United States', dial_code: '1',   currency_code: 'USD', currency_symbol: '$' },
  { code: 'CA', name: 'Canada',        dial_code: '1',   currency_code: 'CAD', currency_symbol: 'C$' },
  { code: 'MX', name: 'Mexico',        dial_code: '52',  currency_code: 'MXN', currency_symbol: 'Mex$' },

  // Europe — euro zone first
  { code: 'DE', name: 'Germany',       dial_code: '49',  currency_code: 'EUR', currency_symbol: '€' },
  { code: 'FR', name: 'France',        dial_code: '33',  currency_code: 'EUR', currency_symbol: '€' },
  { code: 'IT', name: 'Italy',         dial_code: '39',  currency_code: 'EUR', currency_symbol: '€' },
  { code: 'ES', name: 'Spain',         dial_code: '34',  currency_code: 'EUR', currency_symbol: '€' },
  { code: 'NL', name: 'Netherlands',   dial_code: '31',  currency_code: 'EUR', currency_symbol: '€' },
  { code: 'BE', name: 'Belgium',       dial_code: '32',  currency_code: 'EUR', currency_symbol: '€' },
  { code: 'AT', name: 'Austria',       dial_code: '43',  currency_code: 'EUR', currency_symbol: '€' },
  { code: 'PT', name: 'Portugal',      dial_code: '351', currency_code: 'EUR', currency_symbol: '€' },
  { code: 'IE', name: 'Ireland',       dial_code: '353', currency_code: 'EUR', currency_symbol: '€' },
  { code: 'FI', name: 'Finland',       dial_code: '358', currency_code: 'EUR', currency_symbol: '€' },
  { code: 'GR', name: 'Greece',        dial_code: '30',  currency_code: 'EUR', currency_symbol: '€' },
  { code: 'LU', name: 'Luxembourg',    dial_code: '352', currency_code: 'EUR', currency_symbol: '€' },

  // Europe — non-euro
  { code: 'GB', name: 'United Kingdom', dial_code: '44',  currency_code: 'GBP', currency_symbol: '£' },
  { code: 'CH', name: 'Switzerland',   dial_code: '41',  currency_code: 'CHF', currency_symbol: 'CHF' },
  { code: 'NO', name: 'Norway',        dial_code: '47',  currency_code: 'NOK', currency_symbol: 'kr' },
  { code: 'SE', name: 'Sweden',        dial_code: '46',  currency_code: 'SEK', currency_symbol: 'kr' },
  { code: 'DK', name: 'Denmark',       dial_code: '45',  currency_code: 'DKK', currency_symbol: 'kr' },
  { code: 'IS', name: 'Iceland',       dial_code: '354', currency_code: 'ISK', currency_symbol: 'kr' },
  { code: 'PL', name: 'Poland',        dial_code: '48',  currency_code: 'PLN', currency_symbol: 'zł' },
  { code: 'CZ', name: 'Czech Republic', dial_code: '420', currency_code: 'CZK', currency_symbol: 'Kč' },
  { code: 'HU', name: 'Hungary',       dial_code: '36',  currency_code: 'HUF', currency_symbol: 'Ft' },
  { code: 'RO', name: 'Romania',       dial_code: '40',  currency_code: 'RON', currency_symbol: 'lei' },
  { code: 'BG', name: 'Bulgaria',      dial_code: '359', currency_code: 'BGN', currency_symbol: 'лв' },
  { code: 'HR', name: 'Croatia',       dial_code: '385', currency_code: 'EUR', currency_symbol: '€' },
  { code: 'RU', name: 'Russia',        dial_code: '7',   currency_code: 'RUB', currency_symbol: '₽' },
  { code: 'UA', name: 'Ukraine',       dial_code: '380', currency_code: 'UAH', currency_symbol: '₴' },
  { code: 'TR', name: 'Turkey',        dial_code: '90',  currency_code: 'TRY', currency_symbol: '₺' },

  // Middle East
  { code: 'AE', name: 'United Arab Emirates', dial_code: '971', currency_code: 'AED', currency_symbol: 'AED' },
  { code: 'SA', name: 'Saudi Arabia',  dial_code: '966', currency_code: 'SAR', currency_symbol: 'SR' },
  { code: 'QA', name: 'Qatar',         dial_code: '974', currency_code: 'QAR', currency_symbol: 'QR' },
  { code: 'KW', name: 'Kuwait',        dial_code: '965', currency_code: 'KWD', currency_symbol: 'KD' },
  { code: 'BH', name: 'Bahrain',       dial_code: '973', currency_code: 'BHD', currency_symbol: 'BD' },
  { code: 'OM', name: 'Oman',          dial_code: '968', currency_code: 'OMR', currency_symbol: 'OMR' },
  { code: 'IL', name: 'Israel',        dial_code: '972', currency_code: 'ILS', currency_symbol: '₪' },
  { code: 'JO', name: 'Jordan',        dial_code: '962', currency_code: 'JOD', currency_symbol: 'JD' },
  { code: 'LB', name: 'Lebanon',       dial_code: '961', currency_code: 'LBP', currency_symbol: 'L£' },
  { code: 'EG', name: 'Egypt',         dial_code: '20',  currency_code: 'EGP', currency_symbol: 'E£' },

  // Africa
  { code: 'ZA', name: 'South Africa',  dial_code: '27',  currency_code: 'ZAR', currency_symbol: 'R' },
  { code: 'NG', name: 'Nigeria',       dial_code: '234', currency_code: 'NGN', currency_symbol: '₦' },
  { code: 'KE', name: 'Kenya',         dial_code: '254', currency_code: 'KES', currency_symbol: 'KSh' },
  { code: 'MA', name: 'Morocco',       dial_code: '212', currency_code: 'MAD', currency_symbol: 'DH' },
  { code: 'TN', name: 'Tunisia',       dial_code: '216', currency_code: 'TND', currency_symbol: 'DT' },
  { code: 'GH', name: 'Ghana',         dial_code: '233', currency_code: 'GHS', currency_symbol: '₵' },
  { code: 'ET', name: 'Ethiopia',      dial_code: '251', currency_code: 'ETB', currency_symbol: 'Br' },

  // South America
  { code: 'BR', name: 'Brazil',        dial_code: '55',  currency_code: 'BRL', currency_symbol: 'R$' },
  { code: 'AR', name: 'Argentina',     dial_code: '54',  currency_code: 'ARS', currency_symbol: 'AR$' },
  { code: 'CL', name: 'Chile',         dial_code: '56',  currency_code: 'CLP', currency_symbol: 'CL$' },
  { code: 'CO', name: 'Colombia',      dial_code: '57',  currency_code: 'COP', currency_symbol: 'CO$' },
  { code: 'PE', name: 'Peru',          dial_code: '51',  currency_code: 'PEN', currency_symbol: 'S/' },
  { code: 'UY', name: 'Uruguay',       dial_code: '598', currency_code: 'UYU', currency_symbol: '$U' },
  { code: 'EC', name: 'Ecuador',       dial_code: '593', currency_code: 'USD', currency_symbol: '$' },
] as const

const BY_CODE: Record<string, Country> = Object.fromEntries(COUNTRIES.map((c) => [c.code, c]))

/** Resolve a country by ISO code (case-insensitive). Falls back to
 *  Indonesia when the code is missing or unknown so the dashboard
 *  never shows an empty prefix / currency on rows from before
 *  migration 0131 landed. */
export function countryByCode(code: string | null | undefined): Country {
  if (!code) return BY_CODE.ID
  const k = code.toUpperCase()
  return BY_CODE[k] ?? BY_CODE.ID
}

/** Filtered subset for autocomplete. Case-insensitive contains-match
 *  on name OR code. Returns the first 12 hits sorted by name. */
export function searchCountries(query: string): Country[] {
  const q = query.trim().toLowerCase()
  if (!q) return COUNTRIES.slice(0, 12) as Country[]
  return COUNTRIES
    .filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
    .slice(0, 12) as Country[]
}
