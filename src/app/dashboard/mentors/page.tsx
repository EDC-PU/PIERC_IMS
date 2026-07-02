'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile, Application } from '@/types';
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
  Check, 
  Trash2, 
  Phone,
  Download
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { exportToCSV } from '@/lib/export';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
// updateDoc is already imported above
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

export default function MentorsPage() {
  const { user: currentUser } = useAuthStore();
  const router = useRouter();
  const [mentors, setMentors] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const getAssignedStartupsCount = (mentorId: string) => {
    return applications.filter(app => app.mentorId === mentorId).length;
  };

  const getMentorSectors = (mentorId: string) => {
    const mentorApps = applications.filter(app => app.mentorId === mentorId);
    const sectors = new Set<string>();
    mentorApps.forEach(app => {
      const sector = app.data?.sector || app.data?.startupSector;
      if (sector) sectors.add(sector);
    });
    if (sectors.size === 0) {
      return ['General Mentorship', 'Advising'];
    }
    return Array.from(sectors);
  };

  const removeMentorRole = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        role: 'user',
        updatedAt: Date.now()
      });
      toast.success('Mentor role removed successfully');
    } catch (error) {
      toast.error('Failed to remove mentor role');
    }
  };

  useEffect(() => {
    const usersCol = collection(db, 'users');
    const unsubscribeUsers = onSnapshot(usersCol, (snapshot) => {
      const userList = snapshot.docs.map(d => d.data()) as UserProfile[];
      setAllUsers(userList);
      setMentors(userList.filter((u: any) => u.role === 'mentor'));
    });

    const appsCol = collection(db, 'applications');
    const unsubscribeApps = onSnapshot(appsCol, (snapshot) => {
      setApplications(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Application[]);
      setLoading(false);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeApps();
    };
  }, []);

  const assignAsMentor = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
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
    ((u.displayName || u.email || '').toLowerCase().includes(userSearch.toLowerCase()) || 
     (u.email || '').toLowerCase().includes(userSearch.toLowerCase()))
  );

  const filteredMentors = mentors.filter(m => 
    (m.displayName || m.email || '').toLowerCase().includes(search.toLowerCase()) ||
    m.bio?.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportMentors = () => {
    const headers = [
      'Name',
      'Email',
      'Phone',
      'Institute',
      'Assigned Startups',
      'Expertise Sectors'
    ];
    const keys = [
      'displayName',
      'email',
      'phone',
      'institute',
      'assignedCount',
      'expertiseSectors'
    ];

    const dataToExport = filteredMentors.map(m => ({
      ...m,
      phone: m.contactNumber || m.phoneNumber || 'N/A',
      assignedCount: getAssignedStartupsCount(m.uid),
      expertiseSectors: getMentorSectors(m.uid).join('; ')
    }));

    exportToCSV(dataToExport, 'mentors_report.csv', headers, keys);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">PIERC Mentors</h1>
          <p className="text-slate-500">Manage and assign expert mentors to startups.</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportMentors} className="rounded-xl font-bold flex items-center gap-2 border-slate-200 bg-white hover:bg-slate-50">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
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
                            <AvatarFallback className="bg-primary text-white font-bold">{(u.displayName || u.email || 'U')[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">{u.displayName || u.email || 'User'}</p>
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
                    <AvatarFallback>{(mentor.displayName || mentor.email || 'M')[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-xl p-2 text-slate-400 hover:bg-white hover:shadow-md transition-all outline-none h-8 w-8 cursor-pointer">
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-2xl border-none ring-1 ring-slate-100">
                        <DropdownMenuItem 
                          className="p-2.5 cursor-pointer group text-rose-600 focus:text-rose-600 focus:bg-rose-50 rounded-lg m-1"
                          onClick={() => removeMentorRole(mentor.uid)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          <span className="font-bold text-sm">Remove Mentor</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <div className="mt-4">
                  <CardTitle className="text-lg">{mentor.displayName || mentor.email || 'Mentor'}</CardTitle>
                  <CardDescription className="line-clamp-1">{mentor.bio || 'Expert Mentor at PIERC'}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {getMentorSectors(mentor.uid).map((sector, idx) => (
                    <Badge key={idx} variant="secondary">
                      {sector}
                    </Badge>
                  ))}
                </div>

                <div className="space-y-1.5 text-xs text-slate-500 pt-1">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium truncate">{mentor.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium">{mentor.contactNumber || mentor.phoneNumber || 'No contact number'}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => router.push(`/dashboard/messages?userId=${mentor.uid}`)}
                  >
                    <Mail className="mr-2 h-4 w-4" /> Contact
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="px-3"
                    onClick={() => {
                      const link = mentor.linkedin || mentor.website;
                      if (link) {
                        window.open(link.startsWith('http') ? link : `https://${link}`, '_blank');
                      } else {
                        toast.info('No external links provided by this mentor');
                      }
                    }}
                  >
                    <ExternalLink className="h-4 w-4 text-blue-600" />
                  </Button>
                </div>
              </CardContent>
              <div className="px-6 py-3 border-t bg-slate-50 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Assigned Startups: {getAssignedStartupsCount(mentor.uid)}</span>
                <Button 
                  variant="link" 
                  size="sm" 
                  className="h-auto p-0 text-primary font-bold hover:no-underline"
                  onClick={() => router.push(`/dashboard/profile/${mentor.uid}`)}
                >
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
