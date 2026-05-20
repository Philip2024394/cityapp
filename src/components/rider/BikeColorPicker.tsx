'use client'
import { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown, Palette } from 'lucide-react'
import { BIKE_COLORS, findColor, type BikeColor } from '@/data/bikeColors'

// ============================================================================
// BikeColorPicker — visual swatch grid for choosing bike colour.
//
// Behaviour:
//   • Tap the trigger → opens a popover with all 29 palette colours
//     (swatch chip + English label + Bahasa label)
//   • Picking a swatch sets the value and closes the popover
//   • "Other / custom" expands a free-text input — saves verbatim, so
//     unusual colours (chrome wrap, custom paint, brand-specific paint
//     names) still work
//
// Value contract: parent owns a plain string. We save the English
// canonical label for catalog entries, the raw free-text for customs.
// ============================================================================

type Props = {
  value: string
  onChange: (v: string) => void
  label?: string
}

export default function BikeColorPicker({ value, onChange, label = 'Color' }: Props) {
  const [open, setOpen] = useState(false)
  const [customMode, setCustomMode] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        setCustomMode(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const matched = findColor(value)
  const isCustom = value.trim().length > 0 && !matched

  function pick(c: BikeColor) {
    onChange(c.label)
    setOpen(false)
    setCustomMode(false)
  }

  return (
    <div ref={wrapRef} className="relative">
      <label className="label">{label}</label>

      {/* Trigger — shows current selection as a swatch chip + name */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input flex items-center gap-2.5 w-full text-left"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {matched ? (
          <Swatch color={matched} size={20} />
        ) : isCustom ? (
          <span
            aria-hidden
            className="inline-block rounded-full shrink-0 border border-white/15"
            style={{ width: 20, height: 20, background: 'rgba(255,255,255,0.08)' }}
          >
            <Palette className="w-3 h-3 m-1 text-muted" />
          </span>
        ) : (
          <span
            aria-hidden
            className="inline-block rounded-full shrink-0 border border-white/15"
            style={{ width: 20, height: 20, background: 'rgba(255,255,255,0.04)' }}
          />
        )}
        <span className="flex-1 min-w-0 truncate text-[14px] font-bold">
          {value || <span className="text-dim font-normal">Pick a colour</span>}
        </span>
        <ChevronDown className={'w-4 h-4 text-muted shrink-0 transition ' + (open ? 'rotate-180' : '')} strokeWidth={2.25} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 max-h-[60vh] overflow-y-auto rounded-xl z-30 p-3"
          style={{
            background: 'rgba(15,15,20,0.97)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Custom-input mode — replaces grid when activated */}
          {customMode ? (
            <div className="space-y-3">
              <div className="text-[12px] uppercase tracking-wider font-extrabold text-dim">
                Custom colour
              </div>
              <input
                className="input"
                placeholder="e.g. Chrome, Striped, Two-tone Red/Black"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                autoFocus
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setCustomMode(false); setOpen(false) }}
                  className="flex-1 p-2.5 rounded-xl font-extrabold text-[13px] active:scale-[0.99] transition"
                  style={{
                    background: 'linear-gradient(135deg, #FACC15, #EAB308)',
                    color: '#0A0A0A',
                    minHeight: 44,
                  }}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setCustomMode(false)}
                  className="p-2.5 px-4 rounded-xl font-bold text-[13px] text-muted active:scale-[0.99] transition"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    minHeight: 44,
                  }}
                >
                  Back
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                {BIKE_COLORS.map((c) => {
                  const selected = matched?.label === c.label
                  return (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => pick(c)}
                      role="option"
                      aria-selected={selected}
                      className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition active:scale-95"
                      style={{
                        background: selected ? 'rgba(250,204,21,0.12)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${selected ? 'rgba(250,204,21,0.45)' : 'rgba(255,255,255,0.08)'}`,
                        minHeight: 80,
                      }}
                    >
                      <Swatch color={c} size={32} ringClass={selected ? 'ring-2 ring-brand' : ''} />
                      <div className="text-center min-w-0 w-full">
                        <div className="text-[12px] font-extrabold leading-tight truncate">{c.label}</div>
                        <div className="text-[12px] text-dim leading-tight truncate">{c.labelId}</div>
                      </div>
                      {selected && <Check className="w-3 h-3 text-brand" strokeWidth={2.5} />}
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={() => setCustomMode(true)}
                className="mt-3 w-full flex items-center justify-center gap-2 p-2.5 rounded-xl font-bold text-[13px] transition active:scale-[0.99]"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px dashed rgba(255,255,255,0.18)',
                  color: 'rgba(255,255,255,0.78)',
                  minHeight: 44,
                }}
              >
                <Palette className="w-4 h-4" strokeWidth={2.25} />
                Other / custom colour
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Swatch({ color, size = 24, ringClass = '' }: { color: BikeColor; size?: number; ringClass?: string }) {
  const isGradient = color.swatch.startsWith('linear-gradient')
  return (
    <span
      aria-hidden
      className={'inline-block rounded-full shrink-0 border border-black/40 ' + ringClass}
      style={{
        width: size,
        height: size,
        background: isGradient ? color.swatch : undefined,
        backgroundColor: !isGradient ? color.swatch : undefined,
        // Two-tone — splits the swatch with the accent colour
        ...(color.swatchAccent
          ? { background: `linear-gradient(135deg, ${color.swatch} 0%, ${color.swatch} 50%, ${color.swatchAccent} 50%, ${color.swatchAccent} 100%)` }
          : {}),
        boxShadow: '0 1px 3px rgba(0,0,0,0.45) inset',
      }}
    />
  )
}
