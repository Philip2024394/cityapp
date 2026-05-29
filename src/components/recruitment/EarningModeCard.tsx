// Shared earning-mode card used by /drivers and /drivers/car recruitment pages.

import React from 'react'

export default function EarningModeCard({
  icon, title, subtitle, body,
}: {
  icon:     React.ReactNode
  title:    string
  subtitle: string
  body:     string
}) {
  return (
    <div className="rounded-2xl bg-white border-2 border-[#FACC15] p-5 shadow-[0_8px_24px_rgba(250,204,21,0.20)]">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{ background: '#0A0A0A', color: '#FACC15' }}
      >
        {icon}
      </div>
      <h3 className="text-[15px] sm:text-[16px] font-black leading-tight">{title}</h3>
      <div className="text-[11.5px] font-extrabold uppercase tracking-wider text-[#EAB308] mt-0.5">
        {subtitle}
      </div>
      <p className="mt-2 text-[12.5px] sm:text-[13px] text-black/70 leading-relaxed">{body}</p>
    </div>
  )
}
