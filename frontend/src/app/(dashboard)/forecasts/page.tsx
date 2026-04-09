'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { FileDown } from 'lucide-react';
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
  const [exportingReport, setExportingReport] = useState(false);

  const exportReport = async () => {
    if (!forecasts || forecasts.length === 0) return;
    setExportingReport(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const PAGE_W = 210, PAGE_H = 297, MARGIN = 14, ROW_H = 8;
      let y = 0;

      doc.setFillColor(26, 58, 92); doc.rect(0, 0, PAGE_W, 18, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(13); doc.setFont('helvetica', 'bold');
      doc.text('BF Mining Group Ltd', MARGIN, 11);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text('AI-Driven Mineral Demand Forecasting System', MARGIN, 16);
      doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toLocaleString()}`, PAGE_W - MARGIN, 11, { align: 'right' });

      y = 26;
      doc.setTextColor(26, 58, 92); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
      doc.text('Forecast History Report', MARGIN, y);
      y += 5;
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
      doc.text(`Total forecasts: ${forecasts.length}`, MARGIN, y);
      y += 8;

      const COL_WIDTHS = [80, 35, 67];
      const headers = ['Model', 'Horizon', 'Generated At'];
      doc.setFillColor(240, 244, 248);
      doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, ROW_H, 'F');
      doc.setTextColor(60, 80, 100); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      let x = MARGIN + 1;
      headers.forEach((h, i) => { doc.text(h, x, y + 5); x += COL_WIDTHS[i]; });
      y += ROW_H;

      doc.setFont('helvetica', 'normal');
      forecasts.forEach((f, idx) => {
        if (y + ROW_H > PAGE_H - 12) { doc.addPage(); y = MARGIN; }
        if (idx % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, ROW_H, 'F'); }
        doc.setTextColor(50, 50, 50); doc.setFontSize(8);
        const cells = [f.modelName ?? f.modelId?.slice(0, 8) ?? '-', `${f.horizonMonths} months`, formatDate(f.createdAt)];
        x = MARGIN + 1;
        cells.forEach((cell, i) => { doc.text(String(cell), x, y + 5); x += COL_WIDTHS[i]; });
        doc.setDrawColor(230, 230, 230);
        doc.line(MARGIN, y + ROW_H, PAGE_W - MARGIN, y + ROW_H);
        y += ROW_H;
      });

      doc.setFillColor(240, 244, 248);
      doc.rect(0, PAGE_H - 8, PAGE_W, 8, 'F');
      doc.setTextColor(120, 120, 120); doc.setFontSize(7);
      doc.text('CONFIDENTIAL - BF Mining Group Ltd', MARGIN, PAGE_H - 3);
      doc.text('Page 1 of 1', PAGE_W - MARGIN, PAGE_H - 3, { align: 'right' });

      doc.save(`BFMining_ForecastReport_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error(err); alert('Report export failed.');
    } finally { setExportingReport(false); }
  };

  const { data: forecasts = [], isLoading } = useQuery<Forecast[]>({
    queryKey: ['forecasts'],
    queryFn: () => api.get('/api/forecasts').then((r) => r.data?.data ?? r.data ?? []),
  });

  const { data: models = [] } = useQuery<TrainedModel[]>({
    queryKey: ['models'],
    queryFn: () => api.get('/api/models').then((r) => r.data?.data ?? r.data ?? []),
  });

  const generateMutation = useMutation({
    mutationFn: (payload: { modelId: string; horizonMonths: number }) =>
      api.post('/api/forecasts/generate', payload).then((r) => r.data?.data ?? r.data),
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
        <div className="flex items-center gap-2">
          <button
            onClick={exportReport}
            disabled={exportingReport || forecasts.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            {exportingReport ? 'Generating…' : 'Export Report'}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-light"
          >
            + Generate Forecast
          </button>
        </div>
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
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {f.modelName ?? f.modelId?.slice(0, 8)}
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
