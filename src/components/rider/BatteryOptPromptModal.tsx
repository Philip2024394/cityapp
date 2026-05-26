'use client'
import { useEffect } from 'react'
import { BatteryCharging, X as XIcon } from 'lucide-react'

// ============================================================================
// BatteryOptPromptModal — one-shot Bahasa explainer asking the driver to
// whitelist IndoCity from Android's battery optimization. Fired by
// GoOnlineToggle after the first successful "Go Online" handshake.
//
// Visual style mirrors BackgroundLocationDisclosure in GoOnlineToggle.tsx
// (same bottom-sheet card, same brand gradient icon chip, same dual CTA).
// Both modals exist because Play's "prominent disclosure" treats the GPS
// permission and the battery-optimization permission as separate user-
// facing asks.
//
// Text floor 13px per project rule (StreetLocal donut-app Shopify-grade
// minimum). Body copy stays at 14px to match the location modal.
// ============================================================================

type Props = {
  onAccept: () => void
  onDismiss: () => void
}

export default function BatteryOptPromptModal({ onAccept, onDismiss }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onDismiss() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onDismiss])

  return (
    <>
      <div
        onClick={onDismiss}
        aria-hidden
        className="fixed inset-0 z-[80]"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(2px)' }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Izin baterai IndoCity"
        className="fixed left-0 right-0 bottom-0 z-[90] pb-safe animate-[fadeUp_0.22s_ease-out]"
      >
        <div
          className="mx-auto max-w-md w-full"
          style={{
            background: '#0A0A0A',
            borderTop: '1px solid rgba(250,204,21,0.40)',
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            boxShadow: '0 -20px 60px rgba(0,0,0,0.55)',
          }}
        >
          <div className="px-5 pt-5 pb-3 flex items-start gap-3">
            <div
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #FACC15, #EAB308)' }}
            >
              <BatteryCharging className="w-5 h-5 text-bg" strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[18px] font-extrabold leading-tight">
                Jangan sampai kamu "hilang" dari marketplace
              </h2>
              <p className="text-[14px] text-muted leading-snug mt-1">
                HP merek Xiaomi, Oppo, dan Vivo mematikan aplikasi
                otomatis setelah ~30 menit tanpa izin baterai.
              </p>
            </div>
            <button
              onClick={onDismiss}
              aria-label="Tutup"
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-muted hover:text-ink transition"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
            >
              <XIcon className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>

          <div className="px-5 pb-4 space-y-3 text-[14px] text-ink/90 leading-relaxed">
            <p>
              Untuk tetap <strong>Online</strong> saat layar mati, IndoCity
              perlu izin baterai. Tanpa izin ini, sistem hemat baterai HP
              kamu akan menutup aplikasi setelah ~30 menit — dan kamu
              berhenti muncul di peta customer tanpa sadar.
            </p>
            <p>
              Tekan <strong>Lanjut</strong>, lalu pilih <strong>"Izinkan"</strong> di
              halaman pengaturan yang muncul.
            </p>
            <ul className="space-y-1.5 text-[13px] text-muted">
              <li>✓ Hanya satu kali — tidak akan ditanya lagi</li>
              <li>✓ Tidak memboroskan baterai saat Offline</li>
              <li>✓ Bisa dicabut kapan saja dari Pengaturan HP</li>
            </ul>
          </div>

          <div className="px-5 pb-5 grid grid-cols-1 gap-2">
            <button
              onClick={onAccept}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-brand to-brand2 text-bg font-extrabold text-[14px] uppercase tracking-wider border border-black/85 active:scale-[0.99]"
              style={{ minHeight: 52 }}
            >
              Lanjut & izinkan baterai
            </button>
            <button
              onClick={onDismiss}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-transparent text-muted font-extrabold text-[14px] uppercase tracking-wider border border-white/10 active:scale-[0.99]"
              style={{ minHeight: 52 }}
            >
              Nanti saja
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
