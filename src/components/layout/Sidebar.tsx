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
  BarChart3,
  UserCog,
  ClipboardList
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { toast } from 'sonner';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';

interface SidebarProps {
  user: UserProfile;
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [counts, setCounts] = useState({
    applications: 0,
    evaluate: 0,
    messages: 0,
    meetings: 0
  });

  useEffect(() => {
    if (!user) return;

    // 1. Applications Count (Admins only)
    if (user.role === 'admin' || user.role === 'super_admin') {
      const appsRef = ref(db, 'applications');
      onValue(appsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const pending = Object.values(data).filter((a: any) => a.status === 'Submitted').length;
          setCounts(prev => ({ ...prev, applications: pending }));
        }
      });
    }

    // 2. Evaluate Count (Admins/Mentors)
    if (user.role !== 'user') {
      const meetingsRef = ref(db, 'meetings');
      onValue(meetingsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          // Simplistic logic: count scheduled meetings where user is attendee
          const pending = Object.values(data).filter((m: any) =>
            m.status === 'Scheduled' && m.attendees?.includes(user.uid)
          ).length;
          setCounts(prev => ({ ...prev, evaluate: pending }));
        }
      });
    }

    // 3. Unread Notifications (Dashboard)
    const notifRef = ref(db, `notifications/${user.uid}`);
    onValue(notifRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const unread = Object.values(data).filter((n: any) => !n.read).length;
        setCounts(prev => ({ ...prev, meetings: unread }));
      }
    });

  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', roles: ['user', 'admin', 'mentor', 'super_admin'], badge: counts.meetings },
    { name: 'Programmes', icon: Rocket, href: '/dashboard/programmes', roles: ['user', 'admin', 'super_admin'] },
    { name: 'Applications', icon: FileText, href: '/dashboard/applications', roles: ['user', 'admin', 'mentor', 'super_admin'], badge: counts.applications },
    { name: 'Evaluate', icon: ClipboardList, href: '/dashboard/evaluate', roles: ['admin', 'mentor', 'super_admin'], badge: counts.evaluate },
    { name: 'Meetings', icon: Calendar, href: '/dashboard/meetings', roles: ['user', 'admin', 'mentor', 'super_admin'] },
    { name: 'Mentors', icon: Users, href: '/dashboard/mentors', roles: ['admin', 'super_admin'] },
    { name: 'Startups', icon: Rocket, href: '/dashboard/startups', roles: ['admin', 'mentor', 'super_admin'] },
    { name: 'Analytics', icon: BarChart3, href: '/dashboard/analytics', roles: ['admin', 'super_admin'] },
    { name: 'Messages', icon: MessageSquare, href: '/dashboard/messages', roles: ['user', 'admin', 'mentor', 'super_admin'], badge: counts.messages },
    { name: 'Manage Users', icon: UserCog, href: '/dashboard/manage-users', roles: ['super_admin'] },
    { name: 'System Admin', icon: Shield, href: '/dashboard/admin', roles: ['super_admin'] },
    { name: 'Settings', icon: Settings, href: '/dashboard/settings', roles: ['user', 'admin', 'mentor', 'super_admin'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <aside className="w-70 bg-white border-r flex flex-col hidden lg:flex shadow-sm">
      <div className="p-6 border-b bg-slate-50/50">
        <Link href="/dashboard" className="block">
          <img
            src="https://www.pierc.org/_next/static/media/PIERC.959ad75d.svg"
            alt="PIERC Logo"
            className="h-18 w-auto"
          />
        </Link>
      </div>
      <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
        {filteredItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 group",
              pathname === item.href
                ? "bg-slate-900 text-white shadow-xl shadow-slate-200 scale-[1.02]"
                : "text-slate-500 hover:bg-slate-50 hover:text-primary"
            )}
          >
            <div className="flex items-center space-x-3">
              <item.icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", pathname === item.href ? "text-primary" : "text-slate-400 group-hover:text-primary")} />
              <span className={cn("text-[13px] font-black tracking-tight", pathname === item.href ? "text-white" : "text-slate-600")}>{item.name}</span>
            </div>
            {item.badge !== undefined && item.badge > 0 && (
              <span className={cn(
                "flex items-center justify-center text-[9px] font-black h-5 min-w-[20px] px-2 rounded-full ring-2 transition-all group-hover:scale-110",
                pathname === item.href
                  ? "bg-primary text-white ring-slate-900"
                  : "bg-rose-500 text-white ring-white"
              )}>
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>
      <div className="p-6 border-t bg-slate-50/30">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 px-4 py-3 w-full text-slate-500 hover:bg-rose-50 hover:text-rose-600 rounded-2xl transition-all font-bold text-[13px]"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout Session</span>
        </button>
      </div>
    </aside>
  );
}
