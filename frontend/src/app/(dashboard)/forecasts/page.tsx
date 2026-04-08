'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/axios';
import { toast } from '@/hooks/useToast';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { Modal } from '@/components/ui/Modal';
import type { Forecast, TrainedModel } from '@/types';
import { formatDate } from '@/lib/utils';

const HORIZONS = [1, 3, 6, 12, 24];

/**
 * Forecast list page with ability to generate new forecasts.
 */
export default function ForecastsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [modelId, setModelId] = useState('');
  const [horizon, setHorizon] = useState(12);

  const { data: forecasts = [], isLoading } = useQuery<Forecast[]>({
    queryKey: ['forecasts'],
    queryFn: () => api.get('/api/forecasts').then((r) => r.data.data),
  });

  const { data: models = [] } = useQuery<TrainedModel[]>({
    queryKey: ['models'],
    queryFn: () => api.get('/api/models').then((r) => r.data.data),
  });

  const generateMutation = useMutation({
    mutationFn: (payload: { modelId: string; horizonMonths: number }) =>
      api.post('/api/forecasts/generate', payload).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forecasts'] });
      toast.success('Forecast generated', `${horizon}-month forecast is ready to view.`);
      setShowModal(false);
    },
    onError: () => toast.error('Forecast failed', 'Could not generate forecast. Please try again.'),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Forecasts</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-light"
        >
          + Generate Forecast
        </button>
      </div>

      <Card>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => <LoadingSkeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : forecasts.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg font-medium">No forecasts yet</p>
            <p className="text-sm mt-1">Generate a forecast to get started.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Horizon', 'Model', 'Created At', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {forecasts.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Badge className="bg-blue-100 text-blue-800">{f.horizonMonths} months</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {f.modelId?.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(f.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/forecasts/${f.id}`} className="text-brand hover:underline text-xs font-medium">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Generate Forecast">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Select a model…</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.algorithm}){m.active ? ' ★ Active' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Horizon</label>
            <div className="flex gap-2 flex-wrap">
              {HORIZONS.map((h) => (
                <button
                  key={h}
                  onClick={() => setHorizon(h)}
                  className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                    horizon === h
                      ? 'bg-brand text-white border-brand'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {h} {h === 1 ? 'month' : 'months'}
                </button>
              ))}
            </div>
          </div>

          {generateMutation.isError && (
            <p className="text-red-600 text-sm">Failed to generate forecast. Please try again.</p>
          )}

          <button
            disabled={!modelId || generateMutation.isPending}
            onClick={() => generateMutation.mutate({ modelId, horizonMonths: horizon })}
            className="w-full bg-brand text-white py-2 rounded-lg text-sm hover:bg-brand-light disabled:opacity-50"
          >
            {generateMutation.isPending ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
