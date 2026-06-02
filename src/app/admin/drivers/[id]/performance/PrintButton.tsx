'use client'

import { Printer } from 'lucide-react'

// Single-purpose client island: invokes window.print() so the admin can
// "Save as PDF" using the browser's native print dialog. No PDF library
// dependency — the print stylesheet on the page handles A4 formatting.

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-bold border transition"
      style={{
        minHeight: 44,
        background: '#FACC15',
        color: '#0A0A0A',
        borderColor: '#FACC15',
      }}
    >
      <Printer className="w-4 h-4" strokeWidth={2.5} />
      Print / Save as PDF
    </button>
  )
}
