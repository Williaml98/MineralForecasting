'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Check, X, UserCheck, UserX } from 'lucide-react';
import api from '@/lib/axios';
import { toast } from '@/hooks/useToast';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { Modal } from '@/components/ui/Modal';
import type { User, Role } from '@/types';
import { formatDate } from '@/lib/utils';

const ROLES: Role[] = ['ANALYST', 'STRATEGIST', 'EXECUTIVE'];
const ALL_ROLES: Role[] = ['ADMIN', 'ANALYST', 'STRATEGIST', 'EXECUTIVE'];

const roleBadgeVariant: Record<Role, 'danger' | 'info' | 'secondary' | 'success'> = {
  ADMIN: 'danger',
  ANALYST: 'info',
  STRATEGIST: 'secondary',
  EXECUTIVE: 'success',
};

export default function UsersPage() {
  const queryClient = useQueryClient();

  // Create user modal
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<Role>('ANALYST');

  // Inline name editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

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
      setShowCreate(false);
      setNewName('');
      setNewEmail('');
      setNewRole('ANALYST');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Email may already be in use.';
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

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => api.put(`/api/users/${id}/reactivate`).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User reactivated', 'The user can now log in again.');
    },
    onError: () => toast.error('Reactivation failed', 'Could not reactivate user.'),
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

  const updateNameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.put(`/api/users/${id}/name`, null, { params: { name } }).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Name updated');
      setEditingId(null);
    },
    onError: () => toast.error('Name update failed'),
  });

  const startEdit = (u: User) => {
    setEditingId(u.id);
    setEditingName(u.name);
  };

  const cancelEdit = () => setEditingId(null);

  const confirmEdit = (id: string) => {
    if (editingName.trim()) {
      updateNameMutation.mutate({ id, name: editingName.trim() });
    }
  };

  const activeCount = users.filter((u) => u.active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage accounts, roles, and access</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Create User
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: users.length, color: 'text-gray-900' },
          { label: 'Active', value: activeCount, color: 'text-green-600' },
          { label: 'Inactive', value: users.length - activeCount, color: 'text-red-500' },
          { label: 'Admins', value: users.filter((u) => u.role === 'ADMIN').length, color: 'text-blue-600' },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => <LoadingSkeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Name', 'Email', 'Role', 'Status', 'Last Login', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${!u.active ? 'opacity-60' : ''}`}>
                    {/* Name — inline editable */}
                    <td className="px-4 py-3">
                      {editingId === u.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') confirmEdit(u.id);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            autoFocus
                            className="border border-blue-400 rounded px-2 py-1 text-sm w-32 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => confirmEdit(u.id)}
                            disabled={updateNameMutation.isPending}
                            className="text-green-600 hover:text-green-800 disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group">
                          <span className="font-medium text-gray-800">{u.name}</span>
                          <button
                            onClick={() => startEdit(u)}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity"
                            title="Edit name"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 text-gray-600">{u.email}</td>

                    {/* Role selector */}
                    <td className="px-4 py-3">
                      <select
                        defaultValue={u.role}
                        onChange={(e) => changeRoleMutation.mutate({ id: u.id, role: e.target.value as Role })}
                        className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {ALL_ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3">
                      <Badge variant={u.active ? 'success' : 'default'}>
                        {u.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>

                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {u.lastLogin ? formatDate(u.lastLogin) : 'Never'}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      {u.active ? (
                        <button
                          onClick={() => deactivateMutation.mutate(u.id)}
                          disabled={deactivateMutation.isPending}
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-40 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                          title="Deactivate user"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => reactivateMutation.mutate(u.id)}
                          disabled={reactivateMutation.isPending}
                          className="inline-flex items-center gap-1 text-green-600 hover:text-green-800 text-xs font-medium disabled:opacity-40 hover:bg-green-50 px-2 py-1 rounded transition-colors"
                          title="Reactivate user"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create user modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New User">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Jane Smith"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="jane@bfmining.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as Role)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            A temporary password will be emailed to the user. They will be required to change it on first login.
          </p>
          <button
            disabled={!newName || !newEmail || createMutation.isPending}
            onClick={() => createMutation.mutate({ name: newName, email: newEmail, role: newRole })}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {createMutation.isPending ? 'Creating…' : 'Create & Send Email'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
