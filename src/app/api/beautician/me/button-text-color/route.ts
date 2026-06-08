import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import type { TableUpdate } from '@/lib/supabase/typed-helpers'

// POST /api/beautician/me/button-text-color
// Sets the beautician's button text color used by the public profile's
// buttons and hero icon strokes. Hex format #RRGGBB, default #FFFFFF.
//
// Schema: beautician_providers.button_text_color (text, default '#FFFFFF')
// Owner: backend agent (mig adds the column). This endpoint only writes.

export const runtime = 'nodejs'

type Body = { button_text_color?: string | null }

const HEX_RE = /^#[A-Fa-f0-9]{6}$/

export async function POST(req: Request) {
  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  let body: Body
  try { body = (await req.json()) as Body } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const raw = body.button_text_color
  let value: string | null
  if (raw === null || raw === undefined || raw === '') {
    // Null resets to the database default (#FFFFFF).
    value = null
  } else if (typeof raw !== 'string' || !HEX_RE.test(raw)) {
    return NextResponse.json({ error: 'invalid_button_text_color' }, { status: 400 })
  } else {
    value = raw.toUpperCase()
  }

  // button_text_color isn't in the generated Database types yet (backend
  // agent's migration runs in parallel). Cast through Record<string,unknown>
  // until `npx supabase gen types typescript` refreshes the schema.
  const update: TableUpdate<'beautician_providers'> = {
    updated_at: new Date().toISOString(),
  }
  ;(update as Record<string, unknown>).button_text_color = value

  const { error } = await admin
    .from('beautician_providers')
    .update(update)
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, button_text_color: value })
}
