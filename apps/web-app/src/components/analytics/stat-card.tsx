// /apps/web-app/src/components/analytics/stat-card.tsx
'use client';

import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  change?: number;
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ title, value, subtitle, change, icon, className }: StatCardProps) {
  const formattedValue = typeof value === 'number'
    ? value.toLocaleString('de-DE')
    : value;

  return (
    <div className={cn(
      "bg-card rounded-lg border p-4 shadow-sm",
      className
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{formattedValue}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
          {change !== undefined && (
            <p className={cn(
              "text-xs mt-1 font-medium",
              change > 0 ? "text-green-600" : change < 0 ? "text-red-600" : "text-muted-foreground"
            )}>
              {change > 0 ? '+' : ''}{change}% vs. letzte Woche
            </p>
          )}
        </div>
        {icon && (
          <div className="text-muted-foreground">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

interface StatGridProps {
  children: React.ReactNode;
  className?: string;
}

export function StatGrid({ children, className }: StatGridProps) {
  return (
    <div className={cn(
      "grid grid-cols-2 md:grid-cols-4 gap-4",
      className
    )}>
      {children}
    </div>
  );
}
