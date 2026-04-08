'use client';

import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Eye, Trash2, FileText, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/axios';
import { toast } from '@/hooks/useToast';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSkeleton, TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import type { Dataset } from '@/types';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING: 'warning',
  VALIDATED: 'success',
  INVALID: 'danger',
  DELETED: 'default',
};

const statusIcon: Record<string, React.ElementType> = {
  PENDING: Clock,
  VALIDATED: CheckCircle,
  INVALID: AlertCircle,
  DELETED: Trash2,
};

export default function DataManagementPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const canWrite = user?.role === 'ADMIN' || user?.role === 'ANALYST';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Dataset | null>(null);

  const { data: datasets, isLoading } = useQuery<Dataset[]>({
    queryKey: ['datasets'],
    queryFn: () => api.get('/api/datasets').then((r) => r.data?.data ?? r.data ?? []),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      setUploadProgress(0);
      setUploadStatus('uploading');
      const res = await api.post('/api/datasets/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      return res.data;
    },
    onSuccess: () => {
      setUploadStatus('success');
      setUploadMessage('File uploaded successfully!');
      setUploadProgress(null);
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast.success('Dataset uploaded', 'The file has been uploaded and is pending validation.');
      setTimeout(() => setUploadStatus('idle'), 3000);
    },
    onError: (err: unknown) => {
      setUploadStatus('error');
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Upload failed. Please try again.';
      setUploadMessage(msg);
      setUploadProgress(null);
      toast.error('Upload failed', msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/datasets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast.success('Dataset deleted');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Delete failed', 'Could not delete the dataset. Please try again.'),
  });

  const handleFile = useCallback(
    (file: File) => {
      const allowed = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
      if (!allowed.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls)$/i)) {
        setUploadStatus('error');
        setUploadMessage('Only CSV and Excel (.xlsx, .xls) files are accepted.');
        return;
      }
      uploadMutation.mutate(file);
    },
    [uploadMutation]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Management</h1>
          <p className="text-sm text-gray-500 mt-1">Upload and manage mineral forecast datasets</p>
        </div>
        {canWrite && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload Dataset
          </button>
        )}
      </div>

      {/* Upload zone */}
      {canWrite && (
        <Card>
          <CardContent className="pt-6">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all',
                isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50',
                uploadStatus === 'uploading' && 'pointer-events-none opacity-75'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />
              <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700">
                {isDragging ? 'Drop the file here' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Supports CSV, XLSX, XLS</p>
            </div>

            {/* Progress */}
            {uploadStatus === 'uploading' && uploadProgress !== null && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Status messages */}
            {uploadStatus === 'success' && (
              <div className="mt-3 flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">{uploadMessage}</span>
              </div>
            )}
            {uploadStatus === 'error' && (
              <div className="mt-3 flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{uploadMessage}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Datasets table */}
      <Card>
        <CardHeader>
          <CardTitle>Datasets ({datasets?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : !datasets || datasets.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No datasets uploaded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    <th className="pb-3 pr-4">Name</th>
                    <th className="pb-3 pr-4">Source</th>
                    <th className="pb-3 pr-4">Version</th>
                    <th className="pb-3 pr-4">Rows</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Uploaded At</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {datasets.map((ds) => {
                    const Icon = statusIcon[ds.status] ?? FileText;
                    return (
                      <tr key={ds.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-300" />
                            <span className="font-medium text-gray-800">{ds.name}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-gray-500">{ds.source ?? '—'}</td>
                        <td className="py-3 pr-4 text-gray-500">v{ds.version}</td>
                        <td className="py-3 pr-4 text-gray-500">
                          {ds.rowCount != null ? ds.rowCount.toLocaleString() : '—'}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 text-gray-400" />
                            <Badge variant={statusVariant[ds.status] ?? 'default'}>{ds.status}</Badge>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-gray-500">
                          {new Date(ds.uploadedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/data/${ds.id}`}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            {canWrite && (
                              <button
                                onClick={() => setDeleteTarget(ds)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
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

      {/* Delete confirmation modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Dataset"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-6">
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setDeleteTarget(null)}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            disabled={deleteMutation.isPending}
            className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
