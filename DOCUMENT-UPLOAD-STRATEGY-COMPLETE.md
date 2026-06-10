# MOTIL MVP - Estrategia de Carga de Documentos Legales

**Date**: June 10, 2026
**Status**: Plan Ready for Implementation

---

## 📊 DOS SISTEMAS INDEPENDIENTES

### Sistema 1: LEGAL MODULE (/dashboard/legal)
**Documentos Corporativos + Contratos**
- Ya existe en el sistema
- API endpoints: `/api/legal/documentos`, `/api/legal/contratos`
- Funcionalidades existentes:
  - Gestión de documentos legales
  - Tracking de contratos
  - Compliance monitoring
  - Búsqueda y filtros
- **REVISOR**: Dennyse Vega (Jefe Legal)

**Tipos de documentos en Legal:**
- Políticas corporativas
- Términos y condiciones
- Contratos maestros
- Regulaciones internas
- Documentos de compliance

---

### Sistema 2: CARPETA DE ARRANQUE (/dashboard/sostenibilidad/prevencion-riesgos/carpeta-arranque)
**Documentos de Validación de Contratistas (Recién creado)**
- Nuevo módulo recién implementado
- Componentes React: DocumentUpload, CarpetaArranqueForm, CarpetaArranqueList
- Funcionalidades:
  - Upload de 19 documentos requeridos por EECC
  - 2-level review (Dennyse L1 → Javier/Gonzalo L2)
  - Progress tracking
  - Status indicators (Pendiente, Revisado, Aprobado, Rechazado)
- **REVISORES**: 
  - Nivel 1: Dennyse Vega
  - Nivel 2: Javier Vargas, Gonzalo Canales

**19 Documentos Requeridos por Contratista:**
1. Certificado de Afiliación
2. Certificado de Accidentabilidad
3. Reglamento Interno (DS 44)
4. IRL (Índice de Riesgo Laboral)
5. Contratos de Trabajo
6. Registro Entrega EPP
7. Reglamento Entrega EPP
8. SGSST (Sistema de Gestión de Seguridad)
9. Procedimientos de Trabajo Críticos
10. Exámenes Pre-ocupacionales
11. Exámenes Ocupacionales
12. Licencias de Conducción
13. Licencias de Izamiento
14. Matriz MIPER (Identificación de Peligros)
15. Procedimiento en caso de Accidente
16. Política de Riesgos
17. Programa de Capacitación HSE
18. Certificados de Afiliación Actualizado
19. Documentos de Cumplimiento Regulatorio

---

## 🔄 WORKFLOW DE CARGA

### Flujo para Legal Module (Documentos Corporativos)

```
1. Login al Dashboard
   ↓
2. Ir a /dashboard/legal
   ↓
3. Click "Agregar Documento"
   ↓
4. Cargar archivo (Word/Excel/PDF)
   ↓
5. Rellenar metadata:
   - Título
   - Categoría
   - Descripción
   - Vigencia (desde/hasta)
   ↓
6. Enviar para Revisión
   ↓
7. Dennyse revisa y aprueba/rechaza
   ↓
8. Documento activo en sistema
```

### Flujo para Carpeta de Arranque (Contratistas)

```
EECC (Empresa Contratista):
1. Login al Dashboard
   ↓
2. Ir a /dashboard/sostenibilidad/prevencion-riesgos/carpeta-arranque
   ↓
3. Click "Nueva Carpeta"
   ↓
4. Selecciona su empresa
   ↓
5. Carga 19 documentos (drag & drop o click)
   ↓
6. Progress bar muestra avance
   ↓
7. Envía para revisión

DENNYSE (L1 Review):
1. Ve carpetas pendientes
   ↓
2. Revisa cada documento
   ↓
3. Marca Cumple/No Cumple + observaciones
   ↓
4. Pasa a Javier o Gonzalo

JAVIER/GONZALO (L2 Approval):
1. Revisa observaciones L1
   ↓
2. Aprueba o rechaza la carpeta
   ↓
3. Notificación a EECC: Aprobado/Rechazado
```

---

## 📁 ESTRUCTURA SUPABASE STORAGE

```
documents/
├── legal/ (Documentos corporativos)
│   ├── politicas/
│   │   ├── Política_Privacidad_v1_2026-01-15.pdf
│   │   └── Política_Seguridad_v2_2026-01-15.docx
│   │
│   ├── contratos/
│   │   └── Contrato_Maestro_Proveedores_v3_2026-01-15.pdf
│   │
│   └── regulaciones/
│       └── Cumplimiento_DS44_v1_2026-01-15.xlsx
│
└── carpeta-arranque/ (Documentos de contratistas)
    ├── eecc-sofia-sabines/ (ID empresa)
    │   ├── 1718000001_Certificado_Afiliacion.pdf
    │   ├── 1718000002_Accidentabilidad.xlsx
    │   └── ...17 más
    │
    └── eecc-felipe-mora/
        ├── documentos...
        └── ...
```

