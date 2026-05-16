'use client';

import { useAuthStore } from '@/store/authStore';
import UserDashboard from '@/components/dashboard/UserDashboard';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import MentorDashboard from '@/components/dashboard/MentorDashboard';
import SuperAdminDashboard from '@/components/dashboard/SuperAdminDashboard';

export default function DashboardPage() {
  const { user } = useAuthStore();

  if (!user) return null;

  switch (user.role) {
    case 'admin':
      return <AdminDashboard user={user} />;
    case 'mentor':
      return <MentorDashboard user={user} />;
    case 'super_admin':
      return <SuperAdminDashboard user={user} />;
    case 'user':
    default:
      return <UserDashboard user={user} />;
  }
}
