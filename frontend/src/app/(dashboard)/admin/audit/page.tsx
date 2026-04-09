'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileDown } from 'lucide-react';
import api from '@/lib/axios';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import type { AuditLog, User } from '@/types';
import { formatDate } from '@/lib/utils';

const ACTION_TYPES = [
  'LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', 'USER_CREATE', 'USER_DEACTIVATE',
  'DATASET_UPLOAD', 'DATASET_DELETE', 'PIPELINE_CREATE', 'PIPELINE_RUN',
  'MODEL_TRAIN', 'MODEL_ACTIVATE', 'FORECAST_GENERATE', 'SCENARIO_CREATE',
];

/** Derives the affected object type from the action type when entityType is not set. */
const ACTION_TO_OBJECT: Record<string, string> = {
  LOGIN: 'Session',
  LOGOUT: 'Session',
  PASSWORD_CHANGE: 'Account',
  USER_CREATE: 'User',
  USER_DEACTIVATE: 'User',
  DATASET_UPLOAD: 'Dataset',
  DATASET_DELETE: 'Dataset',
  PIPELINE_CREATE: 'Pipeline',
  PIPELINE_RUN: 'Pipeline',
  MODEL_TRAIN: 'Model',
  MODEL_ACTIVATE: 'Model',
  FORECAST_GENERATE: 'Forecast',
  SCENARIO_CREATE: 'Scenario',
};

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

