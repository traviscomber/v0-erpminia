'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function CategoryFilter({ categories, selectedCategory, onCategoryChange }: CategoryFilterProps) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Detect mobile on mount and window resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Filter categories based on search
  const filteredCategories = categories.filter(cat =>
    cat.toLowerCase().includes(searchValue.toLowerCase())
  );

  // Desktop: Show scrollable buttons
  if (!isMobile) {
    return (
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Button
          variant={selectedCategory === '' ? 'default' : 'outline'}
          onClick={() => onCategoryChange('')}
          className="text-sm shrink-0"
        >
          Todas
        </Button>
        {categories.map(cat => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? 'default' : 'outline'}
            onClick={() => onCategoryChange(cat)}
            className="text-sm shrink-0 whitespace-nowrap"
          >
            {cat}
          </Button>
        ))}
      </div>
    );
  }

  // Mobile: Show dropdown with search
  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-between text-sm',
              selectedCategory && 'border-primary bg-primary/5',
            )}
          >
            <span className="truncate">
              {selectedCategory || 'Seleccionar categoría...'}
            </span>
            <ChevronDown className="w-4 h-4 ml-2 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Buscar categorías..."
              value={searchValue}
              onValueChange={setSearchValue}
              className="h-9"
            />
            <CommandEmpty>No se encontraron categorías.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-y-auto">
              <CommandItem
                value=""
                onSelect={() => {
                  onCategoryChange('');
                  setOpen(false);
                  setSearchValue('');
                }}
                className={cn(selectedCategory === '' && 'bg-accent')}
              >
                Todas ({categories.length})
              </CommandItem>
              {filteredCategories.map(cat => (
                <CommandItem
                  key={cat}
                  value={cat}
                  onSelect={() => {
                    onCategoryChange(cat);
                    setOpen(false);
                    setSearchValue('');
                  }}
                  className={cn(selectedCategory === cat && 'bg-accent')}
                >
                  {cat}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Show badge if a category is selected */}
      {selectedCategory && (
        <Badge variant="secondary" className="text-xs whitespace-nowrap">
          {selectedCategory}
        </Badge>
      )}
    </div>
  );
}
