'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { GitBranch, Eye, Plus, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';
import api from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import type { Pipeline } from '@/types';

const statusConfig: Record<string, {
  variant: 'default' | 'success' | 'warning' | 'danger' | 'info';
  icon: React.ElementType;
}> = {
  PENDING: { variant: 'warning', icon: Clock },
  RUNNING: { variant: 'info', icon: Clock },
  COMPLETED: { variant: 'success', icon: CheckCircle },
  FAILED: { variant: 'danger', icon: AlertCircle },
  DRAFT: { variant: 'default', icon: XCircle },
};

export default function PreprocessingPage() {
  const { data: pipelines, isLoading } = useQuery<Pipeline[]>({
    queryKey: ['pipelines'],
    queryFn: () => api.get('/api/preprocessing/pipelines').then((r) => r.data?.data ?? r.data ?? []),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Preprocessing Pipelines</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure and run data preprocessing workflows
          </p>
        </div>
        <Link
          href="/preprocessing/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Pipeline
        </Link>
      </div>

      {/* Stats row */}
      {!isLoading && pipelines && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: pipelines.length, color: 'text-gray-900' },
            { label: 'Completed', value: pipelines.filter((p) => p.status === 'COMPLETED').length, color: 'text-green-700' },
            { label: 'Running', value: pipelines.filter((p) => p.status === 'RUNNING').length, color: 'text-blue-700' },
            { label: 'Failed', value: pipelines.filter((p) => p.status === 'FAILED').length, color: 'text-red-700' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Pipelines</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : !pipelines || pipelines.length === 0 ? (
            <div className="text-center py-12">
              <GitBranch className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No pipelines created yet.</p>
              <Link
                href="/preprocessing/new"
                className="text-sm text-blue-600 hover:underline mt-2 inline-block"
              >
                Create your first pipeline
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    <th className="pb-3 pr-4">Name</th>
                    <th className="pb-3 pr-4">Dataset ID</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Version</th>
                    <th className="pb-3 pr-4">Created At</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pipelines.map((p) => {
                    const cfg = statusConfig[p.status] ?? { variant: 'default' as const, icon: XCircle };
                    const Icon = cfg.icon;
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <GitBranch className="w-4 h-4 text-gray-300" />
                            <span className="font-medium text-gray-800">{p.name}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-gray-500 font-mono text-xs">
                          {p.datasetId ? p.datasetId.slice(0, 8) + '...' : '—'}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 text-gray-400" />
                            <Badge variant={cfg.variant}>{p.status}</Badge>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-gray-500">v{p.version}</td>
                        <td className="py-3 pr-4 text-gray-500">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3">
                          <Link
                            href={`/preprocessing/${p.id}`}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors inline-flex"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
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
    </div>
  );
}
