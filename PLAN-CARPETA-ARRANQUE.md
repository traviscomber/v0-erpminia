# Plan: Integración "Carpeta de Arranque" en Módulo Prevención de Riesgos

**Objetivo**: Agregar sistema de validación de documentos de empresas contratistas (EECC) con 2 niveles de aprobación

---

## 1. ESTRUCTURA DE CARPETAS PROPUESTA

```
/app/dashboard/sostenibilidad/prevencion-riesgos/
├── carpeta-arranque/                    (NUEVA)
│   ├── page.tsx                         (Dashboard principal)
│   ├── crear-folder/
│   │   └── page.tsx                     (Crear nueva carpeta)
│   ├── mis-carpetas/
│   │   └── page.tsx                     (Listar mis carpetas)
│   ├── revisar-documentos/
│   │   ├── page.tsx                     (Admin: revisar docs)
│   │   └── [id]/
│   │       └── page.tsx                 (Detalle de carpeta)
│   └── segunda-revision/
│       └── page.tsx                     (Revisor 2: aprobación final)

/components/carpeta-arranque/            (NUEVO)
├── CarpetaArranqueForm.tsx             (Form para subir docs)
├── DocumentValidationCard.tsx          (Card con Cumple/No Cumple)
├── CarpetaStatusBadge.tsx              (Indicador visual: Verde/Rojo)
├── NotificationAlert.tsx                (Alerta de estado)
└── DocumentList.tsx                    (Lista de documentos cargados)
```

---

## 2. TABLAS DE BASE DE DATOS (Supabase)

