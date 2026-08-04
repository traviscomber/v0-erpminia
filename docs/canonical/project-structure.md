# Repository structure

## Runtime application

- `app/`: Next.js routes, layouts and API handlers.
- `components/`: reusable UI and domain components.
- `lib/`: shared authentication, Supabase, authorization and domain utilities.
- `public/`: static assets only.

## Documentation

- `docs/canonical/`: production source-of-truth documentation.
- `docs/architecture/`: architecture decisions and diagrams.
- `docs/runbooks/`: operational procedures, deployment and incident response.
- `docs/migrations/`: migration plans and compatibility notes.
- `docs/archive/`: superseded documentation retained for history.

New production-data documentation belongs in `docs/canonical`, not in route folders, temporary text files or chat-generated notes.

## Database and migrations

- SQL migrations must live in the repository migration location already used by the project.
- One-off SQL should not be committed as an undocumented root file.
- Every migration affecting canonical tables must update `docs/canonical/data-map.md`.
- Destructive migrations require a backup/rollback section.

## API rules

Each protected API should:

1. Resolve authentication with the common resolver.
2. Resolve organization and domain scope.
3. Check module access.
4. Query a documented canonical table.
5. Distinguish unauthorized, forbidden, query-error and legitimate-empty responses.

Avoid creating multiple route handlers that implement their own cookie parsing or role precedence.

## Module organization

Use a consistent domain grouping:

- `maintenance`
- `production`
- `telemetry`
- `warehouse`
- `procurement`
- `finance`
- `hse`
- `sustainability`
- `documents`
- `legal`
- `administration`

Spanish public labels are valid. Internal module keys and route authorization identifiers should remain stable and documented.

## Cleanup policy

Before deleting or moving code:

- Search imports and route references.
- Verify the production API source.
- Confirm that no importer or scheduled task depends on it.
- Prefer deprecation notes over immediate deletion for duplicate data models.

The immediate objective is organization without changing or deleting production records.
