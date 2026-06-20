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
  searchTerm: string;
  onSearchChange: (value: string) => void;
  estado: string;
  onEstadoChange: (value: string) => void;
  inspector?: string;
  onInspectorChange?: (value: string) => void;
  onReset: () => void;
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
  const hasFilters = Boolean(searchTerm || estado || inspector);

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium">Buscar</label>
          <Input
            placeholder="Número, área..."
            value={searchTerm || ''}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Estado</label>
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

        <div>
          <label className="mb-2 block text-sm font-medium">Inspector</label>
          <Select value={inspector || 'todos'} onValueChange={onInspectorChange || (() => {})}>
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
      </div>

      {hasFilters && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onReset}>
            <X className="mr-2 h-4 w-4" />
            Limpiar filtros
          </Button>
        </div>
      )}
    </div>
  );
}
