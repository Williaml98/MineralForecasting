'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import api from '@/lib/axios';
import { toast } from '@/hooks/useToast';
import { useAuthStore } from '@/store/authStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDate, roleBadgeColor } from '@/lib/utils';

const schema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[0-9]/, 'Must contain a number')
      .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/, 'Must contain a special character'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

/**
 * User profile page with avatar upload and password change form.
 */
export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setSuccess(false);
    try {
      await api.post('/api/auth/change-password', { newPassword: values.newPassword });
      toast.success('Password updated', 'Your new password is now active.');
      setSuccess(true);
      reset();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to change password.';
      setServerError(msg);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image too large', 'Please choose an image under 2 MB.');
      return;
    }

    setAvatarUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await api.put('/api/users/me/avatar', { avatarUrl: dataUrl });
      const updated = res.data?.data ?? res.data;
      if (user) setUser({ ...user, avatarUrl: updated.avatarUrl });
      toast.success('Profile picture updated', 'Your new avatar is now saved.');
    } catch {
      toast.error('Upload failed', 'Could not save your profile picture.');
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

      {/* User info */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-5">
          {/* Avatar with upload overlay */}
          <div className="relative group">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-brand flex items-center justify-center">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-2xl font-bold">{initials}</span>
              )}
            </div>
            {/* Upload overlay */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5 disabled:cursor-wait"
              title="Change profile picture"
            >
              {avatarUploading ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <>
                  <Camera className="w-5 h-5 text-white" />
                  <span className="text-white text-[10px] font-medium">Change</span>
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div>
            <p className="text-lg font-semibold text-gray-800">{user.name}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
            <p className="text-xs text-gray-400 mt-1">
              Click the avatar to upload a new profile picture (JPG, PNG or WebP, max 2 MB)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Role</p>
            <Badge className={`mt-1 ${roleBadgeColor(user.role)}`}>{user.role}</Badge>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Status</p>
            <Badge className={`mt-1 ${user.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
              {user.active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Account Created</p>
            <p className="mt-1 text-gray-700">{formatDate(user.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Last Login</p>
            <p className="mt-1 text-gray-700">
              {user.lastLogin ? formatDate(user.lastLogin) : 'Not recorded'}
            </p>
          </div>
        </div>
      </Card>

      {/* Change password */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Change Password</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              {...register('newPassword')}
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
            />
            {errors.newPassword && (
              <p className="text-red-500 text-xs mt-1">{errors.newPassword.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              {...register('confirmPassword')}
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-700 text-sm">
              Password changed successfully.
            </div>
          )}
          {serverError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-light disabled:opacity-50"
          >
            {isSubmitting ? 'Saving…' : 'Update Password'}
          </button>
        </form>
      </Card>
    </div>
  );
}
