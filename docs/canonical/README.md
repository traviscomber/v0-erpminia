# Motil canonical data

This directory is the source-of-truth documentation for production data, access context and module ownership.

## Rules

1. Supabase project `ttlptyheuqeotadtcbaw` is the production system of record.
2. Canonical tables must be documented here before a new API, importer or dashboard depends on them.
3. Do not duplicate the same business entity across new tables without an explicit migration plan.
4. APIs must resolve the authenticated user, organization and module access before querying canonical data.
5. UI placeholders, mock arrays and demo metrics must never replace production records silently.
6. Any compatibility or legacy table must be labeled as such in `data-map.md`.
7. Documentation snapshots record structure and expected ownership, not confidential row-level data.

## Documents

- `data-map.md`: canonical tables by domain, current production volumes and known duplicate models.
- `access-control.md`: authentication, organization context and permission precedence.
- `project-structure.md`: repository organization and placement rules.
- `verification.md`: pre-release checks for data availability and authorization.

## Current production snapshot

Snapshot date: 2026-08-04.

Confirmed records include:

- 23,337 purchase-order records.
- 4,918 inventory records.
- 123 equipment records.
- 36 maintenance work orders.
- 17 maintenance assets.
- 89 module documents.
- 26 profiles.
- 2 organizations.

These counts prove that production data exists. Empty dashboards must be treated as authorization, organization-context or API-query failures until proven otherwise.
