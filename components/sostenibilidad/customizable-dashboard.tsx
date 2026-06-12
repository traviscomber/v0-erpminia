'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripHorizontal, X } from 'lucide-react';

interface DashboardWidget {
  id: string;
  type: 'kpi' | 'chart' | 'list' | 'timeline';
  title: string;
  position: number;
  visible: boolean;
}

export function CustomizableDashboard() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([
    { id: '1', type: 'kpi', title: 'NC pendientes', position: 0, visible: true },
    { id: '2', type: 'chart', title: 'Tendencia de cumplimiento', position: 1, visible: true },
    { id: '3', type: 'list', title: 'Acciones vencidas', position: 2, visible: true },
    { id: '4', type: 'timeline', title: 'Cronograma de eventos', position: 3, visible: true },
  ]);
  const [isEditMode, setIsEditMode] = useState(false);

  const removeWidget = (id: string) => {
    setWidgets(widgets.filter((widget) => widget.id !== id));
  };

  const moveWidget = (id: string, direction: 'up' | 'down') => {
    const index = widgets.findIndex((widget) => widget.id === id);
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
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboard personalizable</h2>
        <Button variant={isEditMode ? 'destructive' : 'default'} onClick={() => setIsEditMode(!isEditMode)}>
          {isEditMode ? 'Cancelar' : 'Editar'}
        </Button>
      </div>

      <div className="grid gap-4">
        {widgets
          .filter((widget) => widget.visible)
          .sort((a, b) => a.position - b.position)
          .map((widget) => (
            <Card key={widget.id} className={isEditMode ? 'rounded-xl ring-2 ring-primary shadow-none' : 'rounded-xl shadow-none'}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{widget.title}</CardTitle>
                {isEditMode && (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => moveWidget(widget.id, 'up')}>
                      ↑
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => moveWidget(widget.id, 'down')}>
                      ↓
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => removeWidget(widget.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>Contenido del widget: {widget.type}</CardContent>
            </Card>
          ))}
      </div>

      {isEditMode && (
        <div className="mt-4 rounded-lg border bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">Widgets disponibles para agregar: reportes, analisis y calendarios</p>
        </div>
      )}
    </div>
  );
}
