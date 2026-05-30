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
      <span
        className="text-[12px] font-extrabold mt-1 leading-none drop-shadow-[0_1px_2px_rgba(255,255,255,0.55)]"
        style={{ color: '#0A0A0A' }}
      >
        {label}
      </span>
    </div>
  )
}
