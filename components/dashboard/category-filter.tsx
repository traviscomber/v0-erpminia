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
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">
            {normalizedCategories.length} categorías disponibles
          </p>
          <p className="text-xs text-muted-foreground">
            {selectedCategory ? `Mostrando: ${selectedCategory}` : 'Mostrando todas'}
          </p>
        </div>
        <div className="relative group">
          <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            <div className="flex gap-2 min-w-min">
              <Button
                variant={selectedCategory === '' ? 'default' : 'outline'}
                onClick={() => onCategoryChange('')}
                size="sm"
                className="text-xs sm:text-sm shrink-0"
              >
                Todas ({normalizedCategories.length})
              </Button>
              {normalizedCategories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  onClick={() => onCategoryChange(cat)}
                  size="sm"
                  className="text-xs sm:text-sm shrink-0"
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>
          <div className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-background to-transparent pointer-events-none w-8"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{normalizedCategories.length} categorías</span>
        {selectedCategory && (
          <span className="font-medium text-primary">Filtrado: {selectedCategory}</span>
        )}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-between text-sm font-medium',
              selectedCategory && 'border-primary/50 bg-primary/10 hover:bg-primary/15'
            )}
          >
            <span className="truncate">
              {selectedCategory ? `${selectedCategory}` : 'Selecciona una categoría...'}
            </span>
            <ChevronDown className={cn('ml-2 h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar categoría..." className="text-sm" />
            <CommandEmpty className="py-6 text-center text-sm">No se encontraron categorías.</CommandEmpty>
            <CommandGroup className="max-h-80 overflow-y-auto">
              <CommandItem
                onSelect={() => {
                  onCategoryChange('');
                  setOpen(false);
                }}
                className="cursor-pointer"
              >
                <Check className={cn('mr-2 h-4 w-4', selectedCategory === '' ? 'opacity-100' : 'opacity-0')} />
                <span className="font-medium">Todas ({normalizedCategories.length})</span>
              </CommandItem>
              {normalizedCategories.map((cat) => (
                <CommandItem
                  key={cat}
                  onSelect={() => {
                    onCategoryChange(cat);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check className={cn('mr-2 h-4 w-4', selectedCategory === cat ? 'opacity-100' : 'opacity-0')} />
                  {cat}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
