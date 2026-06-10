# RLS Setup for module_documents Table

## Problema

La tabla `module_documents` en Supabase tiene RLS habilitado pero sin políticas configuradas. Esto impide que el módulo Compras y otros módulos accedan a los documentos.

## Solución

Ejecuta el siguiente SQL en la consola SQL de Supabase (en https://supabase.com/dashboard):

```sql
-- Enable RLS policies for module_documents table
CREATE POLICY IF NOT EXISTS "module_documents_allow_authenticated_select"
ON public.module_documents
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "module_documents_allow_authenticated_insert"
ON public.module_documents
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "module_documents_allow_authenticated_update"
ON public.module_documents
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "module_documents_allow_authenticated_delete"
ON public.module_documents
FOR DELETE
USING (auth.role() = 'authenticated');
```

## Pasos:

1. Ve a tu proyecto Supabase en https://supabase.com
2. Abre la consola "SQL Editor"
3. Copia y pega el SQL anterior
4. Haz clic en "Execute"
5. Recarga tu aplicación

Después de ejecutar esto:
- ✅ Compras podrá acceder a los documentos
- ✅ Prevención seguirá funcionando
- ✅ Todos los módulos con `module_documents` funcionarán correctamente
- ✅ El modal de revisión se abrirá sin problemas

## Verificación

Accede a `/api/check-uploads` para verificar que los 89 documentos ahora aparecen con desglose por módulo.
