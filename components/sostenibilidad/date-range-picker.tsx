'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from 'lucide-react';

interface DateRangePickerProps {
  startDate?: string;
  endDate?: string;
  onStartDateChange?: (date: string) => void;
  onEndDateChange?: (date: string) => void;
  onReset?: () => void;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onReset,
}: DateRangePickerProps) {
  const hasRange = startDate || endDate;

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium block">Rango de Fechas</label>
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">Desde</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              value={startDate || ''}
              onChange={(e) => onStartDateChange?.(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">Hasta</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              value={endDate || ''}
              onChange={(e) => onEndDateChange?.(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        {hasRange && onReset && (
          <Button variant="outline" size="sm" onClick={onReset}>
            Limpiar
          </Button>
        )}
      </div>
    </div>
  );
}
