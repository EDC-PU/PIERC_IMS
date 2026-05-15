'use client';

import { useAuthStore } from '@/store/authStore';
import UserDashboard from '@/components/dashboard/UserDashboard';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
// import MentorDashboard from '@/components/dashboard/MentorDashboard';
// import SuperAdminDashboard from '@/components/dashboard/SuperAdminDashboard';

export default function DashboardPage() {
  const { user } = useAuthStore();

  if (!user) return null;

  switch (user.role) {
    case 'admin':
      return <AdminDashboard user={user} />;
    case 'mentor':
      // Fallback for now until MentorDashboard is implemented
      return <AdminDashboard user={user} />; 
    case 'super_admin':
      // Fallback for now until SuperAdminDashboard is implemented
      return <AdminDashboard user={user} />;
    case 'user':
    default:
      return <UserDashboard user={user} />;
  }
}
