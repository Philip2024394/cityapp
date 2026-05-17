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
  /** Optional right-side adornment (e.g. the dark-red GPS button). */
  rightSlot?: React.ReactNode
  /** Bias suggestions around this point (e.g. customer GPS). */
  near?: { lat: number; lng: number } | null
  /** Aria-label for the input. */
  ariaLabel?: string
}

// Free-text input with debounced Nominatim place-search suggestions.
// Worldwide coverage (no countrycodes filter) so it works in Indonesia
// AND any other market. Suggestions render in a dropdown ABOVE the
// input (the input lives in the bottom sheet so down would clip).
export default function PlaceAutocomplete({
  value, onChange, onSelect, placeholder, className, rightSlot, near, ariaLabel,
}: Props) {
  const [focused, setFocused] = useState(false)
  const { suggestions, loading } = usePlaceSearch(value, { near })
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
        <input
          className={className}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          aria-label={ariaLabel}
          autoComplete="off"
        />
        {rightSlot}
      </div>

      {showDropdown && (
        <div
          className="absolute left-0 right-0 bottom-full mb-1.5 rounded-xl overflow-hidden z-50"
          style={{
            background: 'rgba(10,10,12,0.96)',
            border: '1px solid rgba(250,204,21,0.25)',
            boxShadow: '0 -14px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)',
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
