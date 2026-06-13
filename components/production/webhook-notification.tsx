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
    alert: 'Alertas de Producción',
    maintenance: 'Órdenes Mantención',
    inventory: 'Inventario Crítico',
    financial: 'Presupuesto',
    all: 'Todos los Eventos',
  };

  const activeWebhooks = webhooks.filter(w => w.status === 'active').length;
  const failedWebhooks = webhooks.filter(w => w.status === 'failed').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Webhooks Configurados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{webhooks.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Integraciones activas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Webhooks Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{activeWebhooks}</p>
            <p className="text-xs text-muted-foreground mt-1">Funcionando correctamente</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Con Fallos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${failedWebhooks > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {failedWebhooks}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Requieren atención</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-sm">Configuración de Webhooks</CardTitle>
          <Button size="sm" variant="outline">+ Agregar Webhook</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className={`p-3 border-2 rounded-lg ${
                webhook.status === 'active' ? 'border-green-200 bg-green-50' :
                webhook.status === 'inactive' ? 'border-gray-200 bg-gray-50' :
                'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm truncate">{webhook.name}</h4>
                    <Badge className={
                      webhook.status === 'active' ? 'bg-green-100 text-green-800' :
                      webhook.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {webhook.status === 'active' ? 'Activo' : 
                       webhook.status === 'inactive' ? 'Inactivo' : 'Fallo'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{webhook.endpoint_url}</p>
                  <p className="text-xs mt-1">
                    Evento: <span className="font-medium">{eventTypeLabels[webhook.event_type]}</span>
                  </p>
                </div>
                <div className="flex gap-1">
                  {onEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEdit(webhook)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(webhook.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs border-t pt-2">
                <div className="flex items-center gap-1">
                  {webhook.is_verified ? (
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-yellow-600" />
                  )}
                  <span>{webhook.is_verified ? 'Verificado' : 'No verificado'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{webhook.last_triggered ? new Date(webhook.last_triggered).toLocaleDateString() : 'Nunca'}</span>
                </div>
                {webhook.retry_count > 0 && (
                  <div className="text-red-600 font-medium">
                    {webhook.retry_count} reintentos
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
