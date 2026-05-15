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
import { Eye, Clock, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function ApplicationsPage() {
  const { user } = useAuthStore();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const appsRef = ref(db, 'applications');
    const unsubscribe = onValue(appsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const userApps = Object.values(data).filter(
          (app: any) => app.userId === user.uid
        ) as Application[];
        setApplications(userApps.sort((a, b) => b.submittedAt - a.submittedAt));
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
      case 'Incubated': return <Badge variant="default" className="bg-green-600">Incubated</Badge>;
      case 'Rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading applications...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">My Applications</h1>
          <p className="text-slate-500">Track the status of your programme applications.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/programmes">Apply for Programme</Link>
        </Button>
      </div>

      {applications.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <CardContent className="space-y-4">
            <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
              <Clock className="h-6 w-6 text-slate-400" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">No applications found</h3>
              <p className="text-slate-500 max-w-sm mx-auto">
                You haven't applied to any programmes yet. Explore available programmes and start your journey with PIERC.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard/programmes">Browse Programmes</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Programme</TableHead>
                <TableHead>Date Submitted</TableHead>
                <TableHead>Current Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.programmeTitle}</TableCell>
                  <TableCell>{format(app.submittedAt, 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{getStatusBadge(app.status)}</TableCell>
                  <TableCell>{format(app.updatedAt, 'MMM dd, yyyy')}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
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
