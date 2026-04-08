'use client';

import { useState, useEffect } from 'react';
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

type Algorithm = 'ARIMA' | 'PROPHET' | 'LSTM';

const algorithmInfo: Record<Algorithm, { title: string; description: string; color: string }> = {
  ARIMA: {
    title: 'ARIMA',
    description: 'Autoregressive Integrated Moving Average — best for stationary time series with clear trends.',
    color: 'blue',
  },
  PROPHET: {
    title: 'Prophet',
    description: 'Facebook\'s decomposable model — handles seasonality and holiday effects robustly.',
    color: 'purple',
  },
  LSTM: {
    title: 'LSTM',
    description: 'Long Short-Term Memory neural network — captures complex non-linear temporal patterns.',
    color: 'amber',
  },
};

const schema = z.object({
  name: z.string().min(1, 'Model name is required'),
  algorithm: z.enum(['ARIMA', 'PROPHET', 'LSTM']),
  datasetId: z.string().min(1, 'Dataset is required'),
  pipelineId: z.string().min(1, 'Pipeline is required'),
  // ARIMA
  p: z.coerce.number().min(0).max(5).optional(),
  d: z.coerce.number().min(0).max(2).optional(),
  q: z.coerce.number().min(0).max(5).optional(),
  // Prophet
  changepoint_prior_scale: z.coerce.number().min(0.001).max(0.5).optional(),
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
  const [pollCount, setPollCount] = useState(0);

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
    enabled: !!trainingModelId && trainingModel?.status !== 'TRAINED' && trainingModel?.status !== 'FAILED',
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
      changepoint_prior_scale: 0.05,
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
      } else if (data.algorithm === 'PROPHET') {
        hyperparams.changepoint_prior_scale = data.changepoint_prior_scale;
      } else {
        hyperparams.units = data.units;
        hyperparams.epochs = data.epochs;
      }
      return api.post('/api/models/train', {
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
      toast.info('Training started', `Model "${model.name}" is being trained.`);
    },
    onError: () => toast.error('Training failed to start', 'Check your dataset and pipeline configuration.'),
  });

  const onSubmit = (data: FormData) => {
    trainMutation.mutate({ ...data, algorithm: selectedAlgorithm });
  };

  const trainingStatus = trainingModel?.status;
  const isDone = trainingStatus === 'TRAINED' || trainingStatus === 'FAILED';

  useEffect(() => {
    if (trainingStatus === 'TRAINED') {
      toast.success('Training complete', 'Your model is ready. You can now generate forecasts.');
    } else if (trainingStatus === 'FAILED') {
      toast.error('Training failed', 'Check your data and hyperparameter configuration.');
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
                {pipelines?.filter((p) => p.status === 'COMPLETED').map((p) => (
                  <option key={p.id} value={p.id}>{p.name} (v{p.version})</option>
                ))}
              </select>
              {errors.pipelineId && (
                <p className="text-xs text-red-500 mt-1">{errors.pipelineId.message}</p>
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

            {selectedAlgorithm === 'PROPHET' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Changepoint Prior Scale: {watch('changepoint_prior_scale')}
                </label>
                <input
                  {...register('changepoint_prior_scale')}
                  type="range"
                  min={0.001}
                  max={0.5}
                  step={0.001}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0.001 (smooth)</span>
                  <span>0.5 (flexible)</span>
                </div>
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
