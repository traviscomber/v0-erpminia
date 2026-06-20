'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, X, Loader2 } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface SearchResult {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
}

interface DocumentSearchProps {
  onResultsChange: (results: SearchResult[]) => void;
  placeholder: string;
}

export function DocumentSearch({ onResultsChange, placeholder = 'Buscar documentos...' }: DocumentSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [showResults, setShowResults] = useState(false);

  const { data: searchData, isLoading } = useSWR(
    searchTerm ? `/api/sostenibilidad/documentos-flujo/search?q=${encodeURIComponent(searchTerm)}&category=${encodeURIComponent(category)}&status=${encodeURIComponent(status)}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 500 }
  );

  const results = searchData.data || [];

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setShowResults(value.length > 0);
  }, []);

  const handleClear = () => {
    setSearchTerm('');
    setShowResults(false);
    if (onResultsChange) {
      onResultsChange([]);
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    setSearchTerm(result.title);
    setShowResults(false);
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchTerm && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <Card className="absolute top-full left-0 right-0 mt-2 max-h-64 overflow-y-auto z-50">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Buscando...
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No se encontraron documentos
              </div>
            ) : (
              <div className="divide-y">
                {results.map((result: SearchResult) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelectResult(result)}
                    className="w-full text-left p-3 hover:bg-muted transition text-sm"
                  >
                    <div className="font-medium">{result.title}</div>
                    <div className="text-xs text-muted-foreground">{result.category}</div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
