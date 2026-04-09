'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, Brain, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '@/lib/axios';
import { toast } from '@/hooks/useToast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { Dataset, Pipeline, TrainedModel } from '@/types';

type Algorithm = 'ARIMA' | 'ETS' | 'LSTM';

const algorithmInfo: Record<Algorithm, { title: string; description: string; color: string }> = {
  ARIMA: {
    title: 'ARIMA',
    description: 'Autoregressive Integrated Moving Average -best for stationary time series with clear trends.',
    color: 'blue',
  },
  ETS: {
    title: 'Holt-Winters ETS',
    description: 'Triple Exponential Smoothing -decomposes level, additive trend, and seasonal cycles. Ideal for mineral demand data with yearly patterns.',
    color: 'purple',
  },
  LSTM: {
    title: 'LSTM',
    description: 'Long Short-Term Memory neural network -captures complex non-linear temporal patterns.',
    color: 'amber',
  },
};

const schema = z.object({
  name: z.string().min(1, 'Model name is required'),
  algorithm: z.enum(['ARIMA', 'ETS', 'LSTM']),
  datasetId: z.string().min(1, 'Dataset is required'),
  pipelineId: z.string().min(1, 'Pipeline is required'),
  // ARIMA
  p: z.coerce.number().min(0).max(5).optional(),
  d: z.coerce.number().min(0).max(2).optional(),
  q: z.coerce.number().min(0).max(5).optional(),
  // ETS
  seasonal_periods: z.coerce.number().min(4).max(52).optional(),
  // LSTM
  units: z.coerce.number().min(16).max(256).optional(),
  epochs: z.coerce.number().min(10).max(200).optional(),
});

type FormData = z.infer<typeof schema>;

