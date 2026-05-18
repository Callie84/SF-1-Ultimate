// /apps/web-app/src/components/analytics/traffic-chart.tsx
'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface TrendData {
  date: string;
  [key: string]: string | number;
}

interface TrafficChartProps {
  data: TrendData[];
  lines: Array<{
    dataKey: string;
    name: string;
    color: string;
  }>;
  title?: string;
}

export function TrafficChart({ data, lines, title }: TrafficChartProps) {
  // Datum formatieren
  const formattedData = data.map(item => ({
    ...item,
    date: new Date(item.date || item._id as string).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
    }),
  }));

  return (
    <div className="bg-card rounded-lg border p-4 shadow-sm">
      {title && (
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
      )}
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                borderColor: 'hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            {lines.map((line) => (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                name={line.name}
                stroke={line.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
