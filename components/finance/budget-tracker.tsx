'use client';

import { AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface BudgetTrackerProps {
  category: string;
  budget: number;
  spent: number;
  forecast: number;
  currency: string;
}

export function BudgetTracker({
  category,
  budget,
  spent,
  forecast,
  currency = 'CLP',
}: BudgetTrackerProps) {
  const percentage = (spent / budget) * 100;
  const remaining = budget - spent;
  const variance = forecast - budget;
  const isOverBudget = forecast > budget;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{category}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Presupuesto: {formatCurrency(budget)}</span>
            <span className="font-semibold">{Math.round(percentage)}%</span>
          </div>
          <Progress value={Math.min(percentage, 100)} />
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground">Gastado</p>
            <p className="font-semibold">{formatCurrency(spent)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Disponible</p>
            <p className={`font-semibold ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(remaining)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Forecast</p>
            <p className={`font-semibold ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(forecast)}
            </p>
          </div>
        </div>

        {isOverBudget && (
          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-600">
              Proyectado {formatCurrency(variance)} sobre presupuesto
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
