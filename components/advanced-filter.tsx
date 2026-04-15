'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Filter, X } from 'lucide-react';
import { useState } from 'react';

interface FilterConfig {
  id: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number';
  placeholder?: string;
  options?: { value: string; label: string }[];
}

interface AdvancedFilterProps {
  filters: FilterConfig[];
  onFilterChange: (filters: Record<string, any>) => void;
}

export function AdvancedFilter({ filters, onFilterChange }: AdvancedFilterProps) {
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [isOpen, setIsOpen] = useState(false);

  const handleFilterChange = (id: string, value: any) => {
    const newFilters = { ...activeFilters, [id]: value };
    setActiveFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    setActiveFilters({});
    onFilterChange({});
  };

  const activeFilterCount = Object.values(activeFilters).filter(v => v).length;

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        <Filter className="h-4 w-4" />
        Filtros {activeFilterCount > 0 && `(${activeFilterCount})`}
      </Button>

      {isOpen && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filters.map((filter) => (
                <div key={filter.id}>
                  <label className="text-sm font-medium mb-2 block">{filter.label}</label>
                  {filter.type === 'select' ? (
                    <Select value={activeFilters[filter.id] || ''} onValueChange={(v) => handleFilterChange(filter.id, v)}>
                      <SelectTrigger>
                        <SelectValue placeholder={filter.placeholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {filter.options?.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={filter.type}
                      placeholder={filter.placeholder}
                      value={activeFilters[filter.id] || ''}
                      onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Limpiar filtros
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
