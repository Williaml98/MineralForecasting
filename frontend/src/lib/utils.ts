import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merges Tailwind CSS class names, resolving conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats a date string to a human-readable format. */
export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

/** Returns a color class for a role badge. */
export function roleBadgeColor(role: string): string {
  const map: Record<string, string> = {
    ADMIN: 'bg-red-100 text-red-800',
    ANALYST: 'bg-blue-100 text-blue-800',
    STRATEGIST: 'bg-purple-100 text-purple-800',
    EXECUTIVE: 'bg-green-100 text-green-800',
  };
  return map[role] ?? 'bg-gray-100 text-gray-800';
}
