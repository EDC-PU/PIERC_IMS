'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ref, onValue, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Application, UserRole } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  Clock, 
  FileText, 
  Calendar, 
  MessageCircle,
  MoreVertical,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ApplicationDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuthStore();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const appRef = ref(db, `applications/${id}`);
    const unsubscribe = onValue(appRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setApplication(data);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  const updateStatus = async (newStatus: string) => {
    if (!application || !user || user.role === 'user') return;

    try {
      const updates: any = {
        status: newStatus,
        updatedAt: Date.now(),
      };

      // Add to timeline
      const newTimeline = [
        ...(application as any).timeline || [],
        { 
          status: newStatus, 
          timestamp: Date.now(), 
          remarks: `Status updated to ${newStatus} by ${user.displayName}` 
        }
      ];
      updates.timeline = newTimeline;

      await update(ref(db, `applications/${id}`), updates);
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!application) return <div className="p-8 text-center text-red-500">Application not found</div>;

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl font-bold">{application.programmeTitle}</h1>
            <Badge variant="outline">{application.status}</Badge>
          </div>
          <p className="text-slate-500">Application ID: {application.id}</p>
        </div>
        
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => updateStatus('Phase 1 Evaluation')}>
              Move to Phase 1
            </Button>
            <Button onClick={() => updateStatus('Phase 2 Evaluation')}>
              Move to Phase 2
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Startup Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-500">Startup Name</p>
                <p className="font-medium">{(application.data as any).startupName}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Industry</p>
                <p className="font-medium capitalize">{(application.data as any).industry}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Current Stage</p>
                <p className="font-medium capitalize">{(application.data as any).stage.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Team Size</p>
                <p className="font-medium">{(application.data as any).teamSize}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-slate-500">Problem Statement</p>
                <p className="text-sm mt-1">{(application.data as any).problemStatement}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-slate-500">Solution</p>
                <p className="text-sm mt-1">{(application.data as any).solution}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'Pitch Deck', type: 'PDF', icon: FileText },
                  { name: 'Business Plan', type: 'PDF', icon: FileText },
                  { name: 'Incorporation Certificate', type: 'PDF', icon: FileText },
                ].map((doc, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded">
                        <doc.icon className="h-4 w-4 text-slate-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{doc.name}</p>
                        <p className="text-xs text-slate-500">{doc.type}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">Download</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
              <CardDescription>History of your application status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-6 pl-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                {((application as any).timeline || []).map((event: any, i: number) => (
                  <div key={i} className="relative">
                    <div className={cn(
                      "absolute -left-[30px] top-1 h-5 w-5 rounded-full border-4 border-white flex items-center justify-center",
                      i === 0 ? "bg-primary" : "bg-slate-300"
                    )} />
                    <div>
                      <p className="text-sm font-bold">{event.status}</p>
                      <p className="text-xs text-slate-500">{format(event.timestamp, 'MMM dd, yyyy HH:mm')}</p>
                      <p className="text-xs text-slate-600 mt-1">{event.remarks}</p>
                    </div>
                  </div>
                )).reverse()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 bg-blue-100 p-1.5 rounded-full text-blue-600">
                  <Calendar className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Evaluation Meeting</p>
                  <p className="text-xs text-slate-500">Will be scheduled after initial review.</p>
                </div>
              </div>
              <Button variant="outline" className="w-full">
                <MessageCircle className="mr-2 h-4 w-4" /> Message Manager
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
