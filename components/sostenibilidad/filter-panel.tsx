'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';

interface FilterPanelProps {
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  estado?: string;
  onEstadoChange?: (value: string) => void;
  inspector?: string;
  onInspectorChange?: (value: string) => void;
  onReset?: () => void;
  inspectores?: string[];
}

export function FilterPanel({
  searchTerm,
  onSearchChange,
  estado,
  onEstadoChange,
  inspector,
  onInspectorChange,
  onReset,
  inspectores = [],
}: FilterPanelProps) {
  const hasFilters = searchTerm || estado || inspector;

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {onSearchChange && (
          <div>
            <label className="text-sm font-medium mb-2 block">Buscar</label>
            <Input
              placeholder="Número, área..."
              value={searchTerm || ''}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}

        {onEstadoChange && (
          <div>
            <label className="text-sm font-medium mb-2 block">Estado</label>
            <Select value={estado || 'todos'} onValueChange={onEstadoChange}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="planificada">Planificada</SelectItem>
                <SelectItem value="realizada">Realizada</SelectItem>
                <SelectItem value="cerrada">Cerrada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {onInspectorChange && inspectores.length > 0 && (
          <div>
            <label className="text-sm font-medium mb-2 block">Inspector</label>
            <Select value={inspector || 'todos'} onValueChange={onInspectorChange}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los inspectores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {inspectores.map((insp) => (
                  <SelectItem key={insp} value={insp}>
                    {insp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {hasFilters && onReset && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onReset}>
            <X className="h-4 w-4 mr-2" />
            Limpiar filtros
          </Button>
        </div>
      )}
    </div>
  );
}
