# Bloque 33 — validación

- Rama base: `main` en `9ffee7ac21a86187bae0765e1ac171727a298fc0`.
- Migración `add_asset_renewal_investment_needs` aplicada correctamente en Supabase.
- Estado de datos al implementar: 0 decisiones de ciclo de vida aprobadas y 0 candidatos rebuild/replace; la UI conserva estado vacío real.
- Centros de costo operacionales: 285; 8 con `budget_annual` registrado. Presupuesto ausente se muestra como ausencia.
- Activos activos: 113; 82 con `cost_center_code` registrado.
- La necesidad de inversión solo puede nacer de una decisión aprobada `rebuild` o `replace`.
- Aprobar una necesidad no muta `budget_annual` ni `budget_used`.
- La brecha financiera agrega necesidades aprobadas por centro de costo para evitar doble conteo del saldo.
- Vercel: commits de modelo y API en estado READY; preview final sin errores registrados durante validación previa al PR.
