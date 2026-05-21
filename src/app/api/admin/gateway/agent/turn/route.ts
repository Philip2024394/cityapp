import { withGateway, ok, fail } from '@/lib/admin/gateway'
import { getStreetlocalAdminSupabase } from '@/lib/supabase/streetlocal'
import { claudeTurn, estimateCostUsd, type Message, type ContentBlock } from '@/lib/agent/claude'
import { TOOL_DESCRIPTORS, runTool } from '@/lib/agent/tools'

// ============================================================================
// POST /api/admin/gateway/agent/turn
// ----------------------------------------------------------------------------
// One conversational turn: admin sends a user message; we:
//   1. Load active agent_rules (ordered priority desc) → injected into
//      the system prompt verbatim. Rules ALWAYS apply.
//   2. Load prior agent_messages for this session → pass to Claude as
//      conversation history.
//   3. Call Claude with TOOL_DESCRIPTORS available.
//   4. If Claude calls tools, run them server-side; loop back to Claude
//      with tool_result blocks until it returns plain text.
//   5. Save every user/assistant/tool message to agent_messages so the
//      UI replays the same sequence Phil saw.
//   6. Track input/output tokens + USD cost for the session.
//
// Mutation tools (propose_*) open an agent_actions row with status=
// 'pending' instead of executing. Approval lives in a separate endpoint.
//
// Body: { session_id?: string, user_message: string, model?: string }
// Returns: { session_id, assistant_text, pending_actions: [...] }
// ============================================================================

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SYSTEM_PROMPT_BASE = `You are Phillip's ops agent for the StreetLocal product family (cityrider, donut, food-basic, landing, affiliate apps). You live inside the admin dashboard and help him operate the business.

CORE PRINCIPLES:
- Obey the RULES below verbatim. They are non-negotiable.
- For any non-trivial task, propose TWO plans: CHEAPEST way (lowest cost, possibly slower) and FASTEST way (may use paid APIs / be more aggressive). Wait for Phillip to pick.
- Read tools fire immediately. ACTION tools (propose_*) draft what you want to do and wait for Phillip to approve in the UI before executing.
- Be direct. No hype. Match Phillip's tone (he is concise; you should be too).
- When unsure, ask one clarifying question rather than guess.
- All data answers come from tools — never make up numbers or invent facts.

RULES (in priority order):`

const MAX_TURN_LOOPS = 6  // safety cap on tool-use loops per user message

type DbRule = { rule_text: string; priority: number; category: string }
type DbMessage = { id: string; role: string; content: ContentBlock[] | string; tool_name?: string | null; tool_args?: unknown; tool_result?: unknown }

