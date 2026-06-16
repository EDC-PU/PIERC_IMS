'use client';

import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { Application } from '@/types';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Eye, Clock, CheckCircle2, XCircle, Search, Rocket, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

export default function ApplicationsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRangeOption, setDateRangeOption] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Mentors do not have access to the applications list
  useEffect(() => {
    if (user && user.role === 'mentor') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'mentor') return;

    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    const appsRef = ref(db, 'applications');
    const unsubscribe = onValue(appsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const allApps = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val
        })) as Application[];

        const filteredApps = isAdmin
          ? allApps
          : allApps.filter(app => app.userId === user.uid);

        setApplications(filteredApps.sort((a, b) => b.submittedAt - a.submittedAt));
      } else {
        setApplications([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Submitted': return <Badge variant="secondary">Submitted</Badge>;
      case 'Under Review': return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Under Review</Badge>;
      case 'Phase 1 Evaluation': return <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">Phase 1</Badge>;
      case 'Phase 2 Evaluation': return <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">Phase 2</Badge>;
      case 'Phase 2 Selected': return <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Phase 2 Selected</Badge>;
      case 'Cohort Selected': return <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">Cohort Selected</Badge>;
      case 'Incubated': return <Badge variant="default" className="bg-green-600">Incubated</Badge>;
      case 'Rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const filteredApplications = applications.filter(app => {
    const query = searchQuery.toLowerCase();
    const startupName = (app.data?.startupTitle || '').toLowerCase();
    const applicantName = (app.userName || '').toLowerCase();
    const email = (app.userEmail || '').toLowerCase();

    // Check team members
    const teamMembers = app.data?.teamMembers || [];
    const matchesTeam = Array.isArray(teamMembers) && teamMembers.some((m: any) =>
      (m.name || '').toLowerCase().includes(query) ||
      (m.email || '').toLowerCase().includes(query)
    );

    const matchesSearch = startupName.includes(query) ||
      applicantName.includes(query) ||
      email.includes(query) ||
      matchesTeam;

    if (!matchesSearch) return false;

    // Date Filtering Logic
    const now = new Date();
    if (dateRangeOption === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      return app.submittedAt >= todayStart;
    }

    if (dateRangeOption === 'week') {
      const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      return app.submittedAt >= sevenDaysAgo;
    }

    if (dateRangeOption === 'month') {
      const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
      return app.submittedAt >= thirtyDaysAgo;
    }

    if (dateRangeOption === 'three_months') {
      const ninetyDaysAgo = now.getTime() - 90 * 24 * 60 * 60 * 1000;
      return app.submittedAt >= ninetyDaysAgo;
    }

    if (dateRangeOption === 'custom') {
      if (customStartDate) {
        const startTimestamp = new Date(customStartDate).getTime();
        if (app.submittedAt < startTimestamp) return false;
      }
      if (customEndDate) {
        const endDateObj = new Date(customEndDate);
        endDateObj.setHours(23, 59, 59, 999);
        const endTimestamp = endDateObj.getTime();
        if (app.submittedAt > endTimestamp) return false;
      }
    }

    return true;
  });

  if (loading) {
    return <div className="p-8 text-center">Loading applications...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{isAdmin ? 'All Applications' : 'My Applications'}</h1>
          <p className="text-slate-500">{isAdmin ? 'Review and manage all programme submissions.' : 'Track the status of your programme applications.'}</p>
        </div>
        {!isAdmin && (
          <Button asChild>
            <Link href="/dashboard/programmes">Apply for Programme</Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by startup, applicant, team members, or email..."
            className="pl-12 rounded-2xl h-14 border-slate-200 bg-white shadow-sm focus:ring-primary/10 transition-all text-sm font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="relative">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 pointer-events-none" />
          <Select value={dateRangeOption} onValueChange={(val) => setDateRangeOption(val || 'all')}>
            <SelectTrigger className="w-full h-14 pl-12 rounded-2xl border-slate-200 bg-white shadow-sm font-bold text-sm text-slate-700 focus:ring-primary/10">
              <SelectValue placeholder="Filter by Date" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl shadow-xl border-none ring-1 ring-slate-100 bg-white p-1">
              <SelectItem value="all" className="cursor-pointer hover:bg-slate-50 font-bold rounded-xl py-2 px-3">All Dates</SelectItem>
              <SelectItem value="today" className="cursor-pointer hover:bg-slate-50 font-bold rounded-xl py-2 px-3">Today</SelectItem>
              <SelectItem value="week" className="cursor-pointer hover:bg-slate-50 font-bold rounded-xl py-2 px-3">This Week</SelectItem>
              <SelectItem value="month" className="cursor-pointer hover:bg-slate-50 font-bold rounded-xl py-2 px-3">This Month</SelectItem>
              <SelectItem value="three_months" className="cursor-pointer hover:bg-slate-50 font-bold rounded-xl py-2 px-3">Last 3 Months</SelectItem>
              <SelectItem value="custom" className="cursor-pointer hover:bg-slate-50 font-bold rounded-xl py-2 px-3">Custom Range...</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {dateRangeOption === 'custom' && (
        <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-200/60 flex flex-wrap items-center gap-6 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black tracking-widest text-slate-400">Start Date:</span>
            <input
              type="date"
              className="rounded-xl h-11 border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black tracking-widest text-slate-400">End Date:</span>
            <input
              type="date"
              className="rounded-xl h-11 border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-lg text-[10px] font-black tracking-widest text-slate-500 hover:bg-slate-100 ml-auto h-9"
            onClick={() => {
              setCustomStartDate('');
              setCustomEndDate('');
            }}
          >
            Clear Dates
          </Button>
        </div>
      )}

      {filteredApplications.length === 0 ? (
        <Card className="p-12 text-center border-dashed rounded-[2rem] bg-slate-50/50">
          <CardContent className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-white rounded-3xl shadow-sm flex items-center justify-center text-slate-300">
              <Search className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-xl text-slate-900 tracking-tight">No matching results</h3>
              <p className="text-slate-500 max-w-sm mx-auto font-medium">
                We couldn't find any applications matching "<strong>{searchQuery}</strong>". Try adjusting your search criteria.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-[2rem] overflow-hidden">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-slate-100">
                  <TableHead className="py-6 px-8 text-[10px] font-black tracking-widest text-slate-500">Innovation / Project</TableHead>
                  {isAdmin && <TableHead className="py-6 text-[10px] font-black tracking-widest text-slate-500">Applicant Details</TableHead>}
                  <TableHead className="py-6 text-[10px] font-black tracking-widest text-slate-500">Timeline</TableHead>
                  <TableHead className="py-6 text-[10px] font-black tracking-widest text-slate-500">Status</TableHead>
                  <TableHead className="py-6 text-right pr-8 text-[10px] font-black tracking-widest text-slate-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.map((app) => (
                  <TableRow key={app.id} className="border-slate-50 hover:bg-slate-50/30 transition-all duration-300">
                    <TableCell className="py-6 px-8 max-w-[220px] md:max-w-[320px] whitespace-normal break-words">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-primary group-hover:text-white transition-colors">
                          <Rocket className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 leading-tight tracking-tight break-words whitespace-normal">{app.data?.startupTitle || app.programmeTitle}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 tracking-widest">{app.id.substring(0, 8)}</p>
                        </div>
                      </div>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="py-6 max-w-[200px] whitespace-normal break-words">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 text-xs tracking-tight break-words whitespace-normal">{app.userName}</span>
                          <span className="text-[10px] text-slate-400 font-black tracking-widest mt-0.5 break-all whitespace-normal">{app.userEmail}</span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="py-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-700 tracking-tight">{format(app.submittedAt, 'MMM dd, yyyy')}</span>
                        <span className="text-[10px] font-bold text-slate-400 mt-0.5 tracking-widest">Submitted</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-6">{getStatusBadge(app.status)}</TableCell>
                    <TableCell className="text-right pr-8 py-6">
                      <Button variant="outline" size="sm" asChild className="rounded-xl font-bold h-9 border-primary/10 text-primary hover:bg-primary hover:text-white transition-all">
                        <Link href={`/dashboard/applications/${app.id}`}>
                          <Eye className="mr-2 h-4 w-4" /> View Details
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
