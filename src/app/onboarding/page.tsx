'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import OnboardingForm from '@/components/forms/OnboardingForm';

export default function OnboardingPage() {
  const { user, loading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.onboardingCompleted) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  if (loading || !user || user.onboardingCompleted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-rose-200/20 rounded-full blur-[150px] animate-pulse delay-700" />
      </div>
      
      <div className="w-full animate-in fade-in zoom-in duration-500">
        <OnboardingForm />
      </div>
    </div>
  );
}
