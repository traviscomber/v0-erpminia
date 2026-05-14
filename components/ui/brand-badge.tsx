import React from 'react'
import { cn } from '@/lib/utils'

interface BrandBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  type?: 'preventive' | 'corrective' | 'predictive' | 'critical' | 'success' | 'warning'
}

export const BrandBadge = React.forwardRef<HTMLSpanElement, BrandBadgeProps>(
  ({ className, type = 'preventive', children, ...props }, ref) => {
    const typeStyles = {
      preventive: 'bg-secondary/10 text-secondary border border-secondary/30',
      corrective: 'bg-primary/10 text-primary border border-primary/30',
      predictive: 'bg-muted text-muted-foreground border border-muted',
      critical: 'bg-destructive/10 text-destructive border border-destructive/30',
      success: 'bg-secondary/10 text-secondary border border-secondary/30',
      warning: 'bg-primary/10 text-primary border border-primary/30',
    }

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
          typeStyles[type],
          className
        )}
        {...props}
      >
        {children}
      </span>
    )
  }
)

BrandBadge.displayName = 'BrandBadge'
