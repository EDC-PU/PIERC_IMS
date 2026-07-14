'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile, Meeting, Application } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import EventsWidget from './EventsWidget';
import { 
  Users, 
  Calendar, 
  MessageSquare, 
  ChevronRight,
  TrendingUp,
  Clock,
  Star
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface MentorDashboardProps {
  user: UserProfile;
}

export default function MentorDashboard({ user }: MentorDashboardProps) {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch applications
    const appsCol = collection(db, 'applications');
    const unsubscribeApps = onSnapshot(appsCol, (snapshot) => {
      const appsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Application[];
      setApplications(appsList);
    });

    // 2. Fetch meetings
    const meetingsCol = collection(db, 'meetings');
    const unsubscribeMeetings = onSnapshot(meetingsCol, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Meeting[];
      setMeetings(list);
      setLoading(false);
    });

    return () => {
      unsubscribeApps();
      unsubscribeMeetings();
    };
  }, []);

  // Filter assigned startups
  const assignedApps = applications.filter(app => app.mentorId === user.uid);
  const totalStartups = assignedApps.length;

  // Filter upcoming sessions for the mentor
  const upcomingMeetings = meetings
    .filter(m => m.attendees?.includes(user.uid) && m.startTime > Date.now() && m.status === 'Scheduled')
    .sort((a, b) => a.startTime - b.startTime);
  
  const upcomingCount = upcomingMeetings.length;

  // Find last meeting for a given application ID
  const getLastMeetingTime = (appId: string) => {
    const appMeetings = meetings.filter(m => m.applicationId === appId && m.status === 'Completed' && m.startTime < Date.now());
    if (appMeetings.length === 0) return 'Never met';
    const sorted = appMeetings.sort((a, b) => b.startTime - a.startTime);
    const diffMs = Date.now() - sorted[0].startTime;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return format(new Date(sorted[0].startTime), 'MMM dd, yyyy');
  };

  if (loading) {
    return <div className="p-8 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest">Synchronizing dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mentor Dashboard</h1>
          <p className="text-slate-500">Welcome back, {user.displayName}. Here's your mentorship overview.</p>
        </div>
        <Button onClick={() => router.push('/dashboard/meetings')}>
          <Calendar className="mr-2 h-4 w-4" /> Schedule Session
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Assigned Startups</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStartups}</div>
            <p className="text-xs text-slate-500 mt-1">Actively mentoring</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Sessions</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingCount}</div>
            <p className="text-xs text-slate-500 mt-1">Scheduled in calendar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Feedback Rate</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">100%</div>
            <p className="text-xs text-green-600 mt-1">All sessions documented</p>
          </CardContent>
        </Card>
      </div>
      
      <EventsWidget user={user} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Assigned Startups</CardTitle>
            <CardDescription>Startups you are currently mentoring</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assignedApps.length === 0 ? (
                <div className="p-10 text-center text-slate-400 font-bold uppercase text-xs italic">
                  No assigned startups
                </div>
              ) : (
                assignedApps.map((startup) => (
                  <div key={startup.id} className="flex items-center justify-between p-4 bg-white border rounded-xl hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold">
                        {(startup.data?.startupName || startup.data?.startupTitle || startup.programmeTitle || 'S').charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold">{startup.data?.startupName || startup.data?.startupTitle || startup.programmeTitle}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                            {startup.data?.sector || 'General'}
                          </Badge>
                          <span className="text-xs text-slate-500">{startup.data?.currentStage || 'Incubating'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-xs text-slate-500 italic">Last met: {getLastMeetingTime(startup.id)}</p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-1 text-primary hover:text-primary-focus"
                        onClick={() => router.push(`/dashboard/applications/${startup.id}`)}
                      >
                        View Details <ChevronRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
          <CardFooter className="justify-center border-t py-3">
            <Button variant="link" className="text-primary font-bold" onClick={() => router.push('/dashboard/applications')}>
              View All Startups
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Sessions</CardTitle>
            <CardDescription>Mentorship calendar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingMeetings.length === 0 ? (
                <div className="p-10 text-center text-slate-400 font-bold uppercase text-xs italic">
                  No upcoming sessions
                </div>
              ) : (
                upcomingMeetings.map((session) => {
                  const startup = applications.find(a => a.id === session.applicationId);
                  const startupName = startup?.data?.startupName || startup?.data?.startupTitle || startup?.programmeTitle || 'Startup';
                  return (
                    <div key={session.id} className="flex flex-col p-3 bg-slate-50 rounded-lg border-l-4 border-primary">
                      <p className="text-sm font-bold">{startupName}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-slate-500 flex items-center">
                          <Clock className="w-3 h-3 mr-1" /> {format(new Date(session.startTime), 'MMM dd • hh:mm a')}
                        </p>
                        <Badge variant="secondary" className="text-[10px]">{session.mode}</Badge>
                      </div>
                    </div>
                  );
                })
              )}
              <Button className="w-full mt-4" variant="outline" onClick={() => router.push('/dashboard/meetings')}>
                <Calendar className="mr-2 h-4 w-4" /> View Full Calendar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle>Mentorship Progress Reports</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
              <h3 className="font-bold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Traction Tracking
              </h3>
              <p className="text-sm text-slate-600 mt-2">
                Monitor the month-on-month growth of your assigned startups and submit quarterly feedback.
              </p>
              <Button className="mt-4 w-full" variant="secondary" onClick={() => router.push('/dashboard/applications')}>
                View Assigned Startups
              </Button>
            </div>
            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
              <h3 className="font-bold flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600" /> Pending Feedback
              </h3>
              <p className="text-sm text-slate-600 mt-2">
                Evaluate scheduled and past incubation presentations for all applications.
              </p>
              <Button className="mt-4 w-full" variant="outline" onClick={() => router.push('/dashboard/evaluate')}>
                Go to Evaluation Hub
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
