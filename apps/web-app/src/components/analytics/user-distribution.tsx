// /apps/web-app/src/components/analytics/user-distribution.tsx
'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { cn } from '@/lib/utils';

interface LevelData {
  level: string;
  count: number;
}

interface RoleData {
  role: string;
  count: number;
}

interface UserDistributionProps {
  levelDistribution?: LevelData[];
  roleDistribution?: RoleData[];
  type: 'level' | 'role';
  title: string;
  className?: string;
}

const LEVEL_COLORS = [
  '#22c55e', // Grün - Level 1-4
  '#84cc16', // Lime - Level 5-9
  '#eab308', // Gelb - Level 10-19
  '#f97316', // Orange - Level 20-49
  '#ef4444', // Rot - Level 50-99
  '#8b5cf6', // Lila - Level 100+
];

const ROLE_COLORS = [
  '#22c55e', // USER
  '#3b82f6', // MODERATOR
  '#ef4444', // ADMIN
  '#8b5cf6', // OTHER
];

export function UserDistribution({
  levelDistribution,
  roleDistribution,
  type,
  title,
  className
}: UserDistributionProps) {
  const data = type === 'level'
    ? levelDistribution?.map(item => ({ name: `Level ${item.level}`, value: item.count }))
    : roleDistribution?.map(item => ({ name: item.role, value: item.count }));

  const colors = type === 'level' ? LEVEL_COLORS : ROLE_COLORS;

  if (!data || data.length === 0) {
    return (
      <div className={cn("bg-card rounded-lg border p-4 shadow-sm", className)}>
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <p className="text-muted-foreground text-sm">Keine Daten verfügbar</p>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className={cn("bg-card rounded-lg border p-4 shadow-sm", className)}>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [
                `${value.toLocaleString('de-DE')} (${((value / total) * 100).toFixed(1)}%)`,
                'Anzahl'
              ]}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                borderColor: 'hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend
              formatter={(value) => <span className="text-sm">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Zusätzliche Liste */}
      <div className="mt-4 space-y-2">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span>{item.name}</span>
            </div>
            <span className="text-muted-foreground">
              {item.value.toLocaleString('de-DE')} ({((item.value / total) * 100).toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
