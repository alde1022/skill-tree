import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';
export function Button({ className, asChild=false, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) { const Comp = asChild ? Slot : 'button'; return <Comp className={cn('inline-flex items-center justify-center gap-2 rounded-md border border-amber-400/30 bg-amber-300/10 px-3 py-2 text-sm font-semibold text-amber-100 shadow-[0_0_18px_rgba(245,158,11,.12)] transition hover:bg-amber-300/20 disabled:cursor-not-allowed disabled:opacity-40', className)} {...props} />; }
