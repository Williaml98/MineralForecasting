'use client';

import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useState } from 'react';
import {
  Brain,
  Calendar,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  Info,
  FileDown,
} from 'lucide-react';
import api from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { KpiCardSkeleton, LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { Badge } from '@/components/ui/Badge';
import type { TrainedModel, Forecast, ForecastPoint, Scenario } from '@/types';

interface Warning {
  title: string;
  description: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
}


const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  } catch {
    return dateStr;
  }
};

const formatValue = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(0);
};

function WarningBanner({ warning }: { warning: Warning }) {
  const config = {
    CRITICAL: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', icon: AlertCircle, iconColor: 'text-red-500' },
    WARNING: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', icon: AlertTriangle, iconColor: 'text-amber-500' },
    INFO: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', icon: Info, iconColor: 'text-blue-500' },
  }[warning.severity];

  const Icon = config.icon;
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${config.bg}`}>
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.iconColor}`} />
      <div>
        <p className={`text-sm font-medium ${config.text}`}>{warning.title}</p>
        <p className={`text-xs mt-0.5 ${config.text} opacity-80`}>{warning.description}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [exportingReport, setExportingReport] = useState(false);
  const { data: models, isLoading: loadingModels } = useQuery<TrainedModel[]>({
    queryKey: ['models'],
    queryFn: () => api.get('/api/models').then((r) => r.data?.data ?? r.data ?? []),
  });

  const { data: forecasts, isLoading: loadingForecasts } = useQuery<Forecast[]>({
    queryKey: ['forecasts'],
    queryFn: () => api.get('/api/forecasts').then((r) => r.data?.data ?? r.data ?? []),
  });

  const { data: warnings, isLoading: loadingWarnings } = useQuery<Warning[]>({
    queryKey: ['warnings'],
    queryFn: () => api.get('/api/decisions/warnings').then((r) => r.data?.data ?? r.data ?? []),
  });

  const { data: scenarios, isLoading: loadingScenarios } = useQuery<Scenario[]>({
    queryKey: ['scenarios'],
    queryFn: () => api.get('/api/scenarios').then((r) => r.data?.data ?? r.data ?? []),
  });

  const activeModel = models?.find((m) => m.active);
  const latestForecast = forecasts && forecasts.length > 0 ? forecasts[0] : null;

  let forecastPoints: ForecastPoint[] = [];
  if (latestForecast?.forecastJson) {
    try {
      const raw = JSON.parse(latestForecast.forecastJson);
      // ML service uses snake_case (lower_80) but recharts needs camelCase (lower80)
      forecastPoints = Array.isArray(raw) ? raw.map((d: Record<string, number | string>) => ({
        date: d.date as string,
        value: d.value as number,
        lower80: (d.lower_80 ?? d.lower80) as number,
        upper80: (d.upper_80 ?? d.upper80) as number,
        lower95: (d.lower_95 ?? d.lower95) as number,
        upper95: (d.upper_95 ?? d.upper95) as number,
      })) : [];
    } catch {
      forecastPoints = [];
    }
  }

  const firstValue = forecastPoints.length > 0 ? forecastPoints[0].value : null;

  const kpis = [
    {
      label: 'Active Model',
      value: activeModel?.name ?? '-',
      sub: activeModel?.algorithm ?? 'No active model',
      icon: Brain,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Forecast Horizon',
      value: latestForecast ? `${latestForecast.horizonMonths} months` : '12 months',
      sub: 'Current configuration',
      icon: Calendar,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Next-Period Demand',
      value: firstValue !== null ? formatValue(firstValue) : '-',
      sub: forecastPoints.length > 0 ? `As of ${formatDate(forecastPoints[0].date)}` : 'No forecast data',
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Active Warnings',
      value: warnings ? String(warnings.length) : '-',
      sub: warnings && warnings.length > 0 ? 'Requires attention' : 'All clear',
      icon: AlertTriangle,
      color: warnings && warnings.length > 0 ? 'text-amber-600' : 'text-gray-400',
      bg: warnings && warnings.length > 0 ? 'bg-amber-50' : 'bg-gray-50',
    },
  ];

  const recentScenarios = scenarios?.slice(0, 5) ?? [];

  const exportDashboardReport = async () => {
    setExportingReport(true);
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
      doc.setTextColor(26, 58, 92); doc.setFontSize(16); doc.setFont('helvetica', 'bold');
      doc.text('Executive Dashboard Report', MARGIN, y);
      y += 7;
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
      doc.text(`Report Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, MARGIN, y);
      y += 12;

      // KPI Section
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 58, 92);
      doc.text('Key Performance Indicators', MARGIN, y); y += 6;
      doc.setFillColor(240, 244, 248); doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 40, 'F');
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50);
      const kpiLines = [
        `Active Model: ${activeModel?.name ?? 'None'} (${activeModel?.algorithm ?? '-'})`,
        `Forecast Horizon: ${latestForecast ? `${latestForecast.horizonMonths} months` : 'No forecast'}`,
        `Next-Period Demand: ${firstValue !== null ? formatValue(firstValue) : 'N/A'}`,
        `Active Warnings: ${warnings?.length ?? 0}`,
        `Total Models Trained: ${models?.length ?? 0}`,
        `Total Scenarios: ${scenarios?.length ?? 0}`,
      ];
      kpiLines.forEach((line, i) => {
        doc.text(line, MARGIN + 4, y + 7 + i * 6);
      });
      y += 46;

      if (warnings && warnings.length > 0) {
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 58, 92);
        doc.text('Active Warnings', MARGIN, y); y += 6;
        warnings.forEach((w) => {
          doc.setFillColor(w.severity === 'CRITICAL' ? 255 : w.severity === 'WARNING' ? 255 : 219,
            w.severity === 'CRITICAL' ? 220 : w.severity === 'WARNING' ? 237 : 234,
            w.severity === 'CRITICAL' ? 220 : w.severity === 'WARNING' ? 213 : 254);
          doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 12, 'F');
          doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(50, 50, 50);
          doc.text(`[${w.severity}] ${w.title}`, MARGIN + 3, y + 5);
          doc.setFont('helvetica', 'normal');
          const desc = doc.splitTextToSize(w.description, PAGE_W - MARGIN * 2 - 6)[0] ?? '';
          doc.text(desc, MARGIN + 3, y + 10);
          y += 14;
        });
        y += 4;
      }

      if (recentScenarios.length > 0) {
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 58, 92);
        doc.text('Recent Scenarios', MARGIN, y); y += 6;
        recentScenarios.forEach((s, idx) => {
          if (idx % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 8, 'F'); }
          doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50);
          doc.text(`${s.name}${s.flaggedForReview ? ' [Flagged]' : ''}`, MARGIN + 2, y + 5);
          doc.text(new Date(s.createdAt).toLocaleDateString(), PAGE_W - MARGIN - 2, y + 5, { align: 'right' });
          y += 8;
        });
      }

      doc.setFillColor(240, 244, 248); doc.rect(0, PAGE_H - 8, PAGE_W, 8, 'F');
      doc.setTextColor(120, 120, 120); doc.setFontSize(7);
      doc.text('CONFIDENTIAL - BF Mining Group Ltd - Internal Use Only', MARGIN, PAGE_H - 3);
      doc.text('Page 1 of 1', PAGE_W - MARGIN, PAGE_H - 3, { align: 'right' });

      doc.save(`BFMining_DashboardReport_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error(err); alert('Report export failed.');
    } finally { setExportingReport(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Mineral demand forecasting overview</p>
        </div>
        <button
          onClick={exportDashboardReport}
          disabled={exportingReport}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <FileDown className="w-4 h-4" />
          {exportingReport ? 'Generating…' : 'Export Report'}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {(loadingModels || loadingForecasts || loadingWarnings)
          ? Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
          : kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Card key={kpi.label} className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{kpi.label}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
                      <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${kpi.color}`} />
                    </div>
                  </div>
                </Card>
              );
            })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Forecast Chart */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
              <CardTitle>Forecast Overview</CardTitle>
              {activeModel && latestForecast && (
                <span className="text-xs text-gray-400">
                  Model: <span className="font-medium text-gray-600">{activeModel.name}</span> · {latestForecast.horizonMonths}-month horizon
                </span>
              )}
            </div>
            </CardHeader>
            <CardContent>
              {loadingForecasts ? (
                <LoadingSkeleton className="h-64 w-full" />
              ) : forecastPoints.length === 0 ? (
                <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-400">No forecast data available. Generate a forecast to see it here.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={forecastPoints} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorBand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#bfdbfe" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#bfdbfe" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10 }} tickLine={false} />
                    <YAxis tickFormatter={formatValue} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(v: number) => formatValue(v)}
                      labelFormatter={(l: string) => formatDate(l)}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Area type="monotone" dataKey="upper80" stroke="transparent" fill="url(#colorBand)" name="80% CI Upper" legendType="none" />
                    <Area type="monotone" dataKey="lower80" stroke="transparent" fill="#fff" name="80% CI Lower" legendType="none" />
                    <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="url(#colorValue)" name="Forecast" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Warnings */}
          <Card>
            <CardHeader>
              <CardTitle>Early Warnings</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingWarnings ? (
                <div className="space-y-2">
                  <LoadingSkeleton className="h-10 w-full" />
                  <LoadingSkeleton className="h-10 w-full" />
                </div>
              ) : !warnings || warnings.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-400">No active warnings</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {warnings.slice(0, 4).map((w, i) => (
                    <WarningBanner key={i} warning={w} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Scenarios */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Scenarios</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingScenarios ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <LoadingSkeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : recentScenarios.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No scenarios yet</p>
              ) : (
                <ul className="space-y-2">
                  {recentScenarios.map((s) => (
                    <li key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{s.name}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(s.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {s.flaggedForReview && (
                        <Badge variant="warning">Flagged</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