---

## 🚀 OPCIONES DE CARGA

### Opción A: Interface en App (RECOMENDADO) ✅

**Para Legal:**
```
Dashboard → Legal → "Agregar Documento" → Upload
```

**Para Carpeta de Arranque:**
```
Dashboard → Prevención → Carpeta de Arranque → "Nueva Carpeta" → Upload x19
```

Ventajas:
- User-friendly (drag & drop)
- Validación automática en UI
- Progress bar visible
- Crea registro en BD automáticamente
- Notificaciones en tiempo real

---

### Opción B: Script Bulk Upload (Para Admin)

Si necesitas cargar muchos documentos de una vez:

```bash
node scripts/bulk-upload-legal-docs.js \
  --folder=/path/to/legal/docs \
  --type=legal \
  --reviewer=dennyse
```

Script que:
1. Lee carpeta local
2. Sube archivos a Supabase Storage
3. Crea registros en BD
4. Asigna a revisor
5. Envía notificaciones

---

### Opción C: Supabase Dashboard (Manual)

Solo para casos excepcionales:
1. Login a Supabase Project
2. Storage → documents bucket
3. Crea carpeta → Upload archivos
4. Crear registros en BD manualmente

No recomendado (tedioso y propenso a errores)

---

## 📋 CHECKLIST PRE-CARGA

Antes de empezar a subir documentos:

- [ ] Usuarios creados en sistema
  - [ ] Dennyse Vega (Revisor L1)
  - [ ] Javier Vargas (Revisor L2)
  - [ ] Gonzalo Canales (Revisor L2)
  - [ ] Empresas Contratistas (EECC)

- [ ] Buckets Supabase Storage creados
  - [ ] `documents` bucket creado
  - [ ] Folder `/legal` creado
  - [ ] Folder `/carpeta-arranque` creado

- [ ] Documentos organizados localmente
  - [ ] Carpeta `/legal-docs` con documentos corporativos
  - [ ] Carpeta `/carpeta-arranque` con documentos por EECC
  - [ ] Nombres sin caracteres especiales
  - [ ] Formatos válidos (PDF, docx, xlsx)

- [ ] Notificaciones configuradas
  - [ ] Email template para L1 review
  - [ ] Email template para L2 approval
  - [ ] Email template para EECC (resultado)

---

## 🔐 PERMISOS Y SEGURIDAD

### RLS Policies Requeridas

**Para Legal Documents:**
```sql
-- Todos pueden ver documentos aprobados
-- Solo Dennyse puede crear/editar
-- Solo Dennyse/Javier/Gonzalo pueden cambiar status
```

**Para Carpeta de Arranque:**
```sql
-- Empresa puede ver solo sus carpetas
-- Dennyse puede ver todas las carpetas (L1)
-- Javier/Gonzalo pueden ver todas las carpetas (L2)
-- Solo dueño puede cargar documentos iniciales
```

---

## 📊 MONITOREO Y ALERTAS

### Dashboard Legal
- Documentos expirados (color rojo)
- Documentos por expirar (color amarillo)
- Documentos aprobados (color verde)
- Compliance % (KPI principal)

### Dashboard Carpeta de Arranque
- Carpetas pendientes
- Carpetas en L1 review
- Carpetas en L2 review
- Carpetas aprobadas
- Carpetas rechazadas
- Observaciones por resolver

---

## 📞 PRÓXIMOS PASOS

**Para implementar:**

1. **Confirma roles:**
   - ¿Ya existen: Dennyse, Javier, Gonzalo en sistema?
   - ¿Son usuarios admin?

2. **Confirma estructura:**
   - ¿Documentos Legal → 5 categorías?
   - ¿Contratistas → 1-5 EECC o más?

3. **Organiza archivos:**
   - Agrupa documentos por tipo
   - Renombra sin caracteres especiales
   - Confirma formatos (PDF/DOCX/XLSX)

4. **Comienza carga:**
   - Opción A (App) = recomendado
   - O Opción B (Script) si hay 50+ archivos

---

## 📝 EJEMPLO DE CARGA

### Legal Document

```
Nombre: Política_Privacidad_v2.pdf
Categoría: Políticas
Vigencia: 2026-01-15 hasta 2027-01-15
Descripción: Política de privacidad actualizada según LGPD
```

### Carpeta de Arranque Document

```
Empresa: Sofia Sabines
Documento: Certificado_Afiliacion.pdf
Tipo: Certificación
Status: Pendiente L1
Revisor L1: Dennyse Vega
```

---

**¿Listo para comenzar?** Confirma los puntos de "Próximos Pasos" y empezamos 📄
