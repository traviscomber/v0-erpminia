'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Upload, Plus, FileText, Building2, Hammer, ShieldAlert, BarChart3, Clock } from 'lucide-react';

interface DocumentCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  count: number;
  pendingApprovals: number;
  href: string;
  color: string;
}

const categories: DocumentCategory[] = [
  {
    id: 'contratos',
    name: 'Contratos & Subcontratos',
    description: 'Gestión de contratos principales y subcontratos con contratistas',
    icon: <FileText className="h-6 w-6" />,
    count: 24,
    pendingApprovals: 3,
    href: '/dashboard/documentos-gestion/contratos',
    color: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    id: 'procuracion',
    name: 'Documentos de Procuración',
    description: 'Órdenes de compra, requisiciones y documentos de procuración',
    icon: <Building2 className="h-6 w-6" />,
    count: 156,
    pendingApprovals: 12,
    href: '/dashboard/documentos-gestion/procuracion',
    color: 'bg-green-500/10 border-green-500/20',
  },
  {
    id: 'procedimientos',
    name: 'Procedimientos Operacionales',
    description: 'POS, SOPs y procedimientos estándar de operación',
    icon: <Hammer className="h-6 w-6" />,
    count: 89,
    pendingApprovals: 2,
    href: '/dashboard/documentos-gestion/procedimientos',
    color: 'bg-orange-500/10 border-orange-500/20',
  },
  {
    id: 'seguridad',
    name: 'Documentos de Seguridad',
    description: 'Procedimientos HSE, alertas, y documentación de seguridad',
    icon: <ShieldAlert className="h-6 w-6" />,
    count: 67,
    pendingApprovals: 1,
    href: '/dashboard/documentos-gestion/seguridad',
    color: 'bg-red-500/10 border-red-500/20',
  },
  {
    id: 'reportes',
    name: 'Reportes & Análisis',
    description: 'Reportes operacionales, análisis y documentos ejecutivos',
    icon: <BarChart3 className="h-6 w-6" />,
    count: 234,
    pendingApprovals: 5,
    href: '/dashboard/documentos-gestion/reportes',
    color: 'bg-purple-500/10 border-purple-500/20',
  },
];

export default function DocumentosGestionPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDocuments = categories.reduce((sum, cat) => sum + cat.count, 0);
  const totalPendingApprovals = categories.reduce((sum, cat) => sum + cat.pendingApprovals, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gestión Documental</h1>
          <p className="text-muted-foreground mt-1">
            Centraliza y gestiona todos los documentos de la operación minera
          </p>
        </div>
        <Button className="gap-2 bg-[var(--brand-naranja)] hover:bg-[var(--brand-naranja)]/90">
          <Plus className="h-4 w-4" />
          Cargar Documento
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalDocuments}</div>
            <p className="text-xs text-muted-foreground mt-1">Documentos en el sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pendiente Aprobación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--brand-naranja)]">{totalPendingApprovals}</div>
            <p className="text-xs text-muted-foreground mt-1">Requieren revisión</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Categorías Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Tipos de documentos</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Buscar Categorías</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Busca por nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((category) => (
          <Link key={category.id} href={category.href}>
            <Card className={`cursor-pointer hover:shadow-lg transition-all border ${category.color}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-background">{category.icon}</div>
                    <div>
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      <CardDescription className="text-xs mt-1">{category.description}</CardDescription>
                    </div>
                  </div>
                  {category.pendingApprovals > 0 && (
                    <Badge variant="destructive">{category.pendingApprovals}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{category.count} documentos</span>
                  <span className="font-semibold">{category.pendingApprovals} pendientes</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No se encontraron categorías que coincidan con tu búsqueda
          </CardContent>
        </Card>
      )}
    </div>
  );
}
