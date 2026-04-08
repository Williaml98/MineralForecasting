'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/axios';
import { toast } from '@/hooks/useToast';
import { Card } from '@/components/ui/Card';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { Modal } from '@/components/ui/Modal';
import type { Scenario, Forecast } from '@/types';
import { formatDate } from '@/lib/utils';

/**
 * Scenario list page with ability to create new scenarios.
 */
export default function ScenariosPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [baseForecastId, setBaseForecastId] = useState('');
  const [notes, setNotes] = useState('');

  const { data: scenarios = [], isLoading } = useQuery<Scenario[]>({
    queryKey: ['scenarios'],
    queryFn: () => api.get('/api/scenarios').then((r) => r.data.data),
  });

  const { data: forecasts = [] } = useQuery<Forecast[]>({
    queryKey: ['forecasts'],
    queryFn: () => api.get('/api/forecasts').then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; baseForecastId: string; notes: string }) =>
      api.post('/api/scenarios', payload).then((r) => r.data.data),
    onSuccess: (scenario: { name: string }) => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      toast.success('Scenario created', `"${scenario.name}" is ready for analysis.`);
      setShowModal(false);
      setName('');
      setBaseForecastId('');
      setNotes('');
    },
    onError: () => toast.error('Failed to create scenario'),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Scenario Analysis</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-light"
        >
          + New Scenario
        </button>
      </div>

      <Card>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => <LoadingSkeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : scenarios.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg font-medium">No scenarios yet</p>
            <p className="text-sm mt-1">Create a scenario to explore what-if analysis.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Name', 'Flagged', 'Created At', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {scenarios.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                  <td className="px-4 py-3">
                    {s.flaggedForReview ? (
                      <span className="text-amber-500 text-base" title="Flagged for executive review">🚩</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(s.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/decisions/scenarios/${s.id}`} className="text-brand hover:underline text-xs font-medium">
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Scenario">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scenario Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="e.g. High demand Q3 2027"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base Forecast</label>
            <select
              value={baseForecastId}
              onChange={(e) => setBaseForecastId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Select a forecast…</option>
              {forecasts.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.horizonMonths}-month forecast ({f.id.slice(0, 8)}…)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
              placeholder="Optional strategic notes…"
            />
          </div>
          <button
            disabled={!name || createMutation.isPending}
            onClick={() => createMutation.mutate({ name, baseForecastId, notes })}
            className="w-full bg-brand text-white py-2 rounded-lg text-sm hover:bg-brand-light disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating…' : 'Create Scenario'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