export default function AuditPage() {
  const [page, setPage] = useState(0);
  const [actionType, setActionType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({ actionType: '', dateFrom: '', dateTo: '' });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data: summary } = useQuery<Record<string, number>>({
    queryKey: ['audit-summary'],
    queryFn: () => api.get('/api/audit/summary').then((r) => r.data?.data ?? r.data),
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users-list'],
    queryFn: () => api.get('/api/users').then((r) => r.data?.data ?? r.data ?? []),
  });

  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

  const { data: logsPage, isLoading } = useQuery<SpringPage<AuditLog>>({
    queryKey: ['audit-logs', page, appliedFilters],
    queryFn: () =>
      api.get('/api/audit/logs', {
        params: {
          page,
          size: 20,
          ...(appliedFilters.actionType ? { actionType: appliedFilters.actionType } : {}),
          ...(appliedFilters.dateFrom ? { from: `${appliedFilters.dateFrom}T00:00:00` } : {}),
          ...(appliedFilters.dateTo ? { to: `${appliedFilters.dateTo}T23:59:59` } : {}),
        },
      }).then((r) => r.data?.data ?? r.data),
  });

  const logs = logsPage?.content ?? [];
  const totalPages = logsPage?.totalPages ?? 1;

  const applyFilters = () => {
    setPage(0);
    setAppliedFilters({ actionType, dateFrom, dateTo });
  };

  const exportPdf = async () => {
    setExporting(true);
    try {
      // Fetch ALL logs matching current filter (up to 1000) for the PDF
      const [allRes, usersRes] = await Promise.all([
        api.get('/api/audit/logs', {
          params: {
            page: 0,
            size: 1000,
            ...(appliedFilters.actionType ? { actionType: appliedFilters.actionType } : {}),
            ...(appliedFilters.dateFrom ? { from: `${appliedFilters.dateFrom}T00:00:00` } : {}),
            ...(appliedFilters.dateTo ? { to: `${appliedFilters.dateTo}T23:59:59` } : {}),
          },
        }),
        api.get('/api/users').catch(() => null),
      ]);
      const allLogs: AuditLog[] = (allRes.data?.data ?? allRes.data)?.content ?? [];
      const userMap: Record<string, string> = {};
      const userList = usersRes ? (usersRes.data?.data ?? usersRes.data ?? []) : [];
      userList.forEach((u: { id: string; name: string }) => { userMap[u.id] = u.name; });

      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      const PAGE_W = 297;
      const PAGE_H = 210;
      const MARGIN = 14;
      const COL_WIDTHS = [38, 52, 32, 36, 35, 70]; // Timestamp, Action, Entity, IP, ID, Detail
      const ROW_H = 7;
      let y = MARGIN;

      // ── Header ───────────────────────────────────────────────────────────────
      // Company bar
      doc.setFillColor(26, 58, 92); // brand #1a3a5c
      doc.rect(0, 0, PAGE_W, 18, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('BF Mining Group Ltd', MARGIN, 11);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('AI-Driven Mineral Demand Forecasting System', MARGIN, 16);
      // Right-side date
      doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toLocaleString()}`, PAGE_W - MARGIN, 11, { align: 'right' });

      y = 24;

      // Report title
      doc.setTextColor(26, 58, 92);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Audit Log Report', MARGIN, y);
      y += 5;

      // Filter summary
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      const filterDesc = [
        appliedFilters.actionType ? `Action: ${appliedFilters.actionType}` : null,
        appliedFilters.dateFrom ? `From: ${appliedFilters.dateFrom}` : null,
        appliedFilters.dateTo ? `To: ${appliedFilters.dateTo}` : null,
      ].filter(Boolean).join('   |   ');
      doc.text(filterDesc || 'No filters applied - showing all records', MARGIN, y);
      doc.text(`Total records: ${allLogs.length}`, PAGE_W - MARGIN, y, { align: 'right' });
      y += 8;

      // ── Table header ─────────────────────────────────────────────────────────
      const drawTableHeader = (yPos: number) => {
        doc.setFillColor(240, 244, 248);
        doc.rect(MARGIN, yPos, PAGE_W - MARGIN * 2, ROW_H, 'F');
        doc.setTextColor(60, 80, 100);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        const headers = ['Timestamp', 'Action Type', 'Entity', 'IP Address', 'User', 'Detail'];
        let x = MARGIN + 1;
        headers.forEach((h, i) => {
          doc.text(h, x, yPos + 4.8);
          x += COL_WIDTHS[i];
        });
        return yPos + ROW_H;
      };

      y = drawTableHeader(y);

      // ── Table rows ───────────────────────────────────────────────────────────
      doc.setFont('helvetica', 'normal');
      allLogs.forEach((log, idx) => {
        if (y + ROW_H > PAGE_H - 12) {
          doc.addPage();
          y = MARGIN;
          // Re-draw header on new page
          doc.setFillColor(26, 58, 92);
          doc.rect(0, 0, PAGE_W, 10, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.text('BF Mining Group Ltd - Audit Log Report (continued)', MARGIN, 7);
          y = 14;
          y = drawTableHeader(y);
        }

        // Alternating row background
        if (idx % 2 === 0) {
          doc.setFillColor(249, 250, 251);
          doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, ROW_H, 'F');
        }

        doc.setTextColor(50, 50, 50);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');

        const cells = [
          formatDate(log.createdAt),
          log.actionType,
          log.entityType ?? ACTION_TO_OBJECT[log.actionType] ?? '-',
          log.ipAddress ?? '-',
          log.userId ? (userMap[log.userId] ?? log.userId.slice(0, 8) + '…') : '-',
          log.detail ? JSON.stringify(log.detail).slice(0, 60) : '-',
        ];

        let x = MARGIN + 1;
        cells.forEach((cell, i) => {
          const maxW = COL_WIDTHS[i] - 2;
          const text = doc.splitTextToSize(String(cell), maxW)[0] ?? '';
          doc.text(text, x, y + 4.8);
          x += COL_WIDTHS[i];
        });

        // Row bottom border
        doc.setDrawColor(230, 230, 230);
        doc.line(MARGIN, y + ROW_H, PAGE_W - MARGIN, y + ROW_H);
        y += ROW_H;
      });

      // ── Footer ───────────────────────────────────────────────────────────────
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(240, 244, 248);
        doc.rect(0, PAGE_H - 8, PAGE_W, 8, 'F');
        doc.setTextColor(120, 120, 120);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('CONFIDENTIAL - BF Mining Group Ltd - Internal Use Only', MARGIN, PAGE_H - 3);
        doc.text(`Page ${i} of ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 3, { align: 'right' });
      }

      const dateStr = new Date().toISOString().split('T')[0];
      doc.save(`BFMining_AuditLog_${dateStr}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('PDF export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <button
          onClick={exportPdf}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-light disabled:opacity-50"
        >
          <FileDown className="w-4 h-4" />
          {exporting ? 'Generating PDF…' : 'Export PDF'}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Events Today', value: summary?.totalEventsToday },
          { label: 'Logins Today', value: summary?.loginsToday },
          { label: 'Total Events', value: summary?.totalEvents },
        ].map(({ label, value }) => (
          <Card key={label} className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value ?? '-'}</p>
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
          {(appliedFilters.actionType || appliedFilters.dateFrom || appliedFilters.dateTo) && (
            <button
              onClick={() => {
                setActionType(''); setDateFrom(''); setDateTo('');
                setAppliedFilters({ actionType: '', dateFrom: '', dateTo: '' });
                setPage(0);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 text-gray-600"
            >
              Clear Filters
            </button>
          )}
        </div>
      </Card>

      {/* Logs table */}
      <Card>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1,2,3,4,5].map((i) => <LoadingSkeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : logs.length === 0 ? (
          <p className="p-8 text-center text-gray-500">No audit log entries found for the selected filters.</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Timestamp', 'User', 'Action', 'Object Affected', 'IP Address', 'Details'].map((h) => (
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
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {log.userId ? (userMap[log.userId] ?? log.userId.slice(0, 8) + '…') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={ACTION_COLORS[log.actionType] ?? 'bg-gray-100 text-gray-600'}>
                          {log.actionType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {log.entityType ?? ACTION_TO_OBJECT[log.actionType] ?? '-'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{log.ipAddress ?? '-'}</td>
                      <td className="px-4 py-3">
                        {log.detail && Object.keys(log.detail).length > 0 ? (
                          <button
                            onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                            className="text-brand hover:underline text-xs font-medium"
                          >
                            {expandedId === log.id ? 'Hide' : 'Show'}
                          </button>
                        ) : (
                          <span className="text-gray-300 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                    {expandedId === log.id && (
                      <tr key={`${log.id}-detail`} className="bg-gray-50">
                        <td colSpan={6} className="px-4 py-3">
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
