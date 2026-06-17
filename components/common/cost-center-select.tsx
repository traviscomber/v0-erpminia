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
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Buscar centro de costos..." />
          <CommandEmpty>No se encontraron centros de costos.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-y-auto">
            {costCenters.map(cc => (
              <CommandItem
                key={cc.id}
                value={cc.id}
                onSelect={currentValue => {
                  onValueChange(currentValue === value ? '' : currentValue);
                  setOpen(false);
                }}
              >
                <Check className={cn('mr-2 h-4 w-4', value === cc.id ? 'opacity-100' : 'opacity-0')} />
                {cc.code} - {cc.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
