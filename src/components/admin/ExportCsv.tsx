'use client'

// ============================================================================
// ExportCsv — admin-only CSV download button (Excel-ready)
// ----------------------------------------------------------------------------
// Reusable across admin tables. Consumer passes the rows + column mapping;
// component handles RFC-4180 escaping, CSV-injection neutralisation
// (=,+,-,@ prefix), UTF-8 BOM for Excel, timestamped filename, blob URL.
//
// Why CSV and not native .xlsx (audit L2 advisor call):
//   - CSV with the UTF-8 BOM prefix is what Excel calls "Excel-ready":
//     opens directly via double-click, auto-detects encoding, preserves
//     accented characters (Café, São) without the import wizard.
//   - True .xlsx (OOXML) is a zip-of-XML — requires SheetJS (~400 KB) or
//     JSZip (~100 KB). Not worth the bundle cost for an admin nice-to-
//     have when CSV already does the job.
//   - SpreadsheetML 2003 .xml is a third option but modern Excel shows a
//     compatibility warning on open. Rejected for the same reason.
//   - If you actually need formulas / multi-sheet / formatting in a
//     specific export later, add an /api/admin/export/xlsx server route
//     with SheetJS scoped to that single use case rather than expanding
//     the admin bundle.
//
// PII note: callers are admin-only (RLS + middleware gate /admin/*). The
// component itself adds no extra access controls — it serialises whatever
// rows the server already chose to render. Keep that contract intact.
//
// Style: matches the brand yellow filter pill (admin/members FilterPill).
// 44px tap target. 13px text.
// ============================================================================

import { useState } from 'react'

export type ExportColumn<T> = {
  /** CSV header label. */
  label: string
  /** Reader: row → cell value (string|number|boolean|null|undefined). */
  get: (row: T) => string | number | boolean | null | undefined
}

export type ExportCsvProps<T> = {
  rows: ReadonlyArray<T>
  columns: ReadonlyArray<ExportColumn<T>>
  /** Filename stem; component appends `-YYYYMMDD-HHmm.csv`. */
  filename: string
  /** Button label. Defaults to "Export CSV". */
  label?: string
  /** Disabled when there are no rows. */
  disabled?: boolean
}

const CSV_INJECTION_PREFIXES = new Set(['=', '+', '-', '@'])

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  let str = String(value)
  // Neutralise CSV injection — Excel/Sheets evaluate cells starting with
  // these characters as formulas. Prefixing with a single quote keeps the
  // displayed text identical but defangs the formula.
  if (str.length > 0 && CSV_INJECTION_PREFIXES.has(str[0]!)) {
    str = `'${str}`
  }
  // RFC 4180: wrap in quotes if cell contains comma/quote/newline; double
  // any embedded quotes.
  if (/[",\r\n]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function buildCsv<T>(rows: ReadonlyArray<T>, columns: ReadonlyArray<ExportColumn<T>>): string {
  const lines: string[] = []
  lines.push(columns.map((c) => escapeCell(c.label)).join(','))
  for (const row of rows) {
    lines.push(columns.map((c) => escapeCell(c.get(row))).join(','))
  }
  return lines.join('\r\n')
}

function timestampSuffix(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
}

export default function ExportCsv<T>({
  rows,
  columns,
  filename,
  label = 'Export CSV',
  disabled,
}: ExportCsvProps<T>) {
  const [downloading, setDownloading] = useState(false)
  const isDisabled = disabled || rows.length === 0 || downloading

  function handleClick() {
    if (isDisabled) return
    setDownloading(true)
    try {
      const csv = buildCsv(rows, columns)
      // UTF-8 BOM so Excel auto-detects encoding for accented chars (Indonesia
      // names like "Café", "São", etc.).
      const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}-${timestampSuffix()}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      title="UTF-8 BOM — opens directly in Excel + Google Sheets, no import wizard"
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-bold border transition"
      style={{
        minHeight: 44,
        background: isDisabled ? 'rgba(255,255,255,0.04)' : '#FACC15',
        color: isDisabled ? 'rgba(255,255,255,0.45)' : '#0A0A0A',
        borderColor: isDisabled ? 'rgba(255,255,255,0.10)' : '#FACC15',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
      }}
      aria-label={`${label} (${rows.length} rows). Opens in Excel.`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      {downloading ? 'Preparing…' : label}
      <span className="text-[11px] opacity-70">{rows.length}</span>
    </button>
  )
}
