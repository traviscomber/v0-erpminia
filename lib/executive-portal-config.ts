export type ExecutivePortalKey = 'maintenance';

export type ExecutivePortalConfig = {
  key: ExecutivePortalKey;
  label: string;
  title: string;
  areaPath: string;
  allowedRoles: string[];
};

const portals: ExecutivePortalConfig[] = [
  {
    key: 'maintenance',
    label: 'Mi área',
    title: 'Mi mantenimiento',
    areaPath: '/dashboard/mantenimiento',
    allowedRoles: ['jefe_mantencion'],
  },
];

export function normalizePortalRole(role?: string | null) {
  return String(role || '').trim().toLowerCase();
}

export function getExecutivePortalForRole(role?: string | null) {
  const normalized = normalizePortalRole(role);
  return portals.find((portal) => portal.allowedRoles.includes(normalized)) || null;
}

export function hasExecutiveAreaPortal(role?: string | null) {
  return Boolean(getExecutivePortalForRole(role));
}
