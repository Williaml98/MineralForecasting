'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, GitBranch, CheckCircle } from 'lucide-react';
import api from '@/lib/axios';
import { toast } from '@/hooks/useToast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import type { Dataset } from '@/types';

// Preprocessing step options
const MISSING_VALUE_OPTIONS = [
  { value: 'mean', label: 'Mean Fill', description: 'Replace missing values with the column mean' },
  { value: 'median', label: 'Median Fill', description: 'Replace missing values with the column median' },
  { value: 'forward_fill', label: 'Forward Fill', description: 'Carry the last known value forward' },
  { value: 'drop', label: 'Drop Rows', description: 'Remove any rows containing missing values' },
];

const OUTLIER_OPTIONS = [
  { value: 'none', label: 'None', description: 'Keep all values as-is' },
  { value: 'zscore', label: 'Z-Score (3σ)', description: 'Flag values more than 3 standard deviations from the mean' },
  { value: 'iqr', label: 'IQR Method', description: 'Flag values outside 1.5× the interquartile range' },
];

const NORMALISATION_OPTIONS = [
  { value: 'none', label: 'None', description: 'Use raw values' },
  { value: 'minmax', label: 'Min-Max Scaling', description: 'Scale values to [0, 1] range' },
  { value: 'zscore', label: 'Z-Score Normalisation', description: 'Standardise to mean=0, std=1' },
];

export default function NewPipelinePage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [datasetId, setDatasetId] = useState('');
  const [missingValues, setMissingValues] = useState('forward_fill');
  const [outlierMethod, setOutlierMethod] = useState('iqr');
  const [normalisation, setNormalisation] = useState('none');
  const [dateCol, setDateCol] = useState('date');
  const [valueCol, setValueCol] = useState('demand');

  const { data: datasets } = useQuery<Dataset[]>({
    queryKey: ['datasets'],
    queryFn: () => api.get('/api/datasets').then((r) => r.data?.data ?? r.data ?? []),
  });

  const validatedDatasets = datasets?.filter((d) => d.status === 'VALIDATED') ?? [];

  const createMutation = useMutation({
    mutationFn: () => {
      const config = { missingValues, outlierMethod, normalisation, dateCol, valueCol };
      return api.post('/api/preprocessing/pipelines', {
        name: name.trim(),
        datasetId: datasetId || null,
        configJson: JSON.stringify(config),
      }).then((r) => r.data?.data ?? r.data);
    },
    onSuccess: (pipeline: { id: string; name: string }) => {
      toast.success('Pipeline created', `"${pipeline.name}" is ready to run.`);
      router.push(`/preprocessing/${pipeline.id}`);
    },
    onError: () => toast.error('Failed to create pipeline', 'Please check your inputs and try again.'),
  });

  const canSubmit = name.trim().length > 0 && !createMutation.isPending;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/preprocessing" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Preprocessing
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">New Pipeline</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Preprocessing Pipeline</h1>
        <p className="text-sm text-gray-500 mt-1">
          A pipeline cleans and prepares your dataset before model training. Each model needs one.
        </p>
      </div>

      {/* What is a pipeline - info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">What does a pipeline do?</p>
        <ul className="space-y-1 text-blue-700">
          <li>• <strong>Handles missing values</strong> - fills gaps in your time series data</li>
          <li>• <strong>Removes outliers</strong> - detects and handles extreme data points</li>
          <li>• <strong>Normalises values</strong> - scales data so the model trains better (important for LSTM)</li>
          <li>• <strong>Maps columns</strong> - tells the system which column is the date and which is the value</li>
        </ul>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}
        className="space-y-5"
      >
        {/* Name */}
        <Card>
          <CardHeader><CardTitle>1. Pipeline Name & Dataset</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pipeline Name <span className="text-red-500">*</span></label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Copper Clean v1"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dataset <span className="text-gray-400 font-normal">(optional - can link later)</span></label>
              <select
                value={datasetId}
                onChange={(e) => setDatasetId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a validated dataset…</option>
                {validatedDatasets.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {validatedDatasets.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">No validated datasets yet - upload a CSV first.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Column Name</label>
                <input
                  value={dateCol}
                  onChange={(e) => setDateCol(e.target.value)}
                  placeholder="date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Column header in your CSV</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Value Column Name</label>
                <input
                  value={valueCol}
                  onChange={(e) => setValueCol(e.target.value)}
                  placeholder="demand"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">The numeric column to forecast</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Missing values */}
        <Card>
          <CardHeader><CardTitle>2. Missing Value Strategy</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MISSING_VALUE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMissingValues(opt.value)}
                  className={cn(
                    'text-left p-3 rounded-xl border-2 transition-all',
                    missingValues === opt.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {missingValues === opt.value && <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                    <p className={cn('text-sm font-semibold', missingValues === opt.value ? 'text-blue-700' : 'text-gray-800')}>
                      {opt.label}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{opt.description}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Outlier detection */}
        <Card>
          <CardHeader><CardTitle>3. Outlier Detection</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {OUTLIER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setOutlierMethod(opt.value)}
                  className={cn(
                    'text-left p-3 rounded-xl border-2 transition-all',
                    outlierMethod === opt.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {outlierMethod === opt.value && <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                    <p className={cn('text-sm font-semibold', outlierMethod === opt.value ? 'text-blue-700' : 'text-gray-800')}>
                      {opt.label}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{opt.description}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Normalisation */}
        <Card>
          <CardHeader><CardTitle>4. Normalisation</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {NORMALISATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setNormalisation(opt.value)}
                  className={cn(
                    'text-left p-3 rounded-xl border-2 transition-all',
                    normalisation === opt.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {normalisation === opt.value && <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                    <p className={cn('text-sm font-semibold', normalisation === opt.value ? 'text-blue-700' : 'text-gray-800')}>
                      {opt.label}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{opt.description}</p>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Tip: Use <strong>Z-Score</strong> or <strong>Min-Max</strong> when training LSTM. ARIMA and Prophet work fine without normalisation.
            </p>
          </CardContent>
        </Card>

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <GitBranch className="w-4 h-4" />
          {createMutation.isPending ? 'Creating…' : 'Create Pipeline'}
        </button>
      </form>
    </div>
  );
}
