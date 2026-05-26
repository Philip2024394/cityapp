'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  ChevronLeft, CheckCircle2, Circle, Scale, AlertCircle,
  CalendarClock, Shield, Siren, ChevronRight, Loader2,
} from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import DashboardNav from '@/components/layout/DashboardNav'

// What a IndoCity subscriber needs to operate LEGALLY as an
// independent motorcycle courier in Indonesia. A self-check list —
// IndoCity does NOT enforce these (verifying compliance would shift
// us toward employer-like control, contrary to our software-directory
// posture under Permenhub PM 12/2019).
//
// Sources cited inline: UU 22/2009 (Lalu Lintas dan Angkutan Jalan),
// UU 24/2011 (SJSN), UU 7/2021 (Harmonisasi Peraturan Perpajakan),
// UU 27/2022 (Pelindungan Data Pribadi), PP 44/2015 (BPJS BPU),
// Perda Bali 5/2020 + Permenparekraf 8/2021 (Pramuwisata).
// Last reviewed: 2026-05-21.

type RequirementId =
  | 'ktp' | 'sim-c' | 'stnk' | 'pkb' | 'helmet' | 'headlights'
  | 'bpjs-kes' | 'bpjs-tk' | 'insurance' | 'jaket' | 'whatsapp-business'
  | 'npwp' | 'nib' | 'pramuwisata' | 'pdp'

