# Canonical Asset Master

Motil uses a single canonical physical-asset identity across the Mining OS.

## Source of truth

- Canonical table: `canonical.assets`
- Application read contract: `public.canonical_assets_current`
- Stable identity: `canonical_assets_current.id`

No domain may create a second canonical asset master.

## Domain rules

- Mantención, Producción, Telemetría, Bodega/abastecimiento and Finanzas must reference the canonical asset ID whenever the relationship is verified.
- `maintenance_canonical_assets_v1` is a compatibility projection only. It is not an independent master.
- Finance-derived asset lists such as `canonical_finance_assets` are analytical/domain projections, not physical-asset truth.
- Finance identities must be reconciled against `canonical_assets_current` before costs are presented as belonging to a physical asset.
- Ambiguous or unmatched identities remain unresolved and must never be auto-merged.

## Current production state — 2026-08-24

- Canonical physical assets: 114
- Active assets: 113
- Validation state: 114 `valid`
- Finance identities reconciled exactly against the canonical master: 109

## Canonical lineage

`source evidence -> canonical.assets -> canonical_assets_current.id -> domain references -> operational flows -> intelligence`

Any new import, API, workflow, ledger or intelligence projection that needs an asset must resolve to this canonical ID or explicitly remain unresolved.

## Prohibited patterns

- New per-module asset master tables.
- Treating a finance, maintenance, telemetry or production projection as a separate source of truth.
- Matching assets by guessed names, fuzzy similarity or inferred equipment type without approved evidence.
- Replacing missing canonical identity with a synthetic ID.
- Using unresolved identities in cost-per-asset, availability-per-asset or cross-area causal conclusions.

## Compatibility

Legacy and domain-specific views may remain temporarily for existing routes, but they must project from or reconcile to `canonical_assets_current`. New code should use the neutral canonical contract directly.
