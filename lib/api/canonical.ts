/**
 * Canonical data layer helpers.
 *
 * The `canonical.*` schema holds the authoritative, deduplicated datasets imported
 * from the official XLS workbooks (Costos equipos, Base Existencias, Existencias,
 * Análisis de bodega). They are exposed to the app through read-only `public`
 * views prefixed with `canonical_`.
 *
 * Canonical data currently belongs to the real production organization only. The
 * demo organization (and any other org) has no canonical rows, so screens must
 * fall back to their operational tables when the canonical view returns nothing
 * for the requesting org. This preserves strict demo/real data isolation.
 */

// Real production organization that owns all canonical data.
export const CANONICAL_ORG_ID = '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee';

// Demo organization — never reads canonical data.
export const DEMO_ORG_ID = '550e8400-e29b-41d4-a716-446655440000';

export function orgHasCanonicalData(organizationId: string | null | undefined): boolean {
  return organizationId === CANONICAL_ORG_ID;
}
