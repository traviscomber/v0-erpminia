export type TireCondition = 'new' | 'used';

export type TireLifecycleStatus = 'in_stock' | 'installed' | 'in_repair' | 'replaced' | 'retired';

export type TireEventType =
  | 'purchase_order'
  | 'received'
  | 'installed'
  | 'removed'
  | 'replaced'
  | 'repositioned'
  | 'repaired'
  | 'returned'
  | 'retired'
  | 'adjusted';

export function normalizeTireCondition(value: unknown): TireCondition {
  const text = String(value || '').trim().toLowerCase();
  if (text === 'new' || text === 'nuevo' || text === 'nuevos') return 'new';
  return 'used';
}

export function tireConditionLabel(value: TireCondition) {
  return value === 'new' ? 'Nuevo' : 'Usado';
}

export function tireLifecycleLabel(value: TireLifecycleStatus | string | null | undefined) {
  switch (String(value || '').trim()) {
    case 'in_stock':
      return 'En bodega';
    case 'installed':
      return 'Instalado';
    case 'in_repair':
      return 'En reparacion';
    case 'replaced':
      return 'Reemplazado';
    case 'retired':
      return 'Retirado';
    default:
      return 'Sin estado';
  }
}

export function tireEventLabel(value: TireEventType | string | null | undefined) {
  switch (String(value || '').trim()) {
    case 'purchase_order':
      return 'Orden de compra';
    case 'received':
      return 'Recepcion';
    case 'installed':
      return 'Instalacion';
    case 'removed':
      return 'Retiro';
    case 'replaced':
      return 'Reposicion';
    case 'repositioned':
      return 'Reubicacion';
    case 'repaired':
      return 'Reparacion';
    case 'returned':
      return 'Retorno a bodega';
    case 'retired':
      return 'Baja';
    case 'adjusted':
      return 'Ajuste';
    default:
      return 'Evento';
  }
}

export function normalizeTireStatus(value: unknown): TireLifecycleStatus {
  const text = String(value || '').trim().toLowerCase();
  if (text === 'installed') return 'installed';
  if (text === 'in_repair') return 'in_repair';
  if (text === 'replaced') return 'replaced';
  if (text === 'retired') return 'retired';
  return 'in_stock';
}
