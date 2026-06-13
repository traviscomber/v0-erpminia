'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, User, AlertCircle, CheckCircle2 } from 'lucide-react';

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
        const response = await fetch('/api/maintenance/work-orders');
        if (!response.ok) throw new Error('Failed to fetch work orders');
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
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update work order');
      const { data } = await res.json();
      setOrders(orders.map(o => o.id === orderId ? data : o));
    } catch (err) {
      console.error('[v0] Error updating order:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-blue-600/10 text-blue-700">Abierto</Badge>;
      case 'assigned':
        return <Badge className="bg-yellow-600/10 text-yellow-700">Asignado</Badge>;
      case 'in_progress':
        return <Badge className="bg-purple-600/10 text-purple-700">En Progreso</Badge>;
      case 'completed':
        return <Badge className="bg-green-600/10 text-green-700">Completado</Badge>;
      case 'closed':
        return <Badge className="bg-gray-600/10 text-gray-700">Cerrado</Badge>;
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
                <div className="flex items-center gap-2 mb-1">
                  <CardTitle className="text-base">{order.work_order_number}</CardTitle>
                  {getStatusBadge(order.status)}
                </div>
                <CardDescription>{order.title}</CardDescription>
              </div>
              <div className={`text-sm font-semibold ${getPriorityColor(order.priority)}`}>
                {order.priority === 'critica_seguridad' ? '🔴 CRÍTICA SEGURIDAD' : order.priority.toUpperCase()}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress */}
            <div>
              <div className="flex justify-between mb-2 text-sm">
                <span className="font-medium">Progreso</span>
                <span className="text-muted-foreground">{order.progress_percentage}%</span>
              </div>
              <Progress value={order.progress_percentage} className="h-2" />
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Tipo</p>
                <p className="font-semibold capitalize">{order.work_type}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Horas
                </p>
                <p className="font-semibold">
                  {order.actual_duration_hours || '-'} / {order.planned_duration_hours}h
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Estado</p>
                <p className="font-semibold capitalize">{order.status}</p>
              </div>
              {order.assigned_to_name && (
                <div>
                  <p className="text-muted-foreground text-xs flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Técnico
                  </p>
                  <p className="font-semibold">{order.assigned_to_name}</p>
                </div>
              )}
            </div>

            {/* Status Update */}
            <div className="pt-3 border-t border-border/50 flex items-center gap-2">
              <Select
                value={order.status}
                onValueChange={(newStatus) => handleStatusUpdate(order.id, newStatus)}
                disabled={updatingId === order.id}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Abierto</SelectItem>
                  <SelectItem value="assigned">Asignado</SelectItem>
                  <SelectItem value="in_progress">En Progreso</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="closed">Cerrado</SelectItem>
                </SelectContent>
              </Select>
              {updatingId === order.id && (
                <span className="text-xs text-muted-foreground">Actualizando...</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {orders.length === 0 && (
        <Card className="border-border bg-muted/30">
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              No hay órdenes de trabajo disponibles
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
