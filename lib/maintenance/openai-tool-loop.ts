import {
  executeMaintenanceSeniorTool,
  maintenanceSeniorTools,
  type MaintenanceCanonicalToolContext,
} from '@/lib/maintenance/senior-assistant-tools'

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'
const MAX_TOOL_ROUNDS = 8
const MAX_TOOL_CALLS = 12

function extractResponseText(payload: any) {
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') return content.text.trim()
    }
  }
  return typeof payload?.output_text === 'string' ? payload.output_text.trim() : ''
}

function functionCalls(payload: any) {
  return (payload?.output || []).filter((item: any) => item?.type === 'function_call')
}

async function createResponse(args: {
  apiKey: string
  model: string
  instructions: string
  input: unknown
  maxOutputTokens: number
}) {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: args.model,
      instructions: args.instructions,
      input: args.input,
      tools: maintenanceSeniorTools,
      tool_choice: 'auto',
      parallel_tool_calls: false,
      reasoning: { effort: 'medium' },
      max_output_tokens: args.maxOutputTokens,
    }),
    cache: 'no-store',
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = payload?.error?.message || `OpenAI respondió ${response.status}`
    const error = new Error(detail) as Error & { status?: number }
    error.status = response.status
    throw error
  }
  return payload
}

export async function runMaintenanceOpenAIToolLoop(args: {
  apiKey: string
  model: string
  instructions: string
  input: string
  context: MaintenanceCanonicalToolContext
  maxOutputTokens?: number
}) {
  let input: any[] = [{ role: 'user', content: args.input }]
  let lastPayload: any = null
  let totalToolCalls = 0
  const toolAudit: Array<{ name: string; mode: string; call_id: string }> = []
  const resultCache = new Map<string, { result: unknown; mode: string }>()

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
    const payload = await createResponse({
      apiKey: args.apiKey,
      model: args.model,
      instructions: args.instructions,
      input,
      maxOutputTokens: args.maxOutputTokens || 3600,
    })
    lastPayload = payload

    const calls = functionCalls(payload)
    if (!calls.length) {
      const text = extractResponseText(payload)
      if (!text) throw new Error('OpenAI no devolvió texto utilizable')
      return {
        text,
        model: payload?.model || args.model,
        responseId: payload?.id || null,
        toolAudit,
      }
    }

    if (round === MAX_TOOL_ROUNDS) throw new Error('El asistente excedió el límite seguro de rondas de herramientas')
    if (totalToolCalls + calls.length > MAX_TOOL_CALLS) throw new Error('El asistente excedió el límite seguro de llamadas a herramientas')

    // Preserve every output item, including reasoning items, before returning tool results.
    input = [...input, ...(payload.output || [])]

    for (const call of calls) {
      totalToolCalls += 1
      const parsedArgs = JSON.parse(call.arguments || '{}')
      const cacheKey = `${String(call.name)}:${JSON.stringify(parsedArgs)}`
      const cached = resultCache.get(cacheKey)
      const result = cached?.result ?? executeMaintenanceSeniorTool(call.name, parsedArgs, args.context)
      const mode = cached?.mode ?? (result && typeof result === 'object' && 'mode' in result ? String((result as any).mode) : 'read')
      if (!cached) resultCache.set(cacheKey, { result, mode })

      toolAudit.push({ name: String(call.name), mode, call_id: String(call.call_id) })
      input.push({
        type: 'function_call_output',
        call_id: call.call_id,
        output: JSON.stringify(result),
      })
    }
  }

  const text = extractResponseText(lastPayload)
  if (!text) throw new Error('OpenAI no devolvió texto utilizable')
  return {
    text,
    model: lastPayload?.model || args.model,
    responseId: lastPayload?.id || null,
    toolAudit,
  }
}
