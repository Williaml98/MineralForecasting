'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api from '@/lib/axios';
import { toast } from '@/hooks/useToast';
import { Card } from '@/components/ui/Card';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import type { Scenario, Forecast, ForecastPoint } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { FileDown } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';

const SLIDERS = [
  { key: 'demandGrowth', label: 'Demand Growth Rate' },
  { key: 'commodityPrice', label: 'Commodity Price' },
  { key: 'productionVolume', label: 'Production Volume' },
  { key: 'exportVolume', label: 'Export Volume' },
  { key: 'policyFactor', label: 'Policy Factor' },
] as const;

type SliderKey = (typeof SLIDERS)[number]['key'];

function parseForecastJson(json?: string): ForecastPoint[] {
  try {
    const arr = JSON.parse(json || '[]');
    return Array.isArray(arr)
      ? arr.map((d: Record<string, number & string>) => ({
          date: d.date,
          value: d.value,
          lower80: d.lower_80 ?? d.lower80 ?? d.value,
          upper80: d.upper_80 ?? d.upper80 ?? d.value,
          lower95: d.lower_95 ?? d.lower95 ?? d.value,
          upper95: d.upper_95 ?? d.upper95 ?? d.value,
        }))
      : [];
  } catch {
    return [];
  }
}

/**
 * Scenario builder page with side-by-side baseline vs adjusted forecast charts
 * and 5 parameter sliders.
 */
