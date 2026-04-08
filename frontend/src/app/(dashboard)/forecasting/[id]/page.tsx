'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Card } from '@/components/ui/Card';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { Badge } from '@/components/ui/Badge';
import type { TrainedModel } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

const PLACEHOLDER_IMPORTANCE = [
  { feature: 'Lag-1', importance: 0.42 },
  { feature: 'Lag-3', importance: 0.28 },
  { feature: 'Rolling-6', importance: 0.15 },
  { feature: 'Trend', importance: 0.10 },
  { feature: 'Seasonality', importance: 0.05 },
];

const ALGO_COLORS: Record<string, string> = {
  ARIMA: 'bg-blue-100 text-blue-800',
  PROPHET: 'bg-purple-100 text-purple-800',
  LSTM: 'bg-green-100 text-green-800',
};

/**
 * Model detail page showing metrics and feature explanation chart.
 */
export default function ModelDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: model, isLoading } = useQuery<TrainedModel>({
    queryKey: ['model', id],
    queryFn: () => api.get(`/api/models/${id}`).then((r) => r.data.data),
  });

  if (isLoading) return <LoadingSkeleton className="h-64 w-full m-6" />;
  if (!model) return <p className="p-6 text-gray-500">Model not found.</p>;

  let metrics: Record<string, number> = {};
  try {
    if (model.metricsJson) metrics = JSON.parse(model.metricsJson);
  } catch {}

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{model.name}</h1>
          <p className="text-sm text-gray-500 mt-1">Version {model.version}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={ALGO_COLORS[model.algorithm] ?? 'bg-gray-100 text-gray-800'}>
            {model.algorithm}
          </Badge>
          {model.active && (
            <Badge className="bg-green-100 text-green-800">● Live</Badge>
          )}
        </div>
      </div>

      {/* Info card */}
      <Card className="p-5 grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
          <p className="font-semibold mt-1">{model.status}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Trained At</p>
          <p className="font-semibold mt-1">
            {model.trainedAt ? new Date(model.trainedAt).toLocaleDateString() : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Job ID</p>
          <p className="font-semibold mt-1 text-xs truncate">{model.jobId ?? '—'}</p>
        </div>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'MAE', key: 'mae', desc: 'Mean Absolute Error' },
          { label: 'RMSE', key: 'rmse', desc: 'Root Mean Squared Error' },
          { label: 'MAPE', key: 'mape', desc: 'Mean Absolute Percentage Error' },
        ].map(({ label, key, desc }) => (
          <Card key={key} className="p-5">
            <p className="text-xs text-gray-500">{desc}</p>
            <p className="text-3xl font-bold text-brand mt-2">
              {metrics[key] != null ? metrics[key].toFixed(4) : '—'}
            </p>
            <p className="text-sm font-medium text-gray-700 mt-1">{label}</p>
          </Card>
        ))}
      </div>

      {/* Feature importance */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Feature Importance</h2>
        <p className="text-sm text-gray-500 mb-4">
          {model.algorithm === 'LSTM'
            ? 'SHAP-based feature contribution (illustrative)'
            : model.algorithm === 'PROPHET'
            ? 'Prophet component decomposition (illustrative)'
            : 'ARIMA coefficient importance (illustrative)'}
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={PLACEHOLDER_IMPORTANCE} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 0.5]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
            <YAxis type="category" dataKey="feature" width={80} />
            <Tooltip formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
            <Bar dataKey="importance" fill="#1a3a5c" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
