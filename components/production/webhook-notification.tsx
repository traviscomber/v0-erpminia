import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Clock, Trash2, Edit2 } from 'lucide-react';

interface WebhookConfig {
  id: string;
  name: string;
  endpoint_url: string;
  event_type: 'alert' | 'maintenance' | 'inventory' | 'financial' | 'all';
  status: 'active' | 'inactive' | 'failed';
  last_triggered: Date | null;
  retry_count: number;
  is_verified: boolean;
}

interface WebhookNotificationProps {
  webhooks: WebhookConfig[];
  onEdit: (webhook: WebhookConfig) => void;
  onDelete: (webhook_id: string) => void;
}

export function WebhookNotification({ webhooks, onEdit, onDelete }: WebhookNotificationProps) {
  const eventTypeLabels = {
    alert: 'Alertas de produccion',
    maintenance: 'Ordenes de mantencion',
    inventory: 'Inventario critico',
    financial: 'Presupuesto',
    all: 'Todos los eventos',
  };

  const activeWebhooks = webhooks.filter((webhook) => webhook.status === 'active').length;
  const failedWebhooks = webhooks.filter((webhook) => webhook.status === 'failed').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Webhooks configurados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{webhooks.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Integraciones activas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Webhooks activos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{activeWebhooks}</p>
            <p className="mt-1 text-xs text-muted-foreground">Funcionando correctamente</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Con fallos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${failedWebhooks > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {failedWebhooks}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Requieren atencion</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-sm">Configuracion de webhooks</CardTitle>
          <Button size="sm" variant="outline">
            + Agregar webhook
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className={`rounded-lg border-2 p-3 ${
                webhook.status === 'active'
                  ? 'border-green-200 bg-green-50'
                  : webhook.status === 'inactive'
                    ? 'border-gray-200 bg-gray-50'
                    : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h4 className="truncate text-sm font-semibold">{webhook.name}</h4>
                    <Badge
                      className={
                        webhook.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : webhook.status === 'inactive'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-red-100 text-red-800'
                      }
                    >
                      {webhook.status === 'active' ? 'Activo' : webhook.status === 'inactive' ? 'Inactivo' : 'Fallo'}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{webhook.endpoint_url}</p>
                  <p className="mt-1 text-xs">
                    Evento: <span className="font-medium">{eventTypeLabels[webhook.event_type]}</span>
                  </p>
                </div>
                <div className="flex gap-1">
                  {onEdit && (
                    <Button size="sm" variant="ghost" onClick={() => onEdit(webhook)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button size="sm" variant="ghost" onClick={() => onDelete(webhook.id)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 border-t pt-2 text-xs">
                <div className="flex items-center gap-1">
                  {webhook.is_verified ? (
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-yellow-600" />
                  )}
                  <span>{webhook.is_verified ? 'Verificado' : 'No verificado'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{webhook.last_triggered ? new Date(webhook.last_triggered).toLocaleDateString('es-CL') : 'Nunca'}</span>
                </div>
                {webhook.retry_count > 0 && <div className="font-medium text-red-600">{webhook.retry_count} reintentos</div>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
