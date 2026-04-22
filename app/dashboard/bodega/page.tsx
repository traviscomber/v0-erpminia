'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Package,
  Search,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  QrCode,
  MapPin,
  Barcode,
  ArrowRightLeft,
  Eye,
  Download,
  Filter,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BrandCard } from '@/components/ui/brand-card';
import { AuditTrail } from '@/components/audit-trail';
import { StatusBadge } from '@/components/status-badge';
import { exportToCSV } from '@/lib/export-utils';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { CHART_COLORS_LIGHT } from '@/lib/theme-colors';

interface InventoryMovement {
  id: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  date: string;
  reference: string;
  responsible: string;
  notes?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  current_stock: number;
  minimum_stock: number;
  unit_cost: number;
  total_value: number;
  warehouse_location?: string;
  zone?: string;
  rack?: string;
  level?: string;
  qr_code?: string;
  batch_number?: string;
  received_date?: string;
  expiry_date?: string;
  fifo_order?: number;
  last_movement?: string;
  traceability_enabled?: boolean;
}

export default function BodegaPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from('wear_parts')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const mappedItems: InventoryItem[] = (data || []).map(part => ({
          id: part.id,
          code: part.part_code || '',
          name: part.part_name || '',
          category: part.description?.split('|')[0] || 'General',
          current_stock: part.stock_current || 0,
          minimum_stock: part.stock_min || 10,
          unit_cost: part.unit_cost || 0,
          total_value: (part.stock_current || 0) * (part.unit_cost || 0),
          last_movement: new Date(),
          supplier: part.supplier || 'Por definir',
          lead_time_days: part.lead_time_days || 0,
          critical: part.is_critical || false,
          traceability_enabled: true,
        }));
        
        setItems(mappedItems);
      } catch (err) {
        console.error('[v0] Error fetching wear parts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const lowStockItems = items.filter(i => i.current_stock <= i.minimum_stock).length;
  const totalValue = items.reduce((sum, i) => sum + i.total_value, 0);
  const categories = [...new Set(items.map(i => i.category))];

  const categoryData = categories.map(cat => ({
    name: cat,
    items: items.filter(i => i.category === cat).length,
  }));

  const COLORS = CHART_COLORS_LIGHT;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Gestión de Bodegas</h1>
            <p className="text-muted-foreground mt-3">
              Trazabilidad completa FIFO, QR/barcode, ubicaciones multi-nivel (Zona/Rack/Nivel) y conteo cíclico
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => alert('Funcionalidad de escaneo QR próximamente')}>
              <QrCode className="h-4 w-4" />
              Escanear QR
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => alert('Módulo de conteo cíclico próximamente')}>
              <Package className="h-4 w-4" />
              Conteo Cíclico
            </Button>
            <Button className="gap-2" onClick={() => alert('Crear nuevo movimiento de inventario próximamente')}>
              <Plus className="h-4 w-4" />
              Nuevo Movimiento
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-border overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-chart-1/10 to-transparent rounded-full -mr-12 -mt-12" />
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Movimientos Hoy
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold">12</div>
            <p className="text-xs text-muted-foreground mt-2">recepciones + despachos</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-primary/5 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -mr-12 -mt-12" />
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bodegas Activas
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-primary">4</div>
            <p className="text-xs text-muted-foreground mt-2">Central, Faena, Regional, Campaña</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-destructive/5 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-destructive/10 to-transparent rounded-full -mr-12 -mt-12" />
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recepción Pendiente
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-destructive">3</div>
            <p className="text-xs text-muted-foreground mt-2">OC por confirmar</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-accent/5 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-accent/10 to-transparent rounded-full -mr-12 -mt-12" />
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Exactitud Inventario
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-accent">98.2%</div>
            <p className="text-xs text-muted-foreground mt-2">físico vs sistema</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert for Low Stock */}
      {lowStockItems > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <CardTitle className="text-destructive">
                  Items con Stock Bajo
                </CardTitle>
                <CardDescription>
                  {lowStockItems} artículo(s) está(n) por debajo del nivel mínimo
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Distribution */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Distribución por Categoría</CardTitle>
            <CardDescription>Items por categoría</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="items"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-6 pt-4 border-t border-border">
              {categoryData.slice(0, 4).map((item, idx) => (
                <div key={item.name} className="text-center">
                  <div
                    className="w-2 h-2 rounded-full mx-auto mb-2"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <p className="text-xs font-medium text-muted-foreground truncate">{item.name}</p>
                  <p className="text-sm font-bold">{item.items}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stock Status */}
        <Card className="border-border lg:col-span-2">
          <CardHeader>
            <CardTitle>Estado del Inventario</CardTitle>
            <CardDescription>Análisis de disponibilidad</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Items Disponibles</span>
                <span className="text-2xl font-bold text-green-600">
                  {items.filter(i => i.current_stock > i.minimum_stock).length}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{
                    width: `${
                      items.length > 0
                        ? (items.filter(i => i.current_stock > i.minimum_stock).length / items.length) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Items con Stock Bajo</span>
                <span className="text-2xl font-bold text-red-600">{lowStockItems}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full"
                  style={{
                    width: `${items.length > 0 ? (lowStockItems / items.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Disponibilidad: {items.length > 0 ? ((items.filter(i => i.current_stock > i.minimum_stock).length / items.length) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Items Table */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <CardTitle>Listado de Inventario</CardTitle>
              <CardDescription>Administra todos los items en bodega</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1 md:flex-initial md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar item..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-input"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40 bg-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando inventario...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No hay items registrados</p>
              <Button className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Crear primer item
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-semibold text-muted-foreground py-3 px-4">Nombre</th>
                    <th className="text-left font-semibold text-muted-foreground py-3 px-4">SKU / Lote</th>
                    <th className="text-left font-semibold text-muted-foreground py-3 px-4">Ubicación (Zona/Rack/Nivel)</th>
                    <th className="text-left font-semibold text-muted-foreground py-3 px-4">Stock Actual</th>
                    <th className="text-left font-semibold text-muted-foreground py-3 px-4">Valor Total</th>
                    <th className="text-left font-semibold text-muted-foreground py-3 px-4">Trazabilidad</th>
                    <th className="text-left font-semibold text-muted-foreground py-3 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors group"
                    >
                      <td className="py-3 px-4 font-medium">{item.name}</td>
                      <td className="py-3 px-4 text-sm">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Barcode className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{item.sku}</span>
                          </div>
                          {item.batch_number && (
                            <div className="text-xs text-muted-foreground">Lote: {item.batch_number}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {item.zone && item.rack && item.level ? (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{item.zone}/{item.rack}/{item.level}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">Sin ubicación</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={
                            item.current_stock <= item.minimum_stock
                              ? 'bg-destructive/10 text-destructive border-destructive/30'
                              : 'bg-accent/10 text-accent border-accent/30'
                          }
                        >
                          {item.current_stock}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-semibold">{formatCurrency(item.total_value)}</td>
                      <td className="py-3 px-4">
                        {item.traceability_enabled ? (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-accent" />
                            <span className="text-xs text-accent font-medium">Activa</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground font-medium">Desactiva</span>
                        )}
                        {item.qr_code && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            QR: {item.qr_code.slice(0, 6)}...
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          Ver Trazabilidad
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
