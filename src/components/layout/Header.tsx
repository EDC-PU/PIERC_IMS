'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { toast } from 'sonner';
import {
  Search,
  ChevronDown,
  User as UserIcon,
  Settings,
  HelpCircle,
  LogOut,
  Menu,
  UserCog,
  UserCheck,
  ShieldAlert
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import NotificationCenter from './NotificationCenter';
import CommandPalette from './CommandPalette';
import ImpersonateModal from './ImpersonateModal';
import { UserProfile } from '@/types';

interface HeaderProps {
  user: UserProfile;
  onMenuClick?: () => void;
}

export default function Header({ user, onMenuClick }: HeaderProps) {
  const router = useRouter();
  const { originalUser, isImpersonating, stopImpersonation } = useAuthStore();
  const [commandOpen, setCommandOpen] = useState(false);
  const [impersonateOpen, setImpersonateOpen] = useState(false);

  const isSuperAdmin = user.role === 'super_admin' || originalUser?.role === 'super_admin';

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success('Signed out successfully');
      router.push('/login');
    } catch (error) {
      console.error(error);
      toast.error('Failed to sign out');
    }
  };

  return (
    <>
      <header className="h-16 bg-white border-b flex items-center justify-between px-3 sm:px-6 shrink-0">
        <div className="flex items-center flex-1 max-w-md gap-2 sm:gap-3 min-w-0">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 -ml-1 sm:-ml-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="h-6 w-6" />
            </button>
          )}
          <Link href="/dashboard" className="lg:hidden flex items-center shrink-0">
            <img 
              src="https://firebasestorage.googleapis.com/v0/b/pierc-portal-9bd82.firebasestorage.app/o/logo.svg?alt=media&token=52188887-32e9-4dcf-bec6-dde7175eaa86" 
              alt="PIERC Logo" 
              className="h-7 sm:h-8 w-auto object-contain" 
            />
          </Link>
          
          {/* Global Search Trigger (Desktop) */}
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="relative w-full hidden md:flex items-center justify-between pl-3.5 pr-2.5 h-10 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 hover:bg-slate-100/70 text-slate-400 hover:text-slate-600 transition-all text-xs font-semibold cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Search className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors shrink-0" />
              <span className="truncate">Search portal, applications, mentors...</span>
            </div>
            <kbd className="inline-flex items-center gap-0.5 text-[10px] font-mono font-bold text-slate-500 bg-white border border-slate-200/90 px-1.5 py-0.5 rounded shadow-2xs">
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
          {/* Mobile Search Button */}
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Super Admin Impersonation Action in Navigation Bar */}
          {isSuperAdmin && (
            <>
              {isImpersonating ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs shadow-2xs">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span className="hidden xl:inline text-slate-500 font-medium">Viewing as:</span>
                  <span className="font-black max-w-[110px] truncate text-amber-950">{user.displayName || user.email}</span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      stopImpersonation();
                      toast.success('Exited impersonation mode', {
                        description: 'Restored Super Admin account access.'
                      });
                      window.location.href = '/dashboard';
                    }}
                    className="h-6 px-2 text-[10px] font-black rounded-lg bg-amber-800 hover:bg-amber-900 text-white shadow-2xs ml-0.5"
                  >
                    Exit
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setImpersonateOpen(true)}
                  className="rounded-xl border-amber-300/90 bg-amber-50/70 hover:bg-amber-100 text-amber-900 font-bold text-xs h-9 px-2.5 sm:px-3 gap-1.5 shadow-2xs hover:border-amber-400 transition-all flex items-center"
                  title="Super Admin: Impersonate any user by Email or Enrollment/PUMIS ID"
                >
                  <UserCog className="h-4 w-4 text-amber-700 shrink-0" />
                  <span className="hidden sm:inline">Impersonate</span>
                </Button>
              )}
            </>
          )}

          <NotificationCenter />

          <DropdownMenu>
            <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost" }), "flex items-center space-x-2 px-2 hover:bg-slate-100 h-12 py-1.5 outline-none cursor-pointer rounded-xl transition-all")}>
              <Avatar className="h-8 w-8 ring-2 ring-slate-100">
                <AvatarImage src={user.photoURL} alt={user.displayName || 'User'} />
                <AvatarFallback className="bg-primary text-white font-bold">{(user.displayName || user.email || 'U')[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-bold leading-none text-slate-900">{user.displayName || user.email || 'User'}</p>
                <p className="text-[10px] text-slate-500 mt-1 capitalize font-black tracking-widest uppercase">{(user.role || 'user').replace('_', ' ')}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400 ml-1" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-2xl border-none ring-1 ring-slate-100 p-2">
              <DropdownMenuLabel className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">My Account</DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1" />
              <Link href="/dashboard/settings">
                <DropdownMenuItem className="rounded-xl p-3 cursor-pointer group">
                  <UserIcon className="mr-3 h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                  <span className="font-bold text-sm">Profile</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/dashboard/settings">
                <DropdownMenuItem className="rounded-xl p-3 cursor-pointer group">
                  <Settings className="mr-3 h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                  <span className="font-bold text-sm">Settings</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem 
                onClick={() => setCommandOpen(true)}
                className="rounded-xl p-3 cursor-pointer group"
              >
                <Search className="mr-3 h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                <span className="font-bold text-sm">Quick Search (⌘K)</span>
              </DropdownMenuItem>
              <Link href="/dashboard/programmes/incubation/apply">
                <DropdownMenuItem className="rounded-xl p-3 cursor-pointer group text-primary">
                  <span className="font-bold text-sm">🚀 Apply for Incubation</span>
                </DropdownMenuItem>
              </Link>

              {/* Impersonate dropdown item for Super Admin */}
              {isSuperAdmin && (
                <>
                  <DropdownMenuSeparator className="my-1" />
                  {isImpersonating ? (
                    <DropdownMenuItem
                      onClick={() => {
                        stopImpersonation();
                        toast.success('Exited impersonation mode', {
                          description: 'Restored Super Admin account access.'
                        });
                        window.location.href = '/dashboard';
                      }}
                      className="rounded-xl p-3 cursor-pointer group text-amber-700 focus:bg-amber-50 focus:text-amber-800 font-bold"
                    >
                      <UserCheck className="mr-3 h-4 w-4 text-amber-600" />
                      <span className="font-bold text-sm">Exit Impersonation</span>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => setImpersonateOpen(true)}
                      className="rounded-xl p-3 cursor-pointer group text-amber-800 focus:bg-amber-50 focus:text-amber-900 font-bold"
                    >
                      <UserCog className="mr-3 h-4 w-4 text-amber-600" />
                      <span className="font-bold text-sm">Impersonate User</span>
                    </DropdownMenuItem>
                  )}
                </>
              )}

              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="rounded-xl p-3 cursor-pointer group text-rose-600 focus:text-rose-600 focus:bg-rose-50"
              >
                <LogOut className="mr-3 h-4 w-4 transition-transform group-hover:translate-x-1" />
                <span className="font-bold text-sm">Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Global Spotlight Command Palette */}
      <CommandPalette 
        user={user} 
        isOpen={commandOpen} 
        onClose={() => setCommandOpen(false)} 
      />

      {/* Super Admin Impersonation Modal */}
      {isSuperAdmin && (
        <ImpersonateModal
          open={impersonateOpen}
          onOpenChange={setImpersonateOpen}
        />
      )}
    </>
  );
}
