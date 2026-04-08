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
import {
  Brain,
  Calendar,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  Info,
} from 'lucide-react';
import api from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { KpiCardSkeleton, LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { Badge } from '@/components/ui/Badge';
import type { TrainedModel, Forecast, ForecastPoint, Scenario } from '@/types';

interface Warning {
  id: string;
  message: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  createdAt: string;
}

interface Recommendation {
  id: string;
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
      <p className={`text-sm ${config.text}`}>{warning.message}</p>
    </div>
  );
}

export default function DashboardPage() {
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
      forecastPoints = JSON.parse(latestForecast.forecastJson);
    } catch {
      forecastPoints = [];
    }
  }

  const firstValue = forecastPoints.length > 0 ? forecastPoints[0].value : null;

  const kpis = [
    {
      label: 'Active Model',
      value: activeModel?.name ?? '—',
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
      value: firstValue !== null ? formatValue(firstValue) : '—',
      sub: forecastPoints.length > 0 ? `As of ${formatDate(forecastPoints[0].date)}` : 'No forecast data',
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Active Warnings',
      value: warnings ? String(warnings.length) : '—',
      sub: warnings && warnings.length > 0 ? 'Requires attention' : 'All clear',
      icon: AlertTriangle,
      color: warnings && warnings.length > 0 ? 'text-amber-600' : 'text-gray-400',
      bg: warnings && warnings.length > 0 ? 'bg-amber-50' : 'bg-gray-50',
    },
  ];

  const recentScenarios = scenarios?.slice(0, 5) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Mineral demand forecasting overview</p>
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
              <CardTitle>Forecast Overview</CardTitle>
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
                    <WarningBanner key={w.id ?? i} warning={w} />
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
