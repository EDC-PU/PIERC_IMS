'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { useAuthStore } from '@/store/authStore';
import { UserProfile } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Search,
  UserCog,
  UserCheck,
  Shield,
  Crown,
  Briefcase,
  GraduationCap,
  Loader2,
  X,
  AlertCircle
} from 'lucide-react';

interface ImpersonateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ImpersonateModal({ open, onOpenChange }: ImpersonateModalProps) {
  const router = useRouter();
  const { user, originalUser, isImpersonating, startImpersonation } = useAuthStore();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'mentor' | 'admin'>('all');

  const realSuperAdminUid = originalUser?.uid || user?.uid;

  // Real-time listener for users collection
  useEffect(() => {
    if (!open) return;

    setLoading(true);
    const usersCol = collection(db, 'users');
    const unsubscribe = onSnapshot(
      usersCol,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          uid: d.id,
          ...d.data(),
        })) as UserProfile[];
        setUsers(list);
        setLoading(false);
      },
      (error) => {
        console.error('Failed to fetch users for impersonation:', error);
        toast.error('Failed to load users list');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [open]);

  // Filter users by search query (Email, Enrollment / PUMIS ID, Name, Phone, Startup)
  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return users.filter((u) => {
      // Don't show the real super admin themself
      if (u.uid === realSuperAdminUid) return false;

      // Filter by role tab
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;

      if (!q) return true;

      const emailMatch = u.email?.toLowerCase().includes(q);
      const enrollmentMatch =
        u.enrollmentNumber?.toLowerCase().includes(q) ||
        (u as any).pumisId?.toLowerCase().includes(q) ||
        (u as any).userEnrollment?.toLowerCase().includes(q);
      const nameMatch = u.displayName?.toLowerCase().includes(q);
      const phoneMatch = u.phoneNumber?.includes(q) || u.contactNumber?.includes(q);
      const startupMatch = u.startupName?.toLowerCase().includes(q);
      const instituteMatch = u.institute?.toLowerCase().includes(q);

      return (
        emailMatch ||
        enrollmentMatch ||
        nameMatch ||
        phoneMatch ||
        startupMatch ||
        instituteMatch
      );
    });
  }, [users, searchQuery, roleFilter, realSuperAdminUid]);

  const handleSelectUser = (targetUser: UserProfile) => {
    onOpenChange(false);
    startImpersonation(targetUser);
    toast.success(`Now impersonating ${targetUser.displayName || targetUser.email}`, {
      description: `Switched session to role: ${(targetUser.role || 'user').toUpperCase()}. Viewing dashboard as this user.`,
    });
    setSearchQuery('');
    window.location.href = '/dashboard';
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'super_admin':
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px] px-2 py-0.5">
            <Crown className="h-3 w-3 mr-1 inline" /> Super Admin
          </Badge>
        );
      case 'admin':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] px-2 py-0.5">
            <Shield className="h-3 w-3 mr-1 inline" /> Admin
          </Badge>
        );
      case 'mentor':
        return (
          <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px] px-2 py-0.5">
            <Briefcase className="h-3 w-3 mr-1 inline" /> Mentor
          </Badge>
        );
      default:
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] px-2 py-0.5">
            <GraduationCap className="h-3 w-3 mr-1 inline" /> Founder / User
          </Badge>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[88vh] flex flex-col p-6 rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shrink-0">
              <UserCog className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>Impersonate User Account</span>
                <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[9px] uppercase tracking-wider font-black">
                  Super Admin
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Switch your active session to any user account by Email ID, Enrollment Number / PUMIS ID, or Name.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Search Input Bar */}
        <div className="space-y-3 pt-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Email ID, Enrollment Number / PUMIS ID, Name..."
              className="pl-10 pr-9 h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white text-xs font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Role Filter Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-xl gap-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setRoleFilter('all')}
              className={`flex-1 py-1 px-2 rounded-lg transition-all text-center text-[11px] font-bold ${
                roleFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All Users ({users.length > 0 ? users.length - 1 : 0})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('user')}
              className={`flex-1 py-1 px-2 rounded-lg transition-all text-center text-[11px] font-bold ${
                roleFilter === 'user'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Founders
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('mentor')}
              className={`flex-1 py-1 px-2 rounded-lg transition-all text-center text-[11px] font-bold ${
                roleFilter === 'mentor'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Mentors
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('admin')}
              className={`flex-1 py-1 px-2 rounded-lg transition-all text-center text-[11px] font-bold ${
                roleFilter === 'admin'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Admins
            </button>
          </div>
        </div>

        {/* User Search Results */}
        <div className="flex-1 overflow-hidden pt-2 min-h-[260px] max-h-[380px] flex flex-col">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin mb-2 text-primary" />
              <p className="text-xs font-medium">Loading user accounts...</p>
            </div>
          ) : (
            <ScrollArea className="flex-1 pr-2">
              <div className="space-y-2 py-1">
                {filteredUsers.map((u) => {
                  const enrollment =
                    u.enrollmentNumber || (u as any).pumisId || (u as any).userEnrollment;
                  const isCurrentlyImpersonated = isImpersonating && user?.uid === u.uid;

                  return (
                    <div
                      key={u.uid}
                      className="p-3 rounded-2xl bg-slate-50/80 hover:bg-slate-100/90 transition-all border border-slate-200/70 flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Avatar className="h-10 w-10 ring-2 ring-white shadow-xs shrink-0">
                          <AvatarImage src={u.photoURL} />
                          <AvatarFallback className="bg-primary text-white font-bold text-xs">
                            {(u.displayName || u.email || 'U')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {u.displayName || 'Unnamed User'}
                            </span>
                            {getRoleBadge(u.role)}
                            {isCurrentlyImpersonated && (
                              <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[9px] font-black">
                                Current
                              </Badge>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-500 truncate font-mono mt-0.5">
                            {u.email}
                          </p>

                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {enrollment ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md">
                                <span className="opacity-70">PUMIS:</span>
                                <span>{enrollment}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">
                                No PUMIS/Enrollment ID
                              </span>
                            )}

                            {u.startupName && (
                              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                                🚀 {u.startupName}
                              </span>
                            )}

                            {u.phoneNumber && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                📞 {u.phoneNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          disabled={isCurrentlyImpersonated}
                          onClick={() => handleSelectUser(u)}
                          className="h-8 px-3 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs gap-1.5 transition-all group-hover:scale-[1.02]"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>{isCurrentlyImpersonated ? 'Active' : 'Impersonate'}</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <div className="text-center py-12 px-4 text-slate-400">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-30 text-amber-500" />
                    <p className="text-xs font-bold text-slate-700">No matching user accounts</p>
                    <p className="text-[11px] mt-1 text-slate-400">
                      Check your email or enrollment number/PUMIS ID search query.
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Footer info notice */}
        <div className="mt-3 pt-3 border-t flex items-center justify-between text-[11px] text-slate-400">
          <p>
            Actions taken will reflect under this user&apos;s identity on the portal.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs font-semibold text-slate-600"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
