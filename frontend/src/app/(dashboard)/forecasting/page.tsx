'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Brain,
  Eye,
  Zap,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  TrendingUp,
} from 'lucide-react';
import api from '@/lib/axios';
import { toast } from '@/hooks/useToast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import type { TrainedModel } from '@/types';

const statusConfig: Record<string, {
  variant: 'default' | 'success' | 'warning' | 'danger' | 'info';
  icon: React.ElementType;
}> = {
  PENDING: { variant: 'warning', icon: Clock },
  TRAINING: { variant: 'info', icon: Clock },
  TRAINED: { variant: 'success', icon: CheckCircle },
  FAILED: { variant: 'danger', icon: AlertCircle },
};

function parseMetric(metricsJson: string | undefined, key: string): string {
  if (!metricsJson) return '—';
  try {
    const metrics = JSON.parse(metricsJson);
    const val = metrics[key];
    if (val == null) return '—';
    return typeof val === 'number' ? val.toFixed(4) : String(val);
  } catch {
    return '—';
  }
}

export default function ForecastingPage() {
  const queryClient = useQueryClient();

  const { data: models, isLoading } = useQuery<TrainedModel[]>({
    queryKey: ['models'],
    queryFn: () => api.get('/api/models').then((r) => r.data?.data ?? r.data ?? []),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/models/${id}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      toast.success('Model activated', 'This model is now live for forecasting.');
    },
    onError: () => toast.error('Activation failed', 'Could not activate the model.'),
  });

  const activeModel = models?.find((m) => m.active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Forecasting Engine</h1>
          <p className="text-sm text-gray-500 mt-1">Train, compare, and manage forecasting models</p>
        </div>
        <Link
          href="/forecasting/train"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Train New Model
        </Link>
      </div>

      {/* Active model banner */}
      {activeModel && (
        <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">Active Model</p>
            <p className="text-xs text-green-600">{activeModel.name} ({activeModel.algorithm})</p>
          </div>
          <Badge variant="success">LIVE</Badge>
        </div>
      )}

      {/* Model comparison table */}
      <Card>
        <CardHeader>
          <CardTitle>Model Comparison ({models?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : !models || models.length === 0 ? (
            <div className="text-center py-12">
              <Brain className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No models trained yet.</p>
              <Link
                href="/forecasting/train"
                className="text-sm text-blue-600 hover:underline mt-2 inline-block"
              >
                Train your first model
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    <th className="pb-3 pr-4">Name</th>
                    <th className="pb-3 pr-4">Algorithm</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4 text-right">MAE</th>
                    <th className="pb-3 pr-4 text-right">RMSE</th>
                    <th className="pb-3 pr-4 text-right">MAPE</th>
                    <th className="pb-3 pr-4">Active</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {models.map((m) => {
                    const cfg = statusConfig[m.status] ?? { variant: 'default' as const, icon: Clock };
                    const Icon = cfg.icon;
                    return (
                      <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <Brain className="w-4 h-4 text-gray-300" />
                            <span className="font-medium text-gray-800">{m.name}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant={
                              m.algorithm === 'ARIMA' ? 'info' :
                              m.algorithm === 'PROPHET' ? 'secondary' : 'warning'
                            }
                          >
                            {m.algorithm}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 text-gray-400" />
                            <Badge variant={cfg.variant}>{m.status}</Badge>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-right font-mono text-gray-600 text-xs">
                          {parseMetric(m.metricsJson, 'mae')}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono text-gray-600 text-xs">
                          {parseMetric(m.metricsJson, 'rmse')}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono text-gray-600 text-xs">
                          {parseMetric(m.metricsJson, 'mape')}
                        </td>
                        <td className="py-3 pr-4">
                          {m.active ? (
                            <Badge variant="success">Active</Badge>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/forecasting/${m.id}`}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            {!m.active && m.status === 'TRAINED' && (
                              <button
                                onClick={() => activateMutation.mutate(m.id)}
                                disabled={activateMutation.isPending}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                                title="Activate model"
                              >
                                <Zap className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
