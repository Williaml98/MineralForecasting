'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import type { AuditLog } from '@/types';
import { formatDate, cn } from '@/lib/utils';

const ACTION_TYPES = [
  'LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', 'USER_CREATE', 'USER_DEACTIVATE',
  'DATASET_UPLOAD', 'DATASET_DELETE', 'PIPELINE_CREATE', 'PIPELINE_RUN',
  'MODEL_TRAIN', 'MODEL_ACTIVATE', 'FORECAST_GENERATE', 'SCENARIO_CREATE',
];

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'bg-green-100 text-green-800',
  LOGOUT: 'bg-gray-100 text-gray-600',
  PASSWORD_CHANGE: 'bg-yellow-100 text-yellow-800',
  USER_CREATE: 'bg-blue-100 text-blue-800',
  USER_DEACTIVATE: 'bg-red-100 text-red-800',
  DATASET_UPLOAD: 'bg-purple-100 text-purple-800',
  DATASET_DELETE: 'bg-red-100 text-red-800',
  MODEL_TRAIN: 'bg-indigo-100 text-indigo-800',
  FORECAST_GENERATE: 'bg-teal-100 text-teal-800',
  SCENARIO_CREATE: 'bg-orange-100 text-orange-800',
};

interface SpringPage<T> {
  content: T[];
  totalPages: number;
  number: number;
  totalElements: number;
}

/**
 * Admin audit log viewer with filter controls and pagination.
 */
export default function AuditPage() {
  const [page, setPage] = useState(0);
  const [actionType, setActionType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({ actionType: '', dateFrom: '', dateTo: '' });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: summary } = useQuery<Record<string, number>>({
    queryKey: ['audit-summary'],
    queryFn: () => api.get('/api/audit/summary').then((r) => r.data.data),
  });

  const { data: logsPage, isLoading } = useQuery<SpringPage<AuditLog>>({
    queryKey: ['audit-logs', page, appliedFilters],
    queryFn: () =>
      api
        .get('/api/audit/logs', {
          params: {
            page,
            size: 20,
            ...(appliedFilters.actionType ? { actionType: appliedFilters.actionType } : {}),
            ...(appliedFilters.dateFrom ? { from: new Date(appliedFilters.dateFrom).toISOString() } : {}),
            ...(appliedFilters.dateTo ? { to: new Date(appliedFilters.dateTo).toISOString() } : {}),
          },
        })
        .then((r) => r.data.data),
  });

  const logs = logsPage?.content ?? [];
  const totalPages = logsPage?.totalPages ?? 1;

  const applyFilters = () => {
    setPage(0);
    setAppliedFilters({ actionType, dateFrom, dateTo });
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Events Today', value: summary?.totalEventsToday },
          { label: 'Logins Today', value: summary?.loginsToday },
          { label: 'Total Events', value: summary?.totalEvents },
        ].map(({ label, value }) => (
          <Card key={label} className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value ?? '—'}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Action Type</label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All actions</option>
              {ACTION_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-light"
          >
            Apply Filters
          </button>
        </div>
      </Card>

      {/* Logs table */}
      <Card>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1,2,3,4,5].map((i) => <LoadingSkeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : logs.length === 0 ? (
          <p className="p-8 text-center text-gray-500">No audit log entries found.</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Timestamp', 'Action', 'Entity', 'IP Address', 'Details'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <>
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={ACTION_COLORS[log.actionType] ?? 'bg-gray-100 text-gray-600'}>
                          {log.actionType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{log.entityType ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{log.ipAddress ?? '—'}</td>
                      <td className="px-4 py-3">
                        {log.detail && Object.keys(log.detail).length > 0 ? (
                          <button
                            onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                            className="text-brand hover:underline text-xs font-medium"
                          >
                            {expandedId === log.id ? 'Hide' : 'Show'}
                          </button>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                    {expandedId === log.id && (
                      <tr key={`${log.id}-detail`} className="bg-gray-50">
                        <td colSpan={5} className="px-4 py-3">
                          <pre className="text-xs text-gray-600 bg-gray-100 rounded p-3 overflow-auto max-h-32">
                            {JSON.stringify(log.detail, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Page {page + 1} of {totalPages} · {logsPage?.totalElements} total
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1 text-xs border rounded disabled:opacity-40 hover:bg-gray-50"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1 text-xs border rounded disabled:opacity-40 hover:bg-gray-50"
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
