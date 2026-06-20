'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { canonicalCategory, categorySortKey } from '@/lib/bodega-normalization';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function CategoryFilter({ categories, selectedCategory, onCategoryChange }: CategoryFilterProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const normalizedCategories = Array.from(new Set(categories.map(canonicalCategory).filter(Boolean))).sort((a, b) =>
    categorySortKey(a).localeCompare(categorySortKey(b), 'es', { sensitivity: 'base' }),
  );

  if (!isMobile) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === '' ? 'default' : 'outline'}
          onClick={() => onCategoryChange('')}
          size="sm"
          className="text-xs sm:text-sm"
        >
          Todas
        </Button>
        {normalizedCategories.map((cat) => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? 'default' : 'outline'}
            onClick={() => onCategoryChange(cat)}
            size="sm"
            className="text-xs sm:text-sm"
          >
            {cat}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn('w-full justify-between text-sm', selectedCategory && 'border-primary bg-primary/5')}
          >
            <span className="truncate">{selectedCategory || 'Filtrar categoría...'}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar categoría..." />
            <CommandEmpty>No se encontraron categorías.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-y-auto">
              <CommandItem
                onSelect={() => {
                  onCategoryChange('');
                  setOpen(false);
                }}
              >
                <Check className={cn('mr-2 h-4 w-4', selectedCategory === '' ? 'opacity-100' : 'opacity-0')} />
                Todas ({normalizedCategories.length})
              </CommandItem>
              {normalizedCategories.map((cat) => (
                <CommandItem
                  key={cat}
                  onSelect={() => {
                    onCategoryChange(cat);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', selectedCategory === cat ? 'opacity-100' : 'opacity-0')} />
                  {cat}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedCategory && (
        <Badge variant="secondary" className="whitespace-nowrap text-xs">
          {selectedCategory}
        </Badge>
      )}
    </div>
  );
}
