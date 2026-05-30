'use client'

const TEXT_INK    = '#0A0A0A'
const TEXT_SECOND = '#52525B'
const BORDER      = '#E4E4E7'
const INPUT_BG    = '#F4F4F5'

// Plain typed field — no autosuggest, no geocoding (phase-1 scope).
// 44px tap target.
export default function BookingTextField({
  label, value, onChange, placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <label className="block">
      <span
        className="block text-[11px] font-extrabold uppercase tracking-wider mb-1"
        style={{ color: TEXT_SECOND }}
      >
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl px-3 text-[14px] focus:outline-none"
        style={{
          minHeight: 44,
          background: INPUT_BG,
          border: `1px solid ${BORDER}`,
          color: TEXT_INK,
        }}
      />
    </label>
  )
}
