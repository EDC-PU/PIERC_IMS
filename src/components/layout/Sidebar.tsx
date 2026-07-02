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
  ClipboardList,
  X
} from 'lucide-react';
import { auth, rtdb as db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { toast } from 'sonner';

import { useState, useEffect } from 'react';
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';

interface SidebarProps {
  user: UserProfile;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}

export default function Sidebar({ user, isOpen = false, setIsOpen }: SidebarProps) {
  const pathname = usePathname();
  const [counts, setCounts] = useState({
    applications: 0,
    evaluate: 0,
    messages: 0,
    notifications: 0,
    totalMeetings: 0
  });

  useEffect(() => {
    if (!user) return;

    const userRole = user.role || 'user';
    const unsubscribes: (() => void)[] = [];

    // 1. Applications Count (Admins only)
    if (userRole === 'admin' || userRole === 'super_admin') {
      const appsRef = ref(db, 'applications');
      const unsub = onValue(appsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const pending = Object.values(data).filter((a: any) => a.status === 'Submitted' || a.status === 'Under Review').length;
          setCounts(prev => ({ ...prev, applications: pending }));
        }
      });
      unsubscribes.push(unsub);
    }

    // 2. Evaluate Count (Admins/Mentors)
    if (userRole !== 'user') {
      const appsRef = ref(db, 'applications');
      const meetingsRef = ref(db, 'meetings');
      const evalsRef = ref(db, 'evaluations');

      let currentApps: any[] = [];
      let currentMeetings: any[] = [];
      let currentEvals: Record<string, any> = {};

      const calculateEvaluateCount = () => {
        const getPhase = (appStatus: string) => {
          if (appStatus === 'Submitted' || appStatus === 'Revision Submitted' || appStatus === 'Under Review' || appStatus === 'Revision Needed') return 'Phase 1';
          if (appStatus === 'Phase 1 Selected' || appStatus === 'Phase 2 Selected') return 'Phase 2';
          if (appStatus === 'Cohort Selected') return 'Final Review';
          return 'Phase 1';
        };

        const pendingList = currentApps.filter(app => {
          if (app.status === 'Draft') return false;
          const phase = getPhase(app.status);
          const isEvaluated = currentEvals[app.id]?.[user.uid]?.[phase.replace(' ', '_')];

          const isCommitteeMember = currentMeetings.some(m =>
            m.applicationId === app.id && m.status === 'Scheduled' && (
              m.attendees?.includes(user.uid) ||
              (phase === 'Phase 1' && m.title?.toLowerCase().includes('phase 1'))
            )
          );

          return isCommitteeMember && (!isEvaluated || app.status === 'Revision Submitted');
        });

        let totalMeetings = 0;
        if (userRole === 'admin' || userRole === 'super_admin') {
          const hasScheduledMeeting = (appId: string, phase: string) => {
            return currentMeetings.some(m => {
              if (m.applicationId !== appId || m.status !== 'Scheduled') return false;
              const titleLower = m.title?.toLowerCase() || '';
              if (phase === 'phase1') return titleLower.includes('phase 1');
              if (phase === 'phase2') return titleLower.includes('phase 2');
              if (phase === 'review') return titleLower.includes('final review') || titleLower.includes('review meeting');
              return false;
            });
          };

          const p1 = currentApps.filter(app =>
            (app.status === 'Submitted' || app.status === 'Under Review' || app.status === 'Revision Submitted' || app.status === 'Phase 1 Evaluation' || app.status === 'Revision Needed' || app.status === 'Shortlisted')
            && !hasScheduledMeeting(app.id, 'phase1')
          ).length;

          const p2 = currentApps.filter(app =>
            (app.status === 'Phase 2 Selected' || app.status === 'Phase 2 Evaluation')
            && !hasScheduledMeeting(app.id, 'phase2')
          ).length;

          const rev = currentApps.filter(app =>
            (app.status === 'Cohort Selected' || app.status === 'Final Review')
            && !hasScheduledMeeting(app.id, 'review')
          ).length;

          totalMeetings = p1 + p2 + rev;
        }

        setCounts(prev => ({ 
          ...prev, 
          evaluate: pendingList.length,
          ...(userRole === 'admin' || userRole === 'super_admin' ? { totalMeetings } : {})
        }));
      };

      const unsubApps = onValue(appsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          currentApps = Object.entries(data).map(([id, val]: [string, any]) => ({
            id,
            ...val
          }));
        } else {
          currentApps = [];
        }
        calculateEvaluateCount();
      });
      unsubscribes.push(unsubApps);

      const unsubMeetings = onValue(meetingsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          currentMeetings = Object.values(data);
        } else {
          currentMeetings = [];
        }
        calculateEvaluateCount();
      });
      unsubscribes.push(unsubMeetings);

      const unsubEvals = onValue(evalsRef, (snapshot) => {
        const data = snapshot.val();
        currentEvals = data || {};
        calculateEvaluateCount();
      });
      unsubscribes.push(unsubEvals);
    }

    // 3. Unread Notifications (Dashboard)
    const notifRef = ref(db, `notifications/${user.uid}`);
    const unsubNotif = onValue(notifRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const unread = Object.values(data).filter((n: any) => !n.read).length;
        setCounts(prev => ({ ...prev, notifications: unread }));
      }
    });
    unsubscribes.push(unsubNotif);

    // 4. Total Pending Meetings (Meetings page - Phase 1 + Phase 2)
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      const centralMeetingsRef = ref(db, 'meetings');
      const unsubCentralMeetings = onValue(centralMeetingsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const pendingMeetings = Object.values(data).filter((m: any) =>
            m.status === 'Scheduled' && m.attendees?.includes(user.uid)
          ).length;
          setCounts(prev => ({ ...prev, totalMeetings: pendingMeetings }));
        } else {
          setCounts(prev => ({ ...prev, totalMeetings: 0 }));
        }
      });
      unsubscribes.push(unsubCentralMeetings);
    }

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
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
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', roles: ['user', 'admin', 'mentor', 'super_admin'], badge: counts.notifications },
    { name: 'Programmes', icon: Rocket, href: '/dashboard/programmes', roles: ['user', 'admin', 'super_admin'] },
    { name: 'Applications', icon: FileText, href: '/dashboard/applications', roles: ['user', 'admin', 'super_admin'], badge: counts.applications },
    { name: 'Evaluate', icon: ClipboardList, href: '/dashboard/evaluate', roles: ['admin', 'mentor', 'super_admin'], badge: counts.evaluate },
    { name: 'Meetings', icon: Calendar, href: '/dashboard/meetings', roles: ['user', 'admin', 'mentor', 'super_admin'], badge: counts.totalMeetings },
    { name: 'Mentors', icon: Users, href: '/dashboard/mentors', roles: ['admin', 'super_admin'] },
    { name: 'Startups', icon: Rocket, href: '/dashboard/startups', roles: ['admin', 'mentor', 'super_admin'] },
    { name: 'Analytics', icon: BarChart3, href: '/dashboard/analytics', roles: ['admin', 'super_admin'] },
    { name: 'Messages', icon: MessageSquare, href: '/dashboard/messages', roles: ['user', 'admin', 'mentor', 'super_admin'], badge: counts.messages },
    { name: 'Manage Users', icon: UserCog, href: '/dashboard/manage-users', roles: ['super_admin'] },
    { name: 'System Admin', icon: Shield, href: '/dashboard/admin', roles: ['super_admin'] },
    { name: 'Settings', icon: Settings, href: '/dashboard/settings', roles: ['user', 'admin', 'mentor', 'super_admin'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(user.role || 'user'));

  return (
    <>
      {/* Mobile Sidebar backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-primary backdrop-blur-sm lg:hidden transition-opacity duration-300 animate-in fade-in"
          onClick={() => setIsOpen?.(false)}
        />
      )}
      <aside className={cn(
        "bg-white border-r flex flex-col shadow-sm transition-all duration-300 z-50 shrink-0",
        // Desktop styles
        "lg:flex lg:w-70 lg:static lg:h-auto",
        // Mobile styles
        "fixed inset-y-0 left-0 w-70 h-full lg:translate-x-0 transform",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-6 border-b bg-slate-50/50 flex items-center justify-between">
          <Link href="/dashboard" className="block" onClick={() => setIsOpen?.(false)}>
            <img
              src="https://www.pierc.org/_next/static/media/PIERC.959ad75d.svg"
              alt="PIERC Logo"
              className="h-18 w-auto"
            />
          </Link>
          {setIsOpen && (
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          {filteredItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen?.(false)}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 group",
                pathname === item.href
                  ? "text-white shadow-xl shadow-primary/20 scale-[1.02]"
                  : "text-slate-500 hover:bg-slate-50 hover:text-primary"
              )}
              style={pathname === item.href ? { backgroundColor: '#D91A2A', color: '#FFFFFF' } : undefined}
            >
              <div className="flex items-center space-x-3">
                <item.icon 
                  className={cn("h-5 w-5 transition-transform group-hover:scale-110", pathname === item.href ? "text-white" : "text-slate-400 group-hover:text-primary")}
                  style={pathname === item.href ? { color: '#FFFFFF' } : undefined}
                />
                <span 
                  className={cn("text-[13px] font-black tracking-tight", pathname === item.href ? "text-white" : "text-slate-600")}
                  style={pathname === item.href ? { color: '#FFFFFF' } : undefined}
                >
                  {item.name}
                </span>
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
            onClick={() => {
              setIsOpen?.(false);
              handleLogout();
            }}
            className="flex items-center space-x-3 px-4 py-3 w-full text-slate-500 hover:bg-rose-50 hover:text-rose-600 rounded-2xl transition-all font-bold text-[13px]"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout Session</span>
          </button>
        </div>
      </aside>
    </>
  );
}
