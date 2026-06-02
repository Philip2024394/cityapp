import { getAdminSupabase } from '@/lib/supabase/admin'
import QrCodesManager from './QrCodesManager'
import AppQRCard from '@/components/admin/AppQRCard'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://citydrivers.id'

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

export default async function AdminQrCodesPage() {
  const admin = getAdminSupabase()
  if (!admin) return <p className="text-muted text-[14px]">Server not configured.</p>

  const { data: rows } = await admin
    .from('admin_qr_codes')
    .select('*')
    .order('amount_idr', { ascending: true })
    .order('created_at', { ascending: false })

  const list = (rows as Row[] | null) ?? []
  return (
    <div className="space-y-8">
      {/* Main app QR — the one-poster-for-everywhere. Print this and put
          it on event tables, hotel lobbies, partner banners. The PNG
          download is for digital sharing (WhatsApp, Instagram, email).
          Distinct from the QRIS payment QRs below. */}
      <section className="card p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-4">
          <div>
            <h1 className="text-2xl font-extrabold">App QR</h1>
            <p className="text-[12px] text-muted mt-1">
              Master QR for {APP_URL.replace(/^https?:\/\//, '')}. Download as PNG or print.
            </p>
          </div>
        </div>
        <AppQRCard url={APP_URL} />
      </section>

      {/* QRIS payment images — drivers see one of these in the subscription
          pay modal based on the amount they pick. Distinct from the app QR
          above. Admin-only write enforced by mig 0183. */}
      <section>
        <div className="mb-3">
          <h2 className="text-[15px] font-extrabold uppercase tracking-wider text-dim">QRIS payment images</h2>
          <p className="text-[12px] text-muted mt-1">
            Drivers see one of these in the subscription pay modal based on the amount they pick.
          </p>
        </div>
        <QrCodesManager initialRows={list} />
      </section>
    </div>
  )
}
