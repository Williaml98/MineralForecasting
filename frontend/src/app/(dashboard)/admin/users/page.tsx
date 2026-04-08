'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { toast } from '@/hooks/useToast';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { Modal } from '@/components/ui/Modal';
import type { User, Role } from '@/types';
import { formatDate, roleBadgeColor } from '@/lib/utils';

const ROLES: Role[] = ['ANALYST', 'STRATEGIST', 'EXECUTIVE'];

/**
 * Admin user management page — create, deactivate, and change roles.
 */
export default function UsersPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<Role>('ANALYST');

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/api/users').then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; email: string; role: Role }) =>
      api.post('/api/users', payload).then((r) => r.data.data),
    onSuccess: (user: { name: string }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created', `${user.name}'s credentials have been sent by email.`);
      setShowModal(false);
      setNewName('');
      setNewEmail('');
      setNewRole('ANALYST');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Email may already be in use.';
      toast.error('Failed to create user', msg);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.put(`/api/users/${id}/deactivate`).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deactivated');
    },
    onError: () => toast.error('Deactivation failed', 'Could not deactivate user.'),
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) =>
      api.put(`/api/users/${id}/role`, null, { params: { role } }).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Role updated');
    },
    onError: () => toast.error('Role update failed'),
  });

  const activeCount = users.filter((u) => u.active).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-light"
        >
          + Create User
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Users</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{users.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Active Users</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{activeCount}</p>
        </Card>
      </div>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => <LoadingSkeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Name', 'Email', 'Role', 'Status', 'Last Login', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        defaultValue={u.role}
                        onChange={(e) => changeRoleMutation.mutate({ id: u.id, role: e.target.value as Role })}
                        className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                      >
                        {(['ADMIN', 'ANALYST', 'STRATEGIST', 'EXECUTIVE'] as Role[]).map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={u.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}>
                        {u.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {u.lastLogin ? formatDate(u.lastLogin) : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deactivateMutation.mutate(u.id)}
                        disabled={!u.active || deactivateMutation.isPending}
                        className="text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-40"
                      >
                        Deactivate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create user modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create New User">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Jane Smith"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="jane@bfmining.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as Role)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <p className="text-xs text-gray-500">
            A temporary password will be emailed to the user automatically.
          </p>
          {createMutation.isError && (
            <p className="text-red-600 text-sm">Failed to create user. Email may already be in use.</p>
          )}
          <button
            disabled={!newName || !newEmail || createMutation.isPending}
            onClick={() => createMutation.mutate({ name: newName, email: newEmail, role: newRole })}
            className="w-full bg-brand text-white py-2 rounded-lg text-sm hover:bg-brand-light disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating…' : 'Create & Send Email'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
