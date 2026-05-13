'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, Handshake, MapPin } from 'lucide-react';

export default function ComunidadesPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Relación con Comunidades</h1>
          <p className="text-muted-foreground">Stakeholders, compromisos y licencia social</p>
        </div>
        <Button className="bg-[var(--brand-naranja)] text-white hover:bg-[var(--brand-naranja)]/90">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Stakeholder
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Stakeholders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <p className="text-xs text-muted-foreground mt-1">Activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Handshake className="w-4 h-4" />
              Compromisos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground mt-1">92% cumplidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Comunidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground mt-1">Ubicaciones</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gestión de Comunidades</CardTitle>
          <CardDescription>Bajo desarrollo - Funcionalidad completa próximamente</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-12">
            Este módulo incluirá relaciones con stakeholders locales, tracking de compromisos comunitarios y monitoreo de licencia social.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
