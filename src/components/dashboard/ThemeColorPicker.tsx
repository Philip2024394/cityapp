'use client'
import { useState } from 'react'
import { Palette, X } from 'lucide-react'

// Theme color picker for provider profile pages (mig 0078 / 0087).
//
// Layout:
//   • Inline row: 4 quick presets + "Custom color" trigger.
//   • Trigger opens a LEFT side drawer with the full website palette —
//     11 hue rows (Pink, Rose, Purple, Violet, Blue, Cyan, Teal,
//     Emerald, Amber, Orange, Red) × 5 shades each (lightest → strongest).
//
// onChange receives the chosen hex (#RRGGBB) immediately.

const PRESETS: Array<{ label: string; value: string }> = [
  { label: 'Pink',   value: '#EC4899' },
  { label: 'Purple', value: '#9333EA' },
  { label: 'Coral',  value: '#F97316' },
  { label: 'Teal',   value: '#0D9488' },
]

// Comprehensive color palette — ordered by color-wheel position
// (warm → cool → neutral) so the swatches form a smooth rainbow.
// Each row: 5 shades (light → strongest) covering the most useful
// range for brand accent colors. Mono row at the end for neutrals.
const PALETTE: Array<{ name: string; shades: string[] }> = [
  // Warm reds / pinks
  { name: 'Red',     shades: ['#FECACA', '#FCA5A5', '#F87171', '#EF4444', '#DC2626'] },
  { name: 'Rose',    shades: ['#FECDD3', '#FDA4AF', '#FB7185', '#F43F5E', '#E11D48'] },
  { name: 'Pink',    shades: ['#FBCFE8', '#F9A8D4', '#F472B6', '#EC4899', '#DB2777'] },
  { name: 'Fuchsia', shades: ['#F5D0FE', '#F0ABFC', '#E879F9', '#D946EF', '#C026D3'] },
  // Purples / blues
  { name: 'Purple',  shades: ['#E9D5FF', '#D8B4FE', '#C084FC', '#A855F7', '#9333EA'] },
  { name: 'Violet',  shades: ['#DDD6FE', '#C4B5FD', '#A78BFA', '#8B5CF6', '#7C3AED'] },
  { name: 'Indigo',  shades: ['#C7D2FE', '#A5B4FC', '#818CF8', '#6366F1', '#4F46E5'] },
  { name: 'Blue',    shades: ['#BFDBFE', '#93C5FD', '#60A5FA', '#3B82F6', '#2563EB'] },
  { name: 'Sky',     shades: ['#BAE6FD', '#7DD3FC', '#38BDF8', '#0EA5E9', '#0284C7'] },
  { name: 'Cyan',    shades: ['#A5F3FC', '#67E8F9', '#22D3EE', '#06B6D4', '#0891B2'] },
  // Greens
  { name: 'Teal',    shades: ['#99F6E4', '#5EEAD4', '#2DD4BF', '#14B8A6', '#0D9488'] },
  { name: 'Emerald', shades: ['#A7F3D0', '#6EE7B7', '#34D399', '#10B981', '#059669'] },
  { name: 'Green',   shades: ['#BBF7D0', '#86EFAC', '#4ADE80', '#22C55E', '#16A34A'] },
  { name: 'Lime',    shades: ['#D9F99D', '#BEF264', '#A3E635', '#84CC16', '#65A30D'] },
  // Warm yellows / oranges / browns
  { name: 'Yellow',  shades: ['#FEF08A', '#FDE047', '#FACC15', '#EAB308', '#CA8A04'] },
  { name: 'Amber',   shades: ['#FDE68A', '#FCD34D', '#FBBF24', '#F59E0B', '#D97706'] },
  { name: 'Orange',  shades: ['#FED7AA', '#FDBA74', '#FB923C', '#F97316', '#EA580C'] },
  // Neutrals
  { name: 'Stone',   shades: ['#E7E5E4', '#D6D3D1', '#A8A29E', '#78716C', '#44403C'] },
  { name: 'Gray',    shades: ['#E5E7EB', '#D1D5DB', '#9CA3AF', '#6B7280', '#374151'] },
  { name: 'Slate',   shades: ['#E2E8F0', '#CBD5E1', '#94A3B8', '#64748B', '#334155'] },
  // Pure mono — black + white + true mid-gray
  { name: 'Mono',    shades: ['#FFFFFF', '#E5E7EB', '#9CA3AF', '#374151', '#0A0A0A'] },
]

