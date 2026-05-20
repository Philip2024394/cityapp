import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'

// ============================================================================
// DELETE /api/places/saved/[id] — remove one of this user's saved places.
// ----------------------------------------------------------------------------
// RLS-enforced — Supabase rejects deletes that don't match auth.uid().
// We use the user-scoped client (not admin) precisely so a buggy request
// can't accidentally nuke another user's row.
// ============================================================================

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  const userClient = await getServerSupabase()
  if (!userClient) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { error } = await userClient
    .from('customer_saved_places')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
