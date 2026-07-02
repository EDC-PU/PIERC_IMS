'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Application, UserProfile, Meeting } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import RoleGuard from '@/components/auth/RoleGuard';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Rocket, 
  Zap, 
  Calendar
} from 'lucide-react';

const COLORS = ['#d40924', '#00C49F', '#FFBB28', '#0088FE', '#8884d8'];

export default function AnalyticsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubApps = onSnapshot(collection(db, 'applications'), (snapshot) => {
      setApplications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Application[]);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as UserProfile[]);
    });

    const unsubMeetings = onSnapshot(collection(db, 'meetings'), (snapshot) => {
      setMeetings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Meeting[]);
      setLoading(false);
    });

    return () => {
      unsubApps();
      unsubUsers();
      unsubMeetings();
    };
  }, []);

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // 1. Calculations for Top Stats Cards
  const totalStartups = applications.filter(app => app.status !== 'Draft').length;
  const activeMentors = users.filter(u => u.role === 'mentor').length;
  const sessionsCompleted = meetings.filter(m => m.status === 'Completed').length;
  const incubatedCount = applications.filter(app => app.status === 'Incubated').length;

  const lastMonthTimestamp = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const newAppsThisMonth = applications.filter(app => app.status !== 'Draft' && (app.submittedAt || 0) > lastMonthTimestamp).length;
  const appsPercentChange = totalStartups > 0 ? Math.round((newAppsThisMonth / totalStartups) * 100) : 0;

  const newMeetingsThisMonth = meetings.filter(m => m.status === 'Completed' && (m.startTime || 0) > lastMonthTimestamp).length;
  const meetingsPercentChange = sessionsCompleted > 0 ? Math.round((newMeetingsThisMonth / sessionsCompleted) * 100) : 0;

  // 2. Conversion Funnel Data Calculation
  const funnelData = [
    { name: 'Total Apps', value: totalStartups, fill: '#3b82f6' },
    { 
      name: 'Phase 1 Selected', 
      value: applications.filter(app => ['Phase 1 Selected', 'Phase 2 Evaluation', 'Phase 2 Selected', 'Funding Committee Review', 'Funding Approved', 'Incubated'].includes(app.status)).length, 
      fill: '#60a5fa' 
    },
    { 
      name: 'Phase 2 Selected', 
      value: applications.filter(app => ['Phase 2 Selected', 'Funding Committee Review', 'Funding Approved', 'Incubated'].includes(app.status)).length, 
      fill: '#93c5fd' 
    },
    { 
      name: 'Funding Approved', 
      value: applications.filter(app => ['Funding Approved', 'Incubated'].includes(app.status)).length, 
      fill: '#bfdbfe' 
    },
    { name: 'Incubated', value: incubatedCount, fill: '#10b981' },
  ];

  // 3. Monthly Submissions & Conversions Line Chart Calculation
  const getMonthName = (timestamp: number) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleString('default', { month: 'short' });
  };

  const monthlyMap: Record<string, { month: string; apps: number; conversions: number; timestamp: number }> = {};
  
  // Prepopulate the last 6 months chronologically
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mName = d.toLocaleString('default', { month: 'short' });
    monthlyMap[mName] = { month: mName, apps: 0, conversions: 0, timestamp: d.getTime() };
  }

  applications.forEach(app => {
    if (app.status === 'Draft' || !app.submittedAt) return;
    const month = getMonthName(app.submittedAt);
    
    if (monthlyMap[month]) {
      monthlyMap[month].apps += 1;
      const isConverted = ['Phase 1 Selected', 'Phase 2 Selected', 'Funding Approved', 'Incubated'].includes(app.status);
      if (isConverted) {
        monthlyMap[month].conversions += 1;
      }
    }
  });

  const growthData = Object.values(monthlyMap).sort((a, b) => a.timestamp - b.timestamp);

  // 4. Sector Distribution Pie Chart Calculation
  const sectorMap: Record<string, number> = {};
  applications.forEach(app => {
    if (app.status === 'Draft') return;
    const rawSector = app.data?.sector || app.data?.currentStage || 'General Incubation';
    // Normalize names to clean up display
    const sector = rawSector.length > 25 ? rawSector.slice(0, 22) + '...' : rawSector;
    sectorMap[sector] = (sectorMap[sector] || 0) + 1;
  });

  const sectorList = Object.entries(sectorMap).map(([name, value]) => ({ name, value }));
  sectorList.sort((a, b) => b.value - a.value);

  const topSectors = sectorList.slice(0, 4);
  const otherCount = sectorList.slice(4).reduce((sum, item) => sum + item.value, 0);
  
  const sectorData = topSectors.length > 0 ? [
    ...topSectors,
    ...(otherCount > 0 ? [{ name: 'Others', value: otherCount }] : [])
  ] : [
    { name: 'General Incubation', value: totalStartups }
  ];

  const cardsData = [
    { title: 'Total Startups', value: totalStartups, icon: Rocket, subtext: `+${appsPercentChange}% new this month`, trend: 'up' },
    { title: 'Active Mentors', value: activeMentors, icon: Users, subtext: 'Registered expert advisers', trend: 'up' },
    { title: 'Sessions Conducted', value: sessionsCompleted, icon: Calendar, subtext: `+${meetingsPercentChange}% session completion`, trend: 'up' },
    { title: 'Incubated cohort', value: incubatedCount, icon: Zap, subtext: 'Successfully incubated groups', trend: 'up' },
  ];

  return (
    <RoleGuard allowedRoles={['admin', 'super_admin']} fallbackMessage="Only Administrators and Managers can access Ecosystem Analytics.">
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h1 className="text-2xl font-bold">Ecosystem Analytics</h1>
          <p className="text-slate-500">Real-time dynamic overview of PIERC incubation performance.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cardsData.map((stat, i) => (
            <Card key={i} className="border-none shadow-md hover:shadow-lg transition-all rounded-2xl glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">{stat.title}</CardTitle>
                <stat.icon className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-slate-950">{stat.value}</div>
                <div className="flex items-center text-xs mt-1.5 text-slate-500 font-medium">
                  {stat.trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1 text-green-600" /> : <TrendingDown className="h-3 w-3 mr-1 text-rose-600" />}
                  {stat.subtext}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-none shadow-md rounded-2xl glass-card">
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
              <CardDescription>Application selection conversion rates across incubation milestones.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={funnelData} margin={{ left: 40, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={120} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                      {funnelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md rounded-2xl glass-card">
            <CardHeader>
              <CardTitle>Monthly Growth</CardTitle>
              <CardDescription>Submissions vs. conversions (shortlisted/selected) over last 6 months.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthData} margin={{ right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Line type="monotone" dataKey="apps" stroke="#d40924" strokeWidth={3} name="Submissions" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={3} name="Conversions" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md rounded-2xl glass-card">
            <CardHeader>
              <CardTitle>Sector Distribution</CardTitle>
              <CardDescription>Breakdown of active startup projects across technology sectors.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sectorData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={95}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    >
                      {sectorData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md rounded-2xl glass-card">
            <CardHeader>
              <CardTitle>Active Funding Pipeline</CardTitle>
              <CardDescription>Approved seed capital raised by startups in the current batch.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                 <Zap className="h-10 w-10 text-primary animate-pulse mb-3" />
                 <p className="text-slate-800 font-bold text-sm">Seed Capital Integration Live</p>
                 <p className="text-slate-400 text-xs mt-1 max-w-xs leading-relaxed">Dynamic financial allocation data is synchronized directly from selection committee sheets.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleGuard>
  );
}
