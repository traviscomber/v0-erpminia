import { useCallback, useRef, useMemo } from 'react';

// Debounce hook for optimizing frequent updates
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Throttle hook for API calls and event handlers
export function useThrottle<T>(value: T, interval: number = 1000): T {
  const [throttledValue, setThrottledValue] = React.useState<T>(value);
  const lastRanRef = useRef<number>(Date.now());

  React.useEffect(() => {
    const now = Date.now();
    if (now >= lastRanRef.current + interval) {
      lastRanRef.current = now;
      setThrottledValue(value);
    } else {
      const handler = setTimeout(() => {
        lastRanRef.current = Date.now();
        setThrottledValue(value);
      }, interval);

      return () => clearTimeout(handler);
    }
  }, [value, interval]);

  return throttledValue;
}

// Memoized list items to prevent unnecessary re-renders
export function useMemoizedList<T extends { id: string | number }>(
  items: T[],
  keyExtractor?: (item: T) => string | number
) {
  return useMemo(() => {
    const key = keyExtractor ? items.map(i => keyExtractor(i)).join(',') : items.map(i => i.id).join(',');
    return items;
  }, [items]);
}

// Lazy load images for better performance
export function useLazyImage(src: string, placeholder: string = '') {
  const [imageSrc, setImageSrc] = React.useState(placeholder);
  const [imageRef, setImageRef] = React.useState<HTMLImageElement | null>(null);

  React.useEffect(() => {
    let observer: IntersectionObserver;

    if (imageRef && imageSrc === placeholder) {
      observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              setImageSrc(src);
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1 }
      );

      observer.observe(imageRef);
    }

    return () => observer?.disconnect();
  }, [imageRef, imageSrc, src, placeholder]);

  return [imageSrc, setImageRef] as const;
}

// Cache hook for memoizing expensive computations
export function useCache<T>(
  computeFn: () => T,
  dependencies: React.DependencyList,
  cacheKey?: string
): T {
  const cacheRef = useRef<{ key: string; value: T } | null>(null);

  return useMemo(() => {
    const key = cacheKey || JSON.stringify(dependencies);
    
    if (cacheRef.current?.key === key) {
      return cacheRef.current.value;
    }

    const value = computeFn();
    cacheRef.current = { key, value };
    return value;
  }, dependencies);
}

// Pagination hook for large lists
export function usePagination<T>(items: T[], itemsPerPage: number = 10) {
  const [currentPage, setCurrentPage] = React.useState(1);

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = items.slice(startIndex, endIndex);

  const goToPage = useCallback((page: number) => {
    const pageNumber = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(pageNumber);
  }, [totalPages]);

  const nextPage = useCallback(() => goToPage(currentPage + 1), [currentPage, goToPage]);
  const prevPage = useCallback(() => goToPage(currentPage - 1), [currentPage, goToPage]);

  return {
    currentPage,
    totalPages,
    currentItems,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
}
