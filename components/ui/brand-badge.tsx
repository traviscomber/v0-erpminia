import React from 'react'
import { cn } from '@/lib/utils'

interface BrandBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  type?: 'preventive' | 'corrective' | 'predictive' | 'critical' | 'success' | 'warning'
}

export const BrandBadge = React.forwardRef<HTMLSpanElement, BrandBadgeProps>(
  ({ className, type = 'preventive', children, ...props }, ref) => {
    const typeStyles = {
      preventive: 'bg-[var(--brand-verde)]/10 text-[var(--brand-verde)] border border-[var(--brand-verde)]/30',
      corrective: 'bg-[var(--brand-naranja)]/10 text-[var(--brand-naranja)] border border-[var(--brand-naranja)]/30',
      predictive: 'bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-900/20 dark:text-blue-400',
      critical: 'bg-[var(--brand-rojo)]/10 text-[var(--brand-rojo)] border border-[var(--brand-rojo)]/30',
      success: 'bg-[var(--brand-verde)]/10 text-[var(--brand-verde)] border border-[var(--brand-verde)]/30',
      warning: 'bg-[var(--brand-naranja)]/10 text-[var(--brand-naranja)] border border-[var(--brand-naranja)]/30',
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
