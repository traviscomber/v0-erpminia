# Canonical access-control model

## Authentication

Motil currently supports:

1. Supabase Auth sessions.
2. A signed custom session cookie named `auth_token` for profile/password login.

The signed cookie must be verified through `lib/auth/signed-session.ts`. Code must not parse `auth_token` with `JSON.parse`.

The common API resolver is `lib/api/auth-session.ts`. All protected route handlers should use this resolver or an explicitly documented equivalent.

## Required request context

A successful login is not sufficient to authorize data access. Every protected data request needs:

- `user.id`
- role
- `organization_id` when the dataset is tenant-scoped
- module permission or admin override
- property/plant/operation scope where the domain requires it

A missing context must produce a clear authorization or configuration response. It must not silently become an empty dataset.

## Current permission sources

Production snapshot:

| Source | Rows | Current role |
|---|---:|---|
| `user_roles` | 4 | All current assignments are `admin`. |
| `role_matrix` | 272 | Cargo-to-module access levels. |
| `permissions` | 80 | Resource/action catalogue. |
| `roles` | 0 | Not currently populated; do not treat as authoritative. |
| `user_permissions` | 0 | No direct user overrides currently recorded. |

## Canonical precedence

Until the permission system is consolidated, access resolution should follow this order:

1. Validate the authenticated session cryptographically.
2. Resolve the profile by user ID or normalized email.
3. Resolve organization from `profiles.organization_id`, falling back to `user_roles.organization_id` only when required.
4. Resolve administrative role from the verified session/profile/user role assignment.
5. For `admin` and `superadmin`, allow configured organizational access without requiring a populated `user_permissions` row.
6. For non-admin users, resolve `profiles.cargo_id` and then `role_matrix(cargo_id, module_key)`.
7. Treat `user_permissions` as an optional future override layer, not as a mandatory source while it is empty.
8. Never use menu visibility alone as authorization.

## Known structural issue

The database has a populated `role_matrix` but no populated `roles` or `user_permissions` table. Code that requires all three sources will deny valid users or return partial data.

The short-term production rule is:

- Admin users: authenticated session plus organization context.
- Cargo-based users: profile cargo plus role matrix.
- Direct user permission override: optional and only applied when a row exists.

## Failure behavior

- Invalid or expired session: `401 Unauthorized` and redirect to login for pages.
- Authenticated user without organization or required scope: `403 Forbidden` or explicit `missing_context` response.
- Authenticated user without module permission: `403 Forbidden`.
- Database/query failure: `500` or partial-source warning; never report it as an empty canonical dataset.

## Demo readiness check

Before a presentation, confirm:

- The demo user exists in the authentication source.
- The demo user resolves to a profile or user-role record.
- The user has an organization.
- Admin users bypass empty direct-permission tables.
- `/api/me/access` returns 200.
- Dashboard and module APIs return 200 using the same session cookie.
