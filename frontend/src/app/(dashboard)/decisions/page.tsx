'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/axios';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { cn } from '@/lib/utils';

interface Recommendation {
  title: string;
  description: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

const SEVERITY_STYLES: Record<string, { card: string; badge: string; border: string }> = {
  INFO: {
    card: 'bg-blue-50',
    badge: 'bg-blue-100 text-blue-800',
    border: 'border-l-blue-500',
  },
  WARNING: {
    card: 'bg-amber-50',
    badge: 'bg-amber-100 text-amber-800',
    border: 'border-l-amber-500',
  },
  CRITICAL: {
    card: 'bg-red-50',
    badge: 'bg-red-100 text-red-800',
    border: 'border-l-red-500',
  },
};

/**
 * Decision support page showing AI-generated recommendations and early warning alerts.
 */
export default function DecisionsPage() {
  const { data: recommendations = [], isLoading: loadingRecs } = useQuery<Recommendation[]>({
    queryKey: ['recommendations'],
    queryFn: () => api.get('/api/decisions/recommendations').then((r) => r.data?.data ?? r.data ?? []),
  });

  const { data: warnings = [], isLoading: loadingWarnings } = useQuery<Recommendation[]>({
    queryKey: ['warnings'],
    queryFn: () => api.get('/api/decisions/warnings').then((r) => r.data?.data ?? r.data ?? []),
  });

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Decision Support</h1>
        <Link
          href="/decisions/scenarios"
          className="px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-light"
        >
          Scenario Analysis →
        </Link>
      </div>

      {/* Early Warnings */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Early Warning Signals</h2>
        {loadingWarnings ? (
          <LoadingSkeleton className="h-20 w-full" />
        ) : warnings.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-700 text-sm">
            No active warnings. All forecasts are within normal thresholds.
          </div>
        ) : (
          <div className="space-y-3">
            {warnings.map((w, i) => {
              const s = SEVERITY_STYLES[w.severity] ?? SEVERITY_STYLES.INFO;
              return (
                <div
                  key={i}
                  className={cn('flex items-start gap-3 p-4 rounded-lg border-l-4', s.card, s.border)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm text-gray-800">{w.title}</p>
                      <Badge className={s.badge}>{w.severity}</Badge>
                    </div>
                    <p className="text-sm text-gray-600">{w.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recommendations */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Strategic Recommendations</h2>
        {loadingRecs ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <LoadingSkeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : recommendations.length === 0 ? (
          <p className="text-gray-500 text-sm">No recommendations available. Train a model and generate a forecast first.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {recommendations.map((rec, i) => {
              const s = SEVERITY_STYLES[rec.severity] ?? SEVERITY_STYLES.INFO;
              return (
                <Card key={i} className={cn('p-5 border-l-4', s.border)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">{rec.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                    </div>
                    <Badge className={cn('ml-4 shrink-0', s.badge)}>{rec.severity}</Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
