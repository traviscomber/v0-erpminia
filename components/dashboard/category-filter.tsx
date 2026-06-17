'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function CategoryFilter({ categories, selectedCategory, onCategoryChange }: CategoryFilterProps) {
  // Show wrapping tags layout for all screen sizes
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={selectedCategory === '' ? 'default' : 'outline'}
        onClick={() => onCategoryChange('')}
        size="sm"
        className="text-xs md:text-sm"
      >
        Todas
      </Button>
      {categories.map(cat => (
        <Button
          key={cat}
          variant={selectedCategory === cat ? 'default' : 'outline'}
          onClick={() => onCategoryChange(cat)}
          size="sm"
          className="text-xs md:text-sm"
        >
          {cat}
        </Button>
      ))}
    </div>
  );
}
