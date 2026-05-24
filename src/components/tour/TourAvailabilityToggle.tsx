'use client'
import { useState } from 'react'

// Three-state availability switcher for the tour-guide dashboard.
// Mirrors the massage dashboard pattern: online (green pulse on the
// marketplace card) / busy (orange) / offline (orange + hidden).
// Refuses to flip online if the listing isn't approved yet.

type Availability = 'online' | 'busy' | 'offline'

export default function TourAvailabilityToggle({
  initial,
  approved,
}: {
  initial: Availability
  approved: boolean
}) {
  const [value, setValue] = useState<Availability>(initial)
  const [saving, setSaving] = useState(false)

  async function set(next: Availability) {
    if (saving) return
    const prev = value
    setValue(next)
    setSaving(true)
    try {
      const r = await fetch('/api/tour-guide/me/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: next }),
      })
      const j = await r.json() as { ok?: boolean; error?: string }
      if (!j.ok) {
        setValue(prev)
        alert(j.error === 'not_approved'
          ? 'Listing is not yet approved by admin. You can go online once the verification is complete.'
          : 'Could not update availability.')
      }
    } catch {
      setValue(prev)
      alert('Network error — could not update availability.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-extrabold uppercase tracking-wider text-brand">
        Availability
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(['online','busy','offline'] as const).map((opt) => {
          const active = value === opt
          const disabled = saving || (opt === 'online' && !approved)
          return (
            <button
              key={opt}
              onClick={() => set(opt)}
              disabled={disabled}
              className={`rounded-xl px-3 py-2.5 text-[12px] font-extrabold uppercase tracking-wider transition border ${
                active
                  ? 'bg-brand text-bg border-brand'
                  : 'bg-black/40 text-ink/80 border-white/15 hover:bg-white/5'
              } ${disabled && !active ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {opt === 'online' ? 'Online' : opt === 'busy' ? 'Busy' : 'Offline'}
            </button>
          )
        })}
      </div>
      <p className="text-[11px] text-muted leading-snug">
        Online = pulsing green dot on the marketplace card. Busy / Offline = orange dot.
        {!approved && <span className="block mt-1 text-yellow-300">Awaiting admin approval — Online unlocks after verification.</span>}
      </p>
    </div>
  )
}
