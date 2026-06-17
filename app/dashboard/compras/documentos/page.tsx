'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ComprasDocumentosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Documentos de Compras</h1>
        <p className="mt-2 text-muted-foreground">
          Los documentos y respaldos de compras se centralizan en la vista de adquisiciones.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ir a Adquisiciones</CardTitle>
          <CardDescription>Revisa el listado operativo de ordenes de compra.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/dashboard/compras">Abrir Compras</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
