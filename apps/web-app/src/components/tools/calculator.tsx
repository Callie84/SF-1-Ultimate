'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';

interface CalculatorField {
  name: string;
  label: string;
  type: 'number' | 'select';
  unit?: string;
  defaultValue: number | string;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string | number; label: string }[];
  help?: string;
}

interface CalculatorProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  fields: CalculatorField[];
  calculate: (values: Record<string, number | string>) => number | string;
  resultUnit: string;
  resultLabel: string;
  getStatus?: (result: number | string) => {
    text: string;
    color: string;
    desc: string;
  };
  info: {
    title: string;
    content: React.ReactNode;
  };
}

export function Calculator({
  title,
  description,
  icon,
  gradient,
  fields,
  calculate,
  resultUnit,
  resultLabel,
  getStatus,
  info,
}: CalculatorProps) {
  const [values, setValues] = useState<Record<string, number | string>>(() => {
    const initial: Record<string, number | string> = {};
    fields.forEach((field) => {
      initial[field.name] = field.defaultValue;
    });
    return initial;
  });
  const [result, setResult] = useState<number | string | null>(null);

  const handleCalculate = () => {
    const calculated = calculate(values);
    setResult(calculated);
  };

  const status = result !== null && getStatus ? getStatus(result as any) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-1">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      {/* Calculator */}
      <div className="rounded-xl border bg-card p-6">
        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium mb-2 text-muted-foreground">
                {field.label} {field.unit && `(${field.unit})`}
              </label>
              {field.type === 'number' ? (
                <input
                  type="number"
                  value={values[field.name]}
                  onChange={(e) =>
                    setValues({ ...values, [field.name]: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  min={field.min}
                  max={field.max}
                  step={field.step || 1}
                />
              ) : (
                <select
                  value={values[field.name]}
                  onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
              {field.help && (
                <p className="text-xs text-muted-foreground mt-1.5">{field.help}</p>
              )}
            </div>
          ))}

          {/* Calculate Button */}
          <button
            onClick={handleCalculate}
            className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Berechnen
          </button>
        </div>
      </div>

      {/* Result */}
      {result !== null && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4">Ergebnis</h3>
          <div className="rounded-lg border p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-1">
              {typeof result === 'number' ? result.toFixed(2) : result} {resultUnit}
            </div>
            <div className="text-sm font-medium text-muted-foreground mb-2">
              {resultLabel}
            </div>
            {status && (
              <>
                <div className={`text-lg font-bold ${status.color} mt-3`}>
                  {status.text}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{status.desc}</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Info className="h-5 w-5 text-primary" />
          {info.title}
        </h3>
        <div className="text-sm text-muted-foreground leading-relaxed">
          {info.content}
        </div>
      </div>
    </div>
  );
}
