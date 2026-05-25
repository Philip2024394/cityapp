import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// POST /api/beautician/me/request-domain
// Beautician submits 1-3 .my.id domain choices + contact info.
// Admin reviews in Supabase Studio, registers the domain manually,
// then marks status=registered.

export const runtime = 'nodejs'

type Body = {
  domain_choice_1?: string
  domain_choice_2?: string
  domain_choice_3?: string
  contact_name?:    string
  contact_whatsapp?:string
  contact_city?:    string
}

// Normalise + validate a single domain choice (lowercase, ascii, no
// leading/trailing dashes, 3-63 chars). Returns null if invalid.
function cleanDomain(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const s = input.trim().toLowerCase().replace(/\.my\.id$/i, '')
  if (!s) return null
  if (s.length < 3 || s.length > 63) return null
  if (!/^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/.test(s)) return null
  return s
}

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

  const d1 = cleanDomain(body.domain_choice_1)
  if (!d1) return NextResponse.json({ error: 'domain_choice_1_required' }, { status: 400 })
  const d2 = cleanDomain(body.domain_choice_2)
  const d3 = cleanDomain(body.domain_choice_3)

  const name = (body.contact_name || '').trim()
  if (name.length < 2) return NextResponse.json({ error: 'name_required' }, { status: 400 })

  const waRaw = (body.contact_whatsapp || '').replace(/\s|-/g, '')
  if (!/^\+?\d{8,15}$/.test(waRaw)) {
    return NextResponse.json({ error: 'invalid_whatsapp' }, { status: 400 })
  }

  // Optional beautician_id — link to the row if signed-in user owns one.
  const { data: bp } = await admin
    .from('beautician_providers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data, error } = await admin
    .from('domain_requests')
    .insert({
      user_id:          user.id,
      beautician_id:    (bp as { id?: string } | null)?.id ?? null,
      domain_choice_1:  d1,
      domain_choice_2:  d2,
      domain_choice_3:  d3,
      tld:              '.my.id',
      price_idr:        150000,
      contact_name:     name,
      contact_whatsapp: waRaw,
      contact_city:     (body.contact_city || '').trim() || null,
      status:           'pending',
    })
    .select('id, status, created_at')
    .single()

  if (error) {
    console.error('[request-domain] insert failed', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, request: data })
}
