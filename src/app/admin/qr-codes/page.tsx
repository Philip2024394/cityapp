import { getAdminSupabase } from '@/lib/supabase/admin'
import QrCodesManager from './QrCodesManager'

export const dynamic = 'force-dynamic'

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
  return <QrCodesManager initialRows={list} />
}