export default function ThemeColorPicker({
  value, onChange,
}: {
  value: string | null
  onChange: (hex: string | null) => void
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const current = (value ?? '').toUpperCase()

  return (
    <div className="rounded-xl bg-white border border-gray-200 p-4 space-y-3 shadow-sm">
      <div>
        <div className="text-[12px] font-extrabold uppercase tracking-wider text-gray-900">
          Theme color
        </div>
        <p className="text-[12px] text-gray-500 leading-snug mt-0.5">
          Pilih 1 dari 4 warna preset atau buka palette untuk pilih sendiri.
          Warna ini muncul di hero text, tombol, dan badge di profile page Anda.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => {
          const on = current === p.value.toUpperCase()
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange(p.value)}
              className={`relative w-11 h-11 rounded-full transition active:scale-[0.95] ${on ? 'ring-2 ring-offset-2 ring-offset-white ring-gray-900' : 'ring-1 ring-gray-200'}`}
              style={{ background: p.value }}
              title={p.label}
              aria-label={`${p.label} preset`}
              aria-pressed={on}
            />
          )
        })}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-1.5 h-11 px-3 rounded-full bg-gray-50 border border-gray-200 text-gray-900 text-[12px] font-extrabold hover:bg-gray-100 active:scale-[0.97] transition"
        >
          <Palette className="w-4 h-4" strokeWidth={2.5} />
          More colors
        </button>
        {current && (
          <span
            className="inline-flex items-center gap-1.5 h-11 px-3 rounded-full bg-gray-50 border border-gray-200 text-gray-700 text-[12px] font-bold font-mono"
            title="Current theme color"
          >
            <span className="w-3 h-3 rounded-full" style={{ background: current }} />
            {current}
          </span>
        )}
        {current && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[12px] text-gray-500 hover:text-gray-700 underline"
          >
            Reset to default
          </button>
        )}
      </div>

      {/* LEFT-anchored slide drawer with the full palette */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-[60] flex"
          onClick={() => setDrawerOpen(false)}
          style={{ background: 'rgba(0,0,0,0.35)' }}
        >
          <div
            className="h-full w-[min(340px,90vw)] bg-white border-r border-gray-200 shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-[13px] font-extrabold uppercase tracking-wider text-gray-900">
                  Website Palette
                </div>
                <div className="text-[12px] text-gray-500 mt-0.5">Lightest → Strongest</div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close palette"
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
              >
                <X className="w-4 h-4 text-gray-900" strokeWidth={2.5} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {PALETTE.map((row) => (
                <div key={row.name}>
                  <div className="text-[12px] font-extrabold uppercase tracking-wider text-gray-600 mb-1.5">
                    {row.name}
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {row.shades.map((hex) => {
                      const on = current === hex.toUpperCase()
                      // White / very light swatches need a visible border so
                      // they don't disappear into the light drawer background.
                      const isLight = ['#FFFFFF','#FEF08A','#FDE68A','#FED7AA','#FECACA','#FECDD3','#FBCFE8','#F5D0FE','#E9D5FF','#DDD6FE','#C7D2FE','#BFDBFE','#BAE6FD','#A5F3FC','#99F6E4','#A7F3D0','#BBF7D0','#D9F99D','#E7E5E4','#E5E7EB','#E2E8F0'].includes(hex.toUpperCase())
                      return (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => { onChange(hex); setDrawerOpen(false) }}
                          className={`aspect-square rounded-md transition active:scale-[0.95] ${on ? 'ring-2 ring-offset-2 ring-offset-white ring-gray-900' : ''}`}
                          style={{
                            background: hex,
                            border: isLight ? '1px solid rgba(0,0,0,0.12)' : undefined,
                          }}
                          title={hex}
                          aria-label={`${row.name} ${hex}`}
                          aria-pressed={on}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
