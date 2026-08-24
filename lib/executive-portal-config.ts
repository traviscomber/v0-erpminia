export type ExecutivePortalKey = 'maintenance' | 'production' | 'sustainability' | 'warehouse' | 'administration' | 'geology' | 'drilling';

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
  {
    key: 'sustainability',
    label: 'Mi área',
    title: 'Mi HSE',
    areaPath: '/dashboard/sostenibilidad/prevencion-riesgos',
    actionLabel: 'Abrir HSE',
    allowedRoles: ['jefe sostenibilidad', 'jefe_sostenibilidad'],
    allowedCargos: ['JEFE SOSTENIBILIDAD'],
  },
  {
    key: 'warehouse',
    label: 'Mi área',
    title: 'Mi bodega',
    areaPath: '/dashboard/bodega',
    actionLabel: 'Abrir inventario',
    allowedRoles: ['jefe_bodega'],
    allowedCargos: ['JEFE BODEGA'],
  },
  {
    key: 'administration',
    label: 'Mi área',
    title: 'Mi administración',
    areaPath: '/dashboard/finanzas',
    actionLabel: 'Abrir finanzas',
    allowedRoles: ['jefe_adm', 'jefe_administracion'],
    allowedCargos: ['JEFE ADM.'],
  },
  {
    key: 'geology',
    label: 'Mi área',
    title: 'Mi geología',
    areaPath: '/dashboard/produccion/geologia',
    actionLabel: 'Abrir geología',
    allowedRoles: ['jefe_geologia'],
    allowedCargos: ['JEFE GEÓLOGIA'],
  },
  {
    key: 'drilling',
    label: 'Mi área',
    title: 'Mi sondaje',
    areaPath: '/dashboard/produccion/sondaje',
    actionLabel: 'Abrir sondaje',
    allowedRoles: ['jefe_sondaje'],
    allowedCargos: ['JEFE SONDAJE'],
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
