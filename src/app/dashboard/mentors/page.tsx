'use client';

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus, 
  Mail, 
  MoreVertical,
  ExternalLink,
  UserPlus,
  Check
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { update } from 'firebase/database';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';

export default function MentorsPage() {
  const { user: currentUser } = useAuthStore();
  const [mentors, setMentors] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const userList = Object.values(data) as UserProfile[];
        setAllUsers(userList);
        const mentorList = userList.filter((user: any) => user.role === 'mentor');
        setMentors(mentorList);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const assignAsMentor = async (uid: string) => {
    try {
      await update(ref(db, `users/${uid}`), {
        role: 'mentor',
        updatedAt: Date.now()
      });
      toast.success('User promoted to Mentor successfully');
      setIsOpen(false);
    } catch (error) {
      toast.error('Failed to promote user');
    }
  };

  const potentialMentors = allUsers.filter(u => 
    u.role !== 'mentor' && 
    (u.displayName.toLowerCase().includes(userSearch.toLowerCase()) || 
     u.email.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const filteredMentors = mentors.filter(m => 
    m.displayName.toLowerCase().includes(search.toLowerCase()) ||
    m.bio?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">PIERC Mentors</h1>
          <p className="text-slate-500">Manage and assign expert mentors to startups.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add New Mentor</Button>
          </DialogTrigger>
          <DialogContent className="rounded-[2rem] border-none shadow-2xl max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-900">Assign New Mentor</DialogTitle>
              <DialogDescription className="text-slate-500 font-medium">
                Search for an existing user to promote them to the Mentor role.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search by name or email..." 
                  className="pl-10 rounded-xl"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
              <ScrollArea className="h-[300px] rounded-xl border border-slate-100 p-2">
                {potentialMentors.length === 0 ? (
                  <p className="text-center py-10 text-xs text-slate-400 font-bold uppercase tracking-widest">No users found</p>
                ) : (
                  <div className="space-y-2">
                    {potentialMentors.map((u) => (
                      <div 
                        key={u.uid} 
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                        onClick={() => assignAsMentor(u.uid)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={u.photoURL} />
                            <AvatarFallback className="bg-primary text-white font-bold">{u.displayName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">{u.displayName}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{u.email}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="rounded-lg h-8 w-8 p-0">
                          <Plus className="h-4 w-4 text-slate-400 group-hover:text-primary" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search mentors by name or expertise..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-slate-100 rounded-t-lg"></div>
              <CardContent className="h-32"></CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMentors.map((mentor) => (
            <Card key={mentor.uid} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="pb-4 bg-slate-50/50">
                <div className="flex justify-between items-start">
                  <Avatar className="h-16 w-16 border-2 border-white shadow-sm">
                    <AvatarImage src={mentor.photoURL} />
                    <AvatarFallback>{mentor.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-4">
                  <CardTitle className="text-lg">{mentor.displayName}</CardTitle>
                  <CardDescription className="line-clamp-1">{mentor.bio || 'Expert Mentor at PIERC'}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">FinTech</Badge>
                  <Badge variant="secondary">Scaling</Badge>
                  <Badge variant="secondary">Strategy</Badge>
                </div>
                
                <div className="flex items-center gap-3 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Mail className="mr-2 h-4 w-4" /> Contact
                  </Button>
                  <Button variant="outline" size="sm" className="px-3">
                    <ExternalLink className="h-4 w-4 text-blue-600" />
                  </Button>
                </div>
              </CardContent>
              <div className="px-6 py-3 border-t bg-slate-50 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Assigned Startups: 4</span>
                <Button variant="link" size="sm" className="h-auto p-0 text-primary">
                  View Profile <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
