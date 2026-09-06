export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-5.6';
const FALLBACK_MODELS = ['gpt-5.6', 'gpt-5.6-luna'];
const MAX_MESSAGE_CHARS = 12000;

function extractResponseText(payload: any) {
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') return content.text.trim();
    }
  }
  return typeof payload?.output_text === 'string' ? payload.output_text.trim() : '';
}

async function callOpenAI(instructions: string, input: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY no está configurada en el servidor');

  const configuredModel = process.env.OPENAI_MAINTENANCE_MODEL?.trim();
  const models = Array.from(new Set([configuredModel, DEFAULT_MODEL, ...FALLBACK_MODELS].filter(Boolean))) as string[];
  let lastError = 'No hay un modelo de OpenAI disponible';

  for (const model of models) {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        instructions,
        input,
        reasoning: { effort: 'medium' },
        max_output_tokens: 3600,
      }),
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const detail = payload?.error?.message || `OpenAI respondió ${response.status}`;
      lastError = detail;
      const invalidModel = /invalid model|model.*not.*found|does not exist|not permitted|not available/i.test(detail);
      if (invalidModel) {
        console.warn('[maintenance-senior-assistant] model unavailable, retrying', { model, detail });
        continue;
      }
      throw new Error(detail);
    }

    const text = extractResponseText(payload);
    if (!text) throw new Error('OpenAI no devolvió texto utilizable');
    return { text, model: payload?.model || model, responseId: payload?.id || null };
  }

  throw new Error(lastError);
}

const isSynthetic = (value: unknown) => /\buat\b|simulad|prueba|test controlado/i.test(String(value ?? ''));

