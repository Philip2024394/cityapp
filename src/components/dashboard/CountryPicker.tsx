'use client'
import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { COUNTRIES, countryByCode, searchCountries, type Country } from '@/lib/data/countries'

// Country autocomplete — shows the resolved country in a button, opens
// a small popover with a search box + filtered hit list. Drives both
// the WhatsApp prefix chip + the currency symbol on every dashboard
// price tile (mig 0131). Owners type any country name or ISO code; the
// fallback is Indonesia for legacy rows that never set the column.

export default function CountryPicker({
  value, onChange,
}: {
  value: string | null
  onChange: (code: string) => void
}) {
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const current = countryByCode(value)
  const hits = searchCountries(query)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown',   onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown',   onKey)
    }
  }, [open])

  function pick(c: Country) {
    onChange(c.code)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 rounded-xl bg-white border border-gray-200 px-4 py-3 text-[14px] font-bold text-black hover:border-pink-300 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 min-h-[44px] transition"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-[18px] leading-none">{flagFor(current.code)}</span>
          <span className="truncate">{current.name}</span>
          <span className="text-[12px] font-mono text-black/55 ml-1 shrink-0">+{current.dial_code}</span>
          <span className="text-[12px] font-mono text-black/55 shrink-0">· {current.currency_symbol}</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-black/55 shrink-0 transition ${open ? 'rotate-180' : ''}`} strokeWidth={2.5} />
      </button>

      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 rounded-xl bg-white border border-gray-200 shadow-lg max-h-[320px] overflow-hidden flex flex-col">
          <div className="relative shrink-0 border-b border-gray-200">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/45" strokeWidth={2.5} />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country or ISO code…"
              className="w-full pl-9 pr-3 py-2.5 text-[13px] text-black placeholder:text-black/35 focus:outline-none"
            />
          </div>
          <div className="overflow-y-auto">
            {hits.length === 0 ? (
              <div className="text-[12px] text-black/55 px-4 py-3 leading-snug">
                No match. Try a different name or 2-letter ISO code.
              </div>
            ) : (
              hits.map((c) => {
                const on = c.code === current.code
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => pick(c)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-[13px] transition ${
                      on ? 'bg-pink-50 text-black' : 'hover:bg-gray-50 text-black/85'
                    }`}
                  >
                    <span className="text-[18px] leading-none shrink-0">{flagFor(c.code)}</span>
                    <span className="flex-1 min-w-0 truncate font-bold">{c.name}</span>
                    <span className="text-[12px] font-mono text-black/55 shrink-0">+{c.dial_code}</span>
                    <span className="text-[12px] font-mono text-black/55 shrink-0">{c.currency_symbol}</span>
                    {on && <Check className="w-3.5 h-3.5 text-pink-600 shrink-0" strokeWidth={3} />}
                  </button>
                )
              })
            )}
          </div>
          <div className="shrink-0 text-[11px] text-black/45 px-3 py-2 border-t border-gray-200 bg-gray-50">
            Showing {hits.length} of {COUNTRIES.length} countries
          </div>
        </div>
      )}
    </div>
  )
}

/** Emoji flag from an ISO 3166-1 alpha-2 code. Works for every country
 *  in the lookup since flags are unicode-derived from the same code. */
function flagFor(code: string): string {
  if (!code || code.length !== 2) return '🏳️'
  return String.fromCodePoint(
    0x1F1E6 - 65 + code.charCodeAt(0),
    0x1F1E6 - 65 + code.charCodeAt(1),
  )
}
