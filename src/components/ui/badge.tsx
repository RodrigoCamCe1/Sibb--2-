'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]',
        secondary: 'bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)]',
        destructive: 'bg-red-100 text-red-900 border border-red-200',
        warning: 'bg-amber-100 text-amber-900 border border-amber-200',
        info: 'bg-sky-100 text-sky-900 border border-sky-200',
        success: 'bg-emerald-100 text-emerald-900 border border-emerald-200',
        outline: 'border border-[var(--color-border)] text-[var(--color-foreground)]',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
