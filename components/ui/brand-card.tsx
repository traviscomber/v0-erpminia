import React from 'react'
import { cn } from '@/lib/utils'

interface BrandCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error'
}

export const BrandCard = React.forwardRef<HTMLDivElement, BrandCardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variantStyles = {
      default: 'border-l-4 border-l-[var(--brand-naranja)]',
      success: 'border-l-4 border-l-[var(--brand-verde)]',
      warning: 'border-l-4 border-l-yellow-500',
      error: 'border-l-4 border-l-[var(--brand-rojo)]',
    }

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md',
          variantStyles[variant],
          className
        )}
        {...props}
      />
    )
  }
)

BrandCard.displayName = 'BrandCard'
