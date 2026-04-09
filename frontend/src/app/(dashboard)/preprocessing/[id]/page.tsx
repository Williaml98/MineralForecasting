'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Card } from '@/components/ui/Card';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { Badge } from '@/components/ui/Badge';
import type { Pipeline } from '@/types';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const STEPS = ['Missing Values', 'Outlier Detection', 'Normalisation', 'Feature Engineering'];

export default function PipelineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeStep, setActiveStep] = useState(0);
  const [success, setSuccess] = useState(false);

  const { data: pipeline, isLoading } = useQuery<Pipeline>({
    queryKey: ['pipeline', id],
    queryFn: () => api.get(`/api/preprocessing/pipelines/${id}`).then((r) => r.data?.data ?? r.data),
  });

  const runMutation = useMutation({
    mutationFn: () => api.post(`/api/preprocessing/pipelines/run/${id}`).then((r) => r.data?.data ?? r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline', id] });
      setSuccess(true);
    },
  });

  if (isLoading) return <LoadingSkeleton className="h-64 w-full" />;
  if (!pipeline) return <p className="text-gray-500 p-6">Pipeline not found.</p>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{pipeline.name}</h1>
          <p className="text-sm text-gray-500">Version {pipeline.version}</p>
        </div>
        <Badge className={pipeline.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
          {pipeline.status}
        </Badge>
      </div>
      <Card className="p-6">
        <div className="flex space-x-2 mb-6">
          {STEPS.map((step, idx) => (
            <button key={step} onClick={() => setActiveStep(idx)}
              className={cn('flex-1 py-2 px-3 text-sm rounded-lg font-medium',
                activeStep === idx ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
              {idx + 1}. {step}
            </button>
          ))}
        </div>
        {activeStep === 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Missing Value Strategy</h3>
            {['Mean / Median', 'Forward Fill', 'Row Removal'].map((o) => (
              <label key={o} className="flex items-center space-x-2"><input type="radio" name="imp" className="accent-brand" /><span className="text-sm">{o}</span></label>
            ))}
          </div>
        )}
        {activeStep === 1 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Outlier Detection</h3>
            {['Z-Score (3σ)', 'IQR Method'].map((o) => (
              <label key={o} className="flex items-center space-x-2"><input type="radio" name="out" className="accent-brand" /><span className="text-sm">{o}</span></label>
            ))}
          </div>
        )}
        {activeStep === 2 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Normalisation</h3>
            {['Min-Max Scaling', 'Z-Score Normalisation'].map((o) => (
              <label key={o} className="flex items-center space-x-2"><input type="radio" name="norm" className="accent-brand" /><span className="text-sm">{o}</span></label>
            ))}
          </div>
        )}
        {activeStep === 3 && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Rolling Windows (months)</label>
              <input defaultValue="3,6,12" className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Lag Steps</label>
              <input defaultValue="1,2,3" className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
        )}
        <div className="flex justify-between mt-6">
          <button onClick={() => setActiveStep((s) => Math.max(0, s - 1))} disabled={activeStep === 0}
            className="px-4 py-2 text-sm border rounded-lg disabled:opacity-40">Previous</button>
          {activeStep < STEPS.length - 1 ? (
            <button onClick={() => setActiveStep((s) => s + 1)} className="px-4 py-2 text-sm bg-brand text-white rounded-lg">Next</button>
          ) : pipeline.status === 'COMPLETED' ? (
            <span className="px-6 py-2 text-sm bg-green-100 text-green-700 rounded-lg font-medium">✓ Already Run</span>
          ) : (
            <button onClick={() => runMutation.mutate()} disabled={runMutation.isPending}
              className="px-6 py-2 text-sm bg-green-600 text-white rounded-lg disabled:opacity-50">
              {runMutation.isPending ? 'Running…' : 'Run Pipeline'}
            </button>
          )}
        </div>
      </Card>
      {(success || pipeline.status === 'COMPLETED') && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-700 text-sm flex items-center gap-2">
          <span>✓</span>
          <span>Pipeline is <strong>ready</strong> - you can now select it when training a model.</span>
        </div>
      )}
    </div>
  );
}
