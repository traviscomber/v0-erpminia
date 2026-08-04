# Canonical data verification

Run this checklist before releases and client demonstrations.

## 1. Database presence

Confirm that production tables contain expected records. Minimum reference snapshot from 2026-08-04:

- `purchase_orders` >= 23,337
- `bodega_inventory` >= 4,918
- `equipment` >= 123
- `maintenance_work_orders` >= 36
- `maintenance_assets` >= 17
- `module_documents` >= 89
- `profiles` >= 26
- `organizations` >= 2

A lower count requires investigation. Do not repopulate or import automatically.

## 2. Authentication

- Login succeeds.
- `auth_token` is signed and has an expiration.
- The proxy and API resolver use the same verification utility.
- Expired or manipulated cookies return 401.

## 3. User context

For the demo user, confirm:

- user ID
- normalized email
- profile record or documented fallback
- organization ID
- role
- cargo ID when matrix permissions are required

## 4. Access endpoints

These requests must not return 401 after login:

- `/api/me/access`
- `/api/alertas`
- `/api/maintenance/equipment`
- `/api/maintenance/work-orders`
- `/api/mantenimiento/ordenes`
- `/api/bodega/inventory`
- `/api/compras/purchase-orders`

Expected results may legitimately be empty for some domains, but the response must be 200 and identify the resolved context.

## 5. Dashboard behavior

- `Datos parciales` only appears when a named source fails.
- A 401 must trigger reauthentication, not four zero-valued KPI cards.
- A 403 must identify missing permission or scope.
- A database error must not be converted silently to `[]`.
- Legitimate empty data must use a neutral empty state.

## 6. Regression checks

- No production table is truncated or overwritten.
- Imports are idempotent or have deduplication keys.
- No demo/mock records are inserted during UI tests.
- Changes to permission precedence are documented in `access-control.md`.
- Changes to canonical table ownership are documented in `data-map.md`.
