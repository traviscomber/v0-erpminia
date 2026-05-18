'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripHorizontal, X, Plus } from 'lucide-react';

interface DashboardWidget {
  id: string;
  type: 'kpi' | 'chart' | 'list' | 'timeline';
  title: string;
  position: number;
  visible: boolean;
}

export function CustomizableDashboard() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([
    { id: '1', type: 'kpi', title: 'NCs Pendientes', position: 0, visible: true },
    { id: '2', type: 'chart', title: 'Tendencia de Compliance', position: 1, visible: true },
    { id: '3', type: 'list', title: 'Acciones Vencidas', position: 2, visible: true },
    { id: '4', type: 'timeline', title: 'Timeline de Eventos', position: 3, visible: true },
  ]);
  const [isEditMode, setIsEditMode] = useState(false);

  const toggleWidget = (id: string) => {
    setWidgets(widgets.map(w => (w.id === id ? { ...w, visible: !w.visible } : w)));
  };

  const removeWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id));
  };

  const moveWidget = (id: string, direction: 'up' | 'down') => {
    const index = widgets.findIndex(w => w.id === id);
    if (direction === 'up' && index > 0) {
      [widgets[index].position, widgets[index - 1].position] = [
        widgets[index - 1].position,
        widgets[index].position,
      ];
      const temp = widgets[index];
      widgets[index] = widgets[index - 1];
      widgets[index - 1] = temp;
      setWidgets([...widgets]);
    } else if (direction === 'down' && index < widgets.length - 1) {
      [widgets[index].position, widgets[index + 1].position] = [
        widgets[index + 1].position,
        widgets[index].position,
      ];
      const temp = widgets[index];
      widgets[index] = widgets[index + 1];
      widgets[index + 1] = temp;
      setWidgets([...widgets]);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Dashboard Personalizado</h2>
        <Button
          variant={isEditMode ? 'destructive' : 'default'}
          onClick={() => setIsEditMode(!isEditMode)}
        >
          {isEditMode ? 'Cancelar' : 'Editar'}
        </Button>
      </div>

      <div className="grid gap-4">
        {widgets
          .filter(w => w.visible)
          .sort((a, b) => a.position - b.position)
          .map(widget => (
            <Card key={widget.id} className={isEditMode ? 'ring-2 ring-primary' : ''}>
              <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle>{widget.title}</CardTitle>
                {isEditMode && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveWidget(widget.id, 'up')}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveWidget(widget.id, 'down')}
                    >
                      ↓
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeWidget(widget.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>Widget content for {widget.type}</CardContent>
            </Card>
          ))}
      </div>

      {isEditMode && (
        <div className="mt-4 p-4 border rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">
            Widgets disponibles para agregar: reportes, análisis, calendarios
          </p>
        </div>
      )}
    </div>
  );
}
