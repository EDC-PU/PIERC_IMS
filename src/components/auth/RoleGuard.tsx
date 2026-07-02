'use client';

import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { ShieldAlert } from 'lucide-react';
import { UserRole } from '@/types';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  fallbackMessage?: string;
  children: React.ReactNode;
}

export function AccessDenied({ message }: { message?: string }) {
  return (
    <div className="h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4 animate-in fade-in zoom-in duration-300">
      <div className="p-4 bg-rose-50 rounded-full shadow-lg shadow-rose-100">
        <ShieldAlert className="h-12 w-12 text-rose-500 animate-pulse" />
      </div>
      <h1 className="text-2xl font-black text-slate-900">Access Denied</h1>
      <p className="text-slate-500 font-medium max-w-sm">
        {message || 'You do not have the required permissions to access this page.'}
      </p>
    </div>
  );
}

export default function RoleGuard({
  allowedRoles,
  fallbackMessage,
  children
}: RoleGuardProps) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <AccessDenied message={fallbackMessage} />;
  }

  return <>{children}</>;
}
