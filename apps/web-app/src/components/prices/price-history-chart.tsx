'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { apiClient } from '@/lib/api-client';
import { Loader2, TrendingDown } from 'lucide-react';

const RANGE_OPTIONS = [
  { label: '7T', days: 7 },
  { label: '30T', days: 30 },
  { label: '3M', days: 90 },
  { label: 'Gesamt', days: 0 },
] as const;

const LINE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#84cc16', '#f97316',
];

interface HistorySeries {
  name: string;
  data: { date: string; price: number | null }[];
}

interface HistoryData {
  series: HistorySeries[];
  dates: string[];
  packSizes: string[];
}

interface Props {
  seedSlug: string;
  seedName?: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

export function PriceHistoryChart({ seedSlug, seedName }: Props) {
  const [days, setDays] = useState<number>(30);
  const [packSizeFilter, setPackSizeFilter] = useState<string>('');

  const { data, isLoading, isError } = useQuery<HistoryData>({
    queryKey: ['price-history', seedSlug, days, packSizeFilter],
    queryFn: () => {
      const params = new URLSearchParams({
        days: days === 0 ? 'all' : String(days),
      });
      if (packSizeFilter) params.set('packSize', packSizeFilter);
      return apiClient.get(`/api/prices/history/${seedSlug}?${params}`);
    },
    enabled: !!seedSlug,
    staleTime: 10 * 60 * 1000,
  });

  // Merge series into flat array for recharts: [{date, SeriesName1: price, ...}]
  const chartData = (data?.dates ?? []).map((date) => {
    const point: Record<string, string | number | null> = { date: formatDate(date) };
    for (const s of data?.series ?? []) {
      const entry = s.data.find((d) => d.date === date);
      point[s.name] = entry?.price ?? null;
    }
    return point;
  });

  const hasSeries = (data?.series?.length ?? 0) > 0;
  const hasData = chartData.some((p) =>
    (data?.series ?? []).some((s) => p[s.name] !== null)
  );

  return (
    <div className="space-y-3">
      {/* Header + Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">
            Preisverlauf{seedName ? ` — ${seedName}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => setDays(opt.days)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                days === opt.days
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-muted-foreground/30 text-muted-foreground hover:bg-muted'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pack Size Filter */}
      {(data?.packSizes?.length ?? 0) > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setPackSizeFilter('')}
            className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
              !packSizeFilter
                ? 'bg-primary/10 border-primary text-primary'
                : 'border-muted-foreground/30 text-muted-foreground hover:bg-muted'
            }`}
          >
            Alle Pakete
          </button>
          {data!.packSizes.map((ps) => (
            <button
              key={ps}
              onClick={() => setPackSizeFilter(ps === packSizeFilter ? '' : ps)}
              className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                packSizeFilter === ps
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'border-muted-foreground/30 text-muted-foreground hover:bg-muted'
              }`}
            >
              {ps}
            </button>
          ))}
        </div>
      )}

      {/* Chart */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Lade Verlaufsdaten...</span>
        </div>
      ) : isError || !hasData ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm rounded-lg border border-dashed">
          Noch keine Verlaufsdaten für diesen Zeitraum verfügbar.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
              stroke="var(--muted-foreground)"
            />
            <YAxis
              tickFormatter={(v) => `${v}€`}
              tick={{ fontSize: 10 }}
              width={48}
              stroke="var(--muted-foreground)"
            />
            <Tooltip
              formatter={(val: number, name: string) => [`${val?.toFixed(2)}€`, name]}
              labelStyle={{ fontSize: 11 }}
              contentStyle={{
                fontSize: 11,
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)',
                borderRadius: '8px',
              }}
            />
            {hasSeries && (data?.series?.length ?? 0) > 1 && (
              <Legend
                wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
                iconSize={8}
              />
            )}
            {(data?.series ?? []).map((s, i) => (
              <Line
                key={s.name}
                type="monotone"
                dataKey={s.name}
                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
