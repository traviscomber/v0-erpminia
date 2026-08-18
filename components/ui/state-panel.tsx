import * as React from 'react'
import { AlertTriangle, CheckCircle2, Inbox, LoaderCircle, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

type StateTone = 'neutral' | 'success' | 'warning' | 'error' | 'loading'

const toneIcon: Record<StateTone, LucideIcon> = {
  neutral: Inbox,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertTriangle,
  loading: LoaderCircle,
}

const toneClass: Record<StateTone, string> = {
  neutral: 'text-muted-foreground',
  success: 'text-secondary',
  warning: 'text-primary',
  error: 'text-destructive',
  loading: 'text-muted-foreground',
}

function StatePanel({
  tone = 'neutral',
  icon,
  title,
  description,
  actions,
  className,
  ...props
}: React.ComponentProps<'div'> & {
  tone?: StateTone
  icon?: LucideIcon
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
}) {
  const Icon = icon || toneIcon[tone]

  return (
    <div
      data-slot="state-panel"
      className={cn(
        'flex min-h-32 flex-col items-center justify-center rounded-md border border-dashed border-border/80 bg-muted/15 px-5 py-6 text-center',
        className,
      )}
      {...props}
    >
      <div className={cn('mb-3 flex size-8 items-center justify-center rounded-md bg-muted/70', toneClass[tone])}>
        <Icon className={cn('size-4', tone === 'loading' && 'animate-spin')} />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? <p className="mt-1 max-w-lg text-sm leading-5 text-muted-foreground">{description}</p> : null}
      {actions ? <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{actions}</div> : null}
    </div>
  )
}

export { StatePanel }
export type { StateTone }
