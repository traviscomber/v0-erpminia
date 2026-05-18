# SOSTENIBILIDAD - Plan de Integración Completa

## 1. CICLO DE SOSTENIBILIDAD ACTUAL vs PROPUESTO

### Ciclo Actual (Desvinculado)
```
Inspecciones → [No genera automáticamente NCs]
NCs → [No tiene acciones correctivas vinculadas]
Acciones Correctivas → [No tiene verificación]
Documentos → [Flujo manual, sin trazabilidad]
Calendario → [No sincronizado con otras áreas]
```

### Ciclo Propuesto (Integrado)
```
1. PLANIFICACIÓN
   ├── Calendario de Inspecciones
   ├── Normativas Requeridas
   └── Riesgos Identificados

2. EJECUCIÓN
   ├── Inspecciones Internas/Externas
   ├── Capacitaciones
   ├── Verificación de EPP
   └── Monitoreo Ambiental

3. ANÁLISIS
   ├── Auto-generación de NCs desde hallazgos
   ├── Cálculo de Compliance Score
   ├── Identificación de patrones
   └── Alertas de incumplimiento

4. CIERRE
   ├── Acciones Correctivas generadas automáticamente
   ├── Verificación y cierre de NCs
   ├── Archivo de evidencia
   └── Reportes de cierre
```

## 2. TABLAS DE BASE DE DATOS EXISTENTES (Verificadas)

### Grupo 1: Inspecciones
- `inspecciones_internas` ✓
- `inspecciones_externas` ✓
- `hse_inspections` ✓

### Grupo 2: No-Conformidades
- `sostenibilidad_nonconformances` ✓
- `sostenibilidad_nc_details` ✓

### Grupo 3: Acciones Correctivas
- `sostenibilidad_corrective_actions` ✓
- `sostenibilidad_ca_updates` ✓

### Grupo 4: Documentos
- `flujo_aprobacion_documentos_sostenibilidad` ✓
- `hse_master_documents` ✓
- `document_approvals` ✓
- `auditoria_documentos_sostenibilidad` ✓

### Grupo 5: Calendario
- `calendario_eventos_sostenibilidad` ✓

### Grupo 6: Capacitaciones
- `capacitaciones_actuales` ✓
- `historico_capacitaciones` ✓

### Grupo 7: EPP
- `epp_maestro` ✓
- `epp_asignacion_historico` ✓
- `epp_resolucion_cambio` ✓

### Grupo 8: Compliance & Auditoría
- `sostenibilidad_compliance_history` ✓
- `normative_frameworks` ✓
- `normative_requirements` ✓

### Grupo 9: KPIs
- `kpi_prevencion` ✓

### Grupo 10: Event Log (Triggers automáticos)
- `event_log` ✓
- `event_history` ✓

## 3. APIs QUE FALTAN (Necesarias)

### Nivel 1: CRUD Básico (Completar lo existente)
- [ ] GET/POST/PUT/DELETE `/api/sostenibilidad/inspecciones` - Completo
- [ ] GET/POST/PUT/DELETE `/api/sostenibilidad/no-conformidades` - Completo
- [ ] GET/POST/PUT/DELETE `/api/sostenibilidad/acciones-correctivas` - Completo
- [ ] GET/POST/PUT/DELETE `/api/sostenibilidad/documentos` - Completo

### Nivel 2: Automaciones & Triggers
- [ ] POST `/api/sostenibilidad/nc/auto-create-from-inspection` - Genera NCs automáticas
- [ ] POST `/api/sostenibilidad/ca/auto-create-from-nc` - Genera CAs automáticas
- [ ] POST `/api/sostenibilidad/ca/verify-closure` - Verifica cierre de CAs
- [ ] POST `/api/sostenibilidad/compliance/calculate-score` - Calcula compliance

### Nivel 3: Inteligencia & Reportes
- [ ] GET `/api/sostenibilidad/dashboard/overview` - KPIs principales
- [ ] GET `/api/sostenibilidad/trends/patterns` - Análisis de patrones
- [ ] GET `/api/sostenibilidad/alerts/overdue` - Alertas de incumplimiento
- [ ] GET `/api/sostenibilidad/reports/period` - Reportes por período

