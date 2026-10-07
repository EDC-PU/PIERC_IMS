'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { toast } from 'sonner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, originalUser, isImpersonating, stopImpersonation, loading } = useAuthStore();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (!user.onboardingCompleted && pathname !== '/onboarding') {
        router.push('/onboarding');
      }
    }
  }, [user, loading, router, pathname]);

  // Close sidebar on path changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      <Sidebar user={user} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Sticky Global Impersonation Warning Banner */}
        {isImpersonating && originalUser && (
          <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-3 sm:px-6 py-2.5 flex items-center justify-between text-xs font-semibold shadow-md z-30 shrink-0 border-b border-amber-500">
            <div className="flex items-center gap-2 min-w-0">
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1">
                ⚠️ Impersonation Mode
              </span>
              <span className="truncate">
                Viewing portal as <strong>{user.displayName || user.email}</strong> ({user.email})
                {user.enrollmentNumber ? (
                  <span className="ml-1.5 opacity-90 hidden sm:inline">
                    • PUMIS/Enrollment: <strong className="font-mono bg-white/20 px-1.5 py-0.5 rounded text-[11px]">{user.enrollmentNumber}</strong>
                  </span>
                ) : null}
                <span className="ml-1.5 uppercase opacity-85 text-[10px] font-black tracking-wider">[{user.role}]</span>
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <button
                type="button"
                onClick={() => {
                  stopImpersonation();
                  toast.success('Exited impersonation mode', {
                    description: 'Restored Super Admin account access.'
                  });
                  window.location.href = '/dashboard';
                }}
                className="h-7 px-3 bg-white text-amber-950 hover:bg-amber-50 font-black text-xs rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1"
              >
                <span>Exit Impersonation</span>
              </button>
            </div>
          </div>
        )}
        <Header user={user} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-5 md:p-6 lg:p-8 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
