# Quality Standard for MOTIL Maintenance

## Scoring dimensions

Score evidence, not effort. A practical 10-point section score should consider:

- Canonical data quality and traceability: 20%
- Operational workflow completeness: 20%
- Decision usefulness and prioritization: 15%
- UI clarity and DESIGN.md adherence: 15%
- Cross-module integration: 10%
- Security/tenancy/auditability: 10%
- Reliability, tests, deployment, runtime QA: 10%

A visual polish pass cannot compensate for weak canonical data or incomplete workflows.

## 9.5+ standard

A section above 9.5 should have:

- canonical source clearly defined;
- no major duplicate masters or competing workflows;
- high-value tasks executable end-to-end;
- explicit evidence and human authority boundaries;
- strong loading/empty/error/partial/no-permission states;
- responsive, accessible interface aligned with DESIGN.md;
- meaningful tests around dangerous regressions;
- clean build and deployment;
- no material runtime errors in exercised paths;
- authenticated production QA;
- remaining gaps documented as real external/data dependencies rather than hidden defects.

## Continuous development loop

After each completed block:

1. Re-score the affected subarea.
2. Identify the single highest-value remaining gap.
3. Prefer data/operational leverage over cosmetic polish when scores are close.
4. Avoid expanding scope into unrelated modules unless a real dependency requires it.
5. Keep the roadmap tied to observable maintenance outcomes.
