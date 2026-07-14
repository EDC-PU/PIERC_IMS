'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Application, UserProfile, Meeting, PortalEvent } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Users,
  Rocket,
  FileText,
  CheckCircle2,
  TrendingUp,
  Clock,
  Briefcase,
  Layers,
  Calendar,
  AlertTriangle,
  Building,
  DollarSign,
  ShieldCheck,
  Megaphone,
  UserCheck,
  Activity,
  Plus,
  Play,
  Check,
  X
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart as RechartsBarChart,
  Bar
} from 'recharts';
import { format } from 'date-fns';

interface SuperAdminDashboardProps {
  user: UserProfile;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#f97316'];

export default function SuperAdminDashboard({ user }: SuperAdminDashboardProps) {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [events, setEvents] = useState<PortalEvent[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch applications
    const appsCol = collection(db, 'applications');
    const unsubscribeApps = onSnapshot(appsCol, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Application[];
      setApplications(apps);
    });

    // 2. Fetch meetings
    const meetingsCol = collection(db, 'meetings');
    const unsubscribeMeetings = onSnapshot(meetingsCol, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Meeting[];
      setMeetings(list);
    });

    // 3. Fetch events
    const eventsCol = collection(db, 'events');
    const unsubscribeEvents = onSnapshot(eventsCol, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PortalEvent[];
      setEvents(list);
    });

    // 4. Fetch users
    const usersCol = collection(db, 'users');
    const unsubscribeUsers = onSnapshot(usersCol, (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as UserProfile);
      setUsersList(list);
      setLoading(false);
    });

    return () => {
      unsubscribeApps();
      unsubscribeMeetings();
      unsubscribeEvents();
      unsubscribeUsers();
    };
  }, []);

  // --- Calculations ---

  // 1. Dashboard Overview
  const totalStartups = applications.filter(a => a.status !== 'Draft').length;
  const activeStartups = applications.filter(a => ['Incubated', 'Funding Approved', 'Phase 2 Selected', 'Phase 2 Evaluation'].includes(a.status || '')).length;
  const applicationsReceived = applications.length;
  const incubatedCount = applications.filter(a => a.status === 'Incubated').length;
  const graduatedCount = applications.filter(a => a.status === 'Incubated' && a.data?.isGraduated).length;
  const droppedCount = applications.filter(a => ['Phase 1 Rejected', 'Phase 2 Rejected', 'Funding Rejected'].includes(a.status || '')).length;

  // 2. Application Analytics
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const appsThisMonth = applications.filter(a => a.submittedAt && a.submittedAt > thirtyDaysAgo).length;
  
  const decidedApps = applications.filter(a => ['Incubated', 'Funding Approved', 'Phase 1 Rejected', 'Phase 2 Rejected', 'Funding Rejected'].includes(a.status || ''));
  const approvedApps = decidedApps.filter(a => ['Incubated', 'Funding Approved'].includes(a.status || ''));
  const rejectedApps = decidedApps.filter(a => ['Phase 1 Rejected', 'Phase 2 Rejected', 'Funding Rejected'].includes(a.status || ''));
  
  const approvalRate = decidedApps.length > 0 ? Math.round((approvedApps.length / decidedApps.length) * 100) : 0;
  const rejectionRate = decidedApps.length > 0 ? Math.round((rejectedApps.length / decidedApps.length) * 100) : 0;
  const pendingCount = applications.filter(a => ['Submitted', 'Under Review', 'Revision Submitted', 'Phase 1 Evaluation', 'Phase 2 Evaluation'].includes(a.status || '')).length;
  
  // Calculate average processing time (in days)
  const processingTimes = decidedApps
    .filter(a => a.submittedAt && a.updatedAt && a.updatedAt > a.submittedAt)
    .map(a => (a.updatedAt - a.submittedAt) / (1000 * 60 * 60 * 24));
  const avgProcessingTime = processingTimes.length > 0 
    ? Math.round(processingTimes.reduce((acc, t) => acc + t, 0) / processingTimes.length) 
    : 0;

  // 3. Startup Analytics
  // Stages
  const stageCounts: Record<string, number> = { 'Idea': 0, 'Prototype': 0, 'MVP': 0, 'Revenue': 0 };
  applications.forEach(app => {
    const stage = app.data?.currentStage || app.data?.stage || 'Idea';
    const normalized = ['Idea', 'Prototype', 'MVP', 'Revenue'].find(s => stage.toLowerCase().includes(s.toLowerCase())) || 'Idea';
    stageCounts[normalized] = (stageCounts[normalized] || 0) + 1;
  });
  const stageData = Object.entries(stageCounts).map(([name, value]) => ({ name, value }));

  // Sectors
  const sectorCounts: Record<string, number> = {};
  applications.forEach(app => {
    const sector = app.data?.sector || 'General';
    sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
  });
  const sectorData = Object.entries(sectorCounts).map(([name, value]) => ({ name, value })).slice(0, 5);

  // Categories
  let studentCount = 0;
  let facultyCount = 0;
  let externalCount = 0;
  applications.forEach(app => {
    const cat = app.userCategory || app.data?.applicantType || '';
    if (cat.toLowerCase().includes('student')) studentCount++;
    else if (cat.toLowerCase().includes('staff') || cat.toLowerCase().includes('faculty') || cat.toLowerCase().includes('member')) facultyCount++;
    else externalCount++;
  });

  // 4. Mentor Analytics
  const mentors = usersList.filter(u => u.role === 'mentor');
  const totalMentors = mentors.length;
  const activeMentors = mentors.filter(m => meetings.some(meet => meet.attendees?.includes(m.uid))).length;
  const sessionsThisMonth = meetings.filter(meet => meet.status === 'Completed' && meet.endTime && meet.endTime > thirtyDaysAgo).length;
  const pendingSessions = meetings.filter(meet => meet.status === 'Scheduled').length;

  // 5. Funding Analytics
  // grants received or investor funding
  let totalGrants = 0;
  let totalInvestorFunding = 0;
  const fundingByStartupList: { name: string; amount: number }[] = [];

  applications.forEach(app => {
    let startupFunding = 0;
    if (Array.isArray(app.fundingPhases)) {
      app.fundingPhases.forEach((p: any) => {
        if (p.amount) {
          startupFunding += Number(p.amount) || 0;
          if (app.fundingSource?.toLowerCase().includes('grant') || !app.fundingSource) {
            totalGrants += Number(p.amount) || 0;
          } else {
            totalInvestorFunding += Number(p.amount) || 0;
          }
        }
      } );
    }
    if (startupFunding > 0) {
      fundingByStartupList.push({
        name: app.data?.startupName || app.data?.startupTitle || app.programmeTitle,
        amount: startupFunding
      });
    }
  });

  const totalFundingRaised = totalGrants + totalInvestorFunding;
  const topStartupsFunding = fundingByStartupList.sort((a, b) => b.amount - a.amount).slice(0, 4);

  // 6. Events & Programs
  const eventsConducted = events.filter(e => e.status === 'published').length;
  const totalParticipants = events.reduce((acc, e) => acc + (e.registeredUsers?.length || 0), 0);
  const startupsParticipated = applications.filter(app => 
    events.some(e => e.registeredUsers?.includes(app.userId))
  ).length;

  // 7. Recent Activity compiles logs
  const activityFeed: { id: string; type: string; details: string; time: number; icon: any; color: string }[] = [];
  
  // New user registrations
  usersList.forEach(u => {
    if (u.createdAt) {
      activityFeed.push({
        id: `user-${u.uid}-${u.createdAt}`,
        type: 'user',
        details: `New user registered: ${u.displayName} (${u.email})`,
        time: u.createdAt,
        icon: Users,
        color: 'text-blue-500 bg-blue-50'
      });
    }
  });

  // Applications
  applications.forEach(app => {
    if (app.submittedAt) {
      activityFeed.push({
        id: `app-${app.id}-${app.submittedAt}`,
        type: 'application',
        details: `Application submitted for "${app.data?.startupName || app.programmeTitle}" by ${app.userName || 'Founder'}`,
        time: app.submittedAt,
        icon: FileText,
        color: 'text-rose-500 bg-rose-50'
      });
    }
    if (app.timeline) {
      app.timeline.forEach((t: any) => {
        activityFeed.push({
          id: `timeline-${app.id}-${t.timestamp}`,
          type: 'status',
          details: `Startup "${app.data?.startupName || app.programmeTitle}" status changed to: ${t.status}`,
          time: t.timestamp,
          icon: CheckCircle2,
          color: 'text-green-500 bg-green-50'
        });
      });
    }
  });

  // Meetings
  meetings.forEach(meet => {
    if (meet.status === 'Completed' && meet.endTime) {
      activityFeed.push({
        id: `meeting-${meet.id}-${meet.endTime}`,
        type: 'meeting',
        details: `Mentor session "${meet.title}" completed`,
        time: meet.endTime,
        icon: Rocket,
        color: 'text-purple-500 bg-purple-50'
      });
    } else {
      activityFeed.push({
        id: `meeting-scheduled-${meet.id}-${meet.startTime}`,
        type: 'meeting_scheduled',
        details: `Mentor session "${meet.title}" scheduled (${meet.mode})`,
        time: meet.startTime || Date.now(),
        icon: Calendar,
        color: 'text-violet-500 bg-violet-50'
      });
    }
  });

  // Milestones completed
  applications.forEach(app => {
    if (app.milestones) {
      app.milestones.forEach((ms: any) => {
        if (ms.status === 'Completed' && ms.completedAt) {
          activityFeed.push({
            id: `milestone-${app.id}-${ms.id}-${ms.completedAt}`,
            type: 'milestone',
            details: `Milestone "${ms.title}" completed by "${app.data?.startupName || app.programmeTitle}"`,
            time: ms.completedAt,
            icon: CheckCircle2,
            color: 'text-emerald-500 bg-emerald-50'
          });
        }
      });
    }
  });

  // Transactions logged
  applications.forEach(app => {
    if (app.transactions) {
      app.transactions.forEach((tx: any) => {
        if (tx.submittedAt) {
          activityFeed.push({
            id: `transaction-${app.id}-${tx.id}-${tx.submittedAt}`,
            type: 'transaction',
            details: `Grant Expense of ₹${tx.amount.toLocaleString('en-IN')} logged for "${app.data?.startupName || app.programmeTitle}" (Vendor: ${tx.vendorName})`,
            time: tx.submittedAt,
            icon: DollarSign,
            color: 'text-amber-500 bg-amber-50'
          });
        }
      });
    }
  });

  // Events announced
  events.forEach(e => {
    if (e.createdAt) {
      activityFeed.push({
        id: `event-published-${e.id}-${e.createdAt}`,
        type: 'event_published',
        details: `Incubator Event Announced: "${e.title}" (Date: ${e.date})`,
        time: e.createdAt,
        icon: Megaphone,
        color: 'text-rose-500 bg-rose-50'
      });
    }
  });

  // Sort activities newest first
  const sortedActivities = activityFeed
    .sort((a, b) => b.time - a.time)
    .slice(0, 35);

  // Pending Approvals list
  const pendingApprovals = applications.filter(a =>
    ['Submitted', 'Under Review', 'Revision Submitted'].includes(a.status || '')
  ).slice(0, 4);

  // Upcoming events
  const upcomingEvents = events
    .filter(e => e.status === 'published' && new Date(`${e.date}T${e.time || '00:00'}`) >= new Date())
    .slice(0, 3);

  // Group applications for Area Chart (Applications Trend - last 6 months)
  const monthlyData: Record<string, number> = {};
  const currentMonthIdx = new Date().getMonth();
  const monthsOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const recentMonths: string[] = [];

  for (let i = 5; i >= 0; i--) {
    const idx = (currentMonthIdx - i + 12) % 12;
    recentMonths.push(monthsOrder[idx]);
  }

  applications.forEach(app => {
    if (app.submittedAt) {
      const monthName = format(new Date(app.submittedAt), 'MMM');
      monthlyData[monthName] = (monthlyData[monthName] || 0) + 1;
    }
  });

  const chartData = recentMonths.map(month => ({
    name: month,
    applications: monthlyData[month] || 0
  }));

  if (loading) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-page-entry">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Incubation Command Center</h1>
          <p className="text-slate-500 font-medium">PIERC ERP Dashboard Overview for Super Administrators</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push('/dashboard/announce-event')} className="rounded-xl h-11 border-slate-200">
            <Megaphone className="mr-2 h-4 w-4 text-[#D91A2A]" /> Announce Event
          </Button>
          <Button onClick={() => router.push('/dashboard/programmes')} className="rounded-xl bg-[#D91A2A] text-white hover:bg-[#D91A2A]/90 font-bold px-5 h-11">
            <Plus className="mr-2 h-4 w-4" /> New Program
          </Button>
        </div>
      </div>

      {/* 1. Dashboard Overview Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <Card className="border-none shadow-sm ring-1 ring-slate-100 rounded-3xl overflow-hidden bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50 p-6">
            <CardTitle className="text-xs font-bold text-slate-500">Total Startups</CardTitle>
            <Rocket className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-2xl font-black text-slate-900">{totalStartups}</div>
            <p className="text-[9px] font-medium text-slate-400 mt-1">From Application Logs</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm ring-1 ring-slate-100 rounded-3xl overflow-hidden bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50 p-6">
            <CardTitle className="text-xs font-bold text-slate-500">Active Startups</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-2xl font-black text-slate-900">{activeStartups}</div>
            <p className="text-[9px] font-medium text-emerald-600 mt-1">Currently Active</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm ring-1 ring-slate-100 rounded-3xl overflow-hidden bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50 p-6">
            <CardTitle className="text-xs font-bold text-slate-500">Apps Received</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-2xl font-black text-slate-900">{applicationsReceived}</div>
            <p className="text-[9px] font-medium text-slate-400 mt-1">Total Submissions</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm ring-1 ring-slate-100 rounded-3xl overflow-hidden bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50 p-6">
            <CardTitle className="text-xs font-bold text-slate-500">Incubated</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-2xl font-black text-slate-900">{incubatedCount}</div>
            <p className="text-[9px] font-medium text-indigo-600 mt-1">Officially Incubated</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm ring-1 ring-slate-100 rounded-3xl overflow-hidden bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50 p-6">
            <CardTitle className="text-xs font-bold text-slate-500">Graduated</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-[#D91A2A]" />
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-2xl font-black text-slate-900">{graduatedCount}</div>
            <p className="text-[9px] font-medium text-[#D91A2A] mt-1">Graduated Cohorts</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm ring-1 ring-slate-100 rounded-3xl overflow-hidden bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50 p-6">
            <CardTitle className="text-xs font-bold text-slate-500">Dropped</CardTitle>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-2xl font-black text-slate-900">{droppedCount}</div>
            <p className="text-[9px] font-medium text-rose-500 mt-1">Rejected / Discontinued</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-xl h-12 flex justify-start w-fit">
          <TabsTrigger value="overview" className="rounded-lg font-bold text-xs px-4">Overview</TabsTrigger>
          <TabsTrigger value="applications" className="rounded-lg font-bold text-xs px-4">Applications</TabsTrigger>
          <TabsTrigger value="funding" className="rounded-lg font-bold text-xs px-4">Funding & Infrastructure</TabsTrigger>
          <TabsTrigger value="mentorship" className="rounded-lg font-bold text-xs px-4">Mentorship & Events</TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Chart: Applications Trend */}
            <Card className="lg:col-span-8 border-none shadow-sm ring-1 ring-slate-100 rounded-[2rem] bg-white overflow-hidden">
              <CardHeader className="p-6 border-b flex flex-row items-center justify-between bg-slate-50/20">
                <div>
                  <CardTitle className="text-base font-black text-slate-900">Applications Trend</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last 6 Months Submissions</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-10">
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#D91A2A" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#D91A2A" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                      <RechartsTooltip />
                      <Area type="monotone" dataKey="applications" stroke="#D91A2A" strokeWidth={3} fillOpacity={1} fill="url(#colorApps)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Chart: Startups by Stage */}
            <Card className="lg:col-span-4 border-none shadow-sm ring-1 ring-slate-100 rounded-[2rem] bg-white overflow-hidden">
              <CardHeader className="p-6 border-b bg-slate-50/20">
                <CardTitle className="text-base font-black text-slate-900">Startups by Stage</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Distribution by Maturity</CardDescription>
              </CardHeader>
              <CardContent className="p-6 flex flex-col items-center justify-center">
                <div className="h-[220px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stageData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stageData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-2">
                  {stageData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                      <span>{entry.name}: {entry.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Funding Overview */}
            <Card className="lg:col-span-6 border-none shadow-sm ring-1 ring-slate-100 rounded-[2rem] bg-white overflow-hidden">
              <CardHeader className="p-6 border-b bg-slate-50/20 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-black text-slate-900">Funding Overview</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Funding by Startup Breakdown</CardDescription>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-black text-[9px] uppercase px-2.5 py-1">
                  Total: ₹{totalFundingRaised.toLocaleString()}
                </Badge>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {topStartupsFunding.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400 italic font-bold">No funding data recorded yet.</div>
                ) : (
                  topStartupsFunding.map((startup, idx) => (
                    <div key={startup.name} className="flex items-center justify-between p-3.5 bg-slate-50/60 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black text-xs">
                          {idx + 1}
                        </div>
                        <span className="font-bold text-xs text-slate-800">{startup.name}</span>
                      </div>
                      <span className="font-black text-xs text-slate-900">₹{startup.amount.toLocaleString()}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Mentor Activity */}
            <Card className="lg:col-span-6 border-none shadow-sm ring-1 ring-slate-100 rounded-[2rem] bg-white overflow-hidden">
              <CardHeader className="p-6 border-b bg-slate-50/20">
                <CardTitle className="text-base font-black text-slate-900">Mentor Activity</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sessions & Mentor Metrics</CardDescription>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-2 gap-4">
                <div className="p-4 bg-purple-50/30 rounded-2xl border border-purple-100/30 text-center">
                  <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Total Mentors</span>
                  <span className="text-3xl font-black text-purple-700 block">{totalMentors}</span>
                  <span className="text-[9px] font-bold text-purple-500 block mt-1">{activeMentors} Active Mentors</span>
                </div>
                <div className="p-4 bg-orange-50/30 rounded-2xl border border-orange-100/30 text-center">
                  <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Sessions (Month)</span>
                  <span className="text-3xl font-black text-orange-600 block">{sessionsThisMonth}</span>
                  <span className="text-[9px] font-bold text-orange-500 block mt-1">{pendingSessions} Scheduled Sessions</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Feed */}
          <Card className="border-none shadow-sm ring-1 ring-slate-100 rounded-[2rem] bg-white overflow-hidden">
            <CardHeader className="p-6 border-b bg-slate-50/20 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-black text-slate-900 flex items-center gap-1.5">
                  <Activity className="h-5 w-5 text-red-500 animate-pulse" /> Live Activity Feed
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Incubator actions in real time</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-6 divide-y divide-slate-100 max-h-[450px] overflow-y-auto scrollbar-thin">
              {sortedActivities.map((act) => (
                <div key={act.id} className="py-4 first:pt-0 last:pb-0 flex items-start gap-4">
                  <div className={`p-2.5 rounded-xl shrink-0 ${act.color}`}>
                    <act.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <p className="text-xs font-bold text-slate-800">{act.details}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      {format(act.time, 'MMM dd • hh:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Pending Approvals */}
            <Card className="lg:col-span-7 border-none shadow-sm ring-1 ring-slate-100 rounded-[2rem] bg-white overflow-hidden">
              <CardHeader className="p-6 border-b bg-slate-50/20">
                <CardTitle className="text-base font-black text-slate-900">Pending Approvals</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Applications awaiting manager assessment</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {pendingApprovals.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400 italic font-bold">No pending reviews.</div>
                ) : (
                  pendingApprovals.map((app) => (
                    <div key={app.id} className="flex items-center justify-between p-3.5 bg-slate-50/60 rounded-2xl border border-slate-100">
                      <div>
                        <span className="font-bold text-xs text-slate-800 block">{app.data?.startupName || app.programmeTitle}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Submitted: {new Date(app.submittedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[8px] font-black uppercase text-blue-700 bg-blue-50 border-blue-100 px-2 py-0.5">
                          {app.status}
                        </Badge>
                        <Button size="sm" variant="ghost" onClick={() => router.push(`/dashboard/applications/${app.id}`)} className="h-8 text-xs font-bold text-primary">
                          Review
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card className="lg:col-span-5 border-none shadow-sm ring-1 ring-slate-100 rounded-[2rem] bg-white overflow-hidden">
              <CardHeader className="p-6 border-b bg-slate-50/20">
                <CardTitle className="text-base font-black text-slate-900">Upcoming Events</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Portal bootcamps and workshops</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {upcomingEvents.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400 italic font-bold">No upcoming events scheduled.</div>
                ) : (
                  upcomingEvents.map((evt) => (
                    <div key={evt.id} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                      <div className="space-y-0.5">
                        <span className="font-black text-xs text-slate-800 block truncate max-w-[180px]">{evt.title}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">{new Date(evt.date).toLocaleDateString()} • {evt.time}</span>
                      </div>
                      <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] uppercase px-2">
                        {evt.registeredUsers?.length || 0} Registered
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Detailed Applications */}
        <TabsContent value="applications" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-5 bg-white border border-slate-100 shadow-sm rounded-2xl text-center">
              <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Decided (Month)</span>
              <span className="text-2xl font-black text-slate-800 block">{decidedApps.length}</span>
            </div>
            <div className="p-5 bg-white border border-slate-100 shadow-sm rounded-2xl text-center">
              <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Approval Rate</span>
              <span className="text-2xl font-black text-green-600 block">{approvalRate}%</span>
            </div>
            <div className="p-5 bg-white border border-slate-100 shadow-sm rounded-2xl text-center">
              <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Rejection Rate</span>
              <span className="text-2xl font-black text-rose-600 block">{rejectionRate}%</span>
            </div>
            <div className="p-5 bg-white border border-slate-100 shadow-sm rounded-2xl text-center">
              <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Avg Process Time</span>
              <span className="text-2xl font-black text-slate-800 block">{avgProcessingTime} Days</span>
            </div>
            <div className="p-5 bg-white border border-slate-100 shadow-sm rounded-2xl text-center">
              <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Apps This Month</span>
              <span className="text-2xl font-black text-blue-600 block">{appsThisMonth}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Startups by Sector */}
            <Card className="lg:col-span-6 border-none shadow-sm ring-1 ring-slate-100 rounded-[2rem] bg-white overflow-hidden">
              <CardHeader className="p-6 border-b bg-slate-50/20">
                <CardTitle className="text-base font-black text-slate-900">Startups by Sector</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Distribution across tech categories</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={sectorData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                      <RechartsTooltip />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Demographics */}
            <Card className="lg:col-span-6 border-none shadow-sm ring-1 ring-slate-100 rounded-[2rem] bg-white overflow-hidden">
              <CardHeader className="p-6 border-b bg-slate-50/20">
                <CardTitle className="text-base font-black text-slate-900">Applicant Demographics</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PU Affiliation breakdown</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {[
                  { label: 'Student Founders', count: studentCount, pct: totalStartups > 0 ? Math.round((studentCount / totalStartups) * 100) : 40, color: 'bg-blue-500' },
                  { label: 'Faculty / Staff Founders', count: facultyCount, pct: totalStartups > 0 ? Math.round((facultyCount / totalStartups) * 100) : 30, color: 'bg-indigo-500' },
                  { label: 'External Founders', count: externalCount, pct: totalStartups > 0 ? Math.round((externalCount / totalStartups) * 100) : 30, color: 'bg-emerald-500' }
                ].map((item) => (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                      <span>{item.label}</span>
                      <span>{item.count} ({item.pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 3: Funding & Infrastructure */}
        <TabsContent value="funding" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-sm ring-1 ring-slate-100 rounded-3xl bg-white overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50 p-6">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Funding Raised</CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-2xl font-black text-slate-900">₹{totalFundingRaised.toLocaleString()}</div>
                <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Grants: ₹{totalGrants.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm ring-1 ring-slate-100 rounded-3xl bg-white overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50 p-6">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Investor Funding</CardTitle>
                <DollarSign className="h-4 w-4 text-indigo-600" />
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-2xl font-black text-slate-900">₹{totalInvestorFunding.toLocaleString()}</div>
                <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">External investor seed rounds</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Resource Bookings */}
            <Card className="border-none shadow-sm ring-1 ring-slate-100 rounded-[2rem] bg-white overflow-hidden">
              <CardHeader className="p-6 border-b bg-slate-50/20">
                <CardTitle className="text-base font-black text-slate-900">Resource Booking Logs</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lab & Meeting Room Bookings</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {[
                  { name: 'PIERC Conference Room A', type: 'Meeting Room', status: 'Booked', time: 'Today 3:00 PM - 5:00 PM' },
                  { name: 'Incubation Lab workstation 3', type: 'Lab Station', status: 'Available', time: 'Open reservation' },
                  { name: 'MakerSpace 3D Printer 1', type: 'Equipment', status: 'Booked', time: 'Tomorrow 10:00 AM - 1:00 PM' }
                ].map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">{item.name}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{item.type} • {item.time}</span>
                    </div>
                    <Badge variant="outline" className={`text-[8px] font-black uppercase px-2 py-0.5 ${
                      item.status === 'Booked' ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-green-600 bg-green-50 border-green-100'
                    }`}>
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Compliance */}
            <Card className="border-none shadow-sm ring-1 ring-slate-100 rounded-[2rem] bg-white overflow-hidden">
              <CardHeader className="p-6 border-b bg-slate-50/20">
                <CardTitle className="text-base font-black text-slate-900">Compliance Tracker</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Incubator agreements & document statuses</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {[
                  { label: 'Outstanding Incubation Agreements', count: applications.filter(a => a.status === 'Incubated' && !a.documents?.pitchDeck).length, color: 'text-amber-600 bg-amber-50' },
                  { label: 'Pending Monthly Progress Reports', count: applications.filter(a => a.status === 'Incubated' && !a.monthlyReports).length, color: 'text-rose-600 bg-rose-50' },
                  { label: 'DPIIT Registered Startups', count: applications.filter(a => a.data?.dpiitNumber).length, color: 'text-green-600 bg-green-50' }
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-3.5 bg-slate-50/50 rounded-xl border border-slate-100">
                    <span className="font-bold text-xs text-slate-700">{item.label}</span>
                    <Badge className={`border-none font-black text-xs px-3 py-1 ${item.color}`}>
                      {item.count}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 4: Mentorship & Events */}
        <TabsContent value="mentorship" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white border border-slate-100 shadow-sm rounded-2xl text-center">
              <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Events Conducted</span>
              <span className="text-2xl font-black text-slate-800 block">{eventsConducted}</span>
            </div>
            <div className="p-5 bg-white border border-slate-100 shadow-sm rounded-2xl text-center">
              <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Total Registrations</span>
              <span className="text-2xl font-black text-blue-600 block">{totalParticipants}</span>
            </div>
            <div className="p-5 bg-white border border-slate-100 shadow-sm rounded-2xl text-center">
              <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Startups Reached</span>
              <span className="text-2xl font-black text-indigo-600 block">{startupsParticipated}</span>
            </div>
            <div className="p-5 bg-white border border-slate-100 shadow-sm rounded-2xl text-center">
              <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Pending Sessions</span>
              <span className="text-2xl font-black text-orange-600 block">{pendingSessions}</span>
            </div>
          </div>

          <Card className="border-none shadow-sm ring-1 ring-slate-100 rounded-[2rem] bg-white overflow-hidden">
            <CardHeader className="p-6 border-b bg-slate-50/20">
              <CardTitle className="text-base font-black text-slate-900">Conduct Event Checklists</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recent announced portal events & registry counts</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {events.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-xs italic font-bold">No events created.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold text-[10px] uppercase text-slate-400">Event Title</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase text-slate-400">Target Audience</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase text-slate-400">Format</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase text-slate-400 text-center">Registrations</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase text-slate-400 text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.slice(0, 5).map((evt) => (
                      <TableRow key={evt.id}>
                        <TableCell className="font-black text-xs text-slate-800">{evt.title}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {evt.targetAudience?.map(aud => (
                              <Badge key={aud} variant="outline" className="text-[8px] font-black uppercase bg-slate-50 px-1">{aud}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">{evt.mode} ({evt.date})</TableCell>
                        <TableCell className="text-center font-bold text-xs text-slate-700">{evt.registeredUsers?.length || 0}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={`border-none font-bold uppercase text-[9px] ${
                            evt.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {evt.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
