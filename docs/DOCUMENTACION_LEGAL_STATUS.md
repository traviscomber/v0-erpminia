# DOCUMENTACIÓN LEGAL - ANÁLISIS DE STATUS

## HALLAZGOS CLAVE

**Status Actual:** ❌ AUSENTE EN EL SISTEMA

### LO QUE EXISTE HOY

1. **Módulo "Contratos" (Parcial)**
   - ✅ Tabla `contracts` con 16 campos
   - ✅ Página UI completa en `/dashboard/documentos-gestion/contratos`
   - ✅ Gestión básica (CRUD mockizado)
   - ❌ Backend desconectado
   - ❌ Sin aprobaciones

2. **Tablas de Apoyo Existentes**
   - `contract_amendments` - Enmiendas (vacía)
   - `contractors` - Proveedores (3 campos)
   - `subcontracts` - Subcontratos (parcial)
   - `procurement_documents` - Documentos de compras

### LO QUE FALTA - BRECHAS CRÍTICAS

| Componente | Estado | Criticidad | Acción |
|-----------|--------|-----------|--------|
| **Módulo Legal** | No existe | CRÍTICA | Crear |
| **Documentos Legales** | No existe | CRÍTICA | Crear tabla + UI |
| **Normativas/Regulaciones** | Parcial (normative_frameworks) | ALTA | Completar |
| **Contratos > API Backend** | UI solo | ALTA | Implementar |
| **Aprobaciones Legales** | No existe | ALTA | Conectar al flujo |
| **Audit Trail Legal** | No existe | MEDIA | Agregar |
| **Reportería Legal** | No existe | MEDIA | Crear |

---

## ESTRUCTURA PROPUESTA

### 1. NUEVO MÓDULO: DOCUMENTACIÓN LEGAL

**Ubicación:** `/dashboard/legal/`

**Subsecciones:**
- Contratos (Mejora existente)
- Documentos Legales (Nuevo)
- Normativas y Cumplimiento
- Reportería Legal

### 2. TABLAS REQUERIDAS

```sql
-- Documentos Legales Maestros
CREATE TABLE legal_documents (
  id UUID PRIMARY KEY,
  document_type TEXT, -- 'Contrato', 'Política', 'Procedimiento', etc.
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_path TEXT,
  version TEXT,
  effective_date DATE,
  expiration_date DATE,
  status TEXT, -- 'Vigente', 'Vencido', 'En Revisión'
  responsible_person_id UUID,
  legal_responsible_id UUID,
  created_by UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Aprobaciones Legales (Extiende document_approvals)
CREATE TABLE legal_approvals (
  id UUID PRIMARY KEY,
  legal_document_id UUID,
  approver_id UUID,
  approval_level TEXT, -- 'Abogado', 'Jefe Legal', 'Gerente General'
  status TEXT,
  comments TEXT,
  approved_at TIMESTAMP
);

-- Audit Trail Legal
CREATE TABLE legal_audit_log (
  id UUID PRIMARY KEY,
  document_id UUID,
  action TEXT,
  user_id UUID,
  timestamp TIMESTAMP,
  details JSONB
);

-- Cumplimiento Normativo
CREATE TABLE regulatory_compliance (
  id UUID PRIMARY KEY,
  requirement_id UUID,
  document_id UUID,
  compliance_status TEXT,
  verified_by UUID,
  verified_date DATE,
  evidence_url TEXT
);
```

### 3. DOCUMENTOS POR CATEGORÍA (Propuesta de Contenido)

**Contratos (contracts):**
- Contratos principales
- Enmiendas y addendums
- Términos y condiciones

**Políticas y Procedimientos:**
- Políticas de cumplimiento
- Procedimientos operacionales
- Manuales de usuario

**Normativas:**
- Regulaciones mineras chilenas
- Estándares HSE
- Requisitos legales vigentes

**Documentos Administrativos:**
- Resoluciones
- Permisos
- Certificaciones

---

## PLAN DE IMPLEMENTACIÓN

### Fase 1 (Esta semana)
- [ ] Crear módulo `/dashboard/legal` con landing page
- [ ] Implementar "Documentos Legales" básico (CRUD)
- [ ] Tabla `legal_documents` en BD
- [ ] Página con listado y búsqueda

### Fase 2 (Próxima semana)
- [ ] Conectar flujo de aprobación legal (3 niveles)
- [ ] Audit trail automático
- [ ] Estados y versionado

### Fase 3 (2 semanas)
- [ ] Cumplimiento normativo tracker
- [ ] Reportería legal integrada
- [ ] Dashboard de vigencia/vencimientos

---

## DATOS INICIALES PROPUESTOS

**10 Documentos Legales Mineros:**
1. Contrato Principal 2024 (La Patagua - Proveedor)
2. Resolución Ambiental RA-2024-001
3. Política de Cumplimiento Legal
4. Contrato Subcontratas Operacionales
5. Acuerdo Marco Laboral
6. Certificación ISO 45001
7. Procedimiento de Seguridad Minera
8. Permiso Operacional Vigente
9. Documentación de Seguros
10. Normativa Interna de Compras

---

## RECOMENDACIONES FINALES

1. **Prioridad:** Integrar con flujo de aprobación existente (2 validadores)
2. **Seguridad:** Implementar permisos granulares por área legal
3. **Automatización:** Alertas de vencimiento 30/60/90 días
4. **Integración:** Conectar con módulo de Contratos existente
5. **Trazabilidad:** Audit log obligatorio en cada cambio

---

**Status:** ✅ READY FOR PHASE 1 IMPLEMENTATION
