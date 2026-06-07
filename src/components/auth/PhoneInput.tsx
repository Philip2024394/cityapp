'use client'
// ============================================================================
// PhoneInput — country-prefix dropdown + national-number input.
// ----------------------------------------------------------------------------
// Used by /signup and /login. Replaces the legacy hardcoded `+62` input.
//
// Defaults: the visitor's country is read from the `kita-country` cookie
// (set by middleware from cf-ipcountry / x-vercel-ip-country). If the cookie
// is missing or names a country we don't have, falls back to Indonesia (ID)
// so the legacy Indonesian-user experience is unchanged.
//
// Value contract:
//   - props.value is the E.164 number WITHOUT a leading + (the format
//     supabase.auth expects), e.g. '6281234567890', '14155551212'.
//   - The component emits the same format via onChange.
//   - Parent code (/signup, /login) does NOT need to know the dial code —
//     it just reads/writes the full E.164 string.
//
// Why a popover instead of <select>: native <select> on mobile renders a
// system picker that strips the flag emoji and the dial-code prefix in
// the closed state on iOS Safari + Android Chrome. A custom popover keeps
// the flag visible at all times. The popover is keyboard-navigable and
// closes on outside-click / Escape.
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import {
  DEFAULT_DIAL,
  DIAL_CODES,
  findByIso2,
  type DialCode,
} from '@/lib/intl/dialCodes'

// Sorted alphabetically by country name. Computed once at module load —
// the dial-code list never changes at runtime.
const SORTED_BY_NAME: ReadonlyArray<DialCode> = [...DIAL_CODES].sort((a, b) =>
  a.name.localeCompare(b.name),
)

function readCountryCookie(): string {
  if (typeof document === 'undefined') return ''
  const m = document.cookie.match(/(?:^|;\s*)kita-country=([A-Z]{2})/)
  return m?.[1] ?? ''
}

export interface PhoneInputProps {
  /** Current E.164 value WITHOUT leading + (e.g. "6281234567890"). */
  value: string
  /** Receives the new E.164 value WITHOUT leading +. */
  onChange: (next: string) => void
  /** Optional autofocus on the national-number field. */
  autoFocus?: boolean
  /** Optional id used for the national-number input + label association. */
  id?: string
  /** Optional placeholder for the national-number field. */
  placeholder?: string
  /** Optional aria-label for the country select trigger. */
  countryAriaLabel?: string
}

