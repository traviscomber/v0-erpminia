import type { AssistantDomain } from '@/lib/intelligence/assistant-context';

export type QueryExecutionMode = 'fast' | 'agentic' | 'action';

export type QueryCapability =
  | 'maintenance'
  | 'geology'
  | 'inventory'
  | 'procurement'
  | 'production'
  | 'data_health'
  | 'root_cause'
  | 'executive_decisions'
  | 'executive_escalations'
  | 'documents'
  | 'finance';

export type QueryContext = {
  domain?: AssistantDomain;
  pathname?: string;
};

export type QueryRoute = {
  mode: QueryExecutionMode;
  intent: string;
  capabilities: QueryCapability[];
  reason: string;
  requiresExplicitAuthorization: boolean;
  scope: AssistantDomain;
  broadened: boolean;
};

const normalize = (value: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

// Keep action detection deliberately narrow. Domain nouns such as "compra" are not actions by themselves.
const ACTION_PATTERN = /\b(aprueba|aprobar|autoriza|autorizar|crea|crear|genera|generar|cierra|cerrar|cancela|cancelar|modifica|modificar|actualiza|actualizar|emite|emitir|comprar|envia|enviar|asigna|asignar)\b/;
const CAUSAL_PATTERN = /\b(por que|porque|causa|causa raiz|que esta frenando|que esta bloqueando|que impide|explica|investiga|diagnostica|que deberia hacer|que deberiamos hacer)\b/;
const CROSS_DOMAIN_PATTERN = /\b(compara|comparar|comparacion|cruza|cruzar|relaciona|relacionar|relacion|correlacion|contrasta|contrastar|entre areas|entre modulos)\b/;
const ATTENTION_PATTERN = /\b(priorizar|prioridad|prioridades|requiere atencion|que requiere atencion)\b/;
const EXECUTIVE_PATTERN = /\b(gerencia|gerente|ejecutiv|direccion|director|escalacion|escalaciones)\b/;
const MAINTENANCE_PATTERN = /\b(ot|orden de trabajo|manten|mantencion|mantenimiento|equipo|activo|disponibilidad|falla|preventiv|taller)\b/;
const GEOLOGY_PATTERN = /\b(geologia|geologico|geologica|sondaje|sondajes|perforacion|pozo|pozos|azimut|inclinacion|litologia|alteracion|mineralizacion|estructura|ley de muestra|qa\/qc|qaqc)\b/;
const INVENTORY_PATTERN = /\b(stock|inventario|bodega|repuesto|repuestos|existencia|existencias|producto|sku|part number)\b/;
const PROCUREMENT_PATTERN = /\b(compra|compras|oc|orden de compra|proveedor|recepcion|recepciones|abastecimiento|solicitud de compra)\b/;
const PRODUCTION_PATTERN = /\b(produccion|planta|tonelada|toneladas|ritmo|tratamiento|recuperacion|turno|turnos)\b/;
const DOCUMENT_PATTERN = /\b(documento|documentos|contrato|contratos|vencimiento|certificado|certificados)\b/;
const FINANCE_PATTERN = /\b(finanza|finanzas|financiero|pago|pagos|saldo|presupuesto|costo|costos|monto|centro de costo)\b/;
const HEALTH_PATTERN = /\b(data health|calidad de datos|frescura|fuente|fuentes|dato atrasado|datos atrasados|dato faltante|datos faltantes)\b/;

const DOMAIN_CAPABILITY: Partial<Record<AssistantDomain, QueryCapability>> = {
  maintenance: 'maintenance',
  geology: 'geology',
  inventory: 'inventory',
  procurement: 'procurement',
  production: 'production',
  finance: 'finance',
  documents: 'documents',
  data_health: 'data_health',
};

function detectedCapabilities(query: string): QueryCapability[] {
  const capabilities = new Set<QueryCapability>();
  if (MAINTENANCE_PATTERN.test(query)) capabilities.add('maintenance');
  if (GEOLOGY_PATTERN.test(query)) capabilities.add('geology');
  if (INVENTORY_PATTERN.test(query)) capabilities.add('inventory');
  if (PROCUREMENT_PATTERN.test(query)) capabilities.add('procurement');
  if (PRODUCTION_PATTERN.test(query)) capabilities.add('production');
  if (DOCUMENT_PATTERN.test(query)) capabilities.add('documents');
  if (FINANCE_PATTERN.test(query)) capabilities.add('finance');
  if (HEALTH_PATTERN.test(query)) capabilities.add('data_health');
  return [...capabilities];
}

function addCausalSupport(capabilities: Set<QueryCapability>) {
  if (capabilities.has('maintenance') || capabilities.has('inventory') || capabilities.has('procurement')) {
    capabilities.add('root_cause');
  }
  if (capabilities.has('production')) capabilities.add('data_health');
}

function executiveCapabilities() {
  return ['executive_decisions', 'executive_escalations', 'data_health', 'root_cause'] as QueryCapability[];
}

export function routeOperationalQuery(rawQuery: string, context: QueryContext = {}): QueryRoute {
  const query = normalize(rawQuery);
  const scope = context.domain || 'global';
  const localCapability = DOMAIN_CAPABILITY[scope] || null;

  if (!query) {
    return {
      mode: 'fast',
      intent: 'unknown',
      capabilities: [],
      reason: 'Consulta vacía; no se ejecutan capacidades.',
      requiresExplicitAuthorization: false,
      scope,
      broadened: false,
    };
  }

  const explicitCapabilities = detectedCapabilities(query);

  if (ACTION_PATTERN.test(query)) {
    const capability = explicitCapabilities[0] || localCapability;
    return {
      mode: 'action',
      intent: capability ? `action_${capability}` : 'action_operational',
      capabilities: capability ? [capability] : [],
      reason: 'La consulta solicita una mutación operacional y debe pasar por autorización explícita y controles del dominio.',
      requiresExplicitAuthorization: true,
      scope,
      broadened: false,
    };
  }

  const explicitlyExecutive = EXECUTIVE_PATTERN.test(query);
  const crossDomain = CROSS_DOMAIN_PATTERN.test(query) || explicitCapabilities.length > 1;
  const causal = CAUSAL_PATTERN.test(query);
  const attention = ATTENTION_PATTERN.test(query);

  if (explicitlyExecutive || (scope === 'executive' && attention) || (scope === 'global' && attention)) {
    return {
      mode: 'agentic',
      intent: 'executive_analysis',
      capabilities: executiveCapabilities(),
      reason: 'La consulta pide priorización ejecutiva y requiere una vista transversal acotada.',
      requiresExplicitAuthorization: false,
      scope,
      broadened: true,
    };
  }

  if (crossDomain || causal) {
    const capabilities = new Set<QueryCapability>(explicitCapabilities);
    if (capabilities.size === 0 && localCapability) capabilities.add(localCapability);
    if (capabilities.size === 0) {
      capabilities.add('executive_decisions');
      capabilities.add('data_health');
    }
    addCausalSupport(capabilities);
    return {
      mode: 'agentic',
      intent: crossDomain ? 'cross_domain_analysis' : 'causal_analysis',
      capabilities: [...capabilities],
      reason: crossDomain
        ? 'La consulta cruza más de un dominio; se usan sólo las capacidades explícitamente necesarias.'
        : 'La consulta requiere explicación causal dentro del contexto disponible.',
      requiresExplicitAuthorization: false,
      scope,
      broadened: capabilities.size > 1 || !localCapability || !capabilities.has(localCapability),
    };
  }

  // A local module owns ambiguous and attention-oriented questions by default.
  if (localCapability) {
    const direct = explicitCapabilities[0];
    if (direct && direct !== localCapability) {
      return {
        mode: 'fast',
        intent: `lookup_${direct}`,
        capabilities: [direct],
        reason: 'La consulta nombra de forma explícita un dominio distinto y puede resolverse desde esa fuente canónica.',
        requiresExplicitAuthorization: false,
        scope,
        broadened: true,
      };
    }
    return {
      mode: 'fast',
      intent: `lookup_${localCapability}`,
      capabilities: [localCapability],
      reason: 'La consulta se mantiene en el módulo actual; no se activa análisis transversal innecesario.',
      requiresExplicitAuthorization: false,
      scope,
      broadened: false,
    };
  }

  if (explicitCapabilities.length === 1) {
    const capability = explicitCapabilities[0];
    return {
      mode: 'fast',
      intent: `lookup_${capability}`,
      capabilities: [capability],
      reason: 'La consulta puede resolverse desde un solo dominio canónico sin análisis transversal.',
      requiresExplicitAuthorization: false,
      scope,
      broadened: false,
    };
  }

  return {
    mode: 'agentic',
    intent: 'operational_analysis',
    capabilities: ['executive_decisions', 'data_health'],
    reason: 'Sin un módulo local o dominio explícito, se usa un análisis ejecutivo acotado y de sólo lectura.',
    requiresExplicitAuthorization: false,
    scope,
    broadened: true,
  };
}
