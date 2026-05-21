import { withGateway, ok, fail } from '@/lib/admin/gateway'
import { getStreetlocalAdminSupabase } from '@/lib/supabase/streetlocal'
import { claudeTurn, estimateCostUsd, type Message, type ContentBlock } from '@/lib/agent/claude'
import { TOOL_DESCRIPTORS, runTool } from '@/lib/agent/tools'

// ============================================================================
// POST /api/admin/gateway/tasks/[id]/run
// ----------------------------------------------------------------------------
// Execute a queued task. The agent:
//   1. Loads the room (rules + allowed_tools + system_prompt_addendum)
//   2. Filters TOOL_DESCRIPTORS to only allowed_tools (or all if empty)
//   3. Loads global agent_rules + this room's room_rules → injects into
//      system prompt in priority order
//   4. Creates an agent_session for the conversation
//   5. Sends the task title + description as the user message
//   6. Loops tool_use → tool_result until end_turn (max 8 loops)
//   7. Writes a task_steps row per tool call so the UI can stream progress
//   8. On finish, stamps tasks.status='completed' + result_summary
//
// Mutation tools (propose_*) open agent_actions rows as usual — the task
// goes to status='awaiting_approval' until Phil decides.
// ============================================================================

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SYSTEM_PROMPT_BASE = `You are Phillip's ops agent for the StreetLocal product family. You are currently in a specific ROOM with its own context and tool restrictions.

CORE PRINCIPLES:
- Obey the RULES below verbatim. They are non-negotiable.
- For any non-trivial task, propose TWO plans: CHEAPEST way (lowest cost, possibly slower) and FASTEST way (may use paid APIs / be more aggressive). Wait for Phillip to pick.
- Read tools fire immediately. ACTION tools (propose_*) draft what you want to do and wait for Phillip to approve in the UI before executing.
- Be direct. No hype. Match Phillip's tone.
- Data answers come from tools — never invent numbers or facts.

RULES (in priority order):`

const MAX_TURN_LOOPS = 8

