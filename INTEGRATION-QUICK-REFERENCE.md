# Document Management System - Quick Integration Guide

**Copy/Paste Template for Any Module**

---

## Step 1: Create Folder Structure

```bash
mkdir -p /app/dashboard/MODULE/documentos
# Examples:
# - /app/dashboard/sostenibilidad/mantenimiento/documentos
# - /app/dashboard/finanzas/documentos
# - /app/dashboard/hse/documentos
```

## Step 2: Copy Page Template

Create `page.tsx` with this template (replace `MODULO` and `modulo` with your module name):

```tsx
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DocumentUpload } from '@/components/documents/document-upload';
import { DocumentList, Document } from '@/components/documents/document-list';
import { DocumentReviewModal } from '@/components/documents/document-review-modal';
import { FileText, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface DocumentStats {
  total: number;
  vigentes: number;
  en_revision: number;
  rechazados: number;
}

export default function DocumentosMODULOPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [stats, setStats] = useState<DocumentStats>({
    total: 0,
    vigentes: 0,
    en_revision: 0,
    rechazados: 0,
  });

  // Cargar documentos
  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/documents/list?module=modulo&category=documentos');
      const data = await response.json();
      if (Array.isArray(data)) {
        setDocuments(data);
        setStats({
          total: data.length,
          vigentes: data.filter((d: Document) => d.status === 'active').length,
          en_revision: data.filter((d: Document) => 
            d.status === 'pending_l1' || d.status === 'pending_l2'
          ).length,
          rechazados: data.filter((d: Document) => d.status === 'rejected').length,
        });
      }
    } catch (error) {
      console.error('Error cargando documentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/delete?id=${documentId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setDocuments(documents.filter(d => d.id !== documentId));
        await loadDocuments();
      }
    } catch (error) {
      console.error('Error eliminando documento:', error);
    }
  };

  const handleView = (document: Document | string) => {
    if (typeof document === 'string') {
      const doc = documents.find(d => d.id === document);
      if (doc) setSelectedDoc(doc);
    } else {
      setSelectedDoc(document);
    }
    setReviewOpen(true);
  };

  const handleApprove = async (documentId: string, observations?: string) => {
    try {
      const response = await fetch('/api/documents/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          action: 'approve',
          observations,
          reviewLevel: 'L1',
        }),
      });
      if (response.ok) await loadDocuments();
    } catch (error) {
      console.error('Error aprobando documento:', error);
    }
  };

  const handleReject = async (documentId: string, observations: string) => {
    try {
      const response = await fetch('/api/documents/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          action: 'reject',
          observations,
          reviewLevel: 'L1',
        }),
      });
      if (response.ok) await loadDocuments();
    } catch (error) {
      console.error('Error rechazando documento:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Documentos MODULO</h1>
        <p className="text-muted-foreground mt-2">Gestión de documentos y procedimientos</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Total</span>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">documentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Vigentes</span>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">{stats.vigentes}</p>
            <p className="text-xs text-muted-foreground">aprobados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>En Revisión</span>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-500">{stats.en_revision}</p>
            <p className="text-xs text-muted-foreground">esperando aprobación</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Rechazados</span>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">{stats.rechazados}</p>
            <p className="text-xs text-muted-foreground">pendientes de corrección</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="vigentes">Vigentes</TabsTrigger>
          <TabsTrigger value="revision">En Revisión</TabsTrigger>
          <TabsTrigger value="upload">Subir Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <DocumentList
            documents={documents}
            isLoading={loading}
            onView={handleView}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="vigentes">
          <DocumentList
            documents={documents.filter(d => d.status === 'active')}
            isLoading={loading}
            onView={handleView}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="revision">
          <DocumentList
            documents={documents.filter(d => 
              d.status === 'pending_l1' || d.status === 'pending_l2'
            )}
            isLoading={loading}
            onView={handleView}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Subir Nuevo Documento</CardTitle>
              <CardDescription>Sube un nuevo documento en este módulo</CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentUpload 
                module="modulo"
                category="documentos"
                onUploadSuccess={loadDocuments}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Modal */}
      <DocumentReviewModal
        document={selectedDoc}
        isOpen={reviewOpen}
        onClose={() => {
          setReviewOpen(false);
          setSelectedDoc(null);
        }}
        onApprove={handleApprove}
        onReject={handleReject}
        reviewLevel="L1"
      />
    </div>
  );
}
```

## Step 3: Replace Placeholders

Find and replace:
- `MODULO` → Your module display name (e.g., "Mantenimiento")
- `modulo` → Your module identifier (e.g., "mantenimiento")

## Step 4: Add to Navigation

Update the module's main page (`page.tsx`) to add a link to documentos:

```tsx
{
  title: "Documentos MODULO",
  description: "Gestión de documentos y procedimientos",
  href: "/dashboard/MODULE/documentos",
  icon: FileText,
  // ... other config
}
```

## Step 5: Test

1. Navigate to the new documentos page
2. Click "Subir Documentos" tab
3. Upload a test file (PDF, DOCX, or XLSX)
4. Verify file appears in list
5. Click review button
6. Test approve/reject workflow

---

## Modules to Integrate

- ✅ Prevención (Done: `/dashboard/sostenibilidad/prevencion-riesgos/documentos-hse`)
- [ ] Mantenimiento
- [ ] Finanzas
- [ ] HSE
- [ ] Bodega
- [ ] Legal
- [ ] Others...

---

## File Structure After Integration

```
/app/dashboard/MODULE/
├── page.tsx (main module page)
├── layout.tsx (if needed)
└── documentos/
    └── page.tsx (NEW - document management)
```

---

## Customization

### Change Module Name
Replace `modulo` with your module's lowercase identifier everywhere

### Change Category
Change `category="documentos"` to `category="procedures"`, `category="contracts"`, etc.

### Change Display Title
Customize the `<h1>` and CardDescription text

### Add More Stats
Add more cards based on your needs:
```tsx
{
  label: 'Por Expirar',
  count: documents.filter(d => d.daysUntilExpiry <= 30).length,
  color: 'text-orange-500',
  icon: AlertTriangle,
}
```

---

## Troubleshooting

**Files not appearing:**
- Check API at `/api/documents/list?module=YOUR_MODULE`
- Verify module name matches exactly
- Check database for records

**Upload not working:**
- Check file type (PDF, DOCX, XLSX only)
- Check file size (<50MB)
- Check browser console for errors

**Compile errors:**
- Ensure all imports are correct
- Check for typos in module names
- Clear node_modules and reinstall

---

**Ready to integrate into your module!** Copy/paste, replace placeholders, and test. 🚀
