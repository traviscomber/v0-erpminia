'use client';

import { useState } from 'react';
import { DocumentUpload } from '@/components/documents/document-upload';
import { DocumentList } from '@/components/documents/document-list';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ComprasDocumentosPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documentos - Compras</h1>
        <p className="text-muted-foreground">Gestión de documentos de compras, contratos, órdenes y proveedores</p>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Subir Documento</TabsTrigger>
          <TabsTrigger value="list">Ver Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subir Nuevo Documento</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentUpload
                module="Compras"
                category="documentos"
                onUploadSuccess={handleUploadSuccess}
                onCancel={() => {
                  // Could navigate or close modal here
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <DocumentList module="Compras" category="documentos" key={refreshKey} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