export default function ScenarioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [params, setParams] = useState<Record<SliderKey, number>>({
    demandGrowth: 1.0,
    commodityPrice: 1.0,
    productionVolume: 1.0,
    exportVolume: 1.0,
    policyFactor: 1.0,
  });
  const [notes, setNotes] = useState('');
  const [annotateSuccess, setAnnotateSuccess] = useState(false);

  const { data: scenario, isLoading: loadingScenario } = useQuery<Scenario>({
    queryKey: ['scenario', id],
    queryFn: () => api.get(`/api/scenarios/${id}`).then((r) => r.data?.data ?? r.data),
    onSuccess: (s: Scenario) => { if (s.notes) setNotes(s.notes); },
  });

  const { data: baseForecast } = useQuery<Forecast>({
    queryKey: ['forecast', scenario?.baseForecastId],
    queryFn: () =>
      api.get(`/api/forecasts/${scenario!.baseForecastId}`).then((r) => r.data?.data ?? r.data),
    enabled: !!scenario?.baseForecastId,
  });

  const annotateMutation = useMutation({
    mutationFn: (payload: { notes: string; flagForReview: boolean }) =>
      api.post(`/api/scenarios/${id}/annotate`, payload).then((r) => r.data?.data ?? r.data),
    onSuccess: (_: unknown, vars: { flagForReview: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ['scenario', id] });
      setAnnotateSuccess(true);
      setTimeout(() => setAnnotateSuccess(false), 3000);
      toast.success(
        vars.flagForReview ? 'Scenario flagged for review' : 'Scenario saved',
        vars.flagForReview ? 'Executives can now review this scenario.' : 'Notes have been saved.'
      );
    },
    onError: () => toast.error('Save failed', 'Could not save scenario annotations.'),
  });

  if (loadingScenario) return <LoadingSkeleton className="h-96 w-full m-6" />;
  if (!scenario) return <p className="p-6 text-gray-500">Scenario not found.</p>;

  const basePoints = parseForecastJson(baseForecast?.forecastJson);
  const multiplier = Object.values(params).reduce((a, b) => a * b, 1);
  const adjustedPoints = basePoints.map((p) => ({ ...p, value: p.value * multiplier }));

  let recommendation = 'Demand outlook is stable. Current production levels remain appropriate.';
  if (multiplier > 1.1)
    recommendation = `Demand is projected to increase by ~${((multiplier - 1) * 100).toFixed(0)}%. Consider expanding production capacity and reviewing export commitments.`;
  else if (multiplier < 0.9)
    recommendation = `Demand is projected to decline by ~${((1 - multiplier) * 100).toFixed(0)}%. Review inventory levels and consider reducing export volumes.`;

  const canFlag = user?.role === 'STRATEGIST' || user?.role === 'ADMIN';

  const exportScenarioReport = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const PAGE_W = 210, PAGE_H = 297, MARGIN = 14;
      let y = 0;

      doc.setFillColor(26, 58, 92); doc.rect(0, 0, PAGE_W, 18, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(13); doc.setFont('helvetica', 'bold');
      doc.text('BF Mining Group Ltd', MARGIN, 11);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text('AI-Driven Mineral Demand Forecasting System', MARGIN, 16);
      doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toLocaleString()}`, PAGE_W - MARGIN, 11, { align: 'right' });

      y = 28;
      doc.setTextColor(26, 58, 92); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
      doc.text('Scenario Analysis Report', MARGIN, y); y += 6;
      doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50);
      doc.text(`Scenario: ${scenario.name}`, MARGIN, y); y += 5;
      doc.setFontSize(8); doc.setTextColor(100, 100, 100);
      doc.text(`Created: ${new Date(scenario.createdAt).toLocaleString()}  |  Status: ${scenario.flaggedForReview ? 'Flagged for Review' : 'Draft'}`, MARGIN, y); y += 10;

      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 58, 92);
      doc.text('Scenario Parameters', MARGIN, y); y += 6;
      SLIDERS.forEach(({ key, label }, idx) => {
        if (idx % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 8, 'F'); }
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50);
        doc.text(label, MARGIN + 3, y + 5.5);
        doc.text(`${params[key].toFixed(2)}x`, PAGE_W - MARGIN - 3, y + 5.5, { align: 'right' });
        y += 8;
      });
      y += 5;
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(50, 50, 50);
      doc.text(`Combined Multiplier: ${multiplier.toFixed(3)}x`, MARGIN, y); y += 10;

      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 58, 92);
      doc.text('Recommendation', MARGIN, y); y += 6;
      doc.setFillColor(multiplier > 1.1 ? 240 : multiplier < 0.9 ? 255 : 235, 255, 240);
      const recLines = doc.splitTextToSize(recommendation, PAGE_W - MARGIN * 2 - 6);
      doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, recLines.length * 6 + 6, 'F');
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50);
      recLines.forEach((line: string, i: number) => { doc.text(line, MARGIN + 3, y + 5 + i * 6); });
      y += recLines.length * 6 + 10;

      if (scenario.notes) {
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 58, 92);
        doc.text('Strategic Notes', MARGIN, y); y += 6;
        const noteLines = doc.splitTextToSize(scenario.notes, PAGE_W - MARGIN * 2 - 6);
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50);
        noteLines.forEach((line: string, i: number) => { doc.text(line, MARGIN + 3, y + i * 6); });
      }

      doc.setFillColor(240, 244, 248); doc.rect(0, PAGE_H - 8, PAGE_W, 8, 'F');
      doc.setTextColor(120, 120, 120); doc.setFontSize(7);
      doc.text('CONFIDENTIAL - BF Mining Group Ltd - Internal Use Only', MARGIN, PAGE_H - 3);
      doc.text('Page 1 of 1', PAGE_W - MARGIN, PAGE_H - 3, { align: 'right' });

      doc.save(`BFMining_Scenario_${scenario.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) { console.error(err); alert('Report export failed.'); }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
        <h1 className="text-2xl font-bold text-gray-900">{scenario.name}</h1>
        {scenario.flaggedForReview && (
          <span className="text-amber-600 text-sm font-medium mt-1 inline-block">
            🚩 Flagged for Executive Review
          </span>
        )}
        </div>
        <button
          onClick={exportScenarioReport}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
        >
          <FileDown className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Sliders */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold mb-4">Scenario Parameters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {SLIDERS.map(({ key, label }) => (
            <div key={key}>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">{label}</label>
                <span className="text-sm font-mono text-brand">{params[key].toFixed(2)}×</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={params[key]}
                onChange={(e) => setParams((p) => ({ ...p, [key]: parseFloat(e.target.value) }))}
                className="w-full accent-brand"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0.5×</span><span>1.0×</span><span>2.0×</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Combined multiplier: <strong>{multiplier.toFixed(3)}×</strong>
        </p>
      </Card>

      {/* Charts side-by-side */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Baseline Forecast</h3>
          {basePoints.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No base forecast data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={basePoints}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#1a3a5c" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Adjusted Forecast ({multiplier.toFixed(2)}×)</h3>
          {adjustedPoints.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No base forecast data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={adjustedPoints}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#e53e3e" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Recommendation */}
      <Card className={`p-4 border-l-4 ${multiplier > 1.1 ? 'border-l-green-500 bg-green-50' : multiplier < 0.9 ? 'border-l-red-500 bg-red-50' : 'border-l-blue-500 bg-blue-50'}`}>
        <p className="text-sm font-medium text-gray-800">💡 Recommendation</p>
        <p className="text-sm text-gray-600 mt-1">{recommendation}</p>
      </Card>

      {/* Annotations */}
      <Card className="p-5 space-y-4">
        <h2 className="text-lg font-semibold">Notes & Actions</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Add strategic notes…"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
        />
        <div className="flex gap-3">
          <button
            onClick={() =>
              annotateMutation.mutate({ notes, flagForReview: scenario.flaggedForReview })
            }
            disabled={annotateMutation.isPending}
            className="px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-light disabled:opacity-50"
          >
            Save Notes
          </button>
          {canFlag && (
            <button
              onClick={() => annotateMutation.mutate({ notes, flagForReview: true })}
              disabled={annotateMutation.isPending || scenario.flaggedForReview}
              className="px-4 py-2 border border-amber-400 text-amber-700 rounded-lg text-sm hover:bg-amber-50 disabled:opacity-50"
            >
              🚩 Flag for Executive Review
            </button>
          )}
        </div>
        {annotateSuccess && (
          <p className="text-green-600 text-sm">Saved successfully.</p>
        )}
      </Card>
    </div>
  );
}
