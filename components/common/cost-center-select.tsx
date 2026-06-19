'use client';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCostCenters } from '@/hooks/use-cost-centers';
import { useState } from 'react';
import { formatCostCenterLabel, getCostCenterDepth } from '@/lib/cost-centers';

interface CostCenterSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export function CostCenterSelect({
  value,
  onValueChange,
  placeholder = 'Seleccionar centro de costos...',
  required = false,
}: CostCenterSelectProps) {
  const { costCenters, loading } = useCostCenters();
  const [open, setOpen] = useState(false);

  const selectedCostCenter = costCenters.find(cc => cc.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={loading}
        >
          {selectedCostCenter ? `${selectedCostCenter.code} - ${selectedCostCenter.name}` : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar centro de costos..." />
          <CommandEmpty>No se encontraron centros de costos.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-y-auto">
            {!required ? (
              <CommandItem
                value="sin centro de costo"
                onSelect={() => {
                  onValueChange('');
                  setOpen(false);
                }}
              >
                <Check className={cn('mr-2 h-4 w-4', !value ? 'opacity-100' : 'opacity-0')} />
                Sin centro de costo
              </CommandItem>
            ) : null}
            {costCenters.map(cc => (
              <CommandItem
                key={cc.id}
                value={`${cc.code} ${cc.name} ${cc.description ?? ''}`.trim()}
                onSelect={() => {
                  onValueChange(cc.id);
                  setOpen(false);
                }}
              >
                <Check className={cn('mr-2 h-4 w-4', value === cc.id ? 'opacity-100' : 'opacity-0')} />
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 shrink-0 rounded-full border border-muted-foreground/20 bg-muted-foreground/10"
                    style={{ marginLeft: `${getCostCenterDepth(cc.code) * 12}px` }}
                  />
                  <span className="truncate">{formatCostCenterLabel(cc)}</span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