export async function POST(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const body = await request.json().catch(() => null);
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message) return NextResponse.json({ error: 'Escribe una consulta de mantenimiento.' }, { status: 400 });
  if (message.length > MAX_MESSAGE_CHARS) return NextResponse.json({ error: 'La consulta es demasiado extensa.' }, { status: 400 });

  try {
    const [reviews, operationalEvidence, preventive, workOrders, reliability, closeReadiness, assets] = await Promise.all([
      context.supabase.from('drilling_maintenance_review_queue_v1')
        .select('review_id,canonical_asset_id,asset_code,asset_name,operation_date,review_reason,equipment_status_raw,machine_observations,review_status,has_linked_work_order')
        .eq('organization_id', context.organizationId).eq('review_status', 'pending').eq('has_linked_work_order', false).limit(50),
      context.supabase.from('drill_asset_operational_evidence_90d_v1')
        .select('canonical_asset_id,asset_code,asset_name,drilling_reports,out_of_service_reports,operational_with_observations_reports,operational_reports,equipment_without_crew_reports,power_outage_reports,water_shortage_reports,evidence_status')
        .eq('organization_id', context.organizationId).limit(100),
      context.supabase.from('preventive_maintenance_hour_status_v1')
        .select('schedule_id,canonical_asset_id,asset_code,asset_name,task_name,frequency_hours,effective_current_meter,due_meter,meter_evidence_source,meter_basis_conflict,hour_status,remaining_hours,generated_work_order_id')
        .eq('organization_id', context.organizationId).limit(100),
      context.supabase.from('maintenance_work_orders')
        .select('id,work_order_number,canonical_asset_id,title,description,work_type,status,priority,scheduled_date,completion_date,actual_duration_hours,down_time_hours,root_cause,preventive_actions,external_cost,created_by')
        .eq('organization_id', context.organizationId).not('created_by', 'is', null).limit(100),
      context.supabase.from('maintenance_reliability_base_v1')
        .select('work_order_id,canonical_asset_id,asset_code,asset_name,root_cause,root_cause_key,work_type,actual_duration_hours,down_time_hours,total_cost,closed_at')
        .eq('organization_id', context.organizationId).limit(100),
      context.supabase.from('work_order_close_readiness_v2')
        .select('work_order_id,work_order_number,canonical_asset_id,title,ready_to_close,next_action,open_procurement_orders,pending_parts,unmet_material_requirements,pending_external_services,open_labor_entries,external_cost_conflict,standard_plan_steps_pending')
        .eq('organization_id', context.organizationId).limit(100),
      context.supabase.from('maintenance_canonical_assets_v1')
        .select('id,asset_code,name,asset_type,category,manufacturer,model,cost_center_code,is_active,validation_status')
        .eq('organization_id', context.organizationId).limit(200),
    ]);

    const queryErrors = [
      ['drilling_maintenance_review_queue_v1', reviews.error],
      ['drill_asset_operational_evidence_90d_v1', operationalEvidence.error],
      ['preventive_maintenance_hour_status_v1', preventive.error],
      ['maintenance_work_orders', workOrders.error],
      ['maintenance_reliability_base_v1', reliability.error],
      ['work_order_close_readiness_v2', closeReadiness.error],
      ['maintenance_canonical_assets_v1', assets.error],
    ] as const;
    const failedQuery = queryErrors.find(([, error]) => Boolean(error));
    if (failedQuery) {
      const [source, error] = failedQuery;
      const detail = (error as any)?.message || JSON.stringify(error);
      throw new Error(`${source}: ${detail}`);
    }

    const workOrderMap = new Map((workOrders.data || []).map((row: any) => [String(row.id), row]));
    const reliableClosures = (reliability.data || []).filter((row: any) => {
      const source = workOrderMap.get(String(row.work_order_id));
      return source && !isSynthetic(source.root_cause) && !isSynthetic(source.preventive_actions) && !isSynthetic(source.description) && !isSynthetic(source.title);
    });

    const canonicalContext = {
      generated_at: new Date().toISOString(),
      semantics: {
        operational_frequency: 'Frecuencia observada en reportes; NO es probabilidad de falla.',
        review_queue: 'Observaciones de terreno pendientes de validación humana; no son diagnósticos confirmados.',
        preventive_due: 'Vencimiento calculado desde pauta y evidencia de horómetro.',
        reliability: 'Sólo cierres operacionales no UAT/simulados pueden usarse como experiencia histórica confiable.',
        authority: 'El mantenedor/supervisor valida diagnóstico, prioridad e intervención. El asistente no crea ni cierra OT.',
      },
      assets: assets.data || [],
      pending_operational_reviews: reviews.data || [],
      observed_conditions_90d: operationalEvidence.data || [],
      preventive_hour_status: preventive.data || [],
      operational_work_orders: workOrders.data || [],
      audited_non_synthetic_reliability: reliableClosures,
      closure_readiness: closeReadiness.data || [],
    };

    const instructions = `Eres el Asistente Senior de Mantenimiento de MOTIL para una operación minera chilena. Respondes como copiloto técnico de un jefe de mantenimiento, planificador o supervisor.\n\nREGLAS DE AUTORIDAD Y SEGURIDAD:\n1. Usa únicamente el CONTEXTO CANÓNICO entregado. Si falta evidencia, dilo explícitamente.\n2. Distingue siempre DATO CANÓNICO, INTERPRETACIÓN PROFESIONAL, HIPÓTESIS A REVISAR y RECOMENDACIÓN/PRÓXIMA ACCIÓN cuando corresponda.\n3. Un porcentaje de reportes fuera de servicio u observados describe frecuencia histórica observada; jamás lo llames probabilidad de falla.\n4. Separa causas mecánicas de restricciones externas como falta de agua, corte de energía o falta de dotación.\n5. No uses UAT, simulaciones o pruebas como evidencia de confiabilidad real.\n6. No declares causa raíz si no está validada. No declares MTBF/MTTR predictivo si no existe evidencia suficiente.\n7. No inventes repuestos, costos, horas, manuales, tolerancias ni procedimientos OEM.\n8. No crees, cierres, priorices de forma irreversible ni autorices una OT. Puedes recomendar qué revisar y por qué; la decisión final es humana.\n9. Si existe evidencia contradictoria, muéstrala. Si una máquina tuvo reportes degradados y también muchos reportes operativos normales, incluye ambos.\n10. Prioriza respuestas operacionales y concretas: qué sabemos, qué nos preocupa, qué falta confirmar y cuál es el siguiente dato/acción de mayor valor.\n\nCuando el usuario pregunte qué equipo requiere atención, compara señales observadas, estado fuera de servicio, preventivos vencidos, OT abiertas y evidencia de cierre. No conviertas un ranking operacional en riesgo probabilístico.`;

    const result = await callOpenAI(instructions, `CONTEXTO CANÓNICO MOTIL:\n${JSON.stringify(canonicalContext)}\n\nPREGUNTA DEL USUARIO:\n${message}`);
    return NextResponse.json({
      answer: result.text,
      model: result.model,
      responseId: result.responseId,
      sources: ['maintenance_canonical_assets_v1','drilling_maintenance_review_queue_v1','drill_asset_operational_evidence_90d_v1','preventive_maintenance_hour_status_v1','maintenance_work_orders','maintenance_reliability_base_v1','work_order_close_readiness_v2'],
      policy: 'Copiloto explicable: evidencia canónica → interpretación → hipótesis → acción humana. No decisión autónoma.',
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error ?? 'unknown');
    const configurationError = detail.includes('OPENAI_API_KEY');
    console.error('[maintenance-senior-assistant] request failed', {
      code: configurationError ? 'AI_CONFIGURATION_REQUIRED' : 'AI_REQUEST_FAILED',
      detail,
    });
    return NextResponse.json({
      error: configurationError
        ? 'El servicio de IA no está configurado en este entorno.'
        : 'No se pudo consultar el Asistente Senior de Mantenimiento.',
      code: configurationError ? 'AI_CONFIGURATION_REQUIRED' : 'AI_REQUEST_FAILED',
    }, { status: 503 });
  }
}
