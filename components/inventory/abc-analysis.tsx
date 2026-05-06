import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface ABCItem {
  id: string;
  name: string;
  classification: 'A' | 'B' | 'C';
  annual_value: number;
  quantity: number;
  rotation_rate: number; // times per year
  criticality: 'high' | 'medium' | 'low';
}

interface ABCAnalysisProps {
  items: ABCItem[];
}

export function ABCAnalysis({ items }: ABCAnalysisProps) {
  const classificationColors = {
    A: '#ef4444',
    B: '#f59e0b',
    C: '#10b981',
  };

  const criticityColors = {
    high: '#dc2626',
    medium: '#f97316',
    low: '#22c55e',
  };

  const abcDistribution = [
    {
      name: 'Clase A (80% valor)',
      value: items.filter(i => i.classification === 'A').length,
      color: '#ef4444',
    },
    {
      name: 'Clase B (15% valor)',
      value: items.filter(i => i.classification === 'B').length,
      color: '#f59e0b',
    },
    {
      name: 'Clase C (5% valor)',
      value: items.filter(i => i.classification === 'C').length,
      color: '#10b981',
    },
  ];

  const totalValue = items.reduce((sum, i) => sum + i.annual_value, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Items Clase A</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{items.filter(i => i.classification === 'A').length}</p>
            <p className="text-xs text-muted-foreground">80% del valor</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Items Clase B</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{items.filter(i => i.classification === 'B').length}</p>
            <p className="text-xs text-muted-foreground">15% del valor</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Items Clase C</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{items.filter(i => i.classification === 'C').length}</p>
            <p className="text-xs text-muted-foreground">5% del valor</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Distribución ABC</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={abcDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {abcDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Items de Alto Valor (Clase A)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items
            .filter(i => i.classification === 'A')
            .sort((a, b) => b.annual_value - a.annual_value)
            .slice(0, 5)
            .map(item => (
              <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge className="text-xs">CLP {item.annual_value.toLocaleString()}</Badge>
                    <Badge variant="outline" className="text-xs">Rotación: {item.rotation_rate}x/año</Badge>
                  </div>
                </div>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
