'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Database,
  GitBranch,
  Brain,
  TrendingUp,
  Lightbulb,
  Users,
  Shield,
  LogOut,
  User,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import type { Role } from '@/types';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: Role[] | 'all';
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: 'all' },
  { href: '/data', label: 'Data Management', icon: Database, roles: ['ANALYST', 'ADMIN'] },
  { href: '/preprocessing', label: 'Preprocessing', icon: GitBranch, roles: ['ANALYST', 'ADMIN'] },
  { href: '/forecasting', label: 'Forecasting', icon: Brain, roles: ['ANALYST', 'ADMIN'] },
  { href: '/forecasts', label: 'Forecasts', icon: TrendingUp, roles: 'all' },
  { href: '/decisions', label: 'Decision Support', icon: Lightbulb, roles: 'all' },
  { href: '/admin/users', label: 'User Management', icon: Users, roles: ['ADMIN'] },
  { href: '/admin/audit', label: 'Audit Log', icon: Shield, roles: ['ADMIN'] },
];

const roleBadgeVariant: Record<Role, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary'> = {
  ADMIN: 'danger',
  ANALYST: 'info',
  STRATEGIST: 'secondary',
  EXECUTIVE: 'success',
};

function canSeeLink(item: NavItem, role: Role): boolean {
  if (item.roles === 'all') return true;
  return (item.roles as Role[]).includes(role);
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser, clearUser } = useAuthStore();
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    api
      .get('/api/users/me')
      .then((res) => {
        const userData = res.data?.data ?? res.data;
        setUser(userData);
        if (userData?.mustChangePassword) {
          router.push('/change-password');
        }
      })
      .catch(() => {
        clearUser();
        router.push('/login');
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await api.post('/api/auth/logout');
    } catch {
      // ignore errors
    } finally {
      clearUser();
      router.push('/login');
    }
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[250px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-gray-900">BF Mining</span>
              <p className="text-[10px] text-gray-400 leading-none">Forecast System</p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              if (user && !canSeeLink(item, user.role)) return null;
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group',
                      active
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-4 h-4 flex-shrink-0',
                        active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                      )}
                    />
                    <span>{item.label}</span>
                    {active && (
                      <ChevronRight className="w-3 h-3 ml-auto text-blue-400" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section at bottom */}
        <div className="p-3 border-t border-gray-200">
          <Link
            href="/profile"
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name ?? 'Loading...'}
              </p>
              <p className="text-xs text-gray-400 truncate">{user?.email ?? ''}</p>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          <div />
          <div className="flex items-center gap-4">
            {user && (
              <Badge variant={roleBadgeVariant[user.role] ?? 'default'}>
                {user.role}
              </Badge>
            )}
            <span className="text-sm font-medium text-gray-700">
              {user?.name ?? 'Loading...'}
            </span>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              <span>{loggingOut ? 'Logging out...' : 'Logout'}</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
