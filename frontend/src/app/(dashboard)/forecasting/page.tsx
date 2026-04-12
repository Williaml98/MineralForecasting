'use client';

import { useState } from 'react';
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
  Trash2,
  TrendingUp,
  FileDown,
  RefreshCw,
  BarChart3,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import api from '@/lib/axios';
import { toast } from '@/hooks/useToast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { Modal } from '@/components/ui/Modal';
import type { TrainedModel, Dataset, Pipeline } from '@/types';

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
  if (!metricsJson) return 'N/A';
  try {
    const metrics = JSON.parse(metricsJson);
    const val = metrics[key];
    if (val == null) return 'N/A';
    return typeof val === 'number' ? val.toFixed(4) : String(val);
  } catch {
    return 'N/A';
  }
}

function parseMetricRaw(metricsJson: string | undefined, key: string): number | null {
  if (!metricsJson) return null;
  try {
    const m = JSON.parse(metricsJson);
    const v = m[key];
    return typeof v === 'number' ? v : null;
  } catch { return null; }
}

export default function ForecastingPage() {
  const queryClient = useQueryClient();
  const [exportingReport, setExportingReport] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [retrainModel, setRetrainModel] = useState<TrainedModel | null>(null);
  const [retrainDatasetId, setRetrainDatasetId] = useState('');
  const [retrainPipelineId, setRetrainPipelineId] = useState('');

  const { data: datasets = [] } = useQuery<Dataset[]>({
    queryKey: ['datasets'],
    queryFn: () => api.get('/api/datasets').then((r) => r.data?.data ?? r.data ?? []),
  });

  const { data: pipelines = [] } = useQuery<Pipeline[]>({
    queryKey: ['pipelines'],
    queryFn: () => api.get('/api/preprocessing/pipelines').then((r) => r.data?.data ?? r.data ?? []),
  });

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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/models/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      toast.success('Model deleted', 'The model has been permanently removed.');
    },
    onError: () => toast.error('Delete failed', 'Could not delete the model.'),
  });

  const retrainMutation = useMutation({
    mutationFn: ({ id, datasetId, pipelineId }: { id: string; datasetId: string; pipelineId: string }) =>
      api.post(`/api/models/${id}/retrain`, {
        datasetId: datasetId || null,
        pipelineId: pipelineId || null,
      }).then((r) => r.data?.data ?? r.data),
    onSuccess: (m: TrainedModel) => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      toast.success('Retraining started', `"${m.name}" is being retrained.`);
      setRetrainModel(null);
      setRetrainDatasetId('');
      setRetrainPipelineId('');
    },
    onError: () => toast.error('Retrain failed', 'Could not start retraining. Please try again.'),
  });

  const activeModel = models?.find((m) => m.active);

  // Prepare chart data from trained models only
  const chartData = (models ?? [])
    .filter((m) => m.status === 'TRAINED')
    .map((m) => ({
      name: m.name.length > 12 ? m.name.slice(0, 12) + '…' : m.name,
      MAE: parseMetricRaw(m.metricsJson, 'mae') ?? 0,
      RMSE: parseMetricRaw(m.metricsJson, 'rmse') ?? 0,
      MAPE: parseMetricRaw(m.metricsJson, 'mape') ?? 0,
      algorithm: m.algorithm,
    }));

  const exportReport = async () => {
    if (!models || models.length === 0) return;
    setExportingReport(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const PAGE_W = 297, PAGE_H = 210, MARGIN = 14, ROW_H = 8;
      let y = 0;

      doc.setFillColor(26, 58, 92);
      doc.rect(0, 0, PAGE_W, 18, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13); doc.setFont('helvetica', 'bold');
      doc.text('BF Mining Group Ltd', MARGIN, 11);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text('AI-Driven Mineral Demand Forecasting System', MARGIN, 16);
      doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toLocaleString()}`, PAGE_W - MARGIN, 11, { align: 'right' });

      y = 26;
      doc.setTextColor(26, 58, 92); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
      doc.text('Model Performance Report', MARGIN, y);
      y += 5;
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
      doc.text(`Total models: ${models.length}  |  Active model: ${activeModel?.name ?? 'None'}`, MARGIN, y);
      y += 8;

      const COL_WIDTHS = [60, 30, 30, 35, 35, 35, 25];
      const headers = ['Model Name', 'Algorithm', 'Status', 'MAE', 'RMSE', 'MAPE (%)', 'Active'];
      doc.setFillColor(240, 244, 248);
      doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, ROW_H, 'F');
      doc.setTextColor(60, 80, 100); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      let x = MARGIN + 1;
      headers.forEach((h, i) => { doc.text(h, x, y + 5); x += COL_WIDTHS[i]; });
      y += ROW_H;

      doc.setFont('helvetica', 'normal');
      models.forEach((m, idx) => {
        if (y + ROW_H > PAGE_H - 12) { doc.addPage(); y = MARGIN; }
        if (idx % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, ROW_H, 'F'); }
        doc.setTextColor(50, 50, 50); doc.setFontSize(8);
        const mae = parseMetricRaw(m.metricsJson, 'mae');
        const rmse = parseMetricRaw(m.metricsJson, 'rmse');
        const mape = parseMetricRaw(m.metricsJson, 'mape');
        const cells = [m.name, m.algorithm, m.status,
          mae != null ? mae.toFixed(4) : 'N/A',
          rmse != null ? rmse.toFixed(4) : 'N/A',
          mape != null ? mape.toFixed(2) : 'N/A',
          m.active ? 'Yes' : 'No'];
        x = MARGIN + 1;
        cells.forEach((cell, i) => { doc.text(String(cell).slice(0, 30), x, y + 5); x += COL_WIDTHS[i]; });
        doc.setDrawColor(230, 230, 230);
        doc.line(MARGIN, y + ROW_H, PAGE_W - MARGIN, y + ROW_H);
        y += ROW_H;
      });

      doc.setFillColor(240, 244, 248);
      doc.rect(0, PAGE_H - 8, PAGE_W, 8, 'F');
      doc.setTextColor(120, 120, 120); doc.setFontSize(7);
      doc.text('CONFIDENTIAL - BF Mining Group Ltd - Internal Use Only', MARGIN, PAGE_H - 3);
      doc.text(`Page 1 of 1`, PAGE_W - MARGIN, PAGE_H - 3, { align: 'right' });

      doc.save(`BFMining_ModelReport_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Report export failed.');
    } finally {
      setExportingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Forecasting Engine</h1>
          <p className="text-sm text-gray-500 mt-1">Train, compare, and manage forecasting models</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportReport}
            disabled={exportingReport || !models || models.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            {exportingReport ? 'Generating…' : 'Export Report'}
          </button>
          <Link
            href="/forecasting/train"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Train New Model
          </Link>
        </div>
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

      {/* Visual metric comparison chart (toggle) */}
      {chartData.length >= 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                Metric Comparison Chart
              </CardTitle>
              <button
                onClick={() => setShowChart((v) => !v)}
                className="text-xs text-blue-600 hover:underline"
              >
                {showChart ? 'Hide chart' : 'Show chart'}
              </button>
            </div>
          </CardHeader>
          {showChart && (
            <CardContent>
              <p className="text-xs text-gray-500 mb-4">
                Lower is better for all metrics. MAE and RMSE are in the same units as demand;
                MAPE is a percentage. Use these to pick which model to activate.
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {(['MAE', 'RMSE', 'MAPE'] as const).map((metric) => (
                  <div key={metric}>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 text-center">
                      {metric}{metric === 'MAPE' ? ' (%)' : ''}
                    </p>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} />
                        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <Tooltip
                          formatter={(v: number) => v.toFixed(4)}
                          contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                        />
                        <Bar
                          dataKey={metric}
                          fill={metric === 'MAE' ? '#3b82f6' : metric === 'RMSE' ? '#8b5cf6' : '#f59e0b'}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
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
                            <span className="text-gray-300 text-xs">N/A</span>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/forecasting/${m.id}`}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="View details"
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
                            {m.status === 'TRAINED' && (
                              <button
                                onClick={() => {
                                  setRetrainModel(m);
                                  setRetrainDatasetId(m.datasetId ?? '');
                                  setRetrainPipelineId(m.pipelineId ?? '');
                                }}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                                title="Retrain with new data"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (confirm(`Delete model "${m.name}"? This cannot be undone.`)) {
                                  deleteMutation.mutate(m.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                              title="Delete model"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
      {/* Retrain modal */}
      <Modal
        isOpen={!!retrainModel}
        onClose={() => setRetrainModel(null)}
        title={`Retrain: ${retrainModel?.name ?? ''}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            A new model will be created using the same algorithm
            (<strong>{retrainModel?.algorithm}</strong>) and hyperparameters.
            Select a dataset and pipeline - leave unchanged to retrain on the same data.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dataset</label>
            <select
              value={retrainDatasetId}
              onChange={(e) => setRetrainDatasetId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Same as original</option>
              {datasets.filter((d) => d.status === 'VALIDATED').map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} (v{d.version})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pipeline</label>
            <select
              value={retrainPipelineId}
              onChange={(e) => setRetrainPipelineId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Same as original</option>
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} - {p.status}
                </option>
              ))}
            </select>
          </div>

          <button
            disabled={retrainMutation.isPending}
            onClick={() => {
              if (!retrainModel) return;
              retrainMutation.mutate({
                id: retrainModel.id,
                datasetId: retrainDatasetId,
                pipelineId: retrainPipelineId,
              });
            }}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-2 rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${retrainMutation.isPending ? 'animate-spin' : ''}`} />
            {retrainMutation.isPending ? 'Starting retrain…' : 'Start Retraining'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