const REQUIREMENTS: Array<{
  id: RequirementId
  category: 'Wajib menurut hukum' | 'Sangat disarankan' | 'Profesional (opsional)'
  title: string
  desc: string
  fine?: string
  link?: { label: string; href: string }
}> = [
  // ─── Wajib menurut hukum ───────────────────────────────────────
  { id: 'ktp', category: 'Wajib menurut hukum',
    title: 'KTP — Kartu Tanda Penduduk',
    desc: 'KTP berlaku dan selalu dibawa. Identitas dasar — kamu tidak bisa mengurus SIM C, NPWP, atau BPJS tanpa ini.',
    link: { label: 'dukcapil.kemendagri.go.id', href: 'https://www.dukcapil.kemendagri.go.id' } },
  { id: 'sim-c', category: 'Wajib menurut hukum',
    title: 'SIM C — Surat Izin Mengemudi sepeda motor',
    desc: 'Berkendara tanpa SIM C melanggar UU 22/2009 dan menggugurkan setiap klaim asuransi pihak ketiga.',
    fine: 'Pasal 281 — maks. Rp 1.000.000 atau 4 bulan kurungan',
    link: { label: 'korlantas.polri.go.id', href: 'https://www.korlantas.polri.go.id' } },
  { id: 'stnk', category: 'Wajib menurut hukum',
    title: 'STNK — Surat Tanda Nomor Kendaraan',
    desc: 'STNK harus aktif dan dibawa saat berkendara (UU 22/2009 Pasal 70).',
    fine: 'Pasal 288 ayat (1) — maks. Rp 500.000 atau 2 bulan kurungan' },
  { id: 'pkb', category: 'Wajib menurut hukum',
    title: 'PKB — Pajak Kendaraan Bermotor aktif',
    desc: 'Pajak tahunan harus dibayar tepat waktu. Jatuh tempo tertera di STNK. PKB lewat = kendaraan dianggap tidak terdaftar.',
    fine: 'Pasal 288 — sama dengan pelanggaran STNK' },
  { id: 'helmet', category: 'Wajib menurut hukum',
    title: 'Helm Standar Nasional Indonesia (SNI)',
    desc: 'Pengemudi dan penumpang wajib mengenakan helm ber-SNI (UU 22/2009 Pasal 106 ayat 8).',
    fine: 'Pasal 291 — maks. Rp 250.000 atau 1 bulan kurungan (per orang)' },
  { id: 'headlights', category: 'Wajib menurut hukum',
    title: 'Lampu utama menyala (siang dan malam)',
    desc: 'Lampu utama wajib menyala sepanjang berkendara (UU 22/2009 Pasal 107 ayat 2). Termasuk pelanggaran paling sering ditilang.',
    fine: 'Pasal 293 ayat (2) — maks. Rp 100.000 atau 15 hari kurungan' },
  { id: 'bpjs-kes', category: 'Wajib menurut hukum',
    title: 'BPJS Kesehatan',
    desc: 'Kepesertaan wajib bagi setiap warga negara (UU 24/2011 SJSN). Untuk pekerja mandiri: kelas PBPU (Peserta Bukan Penerima Upah).',
    link: { label: 'bpjs-kesehatan.go.id', href: 'https://www.bpjs-kesehatan.go.id' } },

  // ─── Sangat disarankan ───────────────────────────────────────
  { id: 'bpjs-tk', category: 'Sangat disarankan',
    title: 'BPJS Ketenagakerjaan — skema BPU',
    desc: 'PP 44/2015 memungkinkan driver mandiri terdaftar di skema Bukan Penerima Upah. Mulai dari ~Rp 16.800/bulan untuk Jaminan Kecelakaan Kerja + Jaminan Kematian. Satu-satunya proteksi pendapatan jika cedera.',
    link: { label: 'bpjsketenagakerjaan.go.id', href: 'https://www.bpjsketenagakerjaan.go.id' } },
  { id: 'insurance', category: 'Sangat disarankan',
    title: 'Asuransi kecelakaan pribadi',
    desc: 'Jasa Raharja (otomatis lewat SWDKLLJ di STNK) hanya menanggung pihak ketiga, bukan kehilangan pendapatan kamu sendiri. Tambah polis komersial (Allianz, Axa Mandiri, Sompo) ~Rp 50–100.000/tahun untuk proteksi income.' },
  { id: 'jaket', category: 'Sangat disarankan',
    title: 'Perlengkapan keselamatan',
    desc: 'Jaket riding, sarung tangan, sepatu tertutup. Untuk kerja malam: rompi reflektif. Lebih melindungi nyawa kamu daripada paparan hukum.' },
  { id: 'pdp', category: 'Sangat disarankan',
    title: 'Privasi data customer — UU 27/2022 PDP',
    desc: 'Saat menyimpan kontak customer di Customer Book atau menjalankan kampanye broadcast, kamu menjadi pengendali data. Aturan minimum: minta izin sebelum simpan, hapus saat diminta, jangan jual ke pihak ketiga.',
    link: { label: 'jdih.kominfo.go.id', href: 'https://jdih.kominfo.go.id' } },
  { id: 'whatsapp-business', category: 'Sangat disarankan',
    title: 'WhatsApp Business',
    desc: 'Aplikasi gratis dengan profil bisnis, balasan cepat, dan label percakapan. Memberikan kesan profesional dan jam operasional yang jelas.',
    link: { label: 'business.whatsapp.com', href: 'https://business.whatsapp.com' } },

  // ─── Profesional (opsional) ──────────────────────────────────
  { id: 'npwp', category: 'Profesional (opsional)',
    title: 'NPWP — Nomor Pokok Wajib Pajak',
    desc: 'Wajib jika penghasilan tahunan melebihi PTKP (Rp 54.000.000/tahun untuk TK0, Rp 58.500.000 untuk K0). Berdasar UU 7/2021 (HPP), UMKM dapat memakai PPh Final 0,5% — tarif sederhana dan rendah.',
    link: { label: 'pajak.go.id', href: 'https://www.pajak.go.id' } },
  { id: 'nib', category: 'Profesional (opsional)',
    title: 'NIB — Nomor Induk Berusaha',
    desc: 'Diterbitkan via OSS (Online Single Submission). Gratis, ~30 menit online. Mengakui kamu sebagai usaha mikro resmi — diperlukan untuk membuka rekening bisnis dan kredit supplier.',
    link: { label: 'oss.go.id', href: 'https://oss.go.id' } },
  { id: 'pramuwisata', category: 'Profesional (opsional)',
    title: 'Pramuwisata — khusus driver tour di Bali',
    desc: 'Jika kamu memandu wisatawan (bukan sekadar mengantar), Perda Bali 5/2020 dan Permenparekraf 8/2021 mewajibkan kartu Pramuwisata Madya/Muda dari Dinas Pariwisata. Lewati jika hanya menjalankan transport.',
    link: { label: 'disparda.baliprov.go.id', href: 'https://disparda.baliprov.go.id' } },
]

