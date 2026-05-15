'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserProfile } from '@/types';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  FileText, 
  Calendar, 
  Users, 
  Settings, 
  LogOut, 
  Shield, 
  Rocket,
  MessageSquare,
  BarChart3
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { toast } from 'sonner';

interface SidebarProps {
  user: UserProfile;
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', roles: ['user', 'admin', 'mentor', 'super_admin'] },
    { name: 'Programmes', icon: Rocket, href: '/dashboard/programmes', roles: ['user', 'admin', 'super_admin'] },
    { name: 'Applications', icon: FileText, href: '/dashboard/applications', roles: ['user', 'admin', 'mentor', 'super_admin'] },
    { name: 'Meetings', icon: Calendar, href: '/dashboard/meetings', roles: ['user', 'admin', 'mentor', 'super_admin'] },
    { name: 'Mentors', icon: Users, href: '/dashboard/mentors', roles: ['admin', 'super_admin'] },
    { name: 'Startups', icon: Rocket, href: '/dashboard/startups', roles: ['admin', 'mentor', 'super_admin'] },
    { name: 'Analytics', icon: BarChart3, href: '/dashboard/analytics', roles: ['admin', 'super_admin'] },
    { name: 'Messages', icon: MessageSquare, href: '/dashboard/messages', roles: ['user', 'admin', 'mentor', 'super_admin'] },
    { name: 'System Admin', icon: Shield, href: '/dashboard/admin', roles: ['super_admin'] },
    { name: 'Settings', icon: Settings, href: '/dashboard/settings', roles: ['user', 'admin', 'mentor', 'super_admin'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <aside className="w-64 bg-white border-r flex flex-col hidden md:flex">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold text-primary tracking-tight">PIERC PORTAL</h1>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {filteredItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center space-x-3 px-3 py-2 rounded-md transition-colors",
              pathname === item.href 
                ? "bg-primary text-white" 
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="font-medium">{item.name}</span>
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 px-3 py-2 w-full text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
