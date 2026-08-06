import * as React from 'react'

import { cn } from '@/lib/utils'

function PageHeader({ className, ...props }: React.ComponentProps<'header'>) {
  return (
    <header
      data-slot="page-header"
      className={cn('flex flex-col gap-4 border-b border-border/70 pb-5 md:flex-row md:items-start md:justify-between', className)}
      {...props}
    />
  )
}

function PageHeaderContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="page-header-content" className={cn('min-w-0 max-w-3xl', className)} {...props} />
}

function PageHeaderEyebrow({ className, ...props }: React.ComponentProps<'p'>) {
  return <p data-slot="page-header-eyebrow" className={cn('mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground', className)} {...props} />
}

function PageHeaderTitle({ className, ...props }: React.ComponentProps<'h1'>) {
  return <h1 data-slot="page-header-title" className={cn('text-2xl font-semibold leading-tight tracking-[-0.025em] text-foreground md:text-[1.75rem]', className)} {...props} />
}

function PageHeaderDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p data-slot="page-header-description" className={cn('mt-2 max-w-2xl text-sm leading-6 text-muted-foreground', className)} {...props} />
}

function PageHeaderActions({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="page-header-actions" className={cn('flex shrink-0 flex-wrap items-center gap-2 md:justify-end', className)} {...props} />
}

export {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
}
