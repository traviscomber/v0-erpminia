# Canonical Asset Master

Motil uses a single canonical physical-asset identity across the Mining OS.

## Source of truth

- Canonical table: `canonical.assets`
- Application read contract: `public.canonical_assets_current`
- Stable identity: `canonical_assets_current.id`
- Cross-domain derived projection: `public.asset_operating_spine_v1`

No domain may create a second canonical asset master.

`asset_operating_spine_v1` is not a second source of truth. It is a rebuildable projection that joins verified evidence by `canonical_asset_id` across maintenance, drilling, recognized costs and telemetry.

## Domain rules

- Mantención, Producción, Telemetría, Bodega/abastecimiento and Finanzas must reference the canonical asset ID whenever the relationship is verified.
- `maintenance_canonical_assets_v1` is a compatibility projection only. It is not an independent master.
- Finance-derived asset lists such as `canonical_finance_assets` are analytical/domain projections, not physical-asset truth.
- New finance reconciliation code must use `finance_asset_reconciliation_v1`; `finance_maintenance_asset_reconciliation_v1` is compatibility-only.
- Finance identities must be reconciled against `canonical_assets_current` before costs are presented as belonging to a physical asset.
- Ambiguous or unmatched identities remain unresolved and must never be auto-merged.
- Missing values remain null. They are not converted to zero or estimated.

## Current production state — 2026-08-24

Across all existing organizations:

- Canonical physical assets: 133.
- Organization `2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee`: 121 assets, 120 active.
- Second existing organization: 12 assets, 11 active.
- Duplicate asset codes inside an organization: 0.
- Foreign keys still pointing to `public.maintenance_assets`: 0.

Verified domain linkage in the principal organization:

- Finance identities reconciled exactly against the canonical master: 109.
- Recognized finance events with canonical asset: 19,426.
- Drilling source reports linked by exact normalized rig name: 4,692 across 7 canonical drill rigs.
- Drilling source reports still unresolved by asset identity: 1 (`rig_name_raw = "0"`).
- Active maintenance work orders without resolvable canonical asset: 1. It references an `Excavadora CAT 390`, which is not present in the canonical master and is tracked in `data_reconciliation_reviews` rather than guessed.
- Telemetry currently linked to canonical assets in the principal organization: none.

## Canonical lineage

`source evidence -> canonical.assets -> canonical_assets_current.id -> domain references -> asset_operating_spine_v1 -> operational flows -> intelligence`

Any new import, API, workflow, ledger or intelligence projection that needs an asset must resolve to this canonical ID or explicitly remain unresolved.

## Cross-domain operating spine

`asset_operating_spine_v1` exposes one row per canonical asset with only recorded evidence:

- maintenance work-order counts and recorded downtime,
- drilling report counts and drilled meters,
- recognized CLP cost events and amount,
- sensor and sensor-reading coverage,
- `evidence_domain_count` to show how many domains are actually connected for that physical asset.

The spine must never infer causality. For example, cost and drilling activity belonging to the same asset may be shown together only when both records independently reference the same `canonical_asset_id`.

## Prohibited patterns

- New per-module asset master tables.
- Treating a finance, maintenance, telemetry or production projection as a separate source of truth.
- Matching assets by guessed names, fuzzy similarity or inferred equipment type without approved evidence.
- Replacing missing canonical identity with a synthetic ID.
- Using unresolved identities in cost-per-asset, availability-per-asset or cross-area causal conclusions.
- Treating an unlinked cost event as an asset cost.
- Treating an absent telemetry reading, OT, cost or production measurement as zero.

## Compatibility

Legacy and domain-specific views may remain temporarily for existing routes, but they must project from or reconcile to `canonical_assets_current`. New code should use the neutral canonical contract directly.