### Tabla 1: `startup_folders` (Carpetas de Arranque)
```sql
CREATE TABLE startup_folders (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  company_rut VARCHAR(20) NOT NULL,
  created_by UUID NOT NULL,
  status VARCHAR(20), -- 'draft', 'submitted', 'under_review', 'approved', 'rejected'
  submitted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### Tabla 2: `startup_folder_items` (Documentos dentro de cada carpeta)
```sql
CREATE TABLE startup_folder_items (
  id UUID PRIMARY KEY,
  folder_id UUID NOT NULL REFERENCES startup_folders(id),
  document_type VARCHAR(100), -- ej: "Certificado Afiliación"
  file_url VARCHAR(500),
  status VARCHAR(20), -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### Tabla 3: `document_reviews` (Revisiones Nivel 1 y 2)
```sql
CREATE TABLE document_reviews (
  id UUID PRIMARY KEY,
  folder_item_id UUID NOT NULL REFERENCES startup_folder_items(id),
  reviewer_id UUID NOT NULL,
  review_level INT, -- 1 (Dennyse) o 2 (Javier/Gonzalo)
  status VARCHAR(20), -- 'complies', 'non_complies'
  observations TEXT,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);
```

### Tabla 4: `document_notifications` (Auditoría de emails enviados)
```sql
CREATE TABLE document_notifications (
  id UUID PRIMARY KEY,
  folder_id UUID NOT NULL,
  recipient_email VARCHAR(255),
  event_type VARCHAR(50), -- 'submitted', 'rejected', 'approved'
  sent_at TIMESTAMP DEFAULT now()
);
```

---

## 3. FLUJO DE PROCESOS

### 🔵 Paso 1: EECC Carga Documentos
1. EECC accede a `/carpeta-arranque/crear-folder`
2. Selecciona su empresa en dropdown
3. Ve 19 carpetas/documentos requeridos:
   - Certificado de Afiliación
   - Certificado de Accidentabilidad
   - Reglamento Interno
   - Contrato Modelo de Trabajo
   - Copia IRL Colaboradores
   - Copia Contrato Trabajos
   - ... (13 más)
4. Carga archivos PDF en cada uno
5. Presiona "ENVIAR CARPETA COMPLETA"
6. Sistema crea registro en `startup_folders` con status = 'submitted'
7. **Email automático** a: Dennyse, Javier Vargas, Gonzalo Canales

### 🟢 Paso 2: REVISIÓN NIVEL 1 (Dennyse)
1. Dennyse accede a `/revisar-documentos`
2. Ve lista de carpetas "En Revisión"
3. Abre cada carpeta
4. Por cada documento ve:
   - ☑ Casilla: **Cumple**
   - ☐ Casilla: **No Cumple**
   - 📝 Campo Observaciones
5. Si selecciona "No Cumple" → Observaciones OBLIGATORIAS
6. Guarda revisión en `document_reviews` (review_level = 1)
7. Si alguno está rechazado:
   - **Email a EECC**: "Doc rechazado, ver observación: [texto]"
   - EECC vuelve a carpeta-arranque para re-cargar
   - Status vuelve a "draft"

### 🟡 Paso 3: REVISIÓN NIVEL 2 (Javier o Gonzalo)
1. Acceden a `/segunda-revision`
2. Ven carpetas que completaron Nivel 1
3. Confirman o revisan estado asignado por Dennyse
4. Si está TODO bien → **Status = "approved"**
5. Si hay algo mal → **Email a EECC** con observaciones
6. **Email final a Dennyse, Javier, Gonzalo**: "Carpeta EECC [empresa] - APROBADA"

### 📊 Indicadores Visuales
```
2 VERDES = ✅ APROBADO (Dennyse + Javier/Gonzalo firmaron OK)
1 VERDE + 1 ROJO = ⚠️ CON OBSERVACIONES (Hay algo que corregir)
1 ROJO + 1 ROJO = ❌ RECHAZADO (No cumple requisitos)
```

---

## 4. TIPOS DE DOCUMENTOS REQUERIDOS (19 items)

```
1. Certificado de Afiliación y Cotización a Organismo Administrador
2. Certificado de Accidentabilidad (últimos 2 años)
3. Reglamento Interno de Orden, Higiene y Seguridad
4. Copia IRL de todos los colaboradores
5. Copia de Contratos de Trabajo
6. Copia de Registro Entrega de EPP
7. Copia de Registro de Reglamento Interno
8. Recepciones Firmadas del Sistema de Gestión de Salud y Seguridad
9. Exámenes Pre-ocupacionales (vigencia 3 años)
10. Exámenes Ocupacionales (con Nivel de Riesgos críticos/intolerables)
11. Documentación de Trabajadores Extranjeros
12. Procedimientos de Trabajo Actualizados (con RRC)
13. Procedimiento en caso de Accidente
14. Política de Control de Riesgos
15. Copia Carnet de Identidad de Colaboradores
16. Copia Licencia de Conducción (si aplica)
17. Examen Psicosensotécnico (si aplica)
18. Recepción de Conductores (Reglamento Interno)
19. MIPER (Matriz de Identificación de Peligros y Evaluación de Riesgos)
```

---

## 5. IMPLEMENTACIÓN POR FASES

### **FASE 1: Setup Base** (3 días)
- [ ] Crear tablas en Supabase
- [ ] Agregar nuevo módulo `carpeta-arranque` a navegación
- [ ] Página principal: Dashboard vacío
- [ ] Componentes básicos

### **FASE 2: Carga de Documentos** (3 días)
- [ ] Formulario de creación de carpeta
- [ ] Upload de archivos a Vercel Blob
- [ ] Grid de 19 documentos requeridos
- [ ] Guardar en BD

### **FASE 3: Validación Nivel 1** (2 días)
- [ ] Vista para Dennyse
- [ ] Checkboxes Cumple/No Cumple
- [ ] Campo de observaciones obligatorio
- [ ] Guardar reviews en BD

### **FASE 4: Validación Nivel 2** (2 días)
- [ ] Vista para Javier/Gonzalo
- [ ] Confirmar estado de Nivel 1
- [ ] Indicadores visuales (verde/rojo)

### **FASE 5: Notificaciones** (2 días)
- [ ] Enviar emails automáticos
- [ ] Tabla de auditoría
- [ ] Recordatorios

### **FASE 6: Biblioteca de Documentos** (3 días)
- [ ] Subir los 80+ PDFs
- [ ] Categorizar por tipo
- [ ] Motor de búsqueda
- [ ] Descarga desde plataforma

---

## 6. ACCIONES INMEDIATAS

1. **¿Tienes los 80+ PDFs en ZIP?** → Los subiré todos a Vercel Blob
2. **¿Quiénes son Dennyse, Javier, Gonzalo?** → Los agrego como usuarios revisores
3. **¿Comenzamos por Fase 1 o 2?** → Recomiendo Fase 1 (setup de BD) + Fase 2 (upload docs)

---

**Status**: 📋 Plan listo para ejecutar  
**Tiempo estimado**: 2-3 semanas (todas las fases)  
**Prioridad**: Alta (requisito para onboarding de contratistas)