export default function TrainModelPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<Algorithm>('ARIMA');
  const [trainingModelId, setTrainingModelId] = useState<string | null>(null);
  const prevStatusRef = useRef<string | undefined>(undefined);

  const { data: datasets } = useQuery<Dataset[]>({
    queryKey: ['datasets'],
    queryFn: () => api.get('/api/datasets').then((r) => r.data?.data ?? r.data ?? []),
  });

  const { data: pipelines } = useQuery<Pipeline[]>({
    queryKey: ['pipelines'],
    queryFn: () => api.get('/api/preprocessing/pipelines').then((r) => r.data?.data ?? r.data ?? []),
  });

  // Poll training status
  const { data: trainingModel } = useQuery<TrainedModel>({
    queryKey: ['model', trainingModelId],
    queryFn: () => api.get(`/api/models/${trainingModelId}`).then((r) => r.data?.data ?? r.data),
    enabled: !!trainingModelId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'TRAINED' || status === 'FAILED') return false;
      return 3000;
    },
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      algorithm: 'ARIMA',
      p: 1,
      d: 1,
      q: 1,
      seasonal_periods: 12,
      units: 64,
      epochs: 50,
    },
  });

  const trainMutation = useMutation({
    mutationFn: (data: FormData) => {
      const hyperparams: Record<string, unknown> = {};
      if (data.algorithm === 'ARIMA') {
        hyperparams.p = data.p;
        hyperparams.d = data.d;
        hyperparams.q = data.q;
      } else if (data.algorithm === 'ETS') {
        hyperparams.seasonal_periods = data.seasonal_periods ?? 12;
      } else {
        hyperparams.units = data.units;
        hyperparams.epochs = data.epochs;
      }
      return api.post('/api/models', {
        name: data.name,
        algorithm: data.algorithm,
        datasetId: data.datasetId,
        pipelineId: data.pipelineId,
        hyperparamsJson: JSON.stringify(hyperparams),
      }).then((r) => r.data?.data ?? r.data);
    },
    onSuccess: (model: TrainedModel) => {
      setTrainingModelId(model.id);
      queryClient.invalidateQueries({ queryKey: ['models'] });
      toast.info('Training started', `Model "${model.name}" is being trained. You will be redirected when done.`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Check your dataset and pipeline configuration.';
      toast.error('Training failed to start', msg);
    },
  });

  const onSubmit = (data: FormData) => {
    trainMutation.mutate({ ...data, algorithm: selectedAlgorithm });
  };

  const trainingStatus = trainingModel?.status;
  const isDone = trainingStatus === 'TRAINED' || trainingStatus === 'FAILED';

  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = trainingStatus;
    // Only fire toast when status genuinely transitions to a terminal state
    if (trainingStatus === prev) return;
    if (trainingStatus === 'TRAINED') {
      toast.success('Training complete!', 'Your model is ready. Redirecting to forecasting...');
      setTimeout(() => router.push('/forecasting'), 2000);
    } else if (trainingStatus === 'FAILED') {
      toast.error('Training failed', 'Check your data and hyperparameter configuration.');
      // Stay on page so user can fix and retry
    }
  }, [trainingStatus]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link
          href="/forecasting"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Forecasting Engine
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-700">Train New Model</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Train New Model</h1>
        <p className="text-sm text-gray-500 mt-1">Configure and start model training</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Algorithm selector */}
        <Card>
          <CardHeader>
            <CardTitle>1. Select Algorithm</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(Object.entries(algorithmInfo) as [Algorithm, typeof algorithmInfo[Algorithm]][]).map(([algo, info]) => (
                <button
                  key={algo}
                  type="button"
                  onClick={() => setSelectedAlgorithm(algo)}
                  className={cn(
                    'text-left p-4 rounded-xl border-2 transition-all',
                    selectedAlgorithm === algo
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <p className={cn('text-sm font-bold mb-1', selectedAlgorithm === algo ? 'text-blue-700' : 'text-gray-800')}>
                    {info.title}
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed">{info.description}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Model name & selectors */}
        <Card>
          <CardHeader>
            <CardTitle>2. Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model Name</label>
              <input
                {...register('name')}
                placeholder={`${selectedAlgorithm} Model v1`}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.name && (
                <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dataset</label>
              <select
                {...register('datasetId')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select a dataset...</option>
                {datasets?.filter((d) => d.status === 'VALIDATED').map((d) => (
                  <option key={d.id} value={d.id}>{d.name} (v{d.version})</option>
                ))}
              </select>
              {errors.datasetId && (
                <p className="text-xs text-red-500 mt-1">{errors.datasetId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preprocessing Pipeline</label>
              <select
                {...register('pipelineId')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select a pipeline...</option>
                {pipelines?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (v{p.version}) -{p.status === 'COMPLETED' ? '✓ Ready' : p.status}
                  </option>
                ))}
              </select>
              {errors.pipelineId && (
                <p className="text-xs text-red-500 mt-1">{errors.pipelineId.message}</p>
              )}
              {pipelines && pipelines.length > 0 && pipelines.every((p) => p.status !== 'COMPLETED') && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠ No pipeline has been run yet. Open your pipeline and click <strong>Run Pipeline</strong> to prepare it for training.
                </p>
              )}
              {pipelines && pipelines.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  No pipelines found. <a href="/preprocessing/new" className="underline">Create a pipeline</a> first.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Hyperparameters */}
        <Card>
          <CardHeader>
            <CardTitle>3. Hyperparameters</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedAlgorithm === 'ARIMA' && (
              <div className="grid grid-cols-3 gap-4">
                {(['p', 'd', 'q'] as const).map((param) => (
                  <div key={param}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {param.toUpperCase()} {param === 'p' ? '(AR order, 0–5)' : param === 'd' ? '(Diff, 0–2)' : '(MA order, 0–5)'}
                    </label>
                    <input
                      {...register(param)}
                      type="number"
                      min={0}
                      max={param === 'd' ? 2 : 5}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            )}

            {selectedAlgorithm === 'ETS' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seasonal Periods (4–52)
                </label>
                <input
                  {...register('seasonal_periods')}
                  type="number"
                  min={4}
                  max={52}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Number of periods in one seasonal cycle. Use <strong>12</strong> for monthly data, <strong>4</strong> for quarterly.
                </p>
              </div>
            )}

            {selectedAlgorithm === 'LSTM' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Units (16–256)
                  </label>
                  <input
                    {...register('units')}
                    type="number"
                    min={16}
                    max={256}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Epochs (10–200)
                  </label>
                  <input
                    {...register('epochs')}
                    type="number"
                    min={10}
                    max={200}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <button
          type="submit"
          disabled={trainMutation.isPending || (!!trainingModelId && !isDone)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {trainMutation.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Starting Training...</>
          ) : (
            <><Brain className="w-4 h-4" /> Start Training</>
          )}
        </button>

        {trainMutation.isError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-700">Training failed to start. Please try again.</p>
          </div>
        )}
      </form>

      {/* Training progress */}
      {trainingModelId && trainingModel && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Training Progress</CardTitle>
              <Badge
                variant={
                  trainingStatus === 'TRAINED' ? 'success' :
                  trainingStatus === 'FAILED' ? 'danger' : 'info'
                }
              >
                {trainingStatus}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {trainingStatus === 'TRAINED' ? (
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-green-800">Model trained successfully!</p>
                  <Link
                    href={`/forecasting/${trainingModelId}`}
                    className="text-xs text-green-600 hover:underline"
                  >
                    View model details →
                  </Link>
                </div>
              </div>
            ) : trainingStatus === 'FAILED' ? (
              <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-500" />
                <p className="text-sm text-red-700">Training failed. Please check your data and configuration.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  <p className="text-sm text-gray-600">Training in progress...</p>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse w-2/3" />
                </div>
                <p className="text-xs text-gray-400">Polling for updates every 3 seconds</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
