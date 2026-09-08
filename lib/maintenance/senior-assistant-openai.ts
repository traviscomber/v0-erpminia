import { runMaintenanceOpenAIToolLoop } from '@/lib/maintenance/openai-tool-loop'
import type { MaintenanceCanonicalToolContext } from '@/lib/maintenance/senior-assistant-tools'

const DEFAULT_MODEL = 'gpt-5.6'
const FALLBACK_MODELS = ['gpt-5.6', 'gpt-5.6-terra', 'gpt-5.6-luna']

export async function callMaintenanceOperationalAI(args: {
  instructions: string
  input: string
  context: MaintenanceCanonicalToolContext
  model?: string
  maxOutputTokens?: number
}) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY no está configurada en el servidor')

  const configuredModel = process.env.OPENAI_MAINTENANCE_MODEL?.trim()
  const models = Array.from(new Set([
    args.model,
    configuredModel,
    DEFAULT_MODEL,
    ...FALLBACK_MODELS,
  ].filter(Boolean))) as string[]

  let lastError = 'No hay un modelo de OpenAI disponible'

  for (const model of models) {
    try {
      return await runMaintenanceOpenAIToolLoop({
        apiKey,
        model,
        instructions: args.instructions,
        input: args.input,
        context: args.context,
        maxOutputTokens: args.maxOutputTokens || 3600,
      })
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error ?? 'unknown')
      lastError = detail
      const invalidModel = /invalid model|model.*not.*found|does not exist|not permitted|not available/i.test(detail)
      if (invalidModel) {
        console.warn('[maintenance-senior-assistant] operational model unavailable, retrying', { model, detail })
        continue
      }
      throw error
    }
  }

  throw new Error(lastError)
}
