# Guia Maestro MVP v0 - n3uralia ERP Mineria

Version: 1.1  
Fecha: 2026-06-03  
Horizonte: 4 meses (16 semanas)  
Estado: Documento base de ejecucion

---

## 1) Objetivo del documento

Este documento define la guia oficial para terminar el MVP v0 modulo por modulo.

Objetivo principal:
- Tener todos los modulos del sidebar en estado usable en entorno dev.
- Conectar todas las paginas posibles a BD real con Supabase.
- Eliminar rutas rotas, endpoints faltantes y dependencias criticas de mock en flujos principales.
- Llegar a un release candidate v0 con criterio claro de Go/No-Go.

---

## 2) Alcance v0 (lo que SI debe quedar listo)

### Prioridad 1 (negocio)
- Sostenibilidad completo.
- Legal + Documentos completo.
- Aprobaciones con notificaciones email reales.

### Prioridad 2 (operacion)
- Mantencion + Ordenes de Trabajo.
- Bodega e Inventario.
- Produccion.

### Prioridad 3 (gestion y soporte)
- Compras.
- Finanzas.
- Reportes.
- IA Operacional (version MVP funcional).
- Dashboard KPI (version MVP funcional).
- Administracion (Usuarios + Permisos).
- Busqueda global transversal.

### Fuera de alcance v0
- Perfeccionamiento visual fino (si no bloquea uso).
- Automatizaciones avanzadas IA.
- Escalamiento multi-tenant enterprise avanzado.

### Nice-to-have dentro de la ventana MVP solo si lo critico ya esta cerrado
- Firma digital en contratos.
- Versionado avanzado de documentos.
- Mejoras de polish no bloqueantes.

---

## 3) Reglas de trabajo (obligatorias)

1. No crear pagina nueva sin contrato de API definido.
2. No cerrar modulo con mocks en flujo principal.
3. Cada modulo cierra con Definition of Done (seccion 8).
4. Cada sprint debe terminar con demo y checklist.
5. Si se detecta drift de esquema DB vs codigo, se corrige antes de seguir.
6. Cualquier endpoint usado por UI debe existir y responder.
7. Seguridad dev: sin exponer endpoints debug/test publicos.
8. No se cierra modulo Legal/Documentos sin upload funcional y aprobaciones notificadas.
9. No se considera "real" un modulo si sigue dependiendo de listas en memoria para el camino principal.

---

## 4) Plan de ejecucion (16 semanas / 8 sprints)

## Sprint 1 (Semanas 1-2) - Base tecnica estable
- Unificar auth (middleware + guards + flujo cookie/session).
- Corregir rutas rotas de navegacion.
- Congelar contrato API v0.
- Normalizar naming (evitar duplicidad de rutas equivalentes).
- Corregir drift de esquema DB critico.
- Levantar inventario final pagina -> SWR -> API -> tabla Supabase.

Salida esperada:
- Login consistente en dashboard y APIs.
- 0 rutas criticas rotas.
- Lista final de endpoints por modulo aprobada.
- Mapa oficial de mocks pendientes y reemplazo planificado.

## Sprint 2 (Semanas 3-4) - Sostenibilidad I
- Implementar APIs reales:
  - `/api/sostenibilidad/capacitaciones`
  - `/api/sostenibilidad/epp`
  - `/api/sostenibilidad/kpi`
- Integrar UI sin fallback mock en esos 3 modulos.
- Agregar validaciones y filtros basicos.
- Reemplazar lecturas mock por SWR + API + Supabase en pantallas del pilar.

Salida esperada:
- CRUD base funcional en 3 modulos de prevencion.
- Datos persistidos en Supabase y ya no en mocks para esos flujos.

## Sprint 3 (Semanas 5-6) - Sostenibilidad II
- Implementar APIs reales:
  - `/api/sostenibilidad/calendario`
  - `/api/sostenibilidad/medio-ambiente`
  - `/api/sostenibilidad/comunidades`
  - `/api/sostenibilidad/documentos-flujo`
  - `/api/sostenibilidad/compliance-report`
  - `/api/sostenibilidad/nonconformances/stats`
  - `/api/sostenibilidad/corrective-actions/stats`
- Cerrar flujo completo Sostenibilidad end-to-end.
- Conectar a BD real las paginas restantes del modulo.

Salida esperada:
- Sostenibilidad completo en estado MVP usable.
- Sin mocks en flujos principales del modulo.

## Sprint 4 (Semanas 7-8) - Legal + Documentos
- Implementar APIs faltantes de Legal:
  - `/api/legal/documentos`
  - `/api/legal/contratos`
  - `/api/legal/compliance`
- Mantener compatibilidad o puente donde hoy exista `/api/contracts` o `/api/documentos`.
- Integrar upload de documentos Legal:
  - validacion de archivos
  - almacenamiento en Blob
  - registro en BD
