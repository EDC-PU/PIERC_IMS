'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Rocket, 
  Calendar, 
  Users, 
  FileText, 
  Settings, 
  Sparkles, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  Building2, 
  ShieldCheck, 
  Bell, 
  Compass, 
  Briefcase, 
  X, 
  Command,
  ExternalLink,
  PlusCircle,
  HelpCircle
} from 'lucide-react';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Navigation' | 'Applications' | 'Startups' | 'Mentors' | 'Quick Actions';
  icon: any;
  action: () => void;
  badge?: string;
  badgeColor?: string;
}

export default function CommandPalette({ user, isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [queryText, setQueryText] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Dynamic search data cached from Firestore
  const [applications, setApplications] = useState<any[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQueryText('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Fetch light search index once when opened
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchSearchData = async () => {
      try {
        // Fetch recent applications
        const appsCol = collection(db, 'applications');
        const appsSnap = await getDocs(query(appsCol, limit(30)));
        if (!isMounted) return;
        const appList = appsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setApplications(appList);

        // Fetch users/mentors
        const usersCol = collection(db, 'users');
        const usersSnap = await getDocs(query(usersCol, limit(30)));
        if (!isMounted) return;
        const userList = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMentors(userList);
      } catch (err) {
        console.error('CommandPalette fetch error:', err);
      }
    };

    fetchSearchData();
    return () => { isMounted = false; };
  }, [isOpen]);

  // Navigate helper
  const navigateTo = (url: string) => {
    onClose();
    router.push(url);
  };

  // Base navigation items
  const baseNavItems: CommandItem[] = useMemo(() => {
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
    const isMentor = user?.role === 'mentor';

    const items: CommandItem[] = [
      {
        id: 'nav-dashboard',
        title: 'Dashboard Overview',
        subtitle: 'Main hub, traction metrics & recent activity',
        category: 'Navigation',
        icon: Compass,
        action: () => navigateTo('/dashboard'),
      },
      {
        id: 'nav-incubation-apply',
        title: 'Apply for Incubation',
        subtitle: 'Cohort 2026 application for early-stage ventures',
        category: 'Quick Actions',
        icon: Rocket,
        badge: 'Open',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        action: () => navigateTo('/dashboard/programmes/incubation/apply'),
      },
      {
        id: 'nav-programmes',
        title: 'Programmes & Tracks',
        subtitle: 'Incubation, GrowthPad, Need-Based, Startup Nivesh',
        category: 'Navigation',
        icon: Briefcase,
        action: () => navigateTo('/dashboard/programmes'),
      },
      {
        id: 'nav-startups',
        title: 'Startups Directory',
        subtitle: 'Explore active cohorts and portfolio ventures',
        category: 'Navigation',
        icon: Building2,
        action: () => navigateTo('/dashboard/startups'),
      },
      {
        id: 'nav-meetings',
        title: 'Mentorship & Meetings',
        subtitle: 'Office hours, 1-on-1 advisory & pitch sessions',
        category: 'Navigation',
        icon: Calendar,
        action: () => navigateTo('/dashboard/meetings'),
      },
      {
        id: 'nav-events',
        title: 'Events & Workshops',
        subtitle: 'Upcoming demo days, guest lectures & bootcamps',
        category: 'Navigation',
        icon: Sparkles,
        action: () => navigateTo('/dashboard/events'),
      },
      {
        id: 'nav-settings',
        title: 'Account Settings & Profile',
        subtitle: 'Manage your founder credentials & notifications',
        category: 'Navigation',
        icon: Settings,
        action: () => navigateTo('/dashboard/settings'),
      },
    ];

    if (!isMentor) {
      items.push({
        id: 'nav-applications',
        title: 'My Applications',
        subtitle: 'Track review statuses and timeline updates',
        category: 'Navigation',
        icon: FileText,
        action: () => navigateTo('/dashboard/applications'),
      });
    }

    if (isAdmin) {
      items.push(
        {
          id: 'admin-manage-users',
          title: 'User Management',
          subtitle: 'Manage roles, super-admin privileges & access',
          category: 'Navigation',
          icon: ShieldCheck,
          badge: 'Admin',
          badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
          action: () => navigateTo('/dashboard/manage-users'),
        },
        {
          id: 'admin-analytics',
          title: 'Analytics & Cohort Reports',
          subtitle: 'Funding distributions, sector charts & KPI metrics',
          category: 'Navigation',
          icon: FileText,
          badge: 'Admin',
          badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
          action: () => navigateTo('/dashboard/analytics'),
        }
      );
    }

    return items;
  }, [user]);

  // Filter items based on user query
  const filteredItems = useMemo(() => {
    const q = queryText.trim().toLowerCase();

    // Convert dynamic applications into CommandItems
    const appItems: CommandItem[] = applications
      .filter(app => {
        if (!q) return false;
        const title = (app.startupTitle || app.data?.startupTitle || app.data?.startupName || '').toLowerCase();
        const applicant = (app.userName || app.userEmail || '').toLowerCase();
        const prog = (app.programmeTitle || '').toLowerCase();
        return title.includes(q) || applicant.includes(q) || prog.includes(q);
      })
      .slice(0, 5)
      .map(app => {
        const title = app.startupTitle || app.data?.startupTitle || app.data?.startupName || 'Startup Application';
        return {
          id: `app-${app.id}`,
          title,
          subtitle: `${app.programmeTitle || 'Programme'} • ${app.userName || 'Applicant'}`,
          category: 'Applications',
          icon: Rocket,
          badge: app.status || 'Under Review',
          badgeColor: app.status === 'Selected' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200',
          action: () => navigateTo(`/dashboard/applications/${app.id}`),
        };
      });

    // Convert dynamic mentors/users into CommandItems
    const mentorItems: CommandItem[] = mentors
      .filter(m => {
        if (!q) return false;
        const name = (m.displayName || '').toLowerCase();
        const email = (m.email || '').toLowerCase();
        const institute = (m.institute || '').toLowerCase();
        const role = (m.role || '').toLowerCase();
        return name.includes(q) || email.includes(q) || institute.includes(q) || role.includes(q);
      })
      .slice(0, 4)
      .map(m => ({
        id: `user-${m.id}`,
        title: m.displayName || m.email || 'Member',
        subtitle: `${(m.role || 'user').toUpperCase()} • ${m.institute || m.email}`,
        category: 'Mentors',
        icon: Users,
        badge: m.role || 'User',
        badgeColor: m.role === 'mentor' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200',
        action: () => navigateTo(`/dashboard/profile/${m.enrollmentNumber || m.id}`),
      }));

    // Filter static navigation items
    const matchingNav = baseNavItems.filter(item => {
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
      );
    });

    return [...matchingNav, ...appItems, ...mentorItems];
  }, [queryText, baseNavItems, applications, mentors]);

  // Keyboard navigation inside list
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filteredItems.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredItems]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Backdrop Click Outside */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />

      {/* Spotlight Command Modal */}
      <div 
        className="relative w-full max-w-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl shadow-slate-950/20 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 gap-3">
          <Search className="h-5 w-5 text-primary shrink-0 animate-pulse" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search portal, applications, mentors, events, or jump to page..."
            value={queryText}
            onChange={(e) => {
              setQueryText(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none"
          />
          {queryText && (
            <button 
              onClick={() => { setQueryText(''); inputRef.current?.focus(); }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-4 divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Compass className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No results found</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                No matching pages, applications, or members found for "{queryText}".
              </p>
            </div>
          ) : (
            Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} className="pt-2 first:pt-0 space-y-1">
                <div className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {category}
                </div>
                <div className="space-y-1">
                  {items.map((item) => {
                    const globalIdx = filteredItems.findIndex(fi => fi.id === item.id);
                    const isSelected = globalIdx === selectedIndex;
                    const IconComponent = item.icon;

                    return (
                      <div
                        key={item.id}
                        onClick={() => item.action()}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all duration-150 group",
                          isSelected 
                            ? "bg-primary/10 text-primary dark:bg-primary/20 shadow-xs" 
                            : "hover:bg-slate-100/70 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200",
                            isSelected 
                              ? "bg-primary text-white scale-105 shadow-md shadow-primary/25" 
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-primary group-hover:scale-105"
                          )}>
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate leading-tight">
                              {item.title}
                            </p>
                            {item.subtitle && (
                              <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          {item.badge && (
                            <Badge 
                              variant="outline" 
                              className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", item.badgeColor || "bg-slate-100 text-slate-700")}
                            >
                              {item.badge}
                            </Badge>
                          )}
                          <ArrowRight className={cn(
                            "h-4 w-4 transition-transform duration-150",
                            isSelected ? "text-primary translate-x-1" : "text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100"
                          )} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Quick Keys */}
        <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded shadow-2xs font-bold text-[9px]">↑</kbd>
              <kbd className="font-mono bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded shadow-2xs font-bold text-[9px]">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded shadow-2xs font-bold text-[9px]">↵</kbd>
              Select
            </span>
          </div>
          <span className="flex items-center gap-1 font-semibold text-primary">
            <Sparkles className="h-3 w-3" />
            PIERC Spotlight
          </span>
        </div>

      </div>

    </div>
  );
}
