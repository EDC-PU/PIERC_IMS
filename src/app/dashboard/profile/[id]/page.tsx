'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ref, onValue, query, orderByChild, equalTo, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Application, UserProfile } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Mail, 
  Phone, 
  Building2, 
  Rocket, 
  MessageSquare, 
  ChevronRight, 
  ExternalLink,
  ShieldCheck,
  Calendar,
  IdCard,
  ClipboardList
} from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userApps, setUserApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const directRef = ref(db, `users/${id}`);
        const directSnap = await get(directRef);
        
        if (directSnap.exists()) {
          setProfile({ uid: directSnap.key, ...directSnap.val() } as UserProfile);
        } else {
          const usersRef = ref(db, 'users');
          const q = query(usersRef, orderByChild('enrollmentNumber'), equalTo(id));
          const slugSnap = await get(q);
          
          if (slugSnap.exists()) {
            const data = slugSnap.val();
            const uid = Object.keys(data)[0];
            setProfile({ uid, ...data[uid] } as UserProfile);
          } else {
            setProfile(null);
          }
        }
      } catch (error) {
        console.error("Profile lookup error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id]);

  if (loading) return <div className="p-8 text-center animate-pulse text-slate-400 font-bold">Loading Identity...</div>;
  if (!profile) return <div className="p-8 text-center text-slate-500 font-bold">Profile not found.</div>;

  const isInternal = profile.institute && (profile.uid.length < 20 || profile.displayName.toLowerCase().includes('staff') || profile.displayName.toLowerCase().includes('student'));

  return (
    <div className="space-y-8 p-6 md:p-8 animate-in fade-in duration-700">
      {/* Header Card */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 rounded-[2.5rem] -m-2 blur-2xl opacity-50"></div>
        <Card className="border-none shadow-2xl ring-1 ring-slate-100 rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-xl relative">
          <CardContent className="p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12">
              <div className="relative group">
                <div className="absolute inset-0 bg-primary/20 rounded-[3rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <Avatar className="h-40 w-40 ring-4 ring-white shadow-2xl rounded-[3rem] relative transition-transform group-hover:scale-105 duration-500">
                  <AvatarImage src={profile.photoURL} />
                  <AvatarFallback className="bg-primary text-white text-5xl font-black">{profile.displayName[0]}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 -right-2 bg-white p-3 rounded-2xl shadow-xl ring-1 ring-slate-100">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
              </div>

              <div className="flex-1 text-center md:text-left space-y-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <h1 className="text-4xl font-black tracking-tight text-slate-900">{profile.displayName}</h1>
                    <Badge className="bg-primary text-white font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-xl border-none shadow-lg shadow-primary/20">
                      {profile.role.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-slate-500 font-bold text-lg">{profile.institute || 'External Stakeholder'}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                  <div className="flex items-center space-x-3 text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <Mail className="h-4 w-4 text-primary/60" />
                    <span className="text-sm font-bold truncate">{profile.email}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <Phone className="h-4 w-4 text-primary/60" />
                    <span className="text-sm font-bold">{profile.contactNumber || profile.phoneNumber || 'N/A'}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <IdCard className="h-4 w-4 text-primary/60" />
                    <span className="text-sm font-black tracking-wider uppercase">
                      {isInternal ? `MIS: ${profile.uid.substring(0, 10)}` : `System ID: ${profile.uid.substring(0, 8)}`}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <Building2 className="h-4 w-4 text-primary/60" />
                    <span className="text-sm font-bold">Parul University</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-4">
                  <Link href={`/dashboard/messages?userId=${profile.uid}`}>
                    <Button className="rounded-2xl h-12 px-8 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20">
                      <MessageSquare className="h-4 w-4 mr-2" /> Message
                    </Button>
                  </Link>
                  <Button variant="outline" className="rounded-2xl h-12 px-8 font-black uppercase tracking-widest text-[10px] border-slate-200">
                    <ClipboardList className="h-4 w-4 mr-2" /> View Logs
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Project List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 flex items-center">
              <Rocket className="h-6 w-6 mr-3 text-primary" /> Associated Startups
            </h2>
            <Badge variant="secondary" className="rounded-lg bg-slate-100 text-slate-500 font-black">{userApps.length}</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {userApps.length === 0 ? (
              <Card className="md:col-span-2 border-dashed border-2 bg-slate-50/50 p-12 text-center rounded-[2rem]">
                <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No startups found for this user.</p>
              </Card>
            ) : (
              userApps.map(app => (
                <Link key={app.id} href={`/dashboard/applications/${app.id}`}>
                  <Card className="group hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 border-none ring-1 ring-slate-100 rounded-[2rem] overflow-hidden bg-white h-full flex flex-col">
                    <div className="p-6 space-y-4 flex-1">
                      <div className="flex justify-between items-start">
                        <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] uppercase tracking-widest px-3">
                          {app.status}
                        </Badge>
                        <ExternalLink className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors" />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 leading-tight group-hover:text-primary transition-colors line-clamp-2">
                          {app.data?.startupTitle || app.programmeTitle}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">{app.programmeTitle}</p>
                      </div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50/50 border-t flex justify-between items-center mt-auto">
                      <div className="flex items-center text-[10px] font-bold text-slate-500">
                        <Calendar className="h-3 w-3 mr-1.5" />
                        {new Date(app.submittedAt).toLocaleDateString()}
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </div>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Info Sidebar */}
        <div className="space-y-8">
          <Card className="border-none shadow-sm ring-1 ring-slate-100 rounded-[2rem] overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b px-6 py-4">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center">
                <ShieldCheck className="h-4 w-4 mr-2 text-primary" /> System Access
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Account Status</p>
                <div className="flex items-center text-emerald-500 font-bold text-sm">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></div>
                  Active & Verified
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Platform Permissions</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {profile.role === 'admin' || profile.role === 'super_admin' ? (
                    ['Evaluation', 'Scheduling', 'User Management', 'Analytics'].map(p => (
                      <Badge key={p} variant="secondary" className="rounded-lg text-[9px] font-bold">{p}</Badge>
                    ))
                  ) : (
                    ['Application Submission', 'Mentorship Access', 'Pitching'].map(p => (
                      <Badge key={p} variant="secondary" className="rounded-lg text-[9px] font-bold">{p}</Badge>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm ring-1 ring-slate-100 rounded-[2rem] overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b px-6 py-4">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-primary" /> Key Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500">Member Since</span>
                <span className="text-xs font-black text-slate-900">May 2026</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500">Last Activity</span>
                <span className="text-xs font-black text-slate-900">Today</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
