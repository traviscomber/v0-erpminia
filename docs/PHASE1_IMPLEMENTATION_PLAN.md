# FASE 1: FLUJO DE APROBACIÓN FUNCIONAL - PLAN DETALLADO

## OBJETIVO
Implementar flujo de aprobación de documentos completamente funcional:
- 2 validadores: Jefe de Sostenibilidad → Gerente General
- BD con tracking completo
- Notificaciones por usuario
- Audit trail automático

## TAREAS FASE 1

### TAREA 1.1: API Endpoint - POST /api/documentos/approve
**Criticidad:** 🔴 CRÍTICA | **Tiempo:** 2-3 horas

Implementar endpoint que:
- Recibe document_id, approval_level, comments
- Valida permisos del usuario
- Registra aprobación en `document_approvals`
- Crea audit log en `document_audit_log`
- Retorna status de workflow

**Archivo:** `/app/api/documentos/approve/route.ts`

```typescript
// Pseudo-código
POST /api/documentos/approve
{
  document_id: UUID,
  approval_level: 'jefe_sostenibilidad' | 'gerente_general',
  comments: string,
  signature: string (digital)
}

Response:
{
  success: boolean,
  approval_id: UUID,
  next_step: string,
  workflow_status: 'pending' | 'approved' | 'rejected'
}
```

---

### TAREA 1.2: Actualizar Schema BD
**Criticidad:** 🔴 CRÍTICA | **Tiempo:** 1-2 horas

**Migration SQL:**
```sql
-- Ampliar document_approvals con campos faltantes
ALTER TABLE document_approvals ADD COLUMN IF NOT EXISTS (
  approval_role TEXT,
  signature TEXT,
  signature_date TIMESTAMP,
  rejection_reason TEXT
);

-- Crear índices para performance
CREATE INDEX IF NOT EXISTS idx_doc_approvals_document 
  ON document_approvals(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_approvals_status 
  ON document_approvals(status);
```

**Archivo:** `/db/migrations/xxx-document-approval-schema.sql`

---

### TAREA 1.3: Componente ApprovalWorkflowCard Funcional
**Criticidad:** 🔴 CRÍTICA | **Tiempo:** 3-4 horas

Actualizar `/components/documents/approval-workflow-card.tsx` para:
- Conectar con API real (no mock)
- Botones de Aprobar/Rechazar funcionales
- Modal para comentarios y firma
- Estados visuales dinámicos
- Notificaciones inline

**Props:**
```typescript
interface ApprovalWorkflowCardProps {
  document_id: UUID;
  current_user_role: string;
  workflow_status: WorkflowStatus;
  onApprovalChange: (status) => void;
}
```

---

### TAREA 1.4: Dashboard Documentos con Datos Reales
**Criticidad:** 🟠 ALTA | **Tiempo:** 2-3 horas

Actualizar `/app/dashboard/sostenibilidad/documentos-flujo/page.tsx`:
- Fetch datos de BD (no mock)
- Filtros por estado/usuario
- Tabs: "Mi Aprobación", "En Espera", "Aprobados"
- Indicadores de urgencia

---

### TAREA 1.5: Notificaciones Aprobación
**Criticidad:** 🟠 ALTA | **Tiempo:** 2-3 horas

Sistema de notificaciones:
- Alert cuando llega documento a revisar
- Email/in-app notification
- Dashboard de pendientes

**Archivo:** `/lib/notification-approval.ts`

---

### TAREA 1.6: Audit Trail Automático
**Criticidad:** 🟠 ALTA | **Tiempo:** 2-3 horas

Crear logger automático:
- Cada acción = registro en `document_audit_log`
- User, timestamp, changes, reason
- Reportería de cambios

**Archivo:** `/lib/document-audit.ts`

---

## DATOS INICIALES

5 documentos de prueba con estados variados:
1. "Procedimiento Seguridad Alturas" → En aprobación Jefe
2. "Política de Emergencias" → En aprobación Gerente
3. "Contrato Proveedor 2024" → Aprobado
4. "Resolución Ambiental" → Rechazado (pendiente revisión)
5. "Manual de HSE" → Borrador

---

## CHECKLIST FASE 1

- [ ] API endpoint `/api/documentos/approve` funcional
- [ ] Migration BD ejecutada
- [ ] ApprovalWorkflowCard conectado a datos reales
- [ ] Dashboard con filtros funcionando
- [ ] Notificaciones básicas
- [ ] Audit log automático
- [ ] 5 documentos de prueba creados
- [ ] Testing con 2 usuarios (Jefe + Gerente)
- [ ] Documentación de API en README

---

## SUCCESS CRITERIA

✅ Jefe de Sostenibilidad puede aprobar/rechazar documentos
✅ Gerente General ve pendientes y aprueba
✅ Cada acción queda registrada en audit log
✅ Usuario recibe notificación de cambios
✅ Workflow estados correctos: Pending → Approved/Rejected

---

**Timeline Estimado:** 14-18 horas (2 días de trabajo)
**Dependencias:** Ninguna (usa BD existente)
**Bloqueadores:** Ninguno conocido
