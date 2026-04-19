import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Badge: React.FC<{ 
  children: React.ReactNode; 
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}> = ({ children, variant = 'default', className }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    error: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    info: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider',
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const p = priority.toLowerCase();
  if (p === 'low') return <Badge variant="default">Low</Badge>;
  if (p === 'medium') return <Badge variant="info">Medium</Badge>;
  if (p === 'high') return <Badge variant="warning">High</Badge>;
  if (p === 'critical') return <Badge variant="error">Critical</Badge>;
  return <Badge>{priority}</Badge>;
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'To Do') return <Badge variant="default">To Do</Badge>;
  if (status === 'In Progress') return <Badge variant="warning">In Progress</Badge>;
  if (status === 'Done') return <Badge variant="success">Done</Badge>;
  return <Badge>{status}</Badge>;
};

export const TypeBadge: React.FC<{ type: string }> = ({ type }) => {
  if (type === 'bug') return <Badge variant="error">Bug</Badge>;
  if (type === 'feature') return <Badge variant="success">Feature</Badge>;
  if (type === 'task') return <Badge variant="info">Task</Badge>;
  return <Badge>{type}</Badge>;
};
