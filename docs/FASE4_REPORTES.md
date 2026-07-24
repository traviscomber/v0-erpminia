# FASE 4: Reportes Analíticos - Documentación

## Descripción General

FASE 4 implementa un sistema completo de reportes analíticos en **tiempo real** que agrega datos de todas las órdenes de trabajo, equipos y técnicos. **NO incluye datos mock** — todos los números provienen de datos reales en la base de datos.

## Arquitectura

### API Endpoints (Tiempo Real)

Todos los endpoints calculan métricas EN VIVO desde la base de datos:

1. **`/api/maintenance/analytics/summary`** (GET)
   - KPIs generales: total OT, completadas, pendientes, vencidas, tasa completación, tiempo promedio
   - Datos últimos 90 días
   - Calcula overdue: scheduled_date < now && status != 'completed'

2. **`/api/maintenance/analytics/work-order-trends`** (GET)
   - Tendencia diaria de OT creadas vs completadas (últimos 30 días)
   - Distribución por tipo de OT: preventivo, correctivo, predictivo, etc.
   - Tasas de completación por tipo

3. **`/api/maintenance/analytics/equipment-risk`** (GET)
   - Top 20 equipos con mayor riesgo (últimos 90 días)
   - Métricas: total fallos, fallos críticos, downtime, MTTR (Mean Time To Repair)
   - Risk score: (failures × 2) + (critical failures × 15) + (failure_frequency × 5)
   - Max score 100

4. **`/api/maintenance/analytics/technician-analytics`** (GET)
   - Desempeño de técnicos (últimos 30 días)
   - Métricas: total OT, completadas, pendientes, críticas
   - Efficiency score: (completion_rate × 50%) + (on_time_rate × 30%) + (critical_handling × 20%)
   - Cargo mostrado desde `profiles.cargos`

5. **`/api/maintenance/analytics/tire-lifecycle`** (GET)
   - Análisis de neumaticos: total, en bodega, operativos, en reparación
   - Tiempo promedio de reparación
   - Tasa de utilización
   - Top 5 neumaticos más reparados

### Componentes de Visualización

1. **`KPICards`** — 6 tarjetas con KPIs principales
2. **`WOTimelineChart`** — Gráfico de barras OT creadas vs completadas
3. **`EquipmentRiskChart`** — Gráfico de barras con equipos en riesgo
4. **`TechnicianPerformanceChart`** — Gráfico de barras con ranking de técnicos

### Páginas de Reportes

- `/dashboard/mantenimiento/reportes/general` — Dashboard principal con KPIs + tendencias
- `/dashboard/mantenimiento/reportes/equipos-criticos` — Análisis de riesgo de equipos
- `/dashboard/mantenimiento/reportes/tecnicos` — Desempeño individual de técnicos
- `/dashboard/mantenimiento/reportes/neumaticos` — Ciclo de vida de neumaticos

## Flujo de Datos

```
DB (work_orders, tire_master, tire_events, profiles) 
    ↓
API Endpoint (calcula métricas en tiempo real)
    ↓
Frontend component (SWR fetches datos)
    ↓
Chart component (Recharts visualiza)
    ↓
User ve reportes SIEMPRE actualizados
```

## Agregación Diaria Opcional

### Configuración (Vercel Crons)

Se incluye archivo `vercel.json` con configuración para ejecutar agregación diaria:

```json
{
  "crons": [
    {
      "path": "/api/cron/maintenance-analytics-daily",
      "schedule": "0 1 * * *"
    }
  ]
}
```

Esto ejecuta `/api/cron/maintenance-analytics-daily` cada día a las 1 AM UTC.

### Endpoint de Agregación

- **`/api/cron/maintenance-analytics-daily`** (POST)
  - Requiere header: `Authorization: Bearer {CRON_SECRET}`
  - Calcula y almacena agregaciones en tabla `maintenance_analytics_daily`
  - Útil para dashboards ejecutivos que necesitan datos pre-calculados
  - **OPCIONAL**: Los reportes funcionan perfectamente sin esto (usan cálculos en vivo)

### Cómo activar

1. Agregar `CRON_SECRET` a variables de entorno en Vercel
2. Vercel ejecutará automáticamente el cron según schedule

## Datos en Tiempo Real vs Agregados

### Tiempo Real (Por defecto)
- ✅ Siempre refleja estado actual
- ✅ NO requiere cron job
- ✅ Sin datos stale/antiguos
- ⚠️ Un poco más lento en dashboards con muchos datos (pero no es notorio)

### Agregados Diarios (Opcional)
- ✅ Muy rápido para dashboards de jefatura
- ⚠️ Solo actualiza una vez al día
- ✅ Bueno para reportes históricos

**Recomendación**: Mantener APIs en tiempo real. El cron es OPCIONAL y solo para optimización.

## Métricas Clave Explicadas

| Métrica | Fórmula | Interpretación |
|---------|---------|-----------------|
| Completion Rate | (completed / total) × 100 | Qué % de OT se completaron |
| MTTR | total_time_to_repair / repair_count | Promedio horas para reparar |
| Efficiency Score | (compl_rate × 0.5) + (on_time × 0.3) + (critical × 0.2) | Score 0-100 de técnico |
| Risk Score | (failures × 2) + (critical × 15) + (freq × 5) | Score 0-100 de equipo |
| Utilization | (installed / total_tires) × 100 | % neumaticos en uso |

## Próximas Fases (FASE 5+)

- **FASE 5**: Alertas automáticas (Slack/Email) cuando riesgos suben
- **FASE 6**: Predicción: ML model que predice fallos antes de ocurran
- **FASE 7**: Optimización: Sugerencias automáticas de mantenimiento preventivo

## URLs Rápidas

- Reportes: `/dashboard/mantenimiento/reportes/general`
- Equipos en riesgo: `/dashboard/mantenimiento/reportes/equipos-criticos`
- Técnicos: `/dashboard/mantenimiento/reportes/tecnicos`
- Neumaticos: `/dashboard/mantenimiento/reportes/neumaticos`
