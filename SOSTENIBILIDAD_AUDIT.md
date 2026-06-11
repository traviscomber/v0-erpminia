# AUDITORÍA: SOSTENIBILIDAD - DOCUMENTOS HSE

## ESTRUCTURA ENCONTRADA

### Rutas de Documentos
- `/app/dashboard/sostenibilidad/prevencion-riesgos/documentos-hse/page.tsx` ✅

### Data Source
Los 83 documentos se están sirviendo desde:
- **API Endpoint**: `/api/documents/list?module=prevención&category=documentos-hse`
- **Database**: Supabase tabla `module_documents`
- **Autenticación**: Requerida (credentials: 'include')

### Flujo de Datos
1. Componente carga en Cliente (`use client`)
2. En `useEffect`, llama a `/api/documents/list` con parámetros:
   - `module=prevención` (minúscula)
   - `category=documentos-hse`
3. API retorna array de documentos
4. Frontend renderiza con `DocumentList` component
5. Muestra estadísticas:
   - Total: 83 documentos
   - Vigentes: 0 aprobados
   - En Revisión: 0
   - Rechazados: 0

### Documentos Mostrados (Screenshot)
- "Seguimiento y control instructivos de S&SO.xls" - 40.5 KB
- "Registro capacitación Procedimiento con máquina Iviana.doc" - 97 KB
- "Evaluación reglamento tránsito interior mina DPRMA-CMLP-E-RITMIN-007.pdf" - 281.69 KB
- "Registro capacitación Procedimiento de Emergencia en Caso de Incendio en Mina.doc" - 90 KB

### Status de Documentos
- Todos en estado "Borrador"
- Ninguno aprobado aún (0 vigentes)
- Ninguno en revisión

### Componentes Utilizados
- `DocumentUpload` - Para subir nuevos documentos
- `DocumentList` - Para listar documentos
- `DocumentReviewModal` - Para revisar documentos (2-level)

### API Endpoints Usados
- `GET /api/documents/list` - Listar documentos
- `DELETE /api/documents/delete` - Eliminar documento
- `POST /api/documents/review` - Revisar documento (L1/L2)

## CONCLUSIÓN

✅ **El dashboard de Sostenibilidad está funcionando correctamente**
- Trae datos reales de Supabase
- Muestra 83 documentos en módulo "prevención"
- Componentes de upload, list, review están operacionales
- Flujo API → Database → UI completamente funcional

Los datos están siendo servidos desde la base de datos Supabase,
no desde archivos estáticos en el file system.
