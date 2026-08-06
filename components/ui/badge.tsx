import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex min-h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-semibold leading-none tracking-[0.01em] transition-colors [&>svg]:size-3 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-destructive/20',
  {
    variants: {
      variant: {
        default: 'border-primary/20 bg-primary/10 text-primary [a&]:hover:bg-primary/15',
        secondary: 'border-secondary/20 bg-secondary/10 text-secondary [a&]:hover:bg-secondary/15',
        destructive: 'border-destructive/20 bg-destructive/10 text-destructive [a&]:hover:bg-destructive/15',
        outline: 'border-border bg-transparent text-muted-foreground [a&]:hover:bg-muted [a&]:hover:text-foreground',
        neutral: 'border-transparent bg-muted text-muted-foreground [a&]:hover:text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
