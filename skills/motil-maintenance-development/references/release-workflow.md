# Development and Release Workflow

## Default tool path

Use the most authoritative connected source available:

- GitHub for repository state, code, diffs, PRs/commits, and CI.
- Supabase for live schema, migrations, RLS/grants, and canonical data checks.
- Vercel for build/deployment/runtime evidence.
- Authenticated browser/Opera for real production UI and route behavior.

Do not substitute public web search for private repository/database facts.

## Change workflow

1. Read the current code and tests.
2. Reproduce the issue or inspect the current live state when relevant.
3. Identify the canonical source and trust boundary.
4. Implement minimal complete changes.
5. Add/adjust tests that lock semantics, not only strings.
6. For DDL, add and apply a migration; verify RLS and grants.
7. Run tests and build.
8. Confirm exact deployment SHA.
9. Wait for Vercel `READY`.
10. Inspect recent runtime `error/fatal` logs.
11. Perform authenticated QA on the exact production route when feasible.
12. Report PASS/HOLD/BLOCK.

## PASS / HOLD / BLOCK

**PASS** only when required evidence is complete and no material blocker remains.

**HOLD** when the change appears correct but a required gate is pending, unavailable, or inconclusive.

**BLOCK** when a known defect, unsafe migration, failed test/build, runtime error, broken authorization, or canonical-data violation remains.

Never call HOLD a PASS merely because the code looks correct.

## Build and deployment discipline

- A successful local/CI build is not production QA.
- A Vercel `READY` deployment is not proof the feature works end-to-end.
- Runtime logs without the relevant user path being exercised are not sufficient for feature verification.
- Browser console CSP or autofill warnings must not be assumed to cause an API 500 without request/runtime evidence.
- When a production bug is fixed, execute the same failing path again after the exact SHA is deployed.

## Database safety

Safe hardening that restricts access without deleting data may be applied once validated. Destructive data edits, identity merges, mass backfills with uncertain semantics, and irreversible operational mutations require explicit authorization and stronger evidence.
