import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[background-color,border-color,color,box-shadow] duration-150 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-none hover:bg-primary/90 active:bg-primary/85',
        destructive:
          'bg-destructive text-destructive-foreground shadow-none hover:bg-destructive/90 focus-visible:ring-destructive/30',
        outline:
          'border border-border bg-background text-foreground shadow-none hover:border-foreground/20 hover:bg-muted/70',
        secondary:
          'bg-secondary text-secondary-foreground shadow-none hover:bg-secondary/90',
        ghost:
          'text-foreground hover:bg-muted/70 hover:text-foreground',
        link: 'h-auto rounded-none p-0 text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 has-[>svg]:px-3',
        sm: 'h-8 gap-1.5 px-3 text-xs has-[>svg]:px-2.5',
        lg: 'h-10 px-5 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