## 4. TRIGGERS DE AUTOMACIÓN PROPUESTOS

### Trigger 1: Inspección → NC
```
Evento: hse_inspections.status = 'completado'
Acción: 
  - Si hallazgos.count > 0
  - Crear sostenibilidad_nonconformances
  - Crear calendario_eventos con alerta
  - Disparar notificación
```

### Trigger 2: NC → CA
```
Evento: sostenibilidad_nonconformances.status = 'aprobada'
Acción:
  - Auto-generar sostenibilidad_corrective_actions
  - Asignar a responsible_person
  - Crear evento en calendario
  - Enviar email
```

### Trigger 3: CA → Cierre
```
Evento: sostenibilidad_corrective_actions.status = 'verificada'
Acción:
  - Marcar NC como 'cerrada'
  - Calcular nuevamente compliance_score
  - Crear evento de cierre
  - Archivar evidencia
```

### Trigger 4: Compliance Score
```
Evento: Diariamente a las 00:00
Acción:
  - Calcular: (NCs cerradas / NCs totales) * 100
  - Identificar tendencias
  - Generar alertas si < 80%
  - Guardar en sostenibilidad_compliance_history
```

## 5. NUEVAS CONEXIONES ENTRE MÓDULOS

### Inspecciones → NCs
```
inspecciones_internas.id → sostenibilidad_nonconformances.source_id
hse_inspections.hallazgos_json → sostenibilidad_nc_details
```

### NCs → Acciones Correctivas
```
sostenibilidad_nonconformances.id → sostenibilidad_corrective_actions.nc_id
Responsable: assigned_to (sostenibilidad_nonconformances)
```

### Calendario Integration
```
Todos los hitos importante crean entrada en calendario_eventos_sostenibilidad
- Inspecciones programadas
- Vencimiento de CAs
- Certificados de capacitación
- Auditorías externas
```

### Documentos Integration
```
flujo_aprobacion_documentos_sostenibilidad ← Vinculado a:
  - NCs (evidence)
  - CAs (action plans)
  - Inspecciones (reports)
  - Capacitaciones (certs)
```

## 6. FASES DE IMPLEMENTACIÓN

### Phase 1: APIs Backend (Esta semana)
1. CRUD completo para Inspecciones
2. CRUD completo para NCs
3. CRUD completo para CAs
4. CRUD completo para Documentos
5. Auto-triggers básicos

### Phase 2: Automaciones (Próxima semana)
1. Implement event_log listeners
2. Auto-generación NC from inspecciones
3. Auto-generación CA from NCs
4. Compliance score calculation
5. Webhooks y notificaciones

### Phase 3: UI/UX Mejorado
1. Conectores visuales entre módulos
2. Workflow canvas
3. Audit trail completo
4. Linked documents viewer

### Phase 4: Reportes
1. Dashboard con KPIs
2. Trend analysis
3. Export PDF/Excel
4. Alertas automáticas

## 7. PRIORIDADES

### CRÍTICA (Esta semana)
- [ ] POST `/api/sostenibilidad/nc/auto-create-from-inspection`
- [ ] POST `/api/sostenibilidad/ca/auto-create-from-nc`
- [ ] GET `/api/sostenibilidad/no-conformidades` (con filtros completos)
- [ ] GET `/api/sostenibilidad/acciones-correctivas` (con filtros completos)

### ALTA (Próximos 3 días)
- [ ] PUT `/api/sostenibilidad/no-conformidades/:id` (estado, asignación)
- [ ] PUT `/api/sostenibilidad/acciones-correctivas/:id` (progreso, verificación)
- [ ] POST `/api/sostenibilidad/compliance/calculate-score`
- [ ] GET `/api/sostenibilidad/alerts/overdue`

### MEDIA
- [ ] Reportes y analytics
- [ ] Event log listeners
- [ ] Webhooks

---

**Status:** Ready for Phase 1 Implementation
**Requester:** Architecture Review Complete
**Next Step:** Create comprehensive API routes
