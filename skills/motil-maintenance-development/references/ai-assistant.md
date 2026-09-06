# Senior Maintenance Assistant

## Role

The Senior Maintenance Assistant is a retrieval/context copilot for supervisors, planners, and maintainers. It explains current evidence, contradictions, missing information, and the next useful human action.

It is not an autonomous CMMS authority and must not silently create operational truth.

## OpenAI integration

- Use the OpenAI Responses API directly through `OPENAI_API_KEY` unless the repository intentionally changes architecture.
- Respect `OPENAI_MAINTENANCE_MODEL` when configured.
- Use permitted fallback models when a configured model is unavailable.
- Return the actual model used where useful for diagnostics/auditability.
- Do not expose API keys or raw secret material to the client.

## Conversation continuity

The maintenance assistant has dedicated, private persistence:

- `maintenance_ai_conversations`
- `maintenance_ai_messages`
- `maintenance_ai_user_memory`

Keep these scoped by organization and user. Server-side access is expected; RLS stays enabled and direct `anon`/`authenticated` table access stays revoked unless architecture is deliberately redesigned.

A conversation may expire after inactivity and be archived. New conversation should archive the current active session rather than deleting history.

## Memory rules

Memory is for durable user working context only, such as:

- explicit work preferences;
- declared responsibility;
- internal terminology;
- stable working context;
- decision rules the user explicitly states;
- non-sensitive operational observations that are clearly user context, not canonical truth.

Never store:

- passwords, tokens, secrets;
- sensitive personal data;
- inferred medical/political/religious/etc. attributes;
- an AI interpretation as a canonical maintenance fact;
- an unverified user statement as equipment state, root cause, or executed work.

Memory may personalize response framing. It must not override canonical operational data.

## Response reasoning contract

When relevant, separate:

1. **DATO CANONICO** - what the system actually knows.
2. **INTERPRETACION PROFESIONAL** - defensible interpretation of the evidence.
3. **HIPOTESIS A REVISAR** - plausible but unvalidated explanation.
4. **EVIDENCIA CONTRARIA / FALTANTE** - what weakens or limits the interpretation.
5. **PROXIMA ACCION** - highest-value human validation or operational step.

## Sources

Persist and show source references for assistant messages. Source references are provenance, not proof that every row from the source supports every sentence. Keep the answer tied to the actual subset of evidence used when the implementation can provide finer traceability.

## Learning boundary

The current system can learn through retrieval/context and explicit durable user memory. Do not claim model weights are fine-tuned or automatically retrained from conversations unless a separate training pipeline exists and has been validated.
