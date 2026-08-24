export type ExecutivePortalKey = 'maintenance' | 'production';

export type ExecutivePortalConfig = {
  key: ExecutivePortalKey;
  label: string;
  title: string;
  areaPath: string;
  actionLabel: string;
  allowedRoles: string[];
  allowedCargos?: string[];
};

const portals: ExecutivePortalConfig[] = [
  {
    key: 'maintenance',
    label: 'Mi área',
    title: 'Mi mantenimiento',
    areaPath: '/dashboard/mantenimiento',
    actionLabel: 'Abrir mantenimiento',
    allowedRoles: ['jefe_mantencion'],
    allowedCargos: ['JEFE MAN. EQ'],
  },
  {
    key: 'production',
    label: 'Mi área',
    title: 'Mi producción',
    areaPath: '/dashboard/produccion',
    actionLabel: 'Abrir producción',
    allowedRoles: ['jefe_planta', 'jefe_produccion'],
    allowedCargos: ['JEFE PLANTA'],
  },
];

export function normalizePortalRole(role?: string | null) {
  return String(role || '').trim().toLowerCase();
}

export function normalizePortalCargo(cargo?: string | null) {
  return String(cargo || '').trim().toUpperCase();
}

export function getExecutivePortalForIdentity(role?: string | null, cargo?: string | null) {
  const normalizedRole = normalizePortalRole(role);
  const normalizedCargo = normalizePortalCargo(cargo);
  return portals.find((portal) =>
    portal.allowedRoles.includes(normalizedRole) ||
    (normalizedCargo && portal.allowedCargos?.map(normalizePortalCargo).includes(normalizedCargo))
  ) || null;
}

export function getExecutivePortalForRole(role?: string | null) {
  return getExecutivePortalForIdentity(role, null);
}

export function hasExecutiveAreaPortal(role?: string | null, cargo?: string | null) {
  return Boolean(getExecutivePortalForIdentity(role, cargo));
}
