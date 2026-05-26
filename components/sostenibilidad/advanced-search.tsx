'use client';

import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface AdvancedSearchProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  debounceMs?: number;
  onClear?: () => void;
}

export function AdvancedSearch({
  placeholder = 'Search...',
  onSearch,
  debounceMs = 500,
  onClear,
}: AdvancedSearchProps) {
  const [value, setValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>();

  const handleSearch = useCallback(
    (query: string) => {
      setValue(query);
      setIsSearching(true);

      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout for debounced search
      timeoutRef.current = setTimeout(() => {
        onSearch(query);
        setIsSearching(false);
      }, debounceMs);
    },
    [onSearch, debounceMs]
  );

  const handleClear = useCallback(() => {
    setValue('');
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    onClear?.();
    onSearch('');
    setIsSearching(false);
  }, [onSearch, onClear]);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 pr-10"
          disabled={isSearching}
        />
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1.5 h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {isSearching && <div className="h-4 w-4 bg-primary rounded-full animate-pulse" />}
    </div>
  );
}
