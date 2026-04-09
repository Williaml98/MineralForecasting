'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState, useRef } from 'react';
import api from '@/lib/axios';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import ForecastChart from '@/components/ForecastChart';
import type { Forecast, ForecastPoint } from '@/types';
import { formatDate } from '@/lib/utils';

/**
 * Forecast detail page with interactive confidence interval toggles and PNG export.
 */
export default function ForecastDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [show80, setShow80] = useState(true);
  const [show95, setShow95] = useState(true);
  const chartRef = useRef<HTMLDivElement>(null);

  const { data: forecast, isLoading } = useQuery<Forecast>({
    queryKey: ['forecast', id],
    queryFn: () => api.get(`/api/forecasts/${id}`).then((r) => r.data?.data ?? r.data),
  });

  const handleExport = async () => {
    if (!chartRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(chartRef.current, { backgroundColor: '#fff' });
      const link = document.createElement('a');
      link.download = `forecast-${id?.slice(0, 8)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      alert('Export failed. Please try again.');
    }
  };

  if (isLoading) return <LoadingSkeleton className="h-96 w-full m-6" />;
  if (!forecast) return <p className="p-6 text-gray-500">Forecast not found.</p>;

  let points: ForecastPoint[] = [];
  try {
    const raw = JSON.parse(forecast.forecastJson || '[]');
    if (Array.isArray(raw)) {
      points = raw.map((d: Record<string, number>) => ({
        date: d.date,
        value: d.value,
        lower80: d.lower_80 ?? d.lower80,
        upper80: d.upper_80 ?? d.upper80,
        lower95: d.lower_95 ?? d.lower95,
        upper95: d.upper_95 ?? d.upper95,
      }));
    }
  } catch {}

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Forecast Detail</h1>
          <p className="text-sm text-gray-500 mt-1">Created {formatDate(forecast.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-blue-100 text-blue-800">{forecast.horizonMonths} months</Badge>
          <button
            onClick={handleExport}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2"
          >
            ↓ Export PNG
          </button>
        </div>
      </div>

      {/* CI toggles */}
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={show80}
            onChange={(e) => setShow80(e.target.checked)}
            className="accent-brand"
          />
          <span className="text-blue-600 font-medium">80% Confidence Band</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={show95}
            onChange={(e) => setShow95(e.target.checked)}
            className="accent-brand"
          />
          <span className="text-blue-300 font-medium">95% Confidence Band</span>
        </label>
      </div>

      {/* Chart */}
      <Card className="p-5">
        <div ref={chartRef}>
          {points.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <div className="text-center">
                <p className="text-lg">Forecast data is still processing.</p>
                <p className="text-sm mt-1">Results will appear once model training completes.</p>
              </div>
            </div>
          ) : (
            <ForecastChart data={points} show80={show80} show95={show95} />
          )}
        </div>
      </Card>

      {/* Metadata */}
      <Card className="p-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Model</p>
          <p className="font-medium mt-1">{forecast.modelName ?? forecast.modelId}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Forecast ID</p>
          <p className="font-mono text-xs mt-1 text-gray-500">{forecast.id}</p>
        </div>
      </Card>
    </div>
  );
}
