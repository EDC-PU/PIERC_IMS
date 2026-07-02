'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ShieldCheck, 
  Search, 
  MoreVertical, 
  UserPlus, 
  ShieldAlert, 
  Mail, 
  Phone,
  Building,
  UserCog,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { UserProfile, UserRole } from '@/types';
import { exportToCSV } from '@/lib/export';

export default function ManageUsersPage() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'super_admin') {
      setLoading(false);
      return;
    }

    setLoading(true);
    const usersCol = collection(db, 'users');
    const unsubscribe = onSnapshot(usersCol, (snapshot) => {
      setUsers(snapshot.docs.map(d => d.data()) as UserProfile[]);
      setLoading(false);
    }, (error) => {
      console.error('User management fetch error:', error);
      toast.error('Failed to load users. Please check permissions.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid, currentUser?.role]);

  const updateUserRole = async (uid: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        role: newRole,
        updatedAt: Date.now(),
      });
      toast.success(`User role updated to ${newRole}`);
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  if (currentUser?.role !== 'super_admin') {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-rose-50 rounded-full">
          <ShieldAlert className="h-12 w-12 text-rose-500" />
        </div>
        <h1 className="text-2xl font-black text-slate-900">Access Denied</h1>
        <p className="text-slate-500 font-medium">Only Super Administrators can access user management.</p>
      </div>
    );
  }

  const filteredUsers = users.filter(u => {
    const name = u.displayName || '';
    const email = u.email || '';
    const searchTerm = search.toLowerCase();
    return name.toLowerCase().includes(searchTerm) || email.toLowerCase().includes(searchTerm);
  });

  const handleExportUsers = () => {
    const headers = [
      'Display Name',
      'Email',
      'Phone',
      'Institute',
      'Role',
      'Enrollment Number',
      'Joined Date'
    ];
    const keys = [
      'displayName',
      'email',
      'phone',
      'institute',
      'role',
      'enrollmentNumber',
      'joinedDate'
    ];

    const dataToExport = filteredUsers.map(u => ({
      ...u,
      phone: u.contactNumber || u.phoneNumber || 'N/A',
      joinedDate: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'
    }));

    exportToCSV(dataToExport, 'users_report.csv', headers, keys);
  };

  const roleColors: Record<UserRole, string> = {
    'super_admin': 'bg-purple-100 text-purple-700 border-purple-200',
    'admin': 'bg-blue-100 text-blue-700 border-blue-200',
    'mentor': 'bg-amber-100 text-amber-700 border-amber-200',
    'user': 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div className="space-y-8 p-2 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 text-primary mb-2">
            <UserCog className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Administration</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">User Management</h1>
          <p className="text-slate-500 font-medium mt-1">Manage platform roles and access levels for all members.</p>
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by name or email..." 
              className="pl-10 h-11 rounded-xl bg-white border-slate-200 focus:ring-2 focus:ring-primary/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={handleExportUsers} className="h-11 rounded-xl font-bold flex items-center gap-2 border-slate-200 bg-white hover:bg-slate-50">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button className="h-11 rounded-xl shadow-lg shadow-primary/20 font-bold">
            <UserPlus className="mr-2 h-4 w-4" /> Add Member
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-2xl ring-1 ring-slate-200 overflow-hidden rounded-3xl">
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-slate-100">
                <TableHead className="py-5 font-black uppercase tracking-widest text-[10px] text-slate-400">User Profile</TableHead>
                <TableHead className="py-5 font-black uppercase tracking-widest text-[10px] text-slate-400">Contact & ID</TableHead>
                <TableHead className="py-5 font-black uppercase tracking-widest text-[10px] text-slate-400">Institute</TableHead>
                <TableHead className="py-5 font-black uppercase tracking-widest text-[10px] text-slate-400">Role</TableHead>
                <TableHead className="py-5 font-black uppercase tracking-widest text-[10px] text-slate-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="animate-pulse">
                    <TableCell colSpan={5} className="py-8"><div className="h-12 bg-slate-100 rounded-2xl w-full" /></TableCell>
                  </TableRow>
                ))
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-20 text-center text-slate-400 font-medium">No users found matching your search.</TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u) => (
                  <TableRow key={u.uid} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                    <TableCell className="py-4">
                        <Link href={`/dashboard/profile/${u.enrollmentNumber || u.uid}`} className="flex items-center space-x-4 group">
                          <Avatar className="h-11 w-11 ring-2 ring-white shadow-sm transition-transform group-hover:scale-110">
                            <AvatarImage src={u.photoURL} />
                            <AvatarFallback className="bg-primary text-white font-black">
                              {(u.displayName || u.email || 'U')[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-primary transition-colors">{u.displayName}</p>
                            <p className="text-xs text-slate-400 font-medium">{u.category}</p>
                          </div>
                        </Link>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="space-y-1">
                        <div className="flex items-center text-xs text-slate-500 font-medium">
                          <Mail className="h-3 w-3 mr-2" /> {u.email}
                        </div>
                        <div className="flex items-center text-xs text-slate-500 font-medium">
                          <Phone className="h-3 w-3 mr-2" /> {u.contactNumber || 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center text-xs text-slate-600 font-bold uppercase tracking-tight">
                        <Building className="h-3 w-3 mr-2 text-slate-400" />
                        {u.institute || 'External'}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge className={`${roleColors[u.role] || 'bg-slate-100'} border-none px-3 py-1 font-black text-[10px] uppercase tracking-widest`}>
                        {u.role.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-xl p-2 text-slate-400 hover:bg-white hover:shadow-md transition-all outline-none">
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-2xl border-none ring-1 ring-slate-100">
                          <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 p-4 pb-2">Modify Access Level</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="p-3 cursor-pointer group" onClick={() => updateUserRole(u.uid, 'user')}>
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center mr-3 group-hover:bg-primary/10 transition-colors">
                              <UserPlus className="h-4 w-4 text-slate-600 group-hover:text-primary" />
                            </div>
                            <span className="font-bold text-sm">Regular User</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="p-3 cursor-pointer group" onClick={() => updateUserRole(u.uid, 'mentor')}>
                            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center mr-3 group-hover:bg-amber-100 transition-colors">
                              <Building className="h-4 w-4 text-amber-600" />
                            </div>
                            <span className="font-bold text-sm">Mentor Access</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="p-3 cursor-pointer group" onClick={() => updateUserRole(u.uid, 'admin')}>
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center mr-3 group-hover:bg-blue-100 transition-colors">
                              <ShieldCheck className="h-4 w-4 text-blue-600" />
                            </div>
                            <span className="font-bold text-sm">Admin Access</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="p-3 cursor-pointer group text-rose-600" onClick={() => updateUserRole(u.uid, 'super_admin')}>
                            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center mr-3 group-hover:bg-rose-100 transition-colors">
                              <ShieldAlert className="h-4 w-4 text-rose-600" />
                            </div>
                            <span className="font-bold text-sm">Super Admin</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
