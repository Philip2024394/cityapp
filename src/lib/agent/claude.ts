// ============================================================================
// Claude API wrapper for the ops agent
// ----------------------------------------------------------------------------
// Plain fetch — no SDK dep. Env vars:
//   ANTHROPIC_API_KEY      — required for live calls; missing = error response
//   ANTHROPIC_MODEL_DEFAULT — defaults to claude-sonnet-4-6 (best cost/quality)
//
// Anthropic Messages API with tool_use blocks:
//   https://docs.anthropic.com/claude/reference/messages_post
// ============================================================================

export type Role = 'user' | 'assistant' | 'tool' | 'system'

// Content blocks per Anthropic schema
export type TextBlock     = { type: 'text';        text: string }
export type ToolUseBlock  = { type: 'tool_use';    id: string; name: string; input: Record<string, unknown> }
export type ToolResultBlock = { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }
export type ContentBlock  = TextBlock | ToolUseBlock | ToolResultBlock

export type Message = { role: 'user' | 'assistant'; content: ContentBlock[] | string }

export type Tool = {
  name: string
  description: string
  input_schema: { type: 'object'; properties: Record<string, unknown>; required?: string[] }
}

export type ClaudeResponse = {
  id: string
  type: 'message'
  role: 'assistant'
  model: string
  content: ContentBlock[]
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence'
  usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number }
}

const ENDPOINT = 'https://api.anthropic.com/v1/messages'
const API_VERSION = '2023-06-01'
const DEFAULT_MAX_TOKENS = 2048

// Rough public pricing per 1M tokens (USD, 2026-05).
// Updated when Anthropic publishes new prices; used for the session-cost
// counter only — billing is between Phil and Anthropic.
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-4-7':            { input: 15.00, output: 75.00 },
  'claude-sonnet-4-6':          { input:  3.00, output: 15.00 },
  'claude-haiku-4-5-20251001':  { input:  0.80, output:  4.00 },
}

export function estimateCostUsd(model: string, input_tokens: number, output_tokens: number): number {
  const p = PRICING[model] || PRICING['claude-sonnet-4-6']
  return ((input_tokens * p.input) + (output_tokens * p.output)) / 1_000_000
}

export async function claudeTurn(opts: {
  model?: string
  system: string
  messages: Message[]
  tools?: Tool[]
  max_tokens?: number
}): Promise<ClaudeResponse> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    throw new Error('ANTHROPIC_API_KEY not configured on this Vercel project')
  }
  const model = opts.model || process.env.ANTHROPIC_MODEL_DEFAULT || 'claude-sonnet-4-6'

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': API_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.max_tokens ?? DEFAULT_MAX_TOKENS,
      system: opts.system,
      messages: opts.messages,
      ...(opts.tools && opts.tools.length > 0 ? { tools: opts.tools } : {}),
    }),
  })

  const text = await res.text()
  if (!res.ok) {
    let detail: string = text
    try { detail = (JSON.parse(text)?.error?.message) || text } catch { /* */ }
    throw new Error(`Anthropic ${res.status}: ${detail}`)
  }
  return JSON.parse(text) as ClaudeResponse
}
