'use client';

import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';

export function DemoDataBadge() {
  return (
    <Badge variant="outline" className="gap-1.5 bg-muted/50 border-muted-foreground/30 text-muted-foreground">
      <AlertCircle className="w-3 h-3" />
      Demo Data
    </Badge>
  );
}
