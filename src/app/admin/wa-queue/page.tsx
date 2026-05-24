import { getAdminSupabase } from '@/lib/supabase/admin'
import WaQueueRow from './WaQueueRow'

// Admin queue of WhatsApp reminders waiting to be sent. Populated by the
// daily reminders cron whenever it composes an email AND the user has
// a WA number on file. Admin opens this page, clicks "Open WhatsApp"
// on each row to fire the message via wa.me deep-link, then marks sent.

export const dynamic = 'force-dynamic'

type Row = {
  id: number
  user_id: string
  kind: string
  period_end: string
  whatsapp_number: string | null
  wa_message: string | null
  queued_at: string
}

export default async function AdminWaQueuePage() {
  const admin = getAdminSupabase()
  if (!admin) {
    return <div className="card p-4 text-muted">Server not configured.</div>
  }

  const { data, error } = await admin
    .from('payment_reminders_log')
    .select('id, user_id, kind, period_end, whatsapp_number, wa_message, queued_at')
    .eq('channel', 'whatsapp')
    .is('sent_at', null)
    .order('queued_at', { ascending: false })
    .limit(200)

  const rows = (data ?? []) as Row[]

  return (
    <div className="space-y-5">
      <header className="pt-2">
        <h1 className="text-[22px] font-extrabold leading-tight">WhatsApp queue</h1>
        <p className="text-[12px] text-muted mt-1">
          Reminders the cron has queued for WhatsApp delivery. Click
          <strong className="text-ink"> Open WhatsApp</strong> to fire the
          message via wa.me with the text pre-filled. After you send it,
          click <strong className="text-ink">Mark sent</strong> so it
          disappears from this queue. Delete rows that are no longer
          relevant (e.g. user already paid).
        </p>
      </header>

      <section className="card p-4">
        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-[13px] px-3 py-2 mb-3">
            Failed to load queue: {error.message}
          </div>
        )}
        {rows.length === 0 ? (
          <div className="text-[13px] text-muted">Queue is empty — no pending WhatsApp reminders.</div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => <WaQueueRow key={r.id} row={r} />)}
          </div>
        )}
      </section>
    </div>
  )
}
