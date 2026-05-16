'use client';

import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { Application } from '@/types';
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
import { Eye, Clock, CheckCircle2, XCircle, Search, Rocket } from 'lucide-react';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

export default function ApplicationsPage() {
  const { user } = useAuthStore();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) return;

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

    return startupName.includes(query) || 
           applicantName.includes(query) || 
           email.includes(query) || 
           matchesTeam;
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

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input 
          placeholder="Search by startup, applicant, team members, or email..." 
          className="pl-12 rounded-2xl h-14 border-slate-200 bg-white shadow-sm focus:ring-primary/10 transition-all text-sm font-medium"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredApplications.length === 0 ? (
        <Card className="p-12 text-center border-dashed rounded-[2rem] bg-slate-50/50">
          <CardContent className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-white rounded-3xl shadow-sm flex items-center justify-center text-slate-300">
              <Search className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-xl text-slate-900 uppercase tracking-tight">No matching results</h3>
              <p className="text-slate-500 max-w-sm mx-auto font-medium">
                We couldn't find any applications matching "<strong>{searchQuery}</strong>". Try adjusting your search criteria.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-[2rem] overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-100">
                <TableHead className="py-6 px-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Innovation / Project</TableHead>
                {isAdmin && <TableHead className="py-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Applicant Details</TableHead>}
                <TableHead className="py-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Timeline</TableHead>
                <TableHead className="py-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</TableHead>
                <TableHead className="py-6 text-right pr-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApplications.map((app) => (
                <TableRow key={app.id} className="border-slate-50 hover:bg-slate-50/30 transition-all duration-300">
                  <TableCell className="py-6 px-8">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-primary group-hover:text-white transition-colors">
                        <Rocket className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 leading-tight uppercase tracking-tight">{app.data?.startupTitle || app.programmeTitle}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{app.id.substring(0, 8)}</p>
                      </div>
                    </div>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="py-6">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 text-xs uppercase tracking-tight">{app.userName}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-0.5">{app.userEmail}</span>
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="py-6">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{format(app.submittedAt, 'MMM dd, yyyy')}</span>
                      <span className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">Submitted</span>
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
        </Card>
      )}
    </div>
  );
}