export default function DashboardLegalPage() {
  // Rider's self-check state — purely client-side localStorage. IndoCity
  // does NOT verify these. Acting as a checker (and gating subscription
  // on them) would shift us toward employer-like control of subscribers
  // contrary to the platform's directory-only posture (PM 12/2019).
  const [checked, setChecked] = useState<Set<RequirementId>>(new Set())

  function toggle(id: RequirementId) {
    const next = new Set(checked)
    if (next.has(id)) next.delete(id); else next.add(id)
    setChecked(next)
  }

  const lawDone   = REQUIREMENTS.filter(r => r.category === 'Wajib menurut hukum').filter(r => checked.has(r.id)).length
  const lawTotal  = REQUIREMENTS.filter(r => r.category === 'Wajib menurut hukum').length

  // Renewal calendar — driver-entered dates for SIM C, STNK, PKB, BPJS,
  // Pramuwisata. Each field is independent; driver fills in whichever
  // they have. Auto-loaded from /api/driver-renewals on mount.
  type Renewals = {
    sim_c_expires_on: string | null
    stnk_expires_on: string | null
    pkb_due_on: string | null
    bpjs_kes_paid_until: string | null
    bpjs_tk_paid_until: string | null
    pramuwisata_expires_on: string | null
  }
  const EMPTY_RENEWALS: Renewals = {
    sim_c_expires_on: null,
    stnk_expires_on: null,
    pkb_due_on: null,
    bpjs_kes_paid_until: null,
    bpjs_tk_paid_until: null,
    pramuwisata_expires_on: null,
  }
  const [renewals, setRenewals] = useState<Renewals>(EMPTY_RENEWALS)
  const [renewalsLoading, setRenewalsLoading] = useState(true)
  const [renewalsSaving, setRenewalsSaving]   = useState(false)
  const [renewalsSaved, setRenewalsSaved]     = useState(false)
  const [renewalsErr, setRenewalsErr]         = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/driver-renewals')
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return
        if (j?.row) {
          setRenewals({
            sim_c_expires_on:       j.row.sim_c_expires_on       ?? null,
            stnk_expires_on:        j.row.stnk_expires_on        ?? null,
            pkb_due_on:             j.row.pkb_due_on             ?? null,
            bpjs_kes_paid_until:    j.row.bpjs_kes_paid_until    ?? null,
            bpjs_tk_paid_until:     j.row.bpjs_tk_paid_until     ?? null,
            pramuwisata_expires_on: j.row.pramuwisata_expires_on ?? null,
          })
        }
        setRenewalsLoading(false)
      })
      .catch(() => { setRenewalsLoading(false) })
    return () => { cancelled = true }
  }, [])

  async function saveRenewals() {
    setRenewalsErr(null); setRenewalsSaved(false); setRenewalsSaving(true)
    try {
      const res = await fetch('/api/driver-renewals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(renewals),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setRenewalsErr(j.error || 'Save failed'); return }
      setRenewalsSaved(true)
      setTimeout(() => setRenewalsSaved(false), 2000)
    } finally {
      setRenewalsSaving(false)
    }
  }

  function setRenewalDate(field: keyof Renewals, v: string) {
    setRenewals((r) => ({ ...r, [field]: v || null }))
    setRenewalsSaved(false)
  }

  // Computed status for each renewal date: red < 14 days, amber < 30,
  // green otherwise; "expired" for past-due. Returns null if no date.
  function daysToGo(iso: string | null): { days: number; tone: 'expired'|'red'|'amber'|'green' } | null {
    if (!iso) return null
    const now = new Date()
    const target = new Date(iso + 'T00:00:00')
    const days = Math.ceil((target.getTime() - now.getTime()) / 86_400_000)
    if (days < 0)    return { days, tone: 'expired' }
    if (days <= 14)  return { days, tone: 'red' }
    if (days <= 30)  return { days, tone: 'amber' }
    return { days, tone: 'green' }
  }

  const RENEWAL_FIELDS: Array<{ key: keyof Renewals; label: string; hint: string }> = [
    { key: 'sim_c_expires_on',       label: 'SIM C habis',               hint: 'Perpanjang setiap 5 tahun' },
    { key: 'stnk_expires_on',        label: 'STNK habis',                hint: 'Perpanjangan STNK — setiap 5 tahun' },
    { key: 'pkb_due_on',             label: 'PKB jatuh tempo',           hint: 'Pajak tahunan kendaraan (tertera di STNK)' },
    { key: 'bpjs_kes_paid_until',    label: 'BPJS Kesehatan dibayar s/d', hint: 'Premi bulanan jaminan kesehatan' },
    { key: 'bpjs_tk_paid_until',     label: 'BPJS TK dibayar s/d',       hint: 'Opsional — proteksi kecelakaan kerja' },
    { key: 'pramuwisata_expires_on', label: 'Pramuwisata habis',         hint: 'Khusus driver tour Bali — izin Dispar' },
  ]

  return (
    <>
      <AppNav />
      <main className="min-h-screen pb-32">
        <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
          <Link href="/dashboard" className="text-[13px] text-muted hover:text-ink font-bold flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" />
            Dashboard
          </Link>

          <header className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand/12 border border-brand/25 flex items-center justify-center">
                <Scale className="w-4 h-4 text-brand" />
              </div>
              <h1 className="text-2xl font-extrabold">Kepatuhan hukum</h1>
            </div>
            <p className="text-muted text-[14px] leading-relaxed">
              Daftar persyaratan untuk beroperasi sebagai driver kurir motor independen di Indonesia.
              IndoCity tidak memverifikasi item-item ini — sebagai bisnis independen, kepatuhan
              adalah tanggung jawab kamu sendiri.
            </p>
          </header>

          {/* Compliance summary */}
          <div className="card p-4 relative overflow-hidden">
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none opacity-60"
              style={{ background: lawDone === lawTotal
                ? 'radial-gradient(ellipse at top right, rgba(34,197,94,0.16), transparent 60%)'
                : 'radial-gradient(ellipse at top right, rgba(250,204,21,0.12), transparent 60%)' }}
            />
            <div className="relative">
              <div className="text-[12px] uppercase tracking-wider font-extrabold text-dim">
                Wajib menurut hukum
              </div>
              <div className="text-2xl font-extrabold mt-1">
                {lawDone === lawTotal
                  ? <span className="text-online">Lengkap ✓</span>
                  : <><span className="gradient-text">{lawDone}/{lawTotal}</span> <span className="text-muted text-[14px]">terkonfirmasi</span></>}
              </div>
              <div className="text-[12px] text-muted mt-2 leading-relaxed">
                Centang setiap item saat kamu sudah memenuhinya. Status hanya tersimpan di
                perangkatmu — IndoCity tidak menyimpan apapun.
              </div>
            </div>
          </div>

          {/* Disclaimer — tinted black with a thin yellow accent strip */}
          <div className="card p-4 flex gap-3 text-[13px] relative overflow-hidden">
            <span
              aria-hidden
              className="absolute left-0 top-0 bottom-0 w-1"
              style={{ background: 'linear-gradient(180deg, #FACC15, #EAB308)' }}
            />
            <AlertCircle className="w-4 h-4 text-brand shrink-0 mt-0.5 ml-1" />
            <div className="text-ink/85 leading-relaxed">
              <strong className="text-brand">Mengapa halaman ini ada:</strong>{' '}
              kamu adalah pemilik bisnis kurir kamu sendiri. IndoCity menyediakan
              perangkat lunak direktori — kamu menyediakan layanan. Jika terjadi masalah
              di lapangan, kamu (bukan platform) yang menangani. Persyaratan ini melindungi
              kamu — bukan kami.
            </div>
          </div>

          {/* Pocket reference cards — police stop + accident protocol.
              Tinted black with subtle colored borders + icons for category
              recognition. No more colored backgrounds. */}
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/dashboard/legal/police-stop"
              className="card card-interactive p-3"
              style={{ borderColor: 'rgba(96,165,250,0.35)' }}
            >
              <div className="flex items-center justify-between">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(96,165,250,0.30)' }}
                >
                  <Shield className="w-4 h-4" style={{ color: '#60A5FA' }} />
                </div>
                <ChevronRight className="w-4 h-4 text-muted" />
              </div>
              <div className="text-[13px] font-extrabold mt-2">Jika dihentikan polisi</div>
              <div className="text-[11px] text-muted mt-0.5 leading-snug">
                Dokumen + tata cara
              </div>
            </Link>
            <Link
              href="/dashboard/legal/accident"
              className="card card-interactive p-3"
              style={{ borderColor: 'rgba(239,68,68,0.35)' }}
            >
              <div className="flex items-center justify-between">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)' }}
                >
                  <Siren className="w-4 h-4" style={{ color: '#EF4444' }} />
                </div>
                <ChevronRight className="w-4 h-4 text-muted" />
              </div>
              <div className="text-[13px] font-extrabold mt-2">Jika terjadi kecelakaan</div>
              <div className="text-[11px] text-muted mt-0.5 leading-snug">
                Jasa Raharja · BPJS · 110
              </div>
            </Link>
          </div>

          {/* Renewal calendar — driver-entered dates with countdown badges */}
          <section className="card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-brand" />
              <h2 className="text-[14px] font-extrabold">Kalender perpanjangan</h2>
            </div>
            <p className="text-[12px] text-muted leading-snug">
              Masukkan tanggal kadaluarsa setiap dokumen. Dashboard menampilkan hitung mundur.
              Tanggal ini bersifat privat — hanya kamu yang bisa melihat.
            </p>

            {renewalsLoading ? (
              <div className="py-4 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-muted" />
              </div>
            ) : (
              <div className="space-y-2">
                {RENEWAL_FIELDS.map((f) => {
                  const value = renewals[f.key] ?? ''
                  const status = daysToGo(value || null)
                  const toneColor =
                    status?.tone === 'expired' ? '#EF4444'
                    : status?.tone === 'red'    ? '#EF4444'
                    : status?.tone === 'amber'  ? '#F97316'
                    : status?.tone === 'green'  ? '#22C55E'
                    : '#64748B'
                  return (
                    <div key={f.key} className="flex items-stretch gap-2">
                      <div className="flex-1 min-w-0">
                        <label className="block text-[11px] font-extrabold uppercase tracking-wider text-dim">
                          {f.label}
                        </label>
                        <input
                          type="date"
                          value={value}
                          onChange={(e) => setRenewalDate(f.key, e.target.value)}
                          className="mt-1 w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-[13px] text-ink focus:outline-none focus:border-brand/40"
                        />
                        <p className="text-[10px] text-dim mt-1">{f.hint}</p>
                      </div>
                      <div
                        className="shrink-0 self-end px-2 py-1.5 rounded-lg text-[11px] font-extrabold whitespace-nowrap min-w-[88px] text-center"
                        style={{
                          color: toneColor,
                          background: status ? `${toneColor}1A` : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${status ? `${toneColor}55` : 'rgba(255,255,255,0.08)'}`,
                        }}
                      >
                        {status === null && '—'}
                        {status?.tone === 'expired' && `Lewat ${Math.abs(status.days)} hr`}
                        {status?.tone === 'red'     && `${status.days} hr lagi`}
                        {status?.tone === 'amber'   && `${status.days} hr lagi`}
                        {status?.tone === 'green'   && `${status.days} hr`}
                      </div>
                    </div>
                  )
                })}
                {renewalsErr && (
                  <div className="text-[12px] text-red-400 font-bold">{renewalsErr}</div>
                )}
                <button
                  type="button"
                  onClick={saveRenewals}
                  disabled={renewalsSaving}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-brand to-brand2 text-bg font-extrabold text-[12px] uppercase tracking-wider border border-black/85 active:scale-[0.99] disabled:opacity-60"
                >
                  {renewalsSaving
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan…</>
                    : renewalsSaved
                      ? <><CheckCircle2 className="w-3.5 h-3.5" /> Tersimpan</>
                      : <><CheckCircle2 className="w-3.5 h-3.5" /> Simpan tanggal</>}
                </button>
              </div>
            )}
          </section>

          {/* Requirements groups */}
          {(['Wajib menurut hukum', 'Sangat disarankan', 'Profesional (opsional)'] as const).map(cat => {
            const items = REQUIREMENTS.filter(r => r.category === cat)
            const catColor =
              cat === 'Wajib menurut hukum'    ? '#EF4444'
              : cat === 'Sangat disarankan'    ? '#FACC15'
              : '#94A3B8'
            return (
              <section key={cat} className="space-y-2">
                <div className="text-[12px] uppercase tracking-wider font-extrabold flex items-center gap-2 px-1" style={{ color: catColor }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: catColor }} />
                  {cat}
                </div>
                {items.map(r => {
                  const isChecked = checked.has(r.id)
                  return (
                    <button
                      key={r.id}
                      onClick={() => toggle(r.id)}
                      className="card card-interactive p-4 w-full text-left flex gap-3 items-start"
                    >
                      <div className="shrink-0 mt-0.5">
                        {isChecked
                          ? <CheckCircle2 className="w-5 h-5 text-online" />
                          : <Circle className="w-5 h-5 text-dim" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-[14px] leading-snug">{r.title}</div>
                        <p className="text-[13px] text-muted leading-relaxed mt-1.5">{r.desc}</p>
                        {r.fine && (
                          <div
                            className="text-[11px] font-bold mt-2 px-2 py-1 rounded-md inline-flex items-center gap-1.5"
                            style={{
                              background: 'rgba(239,68,68,0.08)',
                              color: '#FCA5A5',
                              border: '1px solid rgba(239,68,68,0.30)',
                            }}
                          >
                            <span aria-hidden className="w-1.5 h-1.5 rounded-full" style={{ background: '#EF4444' }} />
                            Sanksi · {r.fine}
                          </div>
                        )}
                        {r.link && (
                          <a
                            href={r.link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[12px] font-bold text-brand mt-2 hover:underline ml-2 first:ml-0"
                          >
                            {r.link.label} →
                          </a>
                        )}
                      </div>
                    </button>
                  )
                })}
              </section>
            )
          })}

          {/* Closing posture note — explains the platform's stance plainly */}
          <div className="card p-4 text-[13px] text-ink/85 leading-relaxed space-y-2">
            <div>
              <strong>Kamu bukan karyawan IndoCity.</strong>{' '}
              Kami menjual perangkat lunak (Rp 38.000/bulan). Kamu yang memutuskan
              siapa pelangganmu, berapa harga yang kamu pasang, kapan kamu kerja, dan
              bagaimana kamu beroperasi.
            </div>
            <div className="text-muted text-[12px]">
              Posisi ini sesuai dengan Permenhub PM 12/2019 — IndoCity bertindak
              sebagai direktori, bukan operator transportasi aplikasi.
            </div>
          </div>

          {/* Source footer — establishes credibility, looks professional */}
          <footer className="text-[11px] text-dim leading-relaxed px-1 pb-4 space-y-1">
            <div className="font-bold text-muted">Sumber referensi:</div>
            <div>UU 22/2009 (LLAJ) · UU 24/2011 (SJSN) · UU 7/2021 (HPP) · UU 27/2022 (PDP) · PP 44/2015 (BPJS BPU) · Permenhub PM 12/2019 · Perda Bali 5/2020 · Permenparekraf 8/2021.</div>
            <div className="pt-1">
              Halaman ini bukan nasihat hukum. Konsultasikan dengan konsultan hukum atau
              kantor pajak untuk situasi spesifik kamu. Terakhir ditinjau: 21 Mei 2026.
            </div>
          </footer>
        </div>
      </main>
      <DashboardNav />
    </>
  )
}