export const POST = withGateway(async (req) => {
  const sl = getStreetlocalAdminSupabase()
  if (!sl) return fail('Streetlocal Supabase not configured', 503)
  if (!process.env.AGENT_ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY) return fail('AGENT_ANTHROPIC_API_KEY not set on this Vercel project', 503)

  const url = new URL(req.url)
  const segs = url.pathname.split('/').filter(Boolean)
  const taskId = segs[segs.length - 2]
  if (!taskId) return fail('Missing task id', 400)

  // ── 1. Load task ──────────────────────────────────────────────────
  const { data: task } = await sl.from('tasks').select('*').eq('id', taskId).maybeSingle()
  if (!task) return fail('Task not found', 404)
  if (task.status !== 'queued') return fail(`Task is ${task.status}, cannot run`, 409)

  // ── 2. Load room (rules + allowed tools + addendum) ──────────────
  const { data: room } = await sl.from('rooms').select('*').eq('id', task.room_id).maybeSingle()
  if (!room) return fail('Room not found', 404)
  const { data: roomRules }   = await sl.from('room_rules').select('*').eq('room_id', room.id).eq('active', true).order('priority', { ascending: false })
  const { data: globalRules } = await sl.from('agent_rules').select('*').eq('active', true).order('priority', { ascending: false })

  // Tool filter
  const allowedSet = Array.isArray(room.allowed_tools) && room.allowed_tools.length > 0
    ? new Set(room.allowed_tools as string[])
    : null
  const tools = allowedSet ? TOOL_DESCRIPTORS.filter((t) => allowedSet.has(t.name)) : TOOL_DESCRIPTORS

  // ── 3. Build system prompt ───────────────────────────────────────
  const allRules = [
    ...((globalRules ?? []) as Array<{ rule_text: string; priority: number; category: string }>),
    ...((roomRules   ?? []) as Array<{ rule_text: string; priority: number; category: string }>),
  ].sort((a, b) => b.priority - a.priority)
  const rulesText = allRules.map((r, i) => `${i + 1}. [${r.category}] ${r.rule_text}`).join('\n')

  const system = `${SYSTEM_PROMPT_BASE}\n${rulesText || '(no rules set)'}

ROOM: ${room.name} (${room.icon || ''})
${room.description || ''}

${room.system_prompt_addendum || ''}

Available tools in this room: ${tools.length === 0 ? '(none)' : tools.map((t) => t.name).join(', ')}

Current UTC time: ${new Date().toISOString()}`

  // ── 4. Create session + mark task running ────────────────────────
  const { data: session } = await sl
    .from('agent_sessions')
    .insert({ title: task.title.slice(0, 80), model: 'claude-sonnet-4-6' })
    .select('id, model')
    .single()
  if (!session) return fail('Failed to create session', 500)

  await sl.from('tasks').update({
    status: 'running',
    started_at: new Date().toISOString(),
    session_id: session.id,
  }).eq('id', taskId)

  // ── 5. Conversation loop ─────────────────────────────────────────
  const userMessage = `${task.title}\n\n${task.description || ''}`.trim()
  const messages: Message[] = [{ role: 'user', content: [{ type: 'text', text: userMessage }] }]
  await sl.from('agent_messages').insert({
    session_id: session.id,
    role: 'user',
    content: [{ type: 'text', text: userMessage }],
  })

  let stepNumber = 0
  let assistantText = ''
  let totalIn = 0
  let totalOut = 0
  let openedActions = 0
  let lastError: string | null = null

  for (let loop = 0; loop < MAX_TURN_LOOPS; loop++) {
    try {
      const resp = await claudeTurn({ model: session.model, system, messages, tools })
      totalIn  += resp.usage.input_tokens
      totalOut += resp.usage.output_tokens

      await sl.from('agent_messages').insert({
        session_id: session.id,
        role: 'assistant',
        content: resp.content,
        input_tokens: resp.usage.input_tokens,
        output_tokens: resp.usage.output_tokens,
      })
      messages.push({ role: 'assistant', content: resp.content })

      for (const block of resp.content) {
        if (block.type === 'text') assistantText += (assistantText ? '\n\n' : '') + block.text
      }
      if (resp.stop_reason !== 'tool_use') break

      const toolUses = resp.content.filter((b): b is { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> } => b.type === 'tool_use')
      const results: ContentBlock[] = []

      for (const tu of toolUses) {
        stepNumber++
        const t0 = Date.now()
        const stepInsert = await sl.from('task_steps').insert({
          task_id: taskId,
          step_number: stepNumber,
          description: `Using ${tu.name}`,
          tool_name: tu.name,
          tool_args: tu.input,
          status: 'running',
        }).select('id').single()

        const r = await runTool(tu.name, tu.input)
        let resultContent = r.result

        if (r.action_pending) {
          const { data: actRow } = await sl.from('agent_actions').insert({
            session_id: session.id,
            action_type: r.action_pending.type,
            args: r.action_pending.args,
            reasoning: r.action_pending.reasoning,
            status: 'pending',
          }).select('id').single()
          if (actRow?.id) {
            openedActions++
            resultContent = `Action queued (action_id=${actRow.id}). Awaiting Phil's approval.`
          }
        }

        results.push({ type: 'tool_result', tool_use_id: tu.id, content: resultContent, is_error: r.is_error })
        await sl.from('agent_messages').insert({
          session_id: session.id,
          role: 'tool',
          content: [{ type: 'tool_result', tool_use_id: tu.id, content: resultContent, is_error: r.is_error }],
          tool_name: tu.name,
          tool_args: tu.input,
          tool_result: { text: resultContent, is_error: !!r.is_error },
        })

        if (stepInsert.data?.id) {
          await sl.from('task_steps').update({
            status: r.is_error ? 'failed' : 'completed',
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - t0,
            tool_result: { text: resultContent.slice(0, 4000), is_error: !!r.is_error },
          }).eq('id', stepInsert.data.id)
        }
      }

      messages.push({ role: 'user', content: results })
    } catch (e) {
      lastError = e instanceof Error ? e.message : 'Turn failed'
      break
    }
  }

  // ── 6. Finalise task ─────────────────────────────────────────────
  const cost = estimateCostUsd(session.model, totalIn, totalOut)
  const finalStatus = lastError
    ? 'failed'
    : openedActions > 0
    ? 'awaiting_approval'
    : 'completed'

  await sl.from('tasks').update({
    status: finalStatus,
    completed_at: new Date().toISOString(),
    result_summary: assistantText.slice(0, 1000) || (lastError ? null : '(no reply)'),
    result: { assistant_text: assistantText, opened_actions: openedActions, steps: stepNumber },
    error: lastError,
    total_cost_usd: cost,
    total_tokens: totalIn + totalOut,
  }).eq('id', taskId)

  await sl.from('agent_sessions').update({
    total_input_tokens: totalIn,
    total_output_tokens: totalOut,
    total_cost_usd: cost,
  }).eq('id', session.id)

  return ok({
    task_id: taskId,
    status: finalStatus,
    assistant_text: assistantText,
    opened_actions: openedActions,
    steps: stepNumber,
    cost_usd: cost,
    error: lastError,
  })
})

export const OPTIONS = withGateway(async () => ok({}))
