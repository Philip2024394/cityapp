'use client'
import { Download, Printer, FileText, IdCard } from 'lucide-react'

// ============================================================================
// ContractTemplates — downloadable + printable rental-agreement templates.
// Mounted on /rent/list so owners can grab a paper contract before handing
// over their bike. We host the PNG masters on ImageKit so updates are
// instant without redeploying. Two languages: Indonesian + English.
// ============================================================================

type Template = {
  id: string
  language: 'Indonesian' | 'English'
  flag: string
  imageUrl: string
  downloadName: string
}

const TEMPLATES: Template[] = [
  {
    id: 'id',
    language: 'Indonesian',
    flag: '🇮🇩',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/indonisea%20motor%20bike%20agreement.png?updatedAt=1779361806371',
    downloadName: 'cityrider-perjanjian-sewa-motor-id.png',
  },
  {
    id: 'en',
    language: 'English',
    flag: '🇬🇧',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/motor%20bike%20agreemnt%20english.png?updatedAt=1779361792398',
    downloadName: 'cityrider-motorbike-rental-agreement-en.png',
  },
]

function printImage(url: string, label: string) {
  // Open the image alone in a popup window and trigger the browser print
  // dialog once the image has loaded. Falls back to a new tab if popups
  // are blocked (user can ctrl+P from there).
  const win = window.open('', '_blank', 'width=900,height=1200')
  if (!win) {
    window.open(url, '_blank', 'noopener,noreferrer')
    return
  }
  win.document.write(`<!doctype html><html><head><title>${label}</title>
    <style>
      html,body{margin:0;padding:0;background:#fff}
      img{display:block;max-width:100%;height:auto;margin:0 auto}
      @media print { @page { margin: 0 } body{margin:0} }
    </style></head>
    <body><img src="${url}" alt="${label}" onload="window.focus();window.print()" /></body>
    </html>`)
  win.document.close()
}

export default function ContractTemplates() {
  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #FACC15, #EAB308)',
            border: '1px solid rgba(0,0,0,0.85)',
          }}
        >
          <FileText className="w-5 h-5 text-bg" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <h2 className="text-[18px] font-extrabold text-ink leading-tight">
            Template kontrak sewa motor
          </h2>
          <p className="mt-1 text-[13px] text-muted leading-snug">
            Print salah satu template ini saat menyerahkan motor ke penyewa.
            Wajib lampirkan <strong className="text-ink">foto KTP / Passport</strong> penyewa
            sebelum motor diserahkan — proteksi legal dasar untuk kamu sebagai pemilik.
          </p>
        </div>
      </div>

      <div
        className="rounded-xl p-3 flex items-center gap-2.5"
        style={{
          background: 'rgba(250,204,21,0.10)',
          border: '1px solid rgba(250,204,21,0.30)',
        }}
      >
        <IdCard className="w-5 h-5 text-brand shrink-0" strokeWidth={2.5} />
        <p className="text-[12px] text-ink/85 leading-snug">
          <strong>Wajib:</strong> ambil foto KTP (warga Indonesia) atau Passport
          (turis) penyewa, plus foto wajah pemegang ID, sebelum kunci motor
          diserahkan. Simpan minimal 90 hari sebagai bukti rental.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TEMPLATES.map((t) => (
          <div
            key={t.id}
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.10)',
            }}
          >
            {/* Thumbnail preview — clickable to open full-size in a new tab. */}
            <a
              href={t.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white"
            >
              <img
                src={t.imageUrl}
                alt={`${t.language} rental agreement preview`}
                className="w-full h-[200px] object-contain object-top"
                loading="lazy"
              />
            </a>

            <div className="p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span aria-hidden className="text-[20px]">{t.flag}</span>
                  <div className="min-w-0">
                    <div className="text-[14px] font-extrabold text-ink leading-tight">{t.language}</div>
                    <div className="text-[11px] text-muted leading-tight">Rental agreement template</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={t.imageUrl}
                  download={t.downloadName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-bg text-[12px] font-extrabold uppercase tracking-wider active:scale-[0.99] transition"
                  style={{
                    background: 'linear-gradient(135deg, #FACC15, #EAB308)',
                    border: '1px solid rgba(0,0,0,0.85)',
                    minHeight: 40,
                  }}
                >
                  <Download className="w-3.5 h-3.5" strokeWidth={2.75} />
                  Download
                </a>
                <button
                  type="button"
                  onClick={() => printImage(t.imageUrl, `${t.language} rental agreement`)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-ink text-[12px] font-extrabold uppercase tracking-wider active:scale-[0.99] transition"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.20)',
                    minHeight: 40,
                  }}
                >
                  <Printer className="w-3.5 h-3.5" strokeWidth={2.5} />
                  Print
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted leading-snug">
        Template ini hanya saran — IndoCity bukan pihak dalam kontrak antara
        kamu dan penyewa. Untuk kasus besar (motor mahal, sewa panjang) silakan
        konsultasi notaris atau pengacara setempat.
      </p>
    </section>
  )
}