- Cerrar workflow de aprobacion documental.

Salida esperada:
- Legal y Documentos listos para uso diario en dev.
- Modulo Legal con backend real, upload funcional y compliance visible.

## Sprint 5 (Semanas 9-10) - Notificaciones + Mantencion + OT
- Integrar `NotificationService` en aprobaciones.
- Disparar notificaciones email en approve/reject.
- Completar CRUD real en `/api/maintenance/work-orders` (incluye POST).
- Corregir detalle dinamico de OT (`[id]` real).
- Alinear tablas y queries (`maintenance_orders` vs `maintenance_work_orders`).
- Cerrar MTTR, activos y preventivo con datos consistentes.

Salida esperada:
- Mantencion y OT sin bloqueo funcional.
- Aprobaciones criticas notifican por email.

## Sprint 6 (Semanas 11-12) - Bodega + Produccion
- Implementar:
  - `/api/warehouse/stock`
  - `/api/warehouse/reorder`
  - `/api/warehouse/qr`
- Integrar transferencias y alertas de stock.
- Produccion con data real o seed estable no-fragil.
- Reemplazar mocks visibles de Produccion por SWR + API real donde aplique.

Salida esperada:
- Bodega y Produccion operables de punta a punta.
- KPI operacionales alimentados por datos consistentes.

## Sprint 7 (Semanas 13-14) - Gestion empresarial + IA + Busqueda global
- Implementar:
  - `/api/dashboard/compras`
  - `/api/dashboard/finanzas`
  - `/api/dashboard/reportes`
  - `/api/dashboard/ia-operacional`
  - `/api/dashboard/kpi-dashboard`
- Extender busqueda global a otros modulos.
- Agregar filtros avanzados en documentos y Legal donde tenga mayor valor.
- Entregar version MVP funcional para gestion y capa analitica.

Salida esperada:
- Modulos empresariales e IA sin endpoints faltantes.
- Busqueda transversal operativa al menos en Documentos, Legal y modulos con tablas.

## Sprint 8 (Semanas 15-16) - Cierre v0 deploy-ready
- Implementar `/api/admin/permissions`.
- Limpieza final de deuda tecnica y mocks residuales criticos.
- Pruebas E2E de caminos criticos.
- Runbook de despliegue y checklist final.
- Si todo critico ya esta en PASS:
  - evaluar firma digital en contratos
  - evaluar versionado documental avanzado

Salida esperada:
- Release candidate v0 con Gate final aprobado.

---

## 5) Backlog tecnico priorizado (P0/P1/P2)

## P0 - Bloqueantes
- Conectar todas las paginas posibles a BD real.
- Reemplazar mock data por SWR + API + Supabase.
- Unificacion de auth y guardias.
- Endpoints faltantes usados por UI.
- Drift DB critico (auth y maintenance).
- Rutas dinamicas rotas (`work-orders/[id]` y similares).
- APIs faltantes de Legal:
  - `/api/legal/documentos`
  - `/api/legal/contratos`
  - `/api/legal/compliance`
- Notificaciones email en approve/reject.

## P1 - Alto impacto negocio
- Sostenibilidad completo.
- Legal + Documentos completo.
- Bodega y OT operables.
- Upload de documentos Legal con Blob y validacion.
- Busqueda global y filtros avanzados.

## P2 - Optimizacion
- Refactor de servicios no usados.
- Mejoras visuales no bloqueantes.
- Cobertura de tests adicional.
- Firma digital en contratos.
- Versionado documental avanzado.

---

## 6) Seguridad para modo dev (6 meses)

1. Mantener bloqueo de endpoints debug/test en produccion.
2. Permitir lectura publica solo si `DEMO_PUBLIC_READ=true`.
3. Operaciones de escritura: auth o `x-dev-write-key`.
4. Nunca exponer secrets en cliente.
5. Health endpoint sin filtrar informacion sensible.
6. Registrar errores server-side con contexto minimo.

---

## 7) Calidad y testing minimo por sprint

Cada sprint debe incluir:
- 1 prueba de flujo feliz por modulo tocado.
- 1 prueba de autorizacion/acceso por modulo tocado.
- Smoke test manual de navegacion lateral.
- Verificacion de endpoints nuevos (GET/POST minimo).

Al cierre de cada sprint:
- Sin errores de compilacion.
- Sin links criticos rotos.
- Sin endpoint UI faltante en alcance del sprint.

---

## 8) Definition of Done (por modulo)

Un modulo se considera "Listo MVP" solo si cumple todo:

1. Pagina carga sin error.
2. Endpoint(s) requerido(s) existe(n).
3. Listar + crear + editar (si aplica) funciona.
4. Sin dependencia de mock para flujo principal.
5. Validacion minima en formularios.
6. Filtros basicos operativos.
7. Manejo de error visible para usuario.
8. Permisos minimos por rol aplicados.
9. Prueba funcional minima ejecutada.
10. Documentado en changelog sprint.
11. Datos guardados y recuperados desde BD real cuando aplique.
12. Si el flujo tiene aprobaciones, envia notificacion o deja hook listo para ella.

