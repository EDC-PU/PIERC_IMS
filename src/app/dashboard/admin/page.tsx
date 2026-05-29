'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { UserProfile, UserRole } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Shield, ShieldAlert, UserCog } from 'lucide-react';

export default function AdminSettingsPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUsers(Object.values(data) as UserProfile[]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const changeRole = async (uid: string, newRole: UserRole) => {
    try {
      await update(ref(db, `users/${uid}`), { role: newRole });
      toast.success(`Role updated to ${newRole}`);
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin': return <Badge className="bg-red-600"><ShieldAlert className="w-3 h-3 mr-1" /> Super Admin</Badge>;
      case 'admin': return <Badge className="bg-blue-600"><Shield className="w-3 h-3 mr-1" /> Manager</Badge>;
      case 'mentor': return <Badge className="bg-purple-600">Mentor</Badge>;
      default: return <Badge variant="outline">User</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">System Administration</h1>
        <p className="text-slate-500">Manage user roles and system-wide permissions.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Assign roles and manage access for all registered users.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Current Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center">Loading users...</TableCell></TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.uid}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={u.photoURL} />
                          <AvatarFallback>{(u.displayName || u.email || 'U')[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{u.displayName || u.email || 'User'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500">{u.email}</TableCell>
                    <TableCell>{getRoleBadge(u.role)}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Select onValueChange={(val) => changeRole(u.uid, val as UserRole)} value={u.role}>
                        <SelectTrigger className="w-[130px] h-8 ml-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="mentor">Mentor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
