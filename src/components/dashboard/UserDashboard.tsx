'use client';

import { useEffect, useState } from 'react';
import { UserProfile, Meeting, Application } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import EventsWidget from './EventsWidget';
import { Badge } from '@/components/ui/badge';
import { 
  Rocket, 
  Clock, 
  Calendar, 
  CheckCircle2,
  ArrowUpRight,
  FileText,
  MapPin,
  Video,
  ChevronRight,
  History,
  Circle,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface UserDashboardProps {
  user: UserProfile;
}

const tractionData = [
  { name: 'Jan', traction: 400 },
  { name: 'Feb', traction: 600 },
  { name: 'Mar', traction: 800 },
  { name: 'Apr', traction: 1200 },
  { name: 'May', traction: 1500 },
];

export default function UserDashboard({ user }: UserDashboardProps) {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch user's meetings
    const meetingsCol = collection(db, 'meetings');
    const unsubscribeMeetings = onSnapshot(meetingsCol, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Meeting[];
      const userMeetings = list.filter(m => m && m.attendees && m.attendees.includes(user.uid));
      setMeetings(userMeetings.sort((a, b) => (a.startTime || 0) - (b.startTime || 0)));
    });

    // 2. Fetch user's applications
    const appsCol = collection(db, 'applications');
    const q = query(appsCol, where('userId', '==', user.uid));
    
    // Track eval listeners for cleanup
    const evalUnsubscribes: (() => void)[] = [];

    const unsubscribeApps = onSnapshot(q, (snapshot) => {
      const userApps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Application[];
      setApplications(userApps);

      // Clean up previous eval listeners
      evalUnsubscribes.forEach(unsub => unsub());
      evalUnsubscribes.length = 0;

      // 3. Fetch evaluations for these apps
      userApps.forEach(app => {
        if (app && app.id) {
          const evalCol = collection(db, 'evaluations');
          const evalQuery = query(evalCol, where('applicationId', '==', app.id));
          const unsubEval = onSnapshot(evalQuery, (evalSnap) => {
            const evalData: Record<string, any> = {};
            evalSnap.docs.forEach(doc => {
              const evalRec = doc.data();
              const uid = evalRec.evaluatorId;
              const phaseKey = evalRec.phase?.replace(/ /g, '_');
              if (phaseKey) {
                evalData[phaseKey] = true;
              }
              if (uid && phaseKey) {
                if (!evalData[uid]) evalData[uid] = {};
                evalData[uid][phaseKey] = evalRec;
              }
            });
            setEvaluations(prev => [...prev.filter(e => e.appId !== app.id), { appId: app.id, data: evalData }]);
          });
          evalUnsubscribes.push(unsubEval);
        }
      });
      setLoading(false);
    });

    return () => {
      unsubscribeMeetings();
      unsubscribeApps();
      evalUnsubscribes.forEach(unsub => unsub());
    };
  }, [user.uid]);

  const latestApp = applications[0];
  const appMeetings = latestApp ? meetings.filter(m => m && m.applicationId === latestApp.id) : [];
  const appEvaluations = latestApp ? (evaluations.find(e => e && e.appId === latestApp.id)?.data || {}) : {};

  const hasPhase1Meeting = appMeetings.some(m => m && m.title?.toLowerCase().includes('phase 1'));
  const hasPhase1Eval = !!appEvaluations.Phase_1;
  const hasPhase2Meeting = appMeetings.some(m => m && m.title?.toLowerCase().includes('phase 2'));
  const hasPhase2Eval = !!appEvaluations.Phase_2;

  const timelineSteps = [
    { 
      id: 'submitted', 
      label: 'Submitted', 
      status: latestApp ? 'completed' : 'pending', 
      date: latestApp?.submittedAt 
    },
    { 
      id: 'phase1_eval', 
      label: 'Phase 1 Evaluation', 
      status: (hasPhase1Eval || ['Phase 2 Selected', 'Phase 2 Evaluation', 'Cohort Selected', 'Incubated'].includes(latestApp?.status || '')) ? 'completed' : 
              (hasPhase1Meeting || latestApp?.status === 'Phase 1 Evaluation') ? 'current' : 'pending',
      date: appMeetings.find(m => m && m.title?.toLowerCase().includes('phase 1'))?.startTime
    },
    { 
      id: 'phase2_eval', 
      label: 'Phase 2 Evaluation', 
      status: (hasPhase2Eval || ['Cohort Selected', 'Incubated'].includes(latestApp?.status || '')) ? 'completed' : 
              (hasPhase2Meeting || latestApp?.status === 'Phase 2 Evaluation') ? 'current' : 'pending',
      date: appMeetings.find(m => m && m.title?.toLowerCase().includes('phase 2'))?.startTime
    },
    { 
      id: 'final_selection', 
      label: 'Final Selection', 
      status: (['Cohort Selected', 'Incubated'].includes(latestApp?.status || '')) ? 'completed' : 'pending' 
    },
    { 
      id: 'incubated', 
      label: 'Incubated', 
      status: latestApp?.status === 'Incubated' ? 'completed' : 
              latestApp?.status === 'Revision Needed' ? 'warning' : 'pending' 
    }
  ];

  const upcomingMeeting = meetings.find(m => m && m.startTime && m.startTime > Date.now());

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Welcome back, {user.displayName}</h1>
          <p className="text-slate-500 font-medium mt-1">Status: <span className="text-primary font-bold">{latestApp?.status || 'No Application Found'}</span></p>
        </div>
        <Link href="/dashboard/programmes">
          <Button className="rounded-xl h-12 px-6 font-bold shadow-lg shadow-primary/20">
            <Rocket className="mr-2 h-4 w-4" /> Apply for New Programme
          </Button>
        </Link>
      </div>

      {/* Hero Stats */}
      <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6", user.role === 'user' ? "lg:grid-cols-3" : "lg:grid-cols-4")}>
        <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-3xl overflow-hidden bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/30">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Application</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-black text-slate-900">{latestApp?.status || 'N/A'}</div>
            <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Phase {appMeetings.length + 1} Pipeline</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-3xl overflow-hidden bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/30">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Next Session</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-black text-slate-900">
              {upcomingMeeting ? format(upcomingMeeting.startTime, 'MMM dd') : 'TBD'}
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">
              {upcomingMeeting ? format(upcomingMeeting.startTime, 'hh:mm a') : 'Awaiting Schedule'}
            </p>
          </CardContent>
        </Card>

        {user.role !== 'user' && (
          <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-3xl overflow-hidden bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/30">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Evaluations</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-black text-slate-900">{Object.keys(appEvaluations).length}</div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Completed Reviews</p>
            </CardContent>
          </Card>
        )}

        <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-3xl overflow-hidden bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/30">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Traction</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-black text-slate-900">Active</div>
            <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Growth Tracking Live</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Timeline & Schedule */}
        <div className="lg:col-span-4 space-y-8">
          <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-[2.5rem] bg-white overflow-hidden">
            <CardHeader className="p-8 border-b bg-slate-50/30">
              <CardTitle className="text-lg font-black text-slate-900 flex items-center">
                <History className="h-5 w-5 mr-2 text-primary" /> Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="relative space-y-8">
                {/* Vertical Line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-100" />
                
                {timelineSteps.map((step, idx) => (
                  <div key={step.id} className="relative flex items-start space-x-4 pl-8 group">
                    {/* Step Icon/Circle */}
                    <div className={cn(
                      "absolute left-0 top-1 h-6 w-6 rounded-full border-4 border-white flex items-center justify-center transition-all duration-500",
                      step.status === 'completed' ? "bg-primary text-white scale-110 shadow-lg shadow-primary/20" : 
                      step.status === 'current' ? "bg-primary/20 text-primary border-primary/20 animate-pulse" :
                      step.status === 'warning' ? "bg-orange-500 text-white" : "bg-slate-100"
                    )}>
                      {step.status === 'completed' ? <CheckCircle2 className="h-3 w-3" /> : 
                       step.status === 'current' ? <div className="h-2 w-2 bg-primary rounded-full" /> :
                       step.status === 'warning' ? <AlertCircle className="h-3 w-3" /> : 
                       <Circle className="h-2 w-2 text-slate-300" />}
                    </div>
                    
                    <div>
                      <p className={cn(
                        "text-xs font-black uppercase tracking-tight",
                        step.status === 'completed' ? "text-slate-900" : "text-slate-400"
                      )}>
                        {step.label}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                        {step.date ? format(step.date, 'MMM dd, yyyy') : 'Awaiting Stage'}
                      </p>
                      {step.status === 'warning' && (
                        <Badge className="mt-2 bg-orange-100 text-orange-600 border-none font-black text-[8px] uppercase">Action Required</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-[2.5rem] bg-white overflow-hidden">
            <CardHeader className="p-8 border-b bg-slate-50/30">
              <CardTitle className="text-lg font-black text-slate-900 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-primary" /> Upcoming Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {appMeetings.filter(m => m.startTime > Date.now()).length === 0 ? (
                <div className="p-10 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest italic">
                  No upcoming sessions
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {appMeetings.filter(m => m.startTime > Date.now()).map(m => (
                    <div key={m.id} className="p-6 hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-black text-slate-900">{m.title}</p>
                          <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase mt-2">
                            <Clock className="h-3 w-3 mr-1" /> {format(m.startTime, 'MMM dd • hh:mm a')}
                          </div>
                          {m.mode === 'Online' && m.link && (
                            <div className="mt-3">
                              <a 
                                href={m.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-[9px] font-black uppercase bg-primary text-white px-3 py-1.5 rounded-lg shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                              >
                                <Video className="h-3 w-3 mr-1.5" /> Join Meeting
                              </a>
                            </div>
                          )}
                          {m.mode === 'Offline' && m.location && (
                            <div className="flex items-center text-[9px] font-bold text-slate-500 uppercase mt-2">
                              <MapPin className="h-3 w-3 mr-1" /> {m.location}
                            </div>
                          )}
                        </div>
                        <Badge className="bg-slate-100 text-slate-600 border-none font-black text-[8px] uppercase">{m.mode}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Growth & Notifications */}
        <div className="lg:col-span-8 space-y-8">
          <EventsWidget user={user} />
          <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-[2.5rem] bg-white overflow-hidden">
            <CardHeader className="p-8 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black text-slate-900">Startup Traction</CardTitle>
                <CardDescription className="font-bold text-[10px] uppercase tracking-widest text-slate-400">Monthly Growth Visualizer</CardDescription>
              </div>
              <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] uppercase px-3 py-1">Auto-Updating</Badge>
            </CardHeader>
            <CardContent className="p-8 pt-12">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tractionData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'black', fill: '#94a3b8'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'black', fill: '#94a3b8'}} />
                    <Tooltip 
                      contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px'}}
                      labelStyle={{fontWeight: 'black', fontSize: '10px', textTransform: 'uppercase', marginBottom: '8px'}}
                    />
                    <Line type="monotone" dataKey="traction" stroke="#3b82f6" strokeWidth={5} dot={{r: 8, fill: '#3b82f6', strokeWidth: 3, stroke: '#fff'}} activeDot={{r: 10, fill: '#3b82f6', strokeWidth: 4, stroke: '#fff'}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card 
              className="border-none shadow-sm ring-1 ring-slate-200 rounded-[2.5rem] bg-white p-8 group hover:ring-primary/20 transition-all cursor-pointer"
              onClick={() => router.push(latestApp ? `/dashboard/applications/${latestApp.id}` : '/dashboard/applications')}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="h-12 w-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary">
                  <FileText className="h-6 w-6" />
                </div>
                <ChevronRight className="h-5 w-5 text-slate-200 group-hover:text-primary transition-colors" />
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Pitch Deck & Docs</h3>
              <p className="text-sm font-medium text-slate-500 mt-1">Manage your application attachments and resources.</p>
            </Card>

            <Card 
              className="border-none shadow-sm ring-1 ring-slate-200 rounded-[2.5rem] bg-white p-8 group hover:ring-primary/20 transition-all cursor-pointer"
              onClick={() => router.push(latestApp?.mentorId ? `/dashboard/profile/${latestApp.mentorId}` : '/dashboard/mentors')}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="h-12 w-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                  <Rocket className="h-6 w-6" />
                </div>
                <ChevronRight className="h-5 w-5 text-slate-200 group-hover:text-purple-600 transition-colors" />
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Innovation Mentorship</h3>
              <p className="text-sm font-medium text-slate-500 mt-1">Connect with assigned mentors and industry experts.</p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