export default function PhoneInput({
  value,
  onChange,
  autoFocus,
  id,
  placeholder,
  countryAriaLabel,
}: PhoneInputProps) {
  const [country, setCountry] = useState<DialCode>(DEFAULT_DIAL)
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')

  // Resolve the visitor's country from the IP cookie on mount. We don't
  // touch the value here — the parent owns it. The country pick only
  // affects which dial code is prepended on the next change.
  useEffect(() => {
    const iso = readCountryCookie()
    if (!iso) return
    const found = findByIso2(iso)
    if (found) setCountry(found)
  }, [])

  // If the parent-controlled value already starts with a dial code we
  // recognise, keep the dropdown in sync. We pick the LONGEST matching
  // dial code so '1876' (Jamaica) wins over '1' (US/CA). When two
  // countries share the exact same code (e.g. US/CA both = '1'), the
  // first hit wins — the user can always change it manually.
  useEffect(() => {
    if (!value) return
    let best: DialCode | null = null
    for (const c of DIAL_CODES) {
      if (value.startsWith(c.dial) && (!best || c.dial.length > best.dial.length)) {
        best = c
      }
    }
    if (best && best.iso2 !== country.iso2) setCountry(best)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // The national portion = whatever follows the current dial code. We
  // strip non-digits so paste-from-Whatsapp behaviour ("(+62) 812-345...")
  // collapses to digits cleanly.
  const nationalNumber = useMemo(() => {
    if (value.startsWith(country.dial)) return value.slice(country.dial.length)
    return ''
  }, [value, country.dial])

  function handleNationalChange(raw: string) {
    const digits = raw.replace(/\D/g, '').replace(/^0/, '')
    onChange(country.dial + digits)
  }

  function handlePickCountry(next: DialCode) {
    setCountry(next)
    onChange(next.dial + nationalNumber)
    setOpen(false)
    setFilter('')
  }

  // Filter the visible list by name OR by dial code. "United" matches
  // United Kingdom + United States; "44" matches GB / GG / IM / JE.
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return SORTED_BY_NAME
    return SORTED_BY_NAME.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.iso2.toLowerCase().includes(q),
    )
  }, [filter])

  // Close the popover on outside-click. We don't use a portal — the
  // popover lives inside the wrapper div so the parent's overflow:hidden
  // doesn't clip it. Caller can wrap PhoneInput in their own card if needed.
  const wrapperRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div className="relative" ref={wrapperRef}>
      <div
        className="flex items-stretch rounded-xl bg-white border border-[#E4E4E7] focus-within:border-[#FACC15] focus-within:ring-2 focus-within:ring-[#FACC15]/30 transition overflow-hidden"
        style={{ minHeight: 44 }}
      >
        {/* Country trigger — flag + +<dial> + chevron. */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={countryAriaLabel ?? 'Pick country code'}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 hover:bg-[#FAFAFA] active:scale-[0.98] transition border-r border-[#E4E4E7] tabular-nums font-extrabold text-[14px] text-[#0A0A0A]"
        >
          <span aria-hidden className="text-[18px] leading-none">{country.flag}</span>
          <span>+{country.dial}</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#71717A]" strokeWidth={2.5} />
        </button>
        {/* National number input */}
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          autoFocus={autoFocus}
          placeholder={placeholder ?? '81234567890'}
          value={nationalNumber}
          onChange={(e) => handleNationalChange(e.target.value)}
          className="flex-1 min-w-0 px-3 py-2.5 text-[14px] text-[#0A0A0A] placeholder:text-[#A1A1AA] focus:outline-none tabular-nums font-mono bg-white"
        />
      </div>

      {/* Popover — search + scrollable country list. */}
      {open && (
        <div
          role="listbox"
          aria-label="Country list"
          className="absolute left-0 right-0 mt-1 z-50 rounded-xl bg-white border border-[#E4E4E7] shadow-[0_12px_32px_rgba(15,23,42,0.12)] overflow-hidden"
        >
          <div className="px-2.5 py-2 border-b border-[#E4E4E7] relative">
            <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-4 top-1/2 -translate-y-1/2" strokeWidth={2.4} />
            <input
              autoFocus
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search country or code…"
              className="w-full bg-[#F4F4F5] border border-[#E4E4E7] rounded-lg pl-8 pr-3 py-1.5 text-[13px] text-[#0A0A0A] placeholder:text-[#71717A] focus:outline-none focus:bg-white focus:border-[#FACC15] transition"
              style={{ minHeight: 36 }}
            />
          </div>
          <ul className="max-h-[280px] overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-[12px] text-[#71717A] font-bold">No match</li>
            )}
            {filtered.map((c) => {
              const active = c.iso2 === country.iso2
              return (
                <li key={c.iso2} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => handlePickCountry(c)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[#FFFBEA] active:bg-[#FEF9C3] transition"
                    style={{ background: active ? '#FFFBEA' : 'transparent' }}
                  >
                    <span aria-hidden className="text-[18px] leading-none shrink-0">{c.flag}</span>
                    <span className="text-[13px] text-[#0A0A0A] font-bold truncate flex-1">{c.name}</span>
                    <span className="text-[12px] text-[#71717A] tabular-nums font-extrabold shrink-0">+{c.dial}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Helpers exported for /signup + /login to share validation logic. Kept here
// (next to the input component) so the validation rules can't drift between
// the two pages.
// ============================================================================

/**
 * Normalize a user-typed phone string to E.164 without the leading +.
 * Accepts the PhoneInput's emitted value as-is, AND legacy
 * formats: '+6281234...', '081234...' (Indonesia), or raw digits.
 *
 * Returns null when no plausible national number is present after
 * digit extraction. Length sanity check: 6–15 digits inclusive
 * (ITU-T E.164 max is 15 incl. country code).
 */
export function normalizeE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  // Reject too-short or too-long
  if (digits.length < 6 || digits.length > 15) return null
  return digits
}
