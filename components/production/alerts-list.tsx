import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, Zap } from 'lucide-react';

interface ProductionAlert {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  equipment: string;
  timestamp: Date;
  action_needed: string;
}

interface AlertsListProps {
  alerts: ProductionAlert[];
}

export function AlertsList({ alerts }: AlertsListProps) {
  const severityConfig = {
    critical: { bg: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-800', icon: AlertTriangle },
    warning: { bg: 'bg-yellow-50 border-yellow-200', badge: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
    info: { bg: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-800', icon: Zap },
  };

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alertas Activas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">Sin alertas activas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertas Activas ({alerts.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => {
          const config = severityConfig[alert.severity];
          const Icon = config.icon;
          
          return (
            <div key={alert.id} className={`p-4 border-2 rounded-lg ${config.bg}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3 flex-1">
                  <Icon className="w-5 h-5 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm">{alert.title}</h4>
                      <Badge className={config.badge}>{alert.severity}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{alert.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Equipo: {alert.equipment}</span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {alert.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                    {alert.action_needed && (
                      <p className="text-xs font-medium mt-2 text-yellow-700">Acción: {alert.action_needed}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