---

## 9) Ritual de ejecucion (cadencia)

Semanal:
- Lunes: plan semanal y prioridad.
- Miercoles: checkpoint tecnico (riesgos y bloqueos).
- Viernes: demo interna + decision de cierre parcial.

Quincenal (fin de sprint):
- Demo completa de entregables.
- Recuento de deuda tecnica.
- Re-planificacion del siguiente sprint.

---

## 10) Plantilla de seguimiento (usar en cada sprint)

Copiar y completar:

```md
## Sprint X - Semana Y

### Objetivo
- 

### Tareas comprometidas
- [ ] 
- [ ] 
- [ ] 

### Riesgos detectados
- 

### Bloqueos
- 

### Evidencia de avance
- PR/commit:
- Endpoints:
- Pantallas:

### Estado de salida
- [ ] Cumple Definition of Done
- [ ] Demo realizada
- [ ] Aprobado para avanzar
```

---

## 11) Gate final v0 (Go/No-Go)

Debe estar en PASS todo:

1. 0 links del sidebar a paginas inexistentes.
2. 0 endpoints usados por UI sin implementacion.
3. Auth estable en dashboard + APIs.
4. Sin drift critico entre esquema y codigo.
5. Sin mocks en flujo principal de modulos prioritarios.
6. Legal tiene APIs reales, upload funcional y compliance visible.
7. Aprobaciones criticas disparan notificacion email.
8. E2E critico pasa (login, sostenibilidad, documentos, OT, bodega).
9. Seguridad dev aplicada segun politica.
10. Checklist de despliegue completo.
11. Documentacion minima actualizada.
12. Demo final aceptada.

---

## 12) Proximo paso inmediato (arranque)

Semana 1 (inicio Sprint 1):
- Dia 1: cerrar contrato API v0 y mapa final de endpoints.
- Dia 2: unificar auth middleware/guards.
- Dia 3: corregir rutas rotas y links inexistentes.
- Dia 4: corregir drift DB critico (auth/maintenance).
- Dia 5: inventario oficial de mocks, paginas sin BD real y APIs faltantes.

Semana 2:
- Hardening de base tecnica.
- Cerrar pendientes Sprint 1.
- Preparar backlog ejecutable Sprint 2 (Sostenibilidad I).

---

## 13) Endpoints faltantes detectados (base de trabajo)

- `/api/admin/permissions`
- `/api/contracts`
- `/api/contratos/nuevo`
- `/api/contratos/reportes`
- `/api/legal/documentos`
- `/api/legal/contratos`
- `/api/legal/compliance`
- `/api/dashboard/compras`
- `/api/dashboard/finanzas`
- `/api/dashboard/reportes`
- `/api/dashboard/ia-operacional`
- `/api/dashboard/kpi-dashboard`
- `/api/documents`
- `/api/documents/pending`
- `/api/documents/stats`
- `/api/hse/capacitaciones`
- `/api/hse/epp`
- `/api/hse/kpis`
- `/api/sostenibilidad/calendario`
- `/api/sostenibilidad/capacitaciones`
- `/api/sostenibilidad/compliance-report`
- `/api/sostenibilidad/comunidades`
- `/api/sostenibilidad/corrective-actions/stats`
- `/api/sostenibilidad/documentos-flujo`
- `/api/sostenibilidad/epp`
- `/api/sostenibilidad/kpi`
- `/api/sostenibilidad/medio-ambiente`
- `/api/sostenibilidad/nonconformances/stats`
- `/api/warehouse/qr`
- `/api/warehouse/reorder`
- `/api/warehouse/stock`

Nota:
- Esta lista es guia inicial y debe reconfirmarse al cierre de cada sprint.

---

## 14) Prioridades ejecutivas vigentes

### Critico (hace que funcione real)
- Conectar todas las paginas posibles a BD real con Supabase queries.
- Reemplazar mock data con SWR + API.
- Crear APIs faltantes en Legal:
  - `/api/legal/documentos`
  - `/api/legal/contratos`
  - `/api/legal/compliance`
- Integrar notificaciones email en aprobaciones:
  - usar `NotificationService`
  - disparar en approve/reject

### Importante (mejora UX)
- Upload de documentos Legal:
  - componente mejorado
  - validacion de archivos
  - almacenamiento en Blob
- Busqueda global:
  - extender DocumentSearch a otros modulos
  - filtros avanzados

### Nice-to-have (polish)
- Firma digital en contratos.
- Versionado de documentos.

---

## 15) Regla final de ejecucion

No abrimos modulo nuevo si el modulo en curso no cumple su Definition of Done.

Este documento es la guia oficial de desarrollo MVP v0 desde hoy.
