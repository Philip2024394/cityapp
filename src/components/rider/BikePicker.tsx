'use client'
import { useMemo, useState, useEffect, useRef } from 'react'
import { ChevronDown, Search, Check } from 'lucide-react'
import { BIKE_MAKES, BIKE_MODELS, type BikeMake } from '@/data/bikeCatalog'

// ============================================================================
// BikePicker — cascading Make → Model combobox for Indonesian motorbikes.
//
// Flow:
//   1. Driver types or picks a Make from the dropdown
//   2. Model dropdown shows only models for that Make
//   3. Free-text entry is preserved — if the typed text doesn't match a
//      known option we still save it. Picks for rare/imported bikes still
//      work; catalog is for fast selection, not a closed allow-list.
//
// Renders two stacked combobox fields. Each behaves as:
//   • Type to filter
//   • Tap chevron to open the full dropdown
//   • Tap an option to select it
//   • Click outside to close
// ============================================================================

type Props = {
  make: string
  model: string
  onChange: (next: { make: string; model: string }) => void
}

export default function BikePicker({ make, model, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Combobox
        label="Make"
        placeholder="Honda"
        value={make}
        options={[...BIKE_MAKES]}
        onChange={(v) => {
          // If make changes, clear the model (it likely no longer fits).
          if (v !== make) onChange({ make: v, model: '' })
          else onChange({ make: v, model })
        }}
      />
      <Combobox
        label="Model"
        placeholder="BeAT"
        value={model}
        // Use the catalog list for the picked make, falling back to empty
        // (free-text only) for unknown makes.
        options={make && (BIKE_MODELS[make as BikeMake] ?? null)
          ? [...BIKE_MODELS[make as BikeMake]]
          : []}
        onChange={(v) => onChange({ make, model: v })}
      />
    </div>
  )
}

// ─── Generic Combobox ─────────────────────────────────────────────────
function Combobox({
  label,
  placeholder,
  value,
  options,
  onChange,
}: {
  label: string
  placeholder: string
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Close on outside-click. Standard popover pattern.
  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  // Filter options by the current value (substring match, case-insensitive).
  // When no typed value, show all. When a typed value is exactly equal to
  // an option, still show the full list so the driver can switch.
  const filtered = useMemo(() => {
    if (!value.trim() || options.includes(value)) return options
    const q = value.toLowerCase()
    return options.filter((o) => o.toLowerCase().includes(q))
  }, [value, options])

  const hasOptions = options.length > 0

  return (
    <div ref={wrapRef} className="relative">
      <label className="label">{label}</label>
      <div className="relative">
        <input
          className="input pr-10"
          placeholder={placeholder}
          value={value}
          onChange={(e) => { onChange(e.target.value); if (!open) setOpen(true) }}
          onFocus={() => hasOptions && setOpen(true)}
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {hasOptions && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle options"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md flex items-center justify-center text-muted hover:text-ink transition"
          >
            <ChevronDown className={'w-4 h-4 transition ' + (open ? 'rotate-180' : '')} strokeWidth={2.25} />
          </button>
        )}
      </div>

      {open && hasOptions && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 max-h-64 overflow-y-auto rounded-xl z-30"
          style={{
            background: 'rgba(15,15,20,0.97)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {filtered.length === 0 ? (
            <div className="p-3 text-[12px] text-dim flex items-center gap-2">
              <Search className="w-3.5 h-3.5" />
              No match — your typed text will still save
            </div>
          ) : (
            filtered.map((opt) => {
              const selected = opt === value
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false) }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-[13px] font-bold text-ink hover:bg-white/5 transition"
                  style={selected ? { background: 'rgba(250,204,21,0.10)', color: '#FACC15' } : undefined}
                  role="option"
                  aria-selected={selected}
                >
                  <span>{opt}</span>
                  {selected && <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
