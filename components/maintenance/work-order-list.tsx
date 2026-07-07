'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, User } from 'lucide-react';

interface WorkOrder {
  id: string;
  work_order_number: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  work_type: string;
  progress_percentage: number;
  planned_duration_hours: number;
  actual_duration_hours: number;
  assigned_to_name: string;
  created_at: string;
  scheduled_date: string;
  completion_date: string;
  asset_name: string;
}

interface WorkOrderListProps {
  filters: {
    status: string;
    priority: string;
  };
  limit: number;
}

export function WorkOrderList({ filters, limit = 10 }: WorkOrderListProps) {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch('/api/maintenance/work-orders', { credentials: 'include' });
        if (!response.ok) throw new Error('No se pudieron obtener las órdenes de trabajo');
        const { workOrders } = await response.json();
        setOrders((workOrders || []).slice(0, limit));
      } catch (err) {
        console.error('[v0] Error fetching work orders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [limit]);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/maintenance/work-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('No se pudo actualizar la orden de trabajo');
      const { data } = await res.json();
      setOrders(orders.map((o) => (o.id === orderId ? data : o)));
    } catch (err) {
      console.error('[v0] Error updating order:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-blue-600/10 text-blue-700">Abierta</Badge>;
      case 'assigned':
        return <Badge className="bg-yellow-600/10 text-yellow-700">Asignada</Badge>;
      case 'in_progress':
        return <Badge className="bg-purple-600/10 text-purple-700">En progreso</Badge>;
      case 'completed':
        return <Badge className="bg-green-600/10 text-green-700">Completada</Badge>;
      case 'closed':
        return <Badge className="bg-gray-600/10 text-gray-700">Cerrada</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'baja':
        return 'text-gray-600';
      case 'media':
        return 'text-yellow-600';
      case 'alta':
        return 'text-orange-600';
      case 'critica_seguridad':
        return 'text-destructive font-bold';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Cargando órdenes de trabajo...</div>;
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Card key={order.id} className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <CardTitle className="text-base">{order.work_order_number}</CardTitle>
                  {getStatusBadge(order.status)}
                </div>
                <CardDescription>{order.title}</CardDescription>
              </div>
              <div className={`text-sm font-semibold ${getPriorityColor(order.priority)}`}>
                {order.priority === 'critica_seguridad' ? 'CRITICA SEGURIDAD' : (order.priority ?? 'sin prioridad').toUpperCase()}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-medium">Progreso</span>
                <span className="text-muted-foreground">{order.progress_percentage}%</span>
              </div>
              <Progress value={order.progress_percentage} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Tipo</p>
                <p className="font-semibold capitalize">{order.work_type}</p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Horas
                </p>
                <p className="font-semibold">
                  {order.actual_duration_hours || '-'} / {order.planned_duration_hours}h
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estado</p>
                <p className="font-semibold capitalize">{order.status}</p>
              </div>
              {order.assigned_to_name && (
                <div>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    Técnico
                  </p>
                  <p className="font-semibold">{order.assigned_to_name}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-border/50 pt-3">
              <Select
                value={order.status}
                onValueChange={(newStatus) => handleStatusUpdate(order.id, newStatus)}
                disabled={updatingId === order.id}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Abierta</SelectItem>
                  <SelectItem value="assigned">Asignada</SelectItem>
                  <SelectItem value="in_progress">En progreso</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                  <SelectItem value="closed">Cerrada</SelectItem>
                </SelectContent>
              </Select>
              {updatingId === order.id && <span className="text-xs text-muted-foreground">Actualizando...</span>}
            </div>
          </CardContent>
        </Card>
      ))}

      {orders.length === 0 && (
        <Card className="border-border bg-muted/30">
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">No hay órdenes de trabajo disponibles</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
