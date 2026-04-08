'use client';

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ForecastPoint } from '@/types';

interface ForecastChartProps {
  data: ForecastPoint[];
  show80?: boolean;
  show95?: boolean;
  height?: number;
}

const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  } catch {
    return dateStr;
  }
};

const formatValue = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(2);
};

export default function ForecastChart({
  data,
  show80 = true,
  show95 = true,
  height = 350,
}: ForecastChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500 text-sm">No forecast data available</p>
      </div>
    );
  }

  // Build chart data with band pairs for recharts Area
  const chartData = data.map((pt) => ({
    date: pt.date,
    value: pt.value,
    band95: show95 ? [pt.lower95, pt.upper95] : undefined,
    band80: show80 ? [pt.lower80, pt.upper80] : undefined,
    lower95: pt.lower95,
    upper95: pt.upper95,
    lower80: pt.lower80,
    upper80: pt.upper80,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatValue}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value: number) => formatValue(value)}
          labelFormatter={(label: string) => `Date: ${formatDate(label)}`}
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
        />

        {/* 95% confidence band */}
        {show95 && (
          <>
            <Area
              dataKey="upper95"
              stroke="transparent"
              fill="#bfdbfe"
              fillOpacity={0.4}
              name="95% Upper"
              legendType="none"
            />
            <Area
              dataKey="lower95"
              stroke="transparent"
              fill="#bfdbfe"
              fillOpacity={0.0}
              name="95% CI"
              legendType="square"
            />
          </>
        )}

        {/* 80% confidence band */}
        {show80 && (
          <>
            <Area
              dataKey="upper80"
              stroke="transparent"
              fill="#93c5fd"
              fillOpacity={0.5}
              name="80% Upper"
              legendType="none"
            />
            <Area
              dataKey="lower80"
              stroke="transparent"
              fill="#93c5fd"
              fillOpacity={0.0}
              name="80% CI"
              legendType="square"
            />
          </>
        )}

        {/* Forecast line */}
        <Line
          type="monotone"
          dataKey="value"
          stroke="#1d4ed8"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, fill: '#1d4ed8' }}
          name="Forecast"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
