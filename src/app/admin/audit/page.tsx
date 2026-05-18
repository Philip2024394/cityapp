import { getAdminSupabase } from '@/lib/supabase/admin'
import type { AuditLogRow, ProfileRow } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function AdminAudit() {
  const admin = getAdminSupabase()
  if (!admin) return <p className="text-muted text-[14px]">Server not configured.</p>

  const { data: rows } = await admin
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  const actorIds = Array.from(new Set(((rows as AuditLogRow[] | null) ?? []).map((r) => r.actor_id).filter((x): x is string => !!x)))
  const { data: actors } = actorIds.length
    ? await admin.from('profiles').select('id, full_name, phone').in('id', actorIds)
    : { data: [] }
  const actorMap = new Map<string, Pick<ProfileRow, 'id' | 'full_name' | 'phone'>>()
  for (const a of (actors as Pick<ProfileRow, 'id' | 'full_name' | 'phone'>[] | null) ?? []) {
    actorMap.set(a.id, a)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Audit log</h1>
      {!rows || rows.length === 0 ? (
        <div className="card p-8 text-center text-[13px] text-muted">No admin actions recorded yet.</div>
      ) : (
        <div className="space-y-2">
          {(rows as AuditLogRow[]).map((row) => (
            <AuditRowCard key={row.id} row={row} actor={row.actor_id ? actorMap.get(row.actor_id) ?? null : null} />
          ))}
        </div>
      )}
    </div>
  )
}

function AuditRowCard({ row, actor }: { row: AuditLogRow; actor: Pick<ProfileRow, 'id' | 'full_name' | 'phone'> | null }) {
  const when = new Date(row.created_at).toLocaleString('en-GB', {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', year: 'numeric',
  })
  return (
    <div className="card p-3">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="text-[13px] font-extrabold flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded-full text-[11px] uppercase tracking-wider font-extrabold" style={{ background: 'rgba(250,204,21,0.10)', color: '#FACC15' }}>
            {row.action}
          </span>
          {row.entity_type && (
            <span className="text-muted font-mono text-[12px]">
              {row.entity_type}/{row.entity_id?.slice(0, 8)}
            </span>
          )}
        </div>
        <div className="text-[11px] text-dim font-mono">{when}</div>
      </div>
      <div className="text-[12px] text-muted mt-1.5">
        by {actor?.full_name || actor?.phone || (row.actor_id ? row.actor_id.slice(0, 8) : 'system')}
      </div>
      {(row.before_data || row.after_data) && (
        <details className="mt-2">
          <summary className="text-[11px] text-dim cursor-pointer">Show diff</summary>
          <pre className="mt-2 text-[11px] bg-white/5 rounded-lg p-2 overflow-x-auto font-mono whitespace-pre-wrap">
{JSON.stringify({ before: row.before_data, after: row.after_data }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}
