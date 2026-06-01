'use client'
import type React from 'react'

export default function HeroServiceIcon({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; color?: string }>
  label: string
}) {
  return (
    <div className="flex flex-col items-center" style={{ minWidth: 56 }}>
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{
          background: 'rgba(255,255,255,0.92)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.20)',
        }}
      >
        <Icon className="w-5 h-5" strokeWidth={2.25} color="#0A0A0A" />
      </div>
      {/* White text with stacked dark text-shadow so the label reads
          against ANY hero image — light beach, dark mountain, etc. */}
      <span
        className="text-[12px] font-extrabold mt-1 leading-none"
        style={{
          color: '#FFFFFF',
          textShadow: '0 1px 3px rgba(0,0,0,0.75), 0 1px 2px rgba(0,0,0,0.85)',
        }}
      >
        {label}
      </span>
    </div>
  )
}
