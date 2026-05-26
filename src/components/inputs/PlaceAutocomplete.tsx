'use client'
import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { usePlaceSearch, type PlaceSuggestion } from '@/hooks/usePlaceSearch'

type Props = {
  value: string
  onChange: (label: string) => void
  /** Called when the user picks a suggestion — provides label + coords. */
  onSelect: (suggestion: PlaceSuggestion) => void
  placeholder?: string
  className?: string
  /** Optional left-side adornment. */
  leftSlot?: React.ReactNode
  /** Optional right-side adornment (e.g. the dark-red GPS button). */
  rightSlot?: React.ReactNode
  /** Bias suggestions around this point (e.g. customer GPS). */
  near?: { lat: number; lng: number } | null
  /** Restrict suggestions to these ISO-3166 country codes (e.g. ['id']).
   *  Empty / undefined = global. Wire to the user's detected country
   *  so they only see local results. */
  countryCodes?: string[]
  /** Aria-label for the input. */
  ariaLabel?: string
  /** Maximum number of suggestions to render in the dropdown. */
  maxResults?: number
  /** When true, focusing the input wipes the current value so the user
   *  can type their address from scratch (placeholder reappears, caret
   *  blinks). Default false preserves the select-all-on-focus behaviour
   *  that lets form-edit surfaces tweak an existing value. */
  clearOnFocus?: boolean
  /** Which way the suggestions dropdown opens. Default 'up' — for the
   *  bottom-sheet location where opening down would clip below the
   *  viewport. Pass 'down' when the input sits NEAR THE TOP of the
   *  page (e.g. the new pickup card above the map on /cari). */
  dropdownDirection?: 'up' | 'down'
}

// Free-text input with debounced Nominatim place-search suggestions.
// Worldwide coverage (no countrycodes filter) so it works in Indonesia
// AND any other market. Suggestions render in a dropdown ABOVE the
// input (the input lives in the bottom sheet so down would clip).
export default function PlaceAutocomplete({
  value, onChange, onSelect, placeholder, className, leftSlot, rightSlot, near, countryCodes, ariaLabel, maxResults, clearOnFocus,
  dropdownDirection = 'up',
}: Props) {
  const [focused, setFocused] = useState(false)
  const { suggestions: rawSuggestions, loading } = usePlaceSearch(value, { near, countryCodes })
  const suggestions = maxResults ? rawSuggestions.slice(0, maxResults) : rawSuggestions
  const wrapRef = useRef<HTMLDivElement>(null)

  // Close the dropdown when clicking outside the wrapper. Pointerdown
  // (not click) so the dropdown closes BEFORE other handlers run.
  useEffect(() => {
    if (!focused) return
    function onDown(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setFocused(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [focused])

  const showDropdown = focused && value.trim().length >= 3 && (loading || suggestions.length > 0)

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex items-stretch gap-1.5">
        {leftSlot}
        <input
          className={className}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => {
            setFocused(true)
            if (clearOnFocus) {
              // Wipe the value so the placeholder reappears and the caret
              // blinks in an empty field — the user types their address
              // from scratch. Modern maps-app pattern (Google/Uber/Grab).
              if (e.currentTarget.value) onChange('')
            } else if (e.currentTarget.value) {
              // Highlight any existing value so the next keystroke replaces
              // it — saves the user a manual clear when editing a pickup
              // they previously set on a form surface.
              e.currentTarget.select()
            }
          }}
          aria-label={ariaLabel}
          autoComplete="off"
        />
        {rightSlot}
      </div>

      {showDropdown && (
        <div
          className={
            'absolute left-0 right-0 rounded-xl overflow-hidden z-50 ' +
            (dropdownDirection === 'down' ? 'top-full mt-1.5' : 'bottom-full mb-1.5')
          }
          style={{
            background: 'rgba(10,10,12,0.96)',
            border: '1px solid rgba(250,204,21,0.25)',
            boxShadow:
              dropdownDirection === 'down'
                ? '0 14px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)'
                : '0 -14px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)',
            backdropFilter: 'blur(18px) saturate(1.3)',
            WebkitBackdropFilter: 'blur(18px) saturate(1.3)',
          }}
        >
          {loading && suggestions.length === 0 && (
            <div className="px-3 py-2.5 text-[12px] text-dim font-bold">Searching…</div>
          )}
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onPointerDown={(e) => e.preventDefault()}  // keep input focused so onSelect can run before blur
              onClick={() => {
                onSelect(s)
                setFocused(false)
              }}
              className="w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-white/5 active:bg-white/10 transition border-b border-line/30 last:border-b-0"
            >
              <MapPin className="w-4 h-4 text-brand shrink-0 mt-0.5" />
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-extrabold text-ink truncate">{s.label}</span>
                <span className="block text-[11px] text-dim truncate">{s.detail}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
