import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, TrendingDown, TrendingUp } from 'lucide-react';

interface ProjectBudget {
  project_id: string;
  project_name: string;
  allocated_budget: number;
  spent: number;
  committed: number; // órdenes no pagadas
  status: 'on_track' | 'warning' | 'over_budget';
  department: string;
  start_date: Date;
  end_date: Date;
}

interface BudgetBreakdown {
  category: string;
  allocated: number;
  spent: number;
  percentage: number;
}

interface ProjectBudgetProps {
  projects: ProjectBudget[];
  breakdown: BudgetBreakdown[];
}

export function ProjectBudgetTracker({ projects, breakdown }: ProjectBudgetProps) {
  const totalBudget = projects.reduce((sum, p) => sum + p.allocated_budget, 0);
  const totalSpent = projects.reduce((sum, p) => sum + p.spent, 0);
  const totalCommitted = projects.reduce((sum, p) => sum + p.committed, 0);
  const overBudgetCount = projects.filter(p => p.status === 'over_budget').length;

  const getBudgetColor = (utilization: number) => {
    if (utilization >= 100) return 'bg-red-100 text-red-800';
    if (utilization >= 80) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusBadge = (status: ProjectBudget['status']) => {
    switch (status) {
      case 'on_track':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'over_budget':
        return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Presupuesto Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">CLP {(totalBudget / 1e6).toFixed(1)}M</p>
            <p className="text-xs text-muted-foreground">Todos proyectos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Gastado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">CLP {(totalSpent / 1e6).toFixed(1)}M</p>
            <p className="text-xs text-muted-foreground">{((totalSpent / totalBudget) * 100).toFixed(0)}% utilizado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Comprometido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">CLP {(totalCommitted / 1e6).toFixed(1)}M</p>
            <p className="text-xs text-muted-foreground">OCs pendientes pago</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Proyectos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{projects.length}</p>
            <p className={`text-xs font-medium ${overBudgetCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {overBudgetCount > 0 ? `${overBudgetCount} sobre presupuesto` : 'Dentro presupuesto'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Presupuesto por Proyecto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {projects.map((proj) => {
            const utilized = ((proj.spent + proj.committed) / proj.allocated_budget) * 100;
            const remaining = Math.max(0, proj.allocated_budget - (proj.spent + proj.committed));

            return (
              <div key={proj.project_id} className="p-3 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate">{proj.project_name}</h4>
                    <p className="text-xs text-muted-foreground">{proj.department}</p>
                  </div>
                  <Badge className={getStatusBadge(proj.status)}>
                    {proj.status === 'on_track' ? 'En Orden' :
                     proj.status === 'warning' ? 'Alerta' : 'Sobre Presupuesto'}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>CLP {(proj.spent / 1e6).toFixed(2)}M / CLP {(proj.allocated_budget / 1e6).toFixed(1)}M</span>
                      <span className="font-medium">{utilized.toFixed(0)}%</span>
                    </div>
                    <Progress value={Math.min(100, utilized)} className="h-2" />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs border-t pt-2">
                    <div>
                      <span className="text-muted-foreground">Gastado</span>
                      <p className="font-semibold">CLP {(proj.spent / 1e6).toFixed(2)}M</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Comprometido</span>
                      <p className="font-semibold text-blue-600">CLP {(proj.committed / 1e6).toFixed(2)}M</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Disponible</span>
                      <p className="font-semibold text-green-600">CLP {(remaining / 1e6).toFixed(2)}M</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Desglose por Categoría</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {breakdown.map((cat) => (
            <div key={cat.category} className="p-2 border rounded">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium">{cat.category}</p>
                <Badge variant="outline">{cat.percentage}%</Badge>
              </div>
              <Progress value={cat.percentage} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                CLP {(cat.spent / 1e6).toFixed(2)}M / CLP {(cat.allocated / 1e6).toFixed(2)}M
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
