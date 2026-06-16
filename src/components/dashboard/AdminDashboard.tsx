'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Application, UserProfile, Meeting } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  FileCheck,
  AlertCircle,
  BarChart,
  Filter,
  Plus
} from 'lucide-react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { format } from 'date-fns';

interface AdminDashboardProps {
  user: UserProfile;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316'];

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [evaluationsCount, setEvaluationsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch applications
    const appsRef = ref(db, 'applications');
    const unsubscribeApps = onValue(appsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const appsList = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val
        })) as Application[];
        setApplications(appsList);
      } else {
        setApplications([]);
      }
    });

    // 2. Fetch meetings
    const meetingsRef = ref(db, 'meetings');
    const unsubscribeMeetings = onValue(meetingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.values(data) as Meeting[];
        setMeetings(list);
      } else {
        setMeetings([]);
      }
    });

    // 3. Fetch evaluations
    const evalRef = ref(db, 'evaluations');
    const unsubscribeEvals = onValue(evalRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let count = 0;
        Object.values(data).forEach((appEvals: any) => {
          Object.values(appEvals).forEach((phaseEvals: any) => {
            count += Object.keys(phaseEvals).length;
          });
        });
        setEvaluationsCount(count);
      } else {
        setEvaluationsCount(0);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeApps();
      unsubscribeMeetings();
      unsubscribeEvals();
    };
  }, []);

  const totalApps = applications.length;

  const pendingApps = applications.filter(a =>
    a.status === 'Submitted' ||
    a.status === 'Under Review' ||
    a.status === 'Revision Submitted' ||
    a.status === 'Phase 1 Evaluation' ||
    a.status === 'Phase 2 Evaluation'
  );

  const pendingCount = pendingApps.length;

  const incubatedCount = applications.filter(a => a.status === 'Incubated').length;
  const conversionRate = totalApps > 0 ? ((incubatedCount / totalApps) * 100).toFixed(1) : '0';

  // Group applications by programmeTitle
  const programmeCounts: Record<string, number> = {};
  applications.forEach(app => {
    const title = app.programmeTitle || 'Unknown Programme';
    programmeCounts[title] = (programmeCounts[title] || 0) + 1;
  });

  const programmeData = Object.entries(programmeCounts).map(([name, value]) => ({
    name: name.length > 15 ? name.substring(0, 15) + '...' : name,
    fullName: name,
    value
  }));

  // Get top 4 pending evaluations
  const recentPending = [...pendingApps]
    .sort((a, b) => b.submittedAt - a.submittedAt)
    .slice(0, 4);

  if (loading) {
    return <div className="p-8 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest">Synchronizing dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Programme Manager Overview</h1>
          <p className="text-slate-500">Managing assigned programmes and applications.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/applications')}>
            <Filter className="mr-2 h-4 w-4" /> Filter Applications
          </Button>
          <Button onClick={() => router.push('/dashboard/programmes')}>
            <Plus className="mr-2 h-4 w-4" /> New Programme
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalApps}</div>
            <p className="text-xs text-green-600 mt-1">Live from database</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-slate-500 mt-1">Require assessment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Evaluations Done</CardTitle>
            <FileCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{evaluationsCount}</div>
            <p className="text-xs text-slate-500 mt-1">Across all phases</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <BarChart className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate}%</div>
            <p className="text-xs text-slate-500 mt-1">Incubated / Total</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Applications by Programme</CardTitle>
            <CardDescription>Distribution across current offerings</CardDescription>
          </CardHeader>
          <CardContent>
            {programmeData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-slate-400 font-bold uppercase text-xs">
                No application distribution data
              </div>
            ) : (
              <div className="h-[300px] min-h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={programmeData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value, name, props) => [value, props.payload.fullName]} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {programmeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Evaluations</CardTitle>
            <CardDescription>Startups waiting for phase assessment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPending.length === 0 ? (
                <div className="p-10 text-center text-slate-400 font-bold uppercase text-xs italic">
                  No pending evaluations
                </div>
              ) : (
                recentPending.map((startup) => (
                  <div key={startup.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-sm font-bold">{startup.data?.startupName || startup.data?.startupTitle || startup.programmeTitle}</p>
                      <p className="text-xs text-slate-500">Submitted {format(new Date(startup.submittedAt), 'MMM dd, yyyy')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                        {startup.status}
                      </span>
                      <Button size="sm" variant="ghost" onClick={() => router.push(`/dashboard/applications/${startup.id}`)}>
                        Review
                      </Button>
                    </div>
                  </div>
                ))
              )}
              <Button variant="link" className="w-full text-primary" onClick={() => router.push('/dashboard/applications')}>
                View All Pending Applications
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
