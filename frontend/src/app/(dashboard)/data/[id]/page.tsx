'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, FileText, Calendar, Hash, Server, CheckCircle, AlertCircle, Clock, Trash2 } from 'lucide-react';
import api from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import type { Dataset } from '@/types';

const statusConfig: Record<string, { variant: 'default' | 'success' | 'warning' | 'danger'; icon: React.ElementType }> = {
  PENDING: { variant: 'warning', icon: Clock },
  VALIDATED: { variant: 'success', icon: CheckCircle },
  INVALID: { variant: 'danger', icon: AlertCircle },
  DELETED: { variant: 'default', icon: Trash2 },
};

interface MetaRow {
  label: string;
  value: string | number;
  icon: React.ElementType;
}

export default function DatasetDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: dataset, isLoading, isError } = useQuery<Dataset>({
    queryKey: ['dataset', id],
    queryFn: () => api.get(`/api/datasets/${id}`).then((r) => r.data?.data ?? r.data),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !dataset) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
        <p className="text-gray-500">Dataset not found or failed to load.</p>
        <Link href="/data" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
          Back to Data Management
        </Link>
      </div>
    );
  }

  const status = statusConfig[dataset.status] ?? { variant: 'default' as const, icon: FileText };
  const StatusIcon = status.icon;

  const metaRows: MetaRow[] = [
    { label: 'Dataset Name', value: dataset.name, icon: FileText },
    { label: 'Source', value: dataset.source ?? '—', icon: Server },
    { label: 'Version', value: `v${dataset.version}`, icon: Hash },
    { label: 'Row Count', value: dataset.rowCount != null ? dataset.rowCount.toLocaleString() : '—', icon: Hash },
    {
      label: 'Uploaded At',
      value: new Date(dataset.uploadedAt).toLocaleString(),
      icon: Calendar,
    },
    { label: 'Uploaded By', value: dataset.uploadedBy ?? '—', icon: Server },
  ];

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div className="flex items-center gap-3">
        <Link
          href="/data"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Data Management
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-700">{dataset.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{dataset.name}</h1>
          <p className="text-sm text-gray-500 mt-1">Dataset ID: {dataset.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusIcon className="w-4 h-4 text-gray-400" />
          <Badge variant={status.variant}>{dataset.status}</Badge>
        </div>
      </div>

      {/* Metadata card */}
      <Card>
        <CardHeader>
          <CardTitle>Dataset Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {metaRows.map((row) => {
              const Icon = row.icon;
              return (
                <div key={row.label} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {row.label}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{row.value}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Preview section */}
      <Card>
        <CardHeader>
          <CardTitle>Data Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {dataset.status === 'VALIDATED' ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
              <p className="text-sm text-amber-700">
                Dataset preview would appear here in production. Connect to the data preview endpoint to view sample rows.
              </p>
            </div>
          ) : dataset.status === 'INVALID' ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-700">
                This dataset has validation errors and cannot be previewed. Please re-upload a valid file.
              </p>
            </div>
          ) : dataset.status === 'PENDING' ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <Clock className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-sm text-blue-700">
                Dataset is being processed. Preview will be available once validation is complete.
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Preview not available for this dataset status.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File info */}
      <Card>
        <CardHeader>
          <CardTitle>File Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">{dataset.name}</p>
              <p className="text-xs text-gray-400">
                {dataset.hasFile ? 'File stored on server' : 'File not available'}
              </p>
            </div>
            <div className="ml-auto">
              <Badge variant={dataset.hasFile ? 'success' : 'default'}>
                {dataset.hasFile ? 'Available' : 'Not Available'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
