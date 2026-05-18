'use client';

import React, { useCallback, useMemo } from 'react';

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight?: number;
  overscan?: number;
  getKey?: (item: T, index: number) => string | number;
}

export function VirtualizedList<T>({
  items,
  renderItem,
  itemHeight,
  containerHeight = 600,
  overscan = 3,
  getKey = (_, i) => i,
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = React.useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan);

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex).map((item, i) => ({
      item,
      index: startIndex + i,
      offset: (startIndex + i) * itemHeight,
    }));
  }, [items, startIndex, endIndex, itemHeight]);

  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop((e.target as HTMLDivElement).scrollTop);
  }, []);

  return (
    <div
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, offset }) => (
          <div
            key={getKey(item, index)}
            style={{
              position: 'absolute',
              top: offset,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}
