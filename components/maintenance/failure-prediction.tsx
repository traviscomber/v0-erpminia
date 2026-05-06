import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, Clock } from 'lucide-react';

interface FailurePrediction {
  id: string;
  equipment_name: string;
  risk_level: number; // 0-100
  predicted_failure_date: Date;
  confidence: number; // 0-100
  indicators: string[];
  recommended_action: string;
  days_until_failure: number;
}

interface FailurePredictionListProps {
  predictions: FailurePrediction[];
}

export function FailurePredictionList({ predictions }: FailurePredictionListProps) {
  const getRiskColor = (risk: number) => {
    if (risk >= 70) return 'bg-red-100 text-red-800 border-red-300';
    if (risk >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-green-100 text-green-800 border-green-300';
  };

  const getRiskLabel = (risk: number) => {
    if (risk >= 70) return 'CRÍTICO';
    if (risk >= 40) return 'ALTO';
    return 'BAJO';
  };

  const sortedPredictions = [...predictions].sort((a, b) => b.risk_level - a.risk_level);

  return (
    <div className="space-y-3">
      {sortedPredictions.map((pred) => (
        <Card key={pred.id} className={`border-2 ${getRiskColor(pred.risk_level)}`}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <AlertTriangle className="w-5 h-5 mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm">{pred.equipment_name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{pred.recommended_action}</p>
                </div>
              </div>
              <Badge className={`${getRiskColor(pred.risk_level)} flex-shrink-0`}>
                {getRiskLabel(pred.risk_level)} {pred.risk_level}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Fallo en: {pred.days_until_failure} días</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>Confianza: {pred.confidence}%</span>
              </div>
              <span className="text-muted-foreground">
                {pred.predicted_failure_date.toLocaleDateString()}
              </span>
            </div>
            {pred.indicators.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs font-medium mb-1">Indicadores:</p>
                <div className="flex flex-wrap gap-1">
                  {pred.indicators.map((ind, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {ind}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
