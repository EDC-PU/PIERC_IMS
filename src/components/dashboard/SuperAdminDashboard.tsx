'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ref, onValue } from 'firebase/database';
import { rtdb as db } from '@/lib/firebase';
import { Application, UserProfile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  Rocket,
  BarChart3,
  Shield,
  Activity,
  ArrowUpRight,
  TrendingUp,
  Briefcase,
  Layers
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format } from 'date-fns';

interface SuperAdminDashboardProps {
  user: UserProfile;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#f97316'];

export default function SuperAdminDashboard({ user }: SuperAdminDashboardProps) {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const appsRef = ref(db, 'applications');
    return onValue(appsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const appsList = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setApplications(appsList);
      }
      setLoading(false);
    });
  }, []);

  // Calculate Sector Data
  const sectorCounts: Record<string, number> = {};
  applications.forEach(app => {
    const sector = app.data?.sector || 'Other';
    sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
  });

  const sectorData = Object.keys(sectorCounts).map(name => ({
    name,
    value: Math.round((sectorCounts[name] / (applications.length || 1)) * 100)
  })).sort((a, b) => b.value - a.value).slice(0, 5);

  // Group applications by month of submission (last 6 months)
  const monthlyData: Record<string, number> = {};
  applications.forEach(app => {
    if (app.submittedAt) {
      const month = format(new Date(app.submittedAt), 'MMM');
      monthlyData[month] = (monthlyData[month] || 0) + 1;
    }
  });

  const monthsOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonthIdx = new Date().getMonth();
  const recentMonths = [];
  for (let i = 5; i >= 0; i--) {
    const idx = (currentMonthIdx - i + 12) % 12;
    recentMonths.push(monthsOrder[idx]);
  }

  const growthData = recentMonths.map(month => ({
    month,
    apps: monthlyData[month] || 0
  }));

  // Compile logs from timeline history across all applications
  const allLogs: any[] = [];
  applications.forEach(app => {
    if (app.timeline) {
      app.timeline.forEach(event => {
        allLogs.push({
          event: event.status,
          details: event.remarks || `Status updated to ${event.status}`,
          time: event.timestamp,
          appName: app.data?.startupTitle || app.programmeTitle || 'Startup'
        });
      });
    }
  });

  const recentLogs = allLogs
    .sort((a, b) => b.time - a.time)
    .slice(0, 4)
    .map(log => {
      const diffMs = Date.now() - log.time;
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      let timeStr = 'Just now';
      if (diffHrs > 0 && diffHrs < 24) {
        timeStr = `${diffHrs} hours ago`;
      } else if (diffHrs >= 24) {
        timeStr = `${Math.floor(diffHrs / 24)} days ago`;
      } else {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        if (diffMins > 0) timeStr = `${diffMins} mins ago`;
      }

      // Choose icon based on status
      let icon = Activity;
      if (log.event === 'Submitted' || log.event === 'Revision Submitted') icon = Rocket;
      else if (log.event === 'Incubated') icon = Briefcase;
      else if (log.event.includes('Selected')) icon = Shield;

      return {
        event: log.event,
        details: `[${log.appName}] ${log.details}`,
        time: timeStr,
        icon
      };
    });

  // Default logs if none exist
  const displayLogs = recentLogs.length > 0 ? recentLogs : [
    { event: 'Ecosystem Active', details: 'PIERC Portal is live and synchronizing.', time: 'Just now', icon: Activity },
    { event: 'Ready for Submissions', details: 'Programmes are active and accepting proposals.', time: 'Just now', icon: Rocket }
  ];

  const exportAuditTrail = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(applications, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `pierc_applications_audit_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (loading) return <div className="p-8 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest">Synchronizing Ecosystem Data...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ecosystem Command Center</h1>
          <p className="text-slate-500">Global overview of PIERC incubation activities.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportAuditTrail}>Download Report</Button>
          <Button variant="default" className="bg-slate-900" onClick={() => router.push('/dashboard/manage-users')}>Configure Workflow</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 text-white border-none shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium opacity-80">Total Applications</CardTitle>
            <Rocket className="h-4 w-4 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{applications.length}</div>
            <div className="flex items-center text-xs mt-2 text-green-400">
              <TrendingUp className="w-3 h-3 mr-1" /> Live Sync
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-md border-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Active Pipeline</CardTitle>
            <Layers className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {applications.filter(a => a.status !== 'Incubated' && !a.status.includes('Rejected')).length}
            </div>
            <p className="text-xs text-slate-500 mt-2">Currently in evaluation</p>
          </CardContent>
        </Card>
        <Card className="shadow-md border-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Incubated Startups</CardTitle>
            <Briefcase className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {applications.filter(a => a.status === 'Incubated').length}
            </div>
            <p className="text-xs text-slate-500 mt-2">Successfully onboarded</p>
          </CardContent>
        </Card>
        <Card className="shadow-md border-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">System Engagement</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">94%</div>
            <p className="text-xs text-slate-500 mt-2">Platform utilization</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Growth & Funding Trends</CardTitle>
            <CardDescription>Applications vs Investment disbursement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] min-h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData}>
                  <defs>
                    <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="apps" stroke="#3b82f6" fillOpacity={1} fill="url(#colorApps)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Sector Distribution</CardTitle>
            <CardDescription>Diversity of startup ecosystem</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] min-h-[300px] w-full flex items-center justify-center">
              {sectorData.length === 0 ? (
                <div className="text-slate-400 font-bold uppercase text-xs italic">No sector data available</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sectorData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {sectorData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 ml-4">
                    {sectorData.map((sector, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                        <span className="text-xs font-medium text-slate-600">{sector.name} ({sector.value}%)</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-slate-900" />
              System Activity Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {displayLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-4 p-3 hover:bg-slate-50 rounded-lg transition-colors">
                  <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                    <log.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-bold text-slate-900">{log.event}</p>
                      <span className="text-[10px] text-slate-500 font-medium uppercase">{log.time}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{log.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900">System Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 divide-y divide-slate-100">
              <button 
                className="flex items-center justify-between p-6 hover:bg-slate-50 transition-all group w-full text-left"
                onClick={() => router.push('/dashboard/programmes')}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Rocket className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-sm">Manage Programmes</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configure Incubation Cycles</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
              </button>

              <button 
                className="flex items-center justify-between p-6 hover:bg-slate-50 transition-all group w-full text-left"
                onClick={() => router.push('/dashboard/manage-users')}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-sm">User Access Control</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manage Roles & Permissions</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
              </button>

              <button 
                className="flex items-center justify-between p-6 hover:bg-slate-50 transition-all group w-full text-left"
                onClick={() => router.push('/dashboard/settings')}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl group-hover:bg-purple-600 group-hover:text-white transition-all">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-sm">Configure Notifications</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configure Alerts & Settings</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-purple-600 transition-colors" />
              </button>

              <button 
                className="flex items-center justify-between p-6 hover:bg-slate-50 transition-all group w-full text-left"
                onClick={exportAuditTrail}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl group-hover:bg-orange-600 group-hover:text-white transition-all">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-sm">Export Audit Trail</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System-wide Activity Logs</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-orange-600 transition-colors" />
              </button>
            </div>
            <div className="p-6 bg-slate-50 border-t flex flex-col items-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">PIERC</p>
              <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-1">v2.4.0-STABLE • 2026</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