export const POST = withGateway(async (req) => {
  const sl = getStreetlocalAdminSupabase()
  if (!sl) return fail('Streetlocal Supabase not configured on this Vercel project', 503)
  if (!process.env.ANTHROPIC_API_KEY) return fail('ANTHROPIC_API_KEY not set on this Vercel project', 503)

  let body: { session_id?: string; user_message?: string; model?: string }
  try { body = (await req.json()) as typeof body }
  catch { return fail('Invalid JSON', 400) }

  const userMessage = (body.user_message || '').trim()
  if (!userMessage) return fail('user_message required', 400)

  // ── 1. Session: load or create ────────────────────────────────────
  let sessionId = body.session_id
  let model = body.model || 'claude-sonnet-4-6'
  if (!sessionId) {
    const { data: newSess, error: sessErr } = await sl
      .from('agent_sessions')
      .insert({ model, title: userMessage.slice(0, 80) })
      .select('id, model')
      .single()
    if (sessErr) return fail(sessErr.message, 500)
    sessionId = newSess.id
    model = newSess.model
  } else {
    const { data: sess } = await sl.from('agent_sessions').select('model').eq('id', sessionId).maybeSingle()
    if (sess?.model) model = sess.model
  }

  // ── 2. Rules → system prompt ──────────────────────────────────────
  const { data: rules } = await sl.from('agent_rules').select('rule_text, priority, category').eq('active', true).order('priority', { ascending: false })
  const rulesText = ((rules ?? []) as DbRule[]).map((r, i) => `${i + 1}. [${r.category}] ${r.rule_text}`).join('\n')
  const system = `${SYSTEM_PROMPT_BASE}\n${rulesText || '(no custom rules set)'}\n\nCurrent UTC time: ${new Date().toISOString()}`

  // ── 3. Conversation history ───────────────────────────────────────
  const { data: priorMsgs } = await sl
    .from('agent_messages')
    .select('id, role, content, tool_name, tool_args, tool_result')
    .eq('session_id', sessionId)
    .order('occurred_at', { ascending: true })
    .limit(100)

  const messages: Message[] = []
  for (const m of (priorMsgs ?? []) as DbMessage[]) {
    if (m.role === 'user' || m.role === 'assistant') {
      messages.push({ role: m.role, content: m.content })
    } else if (m.role === 'tool') {
      // tool results are user-role messages in Anthropic's schema
      messages.push({ role: 'user', content: m.content })
    }
    // 'system' rows are advisory, not sent back to Claude
  }

  // ── 4. Append the new user message + persist ──────────────────────
  const newUserContent: ContentBlock[] = [{ type: 'text', text: userMessage }]
  messages.push({ role: 'user', content: newUserContent })
  await sl.from('agent_messages').insert({
    session_id: sessionId,
    role: 'user',
    content: newUserContent,
  })

  // ── 5. Loop: call Claude → run tools → call Claude → … ────────────
  const pendingActions: Array<{ id: string; type: string; args: Record<string, unknown>; reasoning?: string }> = []
  let assistantText = ''
  let totalIn = 0
  let totalOut = 0

  for (let loop = 0; loop < MAX_TURN_LOOPS; loop++) {
    const resp = await claudeTurn({ model, system, messages, tools: TOOL_DESCRIPTORS })
    totalIn  += resp.usage.input_tokens
    totalOut += resp.usage.output_tokens

    // Persist the assistant turn
    await sl.from('agent_messages').insert({
      session_id: sessionId,
      role: 'assistant',
      content: resp.content,
      input_tokens: resp.usage.input_tokens,
      output_tokens: resp.usage.output_tokens,
    })

    messages.push({ role: 'assistant', content: resp.content })

    // Extract any text the assistant said (for the final reply)
    for (const block of resp.content) {
      if (block.type === 'text') assistantText += (assistantText ? '\n\n' : '') + block.text
    }

    if (resp.stop_reason !== 'tool_use') break

    // Run all tool calls in the response in parallel, then feed results back.
    const toolUses = resp.content.filter((b): b is { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> } => b.type === 'tool_use')
    const results: ContentBlock[] = []

    for (const tu of toolUses) {
      const r = await runTool(tu.name, tu.input)
      let resultContent = r.result
      // If the tool is a mutation proposal, persist the agent_actions row.
      if (r.action_pending) {
        const { data: actRow } = await sl.from('agent_actions').insert({
          session_id: sessionId,
          action_type: r.action_pending.type,
          args: r.action_pending.args,
          reasoning: r.action_pending.reasoning,
          status: 'pending',
        }).select('id').single()
        if (actRow?.id) {
          pendingActions.push({ id: actRow.id, type: r.action_pending.type, args: r.action_pending.args, reasoning: r.action_pending.reasoning })
          resultContent = `Action queued for Phil's approval (action_id=${actRow.id}). Wait for his decision before assuming anything happened.`
        }
      }
      results.push({ type: 'tool_result', tool_use_id: tu.id, content: resultContent, is_error: r.is_error })

      // Persist each tool result row so the UI replays the full chain
      await sl.from('agent_messages').insert({
        session_id: sessionId,
        role: 'tool',
        content: [{ type: 'tool_result', tool_use_id: tu.id, content: resultContent, is_error: r.is_error }],
        tool_name: tu.name,
        tool_args: tu.input,
        tool_result: { text: resultContent, is_error: !!r.is_error },
      })
    }

    messages.push({ role: 'user', content: results })
  }

  // ── 6. Update session totals (cumulative across turns) ───────────
  const turnCost = estimateCostUsd(model, totalIn, totalOut)
  const { data: priorTotals } = await sl
    .from('agent_sessions')
    .select('total_input_tokens, total_output_tokens, total_cost_usd')
    .eq('id', sessionId)
    .maybeSingle()
  await sl.from('agent_sessions').update({
    total_input_tokens:  (priorTotals?.total_input_tokens  || 0) + totalIn,
    total_output_tokens: (priorTotals?.total_output_tokens || 0) + totalOut,
    total_cost_usd:      Number(priorTotals?.total_cost_usd || 0) + turnCost,
    updated_at: new Date().toISOString(),
  }).eq('id', sessionId)

  return ok({
    session_id: sessionId,
    assistant_text: assistantText || '(no reply)',
    pending_actions: pendingActions,
    usage: { input_tokens: totalIn, output_tokens: totalOut, est_cost_usd: turnCost },
    model,
  })
})

export const OPTIONS = withGateway(async () => ok({}))
