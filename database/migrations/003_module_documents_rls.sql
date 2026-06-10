-- Add RLS policy to module_documents table to allow authenticated users to read all documents
-- This enables the Compras module and all other modules to query documents

CREATE POLICY "module_documents_allow_authenticated_select"
ON public.module_documents
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "module_documents_allow_authenticated_insert"
ON public.module_documents
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "module_documents_allow_authenticated_update"
ON public.module_documents
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "module_documents_allow_authenticated_delete"
ON public.module_documents
FOR DELETE
USING (auth.role() = 'authenticated');
