import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, Clock } from 'lucide-react';

interface FailurePrediction {
  id: string;
  equipment_name: string;
  risk_level: number;
  predicted_failure_date: Date;
  confidence: number;
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
    if (risk >= 70) return 'CRITICO';
    if (risk >= 40) return 'ALTO';
    return 'BAJO';
  };

  const sortedPredictions = [...predictions].sort((a, b) => b.risk_level - a.risk_level);

  return (
    <div className="space-y-3">
      {sortedPredictions.map((pred) => (
        <Card key={pred.id} className={`border-2 ${getRiskColor(pred.risk_level)}`}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-1 items-start gap-3">
                <AlertTriangle className="mt-1 h-5 w-5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold">{pred.equipment_name}</h4>
                  <p className="mt-1 text-xs text-muted-foreground">{pred.recommended_action}</p>
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
                <Clock className="h-3 w-3" />
                <span>Fallo en: {pred.days_until_failure} dias</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span>Confianza: {pred.confidence}%</span>
              </div>
              <span className="text-muted-foreground">{pred.predicted_failure_date.toLocaleDateString()}</span>
            </div>
            {pred.indicators.length > 0 && (
              <div className="border-t pt-2">
                <p className="mb-1 text-xs font-medium">Indicadores:</p>
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
