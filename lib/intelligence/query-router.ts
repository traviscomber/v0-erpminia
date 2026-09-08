export type QueryExecutionMode = 'fast' | 'agentic' | 'action';

export type QueryCapability =
  | 'maintenance'
  | 'inventory'
  | 'procurement'
  | 'production'
  | 'data_health'
  | 'root_cause'
  | 'executive_decisions'
  | 'executive_escalations'
  | 'documents'
  | 'finance';

export type QueryRoute = {
  mode: QueryExecutionMode;
  intent: string;
  capabilities: QueryCapability[];
  reason: string;
  requiresExplicitAuthorization: boolean;
};

const normalize = (value: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const ACTION_PATTERN = /\b(aprueba|aprobar|autoriza|autorizar|crea|crear|genera|generar|cierra|cerrar|cancela|cancelar|modifica|modificar|actualiza|actualizar|emite|emitir|compra|comprar|envia|enviar|asigna|asignar)\b/;
const CAUSAL_PATTERN = /\b(por que|porque|causa|causa raiz|que esta frenando|que esta bloqueando|que impide|explica|investiga|diagnostica|priorizar|prioridad|prioridades|que requiere atencion|que deberia hacer|que deberiamos hacer)\b/;
const EXECUTIVE_PATTERN = /\b(gerencia|gerente|ejecutiv|direccion|director|prioridad|prioridades|requiere atencion|escalacion|escalaciones)\b/;
const MAINTENANCE_PATTERN = /\b(ot|orden de trabajo|manten|mantencion|mantenimiento|equipo|activo|disponibilidad|falla|preventiv|taller)\b/;
const INVENTORY_PATTERN = /\b(stock|inventario|bodega|repuesto|repuestos|existencia|existencias|producto|sku|part number)\b/;
const PROCUREMENT_PATTERN = /\b(compra|compras|oc|orden de compra|proveedor|recepcion|recepciones|abastecimiento|solicitud de compra)\b/;
const PRODUCTION_PATTERN = /\b(produccion|planta|tonelada|toneladas|ritmo|tratamiento|ley|recuperacion|sondaje|perforacion)\b/;
const DOCUMENT_PATTERN = /\b(documento|documentos|contrato|contratos|vencimiento|certificado|certificados)\b/;
const FINANCE_PATTERN = /\b(finanza|finanzas|financiero|pago|pagos|saldo|presupuesto|costo|costos|monto)\b/;
const HEALTH_PATTERN = /\b(data health|calidad de datos|frescura|fuente|fuentes|dato atrasado|datos atrasados)\b/;

function fastCapability(query: string): QueryCapability | null {
  if (MAINTENANCE_PATTERN.test(query)) return 'maintenance';
  if (INVENTORY_PATTERN.test(query)) return 'inventory';
  if (PROCUREMENT_PATTERN.test(query)) return 'procurement';
  if (PRODUCTION_PATTERN.test(query)) return 'production';
  if (DOCUMENT_PATTERN.test(query)) return 'documents';
  if (FINANCE_PATTERN.test(query)) return 'finance';
  if (HEALTH_PATTERN.test(query)) return 'data_health';
  return null;
}

export function routeOperationalQuery(rawQuery: string): QueryRoute {
  const query = normalize(rawQuery);

  if (!query) {
    return {
      mode: 'fast',
      intent: 'unknown',
      capabilities: [],
      reason: 'Consulta vacia; no se ejecutan capacidades.',
      requiresExplicitAuthorization: false,
    };
  }

  if (ACTION_PATTERN.test(query)) {
    const capability = fastCapability(query);
    return {
      mode: 'action',
      intent: capability ? `action_${capability}` : 'action_operational',
      capabilities: capability ? [capability] : [],
      reason: 'La consulta solicita una mutacion operacional y debe pasar por autorizacion explicita y controles del dominio.',
      requiresExplicitAuthorization: true,
    };
  }

  if (CAUSAL_PATTERN.test(query) || EXECUTIVE_PATTERN.test(query)) {
    const capabilities = new Set<QueryCapability>();
    const direct = fastCapability(query);
    if (direct) capabilities.add(direct);
    if (MAINTENANCE_PATTERN.test(query) || PROCUREMENT_PATTERN.test(query) || INVENTORY_PATTERN.test(query)) capabilities.add('root_cause');
    if (PRODUCTION_PATTERN.test(query)) {
      capabilities.add('production');
      capabilities.add('data_health');
    }
    if (EXECUTIVE_PATTERN.test(query)) {
      capabilities.add('executive_decisions');
      capabilities.add('executive_escalations');
      capabilities.add('data_health');
      capabilities.add('root_cause');
    }
    if (capabilities.size === 0) {
      capabilities.add('executive_decisions');
      capabilities.add('root_cause');
      capabilities.add('data_health');
    }
    return {
      mode: 'agentic',
      intent: EXECUTIVE_PATTERN.test(query) ? 'executive_analysis' : 'causal_analysis',
      capabilities: [...capabilities],
      reason: 'La consulta requiere correlacion o priorizacion entre multiples fuentes canónicas.',
      requiresExplicitAuthorization: false,
    };
  }

  const capability = fastCapability(query);
  if (capability) {
    return {
      mode: 'fast',
      intent: `lookup_${capability}`,
      capabilities: [capability],
      reason: 'La consulta puede resolverse desde un solo dominio canónico sin analisis transversal.',
      requiresExplicitAuthorization: false,
    };
  }

  return {
    mode: 'agentic',
    intent: 'operational_analysis',
    capabilities: ['executive_decisions', 'data_health'],
    reason: 'La intención no corresponde de forma segura a un único dominio; se escala a análisis acotado.',
    requiresExplicitAuthorization: false,
  };
}
