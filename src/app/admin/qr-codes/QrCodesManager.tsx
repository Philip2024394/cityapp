'use client'
import { useRef, useState } from 'react'
import { Upload, Loader2, CheckCircle2, Eye, EyeOff, QrCode } from 'lucide-react'

type Row = {
  id: string
  label: string
  amount_idr: number
  image_url: string
  bank_name: string | null
  account_name: string | null
  account_number: string | null
  active: boolean
  notes: string | null
  created_at: string
}

const AMOUNTS = [
  { value: 38_000,  label: 'Rp 38.000 (Bulanan)' },
  { value: 350_000, label: 'Rp 350.000 (Tahunan)' },
] as const

export default function QrCodesManager({ initialRows }: { initialRows: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initialRows)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const fileRef = useRef<HTMLInputElement | null>(null)
  const [amount, setAmount] = useState<number>(38_000)
  const [label, setLabel] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [picked, setPicked] = useState<File | null>(null)

  function reset() {
    setLabel(''); setBankName(''); setAccountName(''); setAccountNumber('')
    setNotes(''); setPicked(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleUpload() {
    if (!picked) { setErr('Pilih file QR dulu.'); return }
    setErr(null); setMsg(null); setBusy(true)
    const form = new FormData()
    form.set('amount_idr', String(amount))
    form.set('image', picked)
    if (label.trim()) form.set('label', label.trim())
    if (bankName.trim()) form.set('bank_name', bankName.trim())
    if (accountName.trim()) form.set('account_name', accountName.trim())
    if (accountNumber.trim()) form.set('account_number', accountNumber.trim())
    if (notes.trim()) form.set('notes', notes.trim())
    try {
      const res = await fetch('/api/admin/qr-codes', { method: 'POST', body: form })
      const j = await res.json().catch(() => ({})) as { ok?: boolean; qr_code?: Row; error?: string }
      if (!res.ok || !j.ok || !j.qr_code) throw new Error(j?.error || `Upload gagal (${res.status})`)
      setRows((prev) => {
        // Deactivate any other active for this amount in local state too
        const next = prev.map((r) => r.amount_idr === j.qr_code!.amount_idr ? { ...r, active: false } : r)
        return [j.qr_code!, ...next]
      })
      reset()
      setMsg('QR uploaded + activated. Public QR di /rent/upgrade dan /tour/upgrade auto-update.')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload gagal.')
    } finally { setBusy(false) }
  }

  async function toggleActive(row: Row) {
    setErr(null); setMsg(null)
    try {
      const res = await fetch('/api/admin/qr-codes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, active: !row.active }),
      })
      const j = await res.json().catch(() => ({})) as { ok?: boolean; error?: string }
      if (!res.ok || !j.ok) throw new Error(j?.error || `Update gagal (${res.status})`)
      setRows((prev) => prev.map((r) => {
        if (r.id === row.id) return { ...r, active: !row.active }
        if (!row.active && r.amount_idr === row.amount_idr) return { ...r, active: false }
        return r
      }))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Update gagal.')
    }
  }

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <QrCode className="w-6 h-6 text-brand" /> QR Codes
        </h1>
        <p className="text-[12px] text-muted">
          Upload satu QR per amount (Rp 38.000 + Rp 350.000). Hanya 1 yang aktif per amount —
          upload yang baru otomatis nonaktifkan yang lama.
        </p>
      </header>

      <section className="card p-4 space-y-3">
        <div className="text-[13px] font-extrabold text-brand uppercase tracking-wider">Upload QR baru</div>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted">Amount</span>
          <select value={amount} onChange={(e) => setAmount(parseInt(e.target.value, 10))} className={inputClass}>
            {AMOUNTS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <FormField label="Label (opsional)" value={label} onChange={setLabel} placeholder="QRIS Bulanan" />
          <FormField label="Bank / Provider" value={bankName} onChange={setBankName} placeholder="QRIS Indonesia" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="Account name (opsional)" value={accountName} onChange={setAccountName} placeholder="StreetLocal Live" />
          <FormField label="Account number (opsional)" value={accountNumber} onChange={setAccountNumber} placeholder="•••• 4321" />
        </div>
        <FormField label="Catatan internal (opsional)" value={notes} onChange={setNotes} placeholder="QR utama, expire 2026" />

        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => setPicked(e.target.files?.[0] ?? null)} />

        {picked ? (
          <div className="rounded-xl p-2 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}>
            <img src={URL.createObjectURL(picked)} alt="preview" className="w-16 h-16 object-contain bg-white rounded-lg" />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-extrabold text-ink truncate">{picked.name}</div>
              <div className="text-[11px] text-muted">{(picked.size / 1024).toFixed(0)} KB</div>
            </div>
            <button type="button" onClick={() => { setPicked(null); if (fileRef.current) fileRef.current.value = '' }} className="text-[12px] text-muted hover:text-ink">Ganti</button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} className="w-full aspect-[16/9] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition hover:bg-white/5" style={{ borderColor: 'rgba(250,204,21,0.45)' }}>
            <Upload className="w-6 h-6 text-brand" />
            <div className="text-[13px] font-extrabold text-ink">Pilih image QR</div>
            <div className="text-[11px] text-muted">JPG / PNG / WebP · max 5MB</div>
          </button>
        )}

        {err && <div className="rounded-xl p-3 text-[12px] text-red-200 font-bold" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.40)' }}>{err}</div>}
        {msg && <div className="rounded-xl p-3 text-[12px] text-green-200 font-bold" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.40)' }}>{msg}</div>}

        <button type="button" onClick={handleUpload} disabled={busy || !picked} className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-brand to-brand2 text-bg font-extrabold text-[13px] uppercase tracking-wider border border-black/85 shadow-[0_4px_12px_rgba(250,204,21,0.30)] active:scale-[0.99] disabled:opacity-60">
          {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</> : <><CheckCircle2 className="w-4 h-4" /> Upload + activate</>}
        </button>
      </section>

      <section className="space-y-2">
        <div className="text-[13px] font-extrabold text-muted uppercase tracking-wider">All QR codes</div>
        {rows.length === 0 ? (
          <div className="card p-6 text-center text-[12px] text-muted">Belum ada QR. Upload yang pertama di atas.</div>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="card p-3 flex items-center gap-3">
              <img src={r.image_url} alt={r.label} className="w-14 h-14 object-contain bg-white rounded-lg shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-extrabold text-ink truncate">{r.label}</span>
                  {r.active && <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(34,197,94,0.25)', color: '#22c55e' }}>active</span>}
                </div>
                <div className="text-[11px] text-muted">
                  Rp {r.amount_idr.toLocaleString('id-ID')}
                  {r.bank_name ? ` · ${r.bank_name}` : ''}
                </div>
              </div>
              <button type="button" onClick={() => toggleActive(r)} className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider" style={{ background: r.active ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #FACC15, #EAB308)', color: r.active ? 'rgba(255,255,255,0.8)' : '#0a0a0c', border: '1px solid rgba(0,0,0,0.85)' }}>
                {r.active ? <><EyeOff className="w-3 h-3" /> Deactivate</> : <><Eye className="w-3 h-3" /> Activate</>}
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  )
}

const inputClass = 'w-full bg-bg text-ink placeholder:text-white/40 border border-black/85 rounded-xl px-3 py-2.5 text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-bg/40 transition'

function FormField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted">{label}</span>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputClass} />
    </label>
  )
}
