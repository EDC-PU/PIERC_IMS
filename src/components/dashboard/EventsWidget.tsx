'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { UserProfile, PortalEvent, Application } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Calendar, Clock, MapPin, Video, CheckCircle2, UserCheck, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface EventsWidgetProps {
  user: UserProfile;
}

export default function EventsWidget({ user }: EventsWidgetProps) {
  const [events, setEvents] = useState<PortalEvent[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [registeringId, setRegisteringId] = useState<string | null>(null);

  useEffect(() => {
    // 1. Listen to events collection
    const eventsCol = collection(db, 'events');
    const unsubEvents = onSnapshot(eventsCol, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PortalEvent[];
      // Sort upcoming events first (soonest first)
      list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setEvents(list);
    }, (error) => {
      console.error('Error loading events:', error);
    });

    // 2. Listen to applications collection (to resolve cohort memberships)
    const appsCol = collection(db, 'applications');
    const unsubApps = onSnapshot(appsCol, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Application[];
      setApplications(list);
      setLoading(false);
    }, (error) => {
      console.error('Error loading applications:', error);
      setLoading(false);
    });

    return () => {
      unsubEvents();
      unsubApps();
    };
  }, []);

  // Filter applications connected to the logged-in user (as owner or team member)
  const userApps = applications.filter(app => {
    const isOwner = app.userId === user.uid || app.userEmail?.toLowerCase() === user.email?.toLowerCase();
    const isTeamMember = Array.isArray(app.data?.teamMembers) && 
      app.data.teamMembers.some((m: any) => m.email?.toLowerCase() === user.email?.toLowerCase());
    return isOwner || isTeamMember;
  });

  const userCohortIds = userApps.map(app => app.cohortId).filter(Boolean) as string[];

  const userLeaderCohortIds = applications
    .filter(app => app.userId === user.uid || app.userEmail?.toLowerCase() === user.email?.toLowerCase())
    .map(app => app.cohortId)
    .filter(Boolean) as string[];

  // Filter events based on targetAudience rules
  const visibleEvents = events.filter(event => {
    // Only show published events on dashboards
    if (event.status !== 'published') {
      return false;
    }

    // Admins and super_admins see all events they created or system-wide
    if (user.role === 'admin' || user.role === 'super_admin') {
      return true;
    }

    const isStaff = user.category === 'PU Staff member' || user.email?.toLowerCase().endsWith('@paruluniversity.ac.in');
    const isStudent = user.category === 'PU Student';

    const audienceList = Array.isArray(event.targetAudience) ? event.targetAudience : [event.targetAudience];

    return audienceList.some(audience => {
      switch (audience) {
        case 'all_users':
          return true;
        case 'pu_staff':
          return isStaff;
        case 'pu_student':
          return isStudent;
        case 'cohort_leaders':
          return event.cohortIds?.some(id => userLeaderCohortIds.includes(id));
        case 'cohort_participants':
          return event.cohortIds?.some(id => userCohortIds.includes(id));
        default:
          return false;
      }
    });
  });

  // Filter out past events (older than current date)
  const upcomingEvents = visibleEvents.filter(event => {
    const eventDateTime = new Date(`${event.date}T${event.time || '00:00'}`);
    // Allow showing events on the same day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDateTime >= today;
  });

  const handleRegister = async (eventId: string, isRegistered: boolean) => {
    setRegisteringId(eventId);
    try {
      const eventRef = doc(db, 'events', eventId);
      if (isRegistered) {
        await updateDoc(eventRef, {
          registeredUsers: arrayRemove(user.uid)
        });
        toast.success('Unregistered from event successfully.');
      } else {
        await updateDoc(eventRef, {
          registeredUsers: arrayUnion(user.uid)
        });
        toast.success('Successfully registered for the event!');
      }
    } catch (error) {
      console.error('Registration toggle error:', error);
      toast.error('Failed to update registration status.');
    } finally {
      setRegisteringId(null);
    }
  };

  if (loading) {
    return (
      <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-[2.5rem] bg-white overflow-hidden animate-pulse">
        <CardContent className="p-8 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
          Loading events...
        </CardContent>
      </Card>
    );
  }

  if (upcomingEvents.length === 0) {
    return null; // Don't show the widget if there are no upcoming events
  }

  return (
    <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-[2.5rem] bg-white overflow-hidden">
      <CardHeader className="p-8 border-b bg-slate-50/30 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-[#D91A2A]" /> Upcoming Portal Events
          </CardTitle>
          <CardDescription className="font-bold text-[10px] uppercase tracking-widest text-slate-400">
            Sessions, workshops, and cohort bootcamps
          </CardDescription>
        </div>
        <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] uppercase px-3 py-1">
          {upcomingEvents.length} {upcomingEvents.length === 1 ? 'Event' : 'Events'}
        </Badge>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-slate-100">
        {upcomingEvents.map(event => {
          const isRegistered = event.registeredUsers?.includes(user.uid);
          const eventDateFormatted = new Date(event.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });

          return (
            <div key={event.id} className="p-6 hover:bg-slate-50/50 transition-colors space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-black text-slate-900 leading-snug">{event.title}</h3>
                    {(Array.isArray(event.targetAudience) ? event.targetAudience : [event.targetAudience]).map(audience => {
                      if (audience === 'all_users') {
                        return <Badge key={audience} variant="outline" className="text-[8px] font-black uppercase text-slate-600 bg-slate-50 border-slate-200 px-2 py-0.5">All Users</Badge>;
                      }
                      if (audience === 'pu_staff') {
                        return <Badge key={audience} variant="outline" className="text-[8px] font-black uppercase text-indigo-600 bg-indigo-50 border-indigo-100 px-2 py-0.5">Staff Only</Badge>;
                      }
                      if (audience === 'pu_student') {
                        return <Badge key={audience} variant="outline" className="text-[8px] font-black uppercase text-amber-600 bg-amber-50 border-amber-100 px-2 py-0.5">Students Only</Badge>;
                      }
                      if (audience === 'cohort_leaders' || audience === 'cohort_participants') {
                        return (
                          <Badge key={audience} variant="outline" className="text-[8px] font-black uppercase text-rose-600 bg-rose-50 border-rose-100 px-2 py-0.5">
                            {audience === 'cohort_leaders' ? 'Cohort Leaders' : 'Cohort Participants'} ({event.cohortNames?.join(', ')})
                          </Badge>
                        );
                      }
                      return null;
                    })}
                  </div>
                  <div 
                    className="text-xs text-slate-500 font-medium prose prose-sm max-w-none space-y-1"
                    dangerouslySetInnerHTML={{ __html: event.description }}
                  />
                  
                  {event.flyerUrl && (
                    <div className="pt-2">
                      <a
                        href={event.flyerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-[10px] font-bold text-[#D91A2A] hover:text-[#D91A2A]/90 bg-red-50 hover:bg-red-100/50 border border-red-100 rounded-lg px-2.5 py-1.5 transition-colors gap-1.5"
                      >
                        <FileText className="h-3.5 w-3.5" /> View Event Flyer / Document
                      </a>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] font-bold text-slate-400 uppercase pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" /> {eventDateFormatted}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" /> {event.time}
                    </span>
                    <span className="flex items-center gap-1">
                      {event.mode === 'Online' ? (
                        <>
                          <Video className="h-3.5 w-3.5 text-blue-500" />
                          <a href={event.linkOrLocation} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline normal-case">
                            Online Link
                          </a>
                        </>
                      ) : (
                        <>
                          <MapPin className="h-3.5 w-3.5 text-emerald-500" /> {event.linkOrLocation}
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center sm:self-center shrink-0">
                  {isRegistered ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={registeringId === event.id}
                      onClick={() => handleRegister(event.id, true)}
                      className="rounded-xl border-green-200 bg-green-50 text-green-700 hover:bg-green-100/70 hover:text-green-800 font-bold text-[11px] h-9 px-4 flex items-center gap-1.5 shadow-sm"
                    >
                      {registeringId === event.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Registered
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={registeringId === event.id}
                      onClick={() => handleRegister(event.id, false)}
                      className="rounded-xl bg-[#D91A2A] text-white hover:bg-[#D91A2A]/90 font-black text-[11px] h-9 px-4 flex items-center gap-1.5 shadow-md shadow-primary/10"
                    >
                      {registeringId === event.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <UserCheck className="h-3.5 w-3.5" /> Register
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
