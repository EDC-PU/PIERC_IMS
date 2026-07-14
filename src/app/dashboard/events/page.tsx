'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { PortalEvent, Cohort, Application } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Eye,
  CheckCircle,
  XCircle,
  Loader2,
  CalendarDays,
  History,
  ClipboardCheck,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function UserEventsPage() {
  const { user } = useAuthStore();
  const [events, setEvents] = useState<PortalEvent[]>([]);
  const [userCohortIds, setUserCohortIds] = useState<string[]>([]);
  const [userLeaderCohortIds, setUserLeaderCohortIds] = useState<string[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [detailEvent, setDetailEvent] = useState<PortalEvent | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');

  useEffect(() => {
    if (!user) return;

    // 1. Fetch user's cohorts
    const appsCol = collection(db, 'applications');
    const unsubApps = onSnapshot(appsCol, (snapshot) => {
      const cohortIds: string[] = [];
      const leaderCohortIds: string[] = [];

      snapshot.docs.forEach((doc) => {
        const app = doc.data() as Application;
        if (!app.cohortId) return;

        // User is team leader/founder
        if (app.userId === user.uid) {
          cohortIds.push(app.cohortId);
          leaderCohortIds.push(app.cohortId);
        }

        // User is team member
        if (Array.isArray(app.data?.teamMembers)) {
          const isMember = app.data.teamMembers.some((m: any) =>
            m.email?.toLowerCase() === user.email?.toLowerCase()
          );
          if (isMember) {
            cohortIds.push(app.cohortId);
          }
        }
      });

      setUserCohortIds(Array.from(new Set(cohortIds)));
      setUserLeaderCohortIds(Array.from(new Set(leaderCohortIds)));
    });

    // 2. Fetch events
    const eventsCol = collection(db, 'events');
    const unsubEvents = onSnapshot(eventsCol, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PortalEvent[];
      list.sort((a, b) => b.createdAt - a.createdAt);
      setEvents(list);
      setLoadingEvents(false);
    }, (error) => {
      console.error('Error loading events:', error);
      setLoadingEvents(false);
    });

    return () => {
      unsubApps();
      unsubEvents();
    };
  }, [user]);

  if (!user) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <p className="text-slate-400 font-bold uppercase tracking-wider text-xs">Please log in to view events.</p>
      </div>
    );
  }

  // Filter events based on targetAudience rules
  const visibleEvents = events.filter(event => {
    // Only show published events
    if (event.status !== 'published') {
      return false;
    }

    // Admins and super_admins see all
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

  // Apply Search, Mode Filter, and Sorters to visibleEvents
  const filteredAndSortedVisibleEvents = visibleEvents
    .filter(e => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        e.title.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.linkOrLocation && e.linkOrLocation.toLowerCase().includes(q));

      const matchesMode = modeFilter === 'all' || e.mode === modeFilter;
      return matchesSearch && matchesMode;
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      const dateB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      if (sortBy === 'date-desc') return dateB - dateA;
      if (sortBy === 'date-asc') return dateA - dateB;
      if (sortBy === 'title-asc') return a.title.localeCompare(b.title);
      if (sortBy === 'title-desc') return b.title.localeCompare(a.title);
      return 0;
    });

  // Separate events into upcoming and past
  const now = new Date();
  const upcomingEvents = filteredAndSortedVisibleEvents.filter(event => {
    const eventDateTime = new Date(`${event.date}T${event.time || '00:00'}`);
    return eventDateTime >= now;
  });

  const pastEvents = filteredAndSortedVisibleEvents.filter(event => {
    const eventDateTime = new Date(`${event.date}T${event.time || '00:00'}`);
    return eventDateTime < now;
  });

  // Filter events registered by user
  const registeredEvents = filteredAndSortedVisibleEvents.filter(event =>
    event.registeredUsers?.includes(user.uid)
  );

  const handleRegister = async (eventId: string, isRegistered: boolean) => {
    setRegisteringId(eventId);
    try {
      const eventRef = doc(db, 'events', eventId);
      await updateDoc(eventRef, {
        registeredUsers: isRegistered ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
      toast.success(isRegistered ? 'Unregistered from event successfully.' : 'Registered for event successfully!');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Failed to change registration status.');
    } finally {
      setRegisteringId(null);
    }
  };

  const renderEventList = (eventList: PortalEvent[]) => {
    if (eventList.length === 0) {
      return (
        <div className="py-16 text-center text-slate-400 font-bold uppercase tracking-widest text-xs italic bg-white border border-slate-100 shadow-sm rounded-3xl">
          No events found in this category.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {eventList.map((event) => {
          const isRegistered = event.registeredUsers?.includes(user.uid);
          const isPast = new Date(`${event.date}T${event.time || '00:00'}`) < now;

          return (
            <Card key={event.id} className="border-none shadow-md ring-1 ring-slate-100 rounded-3xl overflow-hidden bg-white hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
              <div>
                {event.flyerUrl && (
                  <div className="w-full aspect-square bg-slate-50 border-b border-slate-100 overflow-hidden flex items-center justify-center">
                    <img
                      src={event.flyerUrl}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader className="bg-slate-50/50 p-6 border-b">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {(Array.isArray(event.targetAudience) ? event.targetAudience : [event.targetAudience]).map(audience => (
                      <Badge key={audience} variant="outline" className="text-[8px] font-black uppercase bg-white text-slate-600 px-2 py-0.5">
                        {audience.replace('_', ' ')}
                      </Badge>
                    ))}
                    {isRegistered && (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none font-black text-[8px] uppercase px-2 py-0.5 ml-auto">
                        Registered
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-base font-black text-slate-900 leading-snug">{event.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDetailEvent(event)}
                      className="w-full rounded-xl border-[#D91A2A] text-[#D91A2A] hover:bg-red-50/50 hover:text-[#D91A2A] font-bold text-xs"
                    >
                      <Eye className="h-4 w-4 mr-1.5" /> Learn More & Details
                    </Button>
                  </div>

                  <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-[10px] font-bold text-slate-500 uppercase">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-red-500" />
                      <span>{new Date(event.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-blue-500" />
                      <span>{event.time || 'N/A'}</span>
                    </div>
                    <div className="col-span-2 flex items-start gap-1.5 mt-1">
                      {event.mode === 'Online' ? (
                        <Video className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <MapPin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      )}
                      <span className="truncate flex-1">
                        {event.mode === 'Online' ? (
                          <a href={event.linkOrLocation} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            Join Online Session
                          </a>
                        ) : (
                          event.linkOrLocation
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </div>

              {!isPast && (
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">
                    {event.registeredUsers?.length || 0} Registered
                  </div>
                   <Button
                    onClick={() => handleRegister(event.id, isRegistered)}
                    disabled={registeringId === event.id || (isRegistered && event.allowCancellation === false)}
                    className={`rounded-xl px-5 py-2 font-black text-xs uppercase tracking-wider transition-all duration-300 ${isRegistered
                        ? event.allowCancellation === false
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                          : 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                        : 'bg-[#D91A2A] text-white hover:bg-[#D91A2A]/90'
                      }`}
                  >
                    {registeringId === event.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isRegistered ? (
                      event.allowCancellation === false ? 'Cancellation Disabled' : 'Cancel Registration'
                    ) : (
                      'Register Now'
                    )}
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
          <CalendarDays className="h-8 w-8 text-[#D91A2A]" /> Portal Events
        </h1>
        <p className="text-slate-500 font-medium">Browse, register, and check your history of PIERC bootcamps and workshops.</p>
      </div>

      {loadingEvents ? (
        <div className="h-[40vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Search, Filter, and Sort Controls */}
          <Card className="border-none shadow-sm ring-1 ring-slate-100 rounded-[2rem] overflow-hidden bg-white/50 backdrop-blur-sm">
            <CardContent className="p-4 md:p-6 flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search events by title, description, or location..." 
                  className="h-12 pl-12 rounded-2xl border-slate-100 bg-white focus:ring-primary/20 transition-all font-medium text-sm text-slate-800"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <select 
                  className="h-12 px-6 rounded-2xl border border-slate-100 bg-white text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-primary/20"
                  value={modeFilter}
                  onChange={(e) => setModeFilter(e.target.value)}
                >
                  <option value="all">All Modes</option>
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                </select>
                <select 
                  className="h-12 px-6 rounded-2xl border border-slate-100 bg-white text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-primary/20"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="date-desc">Date (Newest)</option>
                  <option value="date-asc">Date (Oldest)</option>
                  <option value="title-asc">Title (A-Z)</option>
                  <option value="title-desc">Title (Z-A)</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="bg-slate-100 p-1 rounded-xl h-12 flex justify-start w-fit">
            <TabsTrigger value="upcoming" className="rounded-lg font-bold text-xs uppercase px-4 flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" /> Upcoming Events ({upcomingEvents.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="rounded-lg font-bold text-xs uppercase px-4 flex items-center gap-1.5">
              <History className="h-4 w-4" /> Past Events ({pastEvents.length})
            </TabsTrigger>
            <TabsTrigger value="registered" className="rounded-lg font-bold text-xs uppercase px-4 flex items-center gap-1.5">
              <ClipboardCheck className="h-4 w-4" /> My Registrations ({registeredEvents.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6">
            {renderEventList(upcomingEvents)}
          </TabsContent>

          <TabsContent value="past" className="mt-6">
            {renderEventList(pastEvents)}
          </TabsContent>

          <TabsContent value="registered" className="mt-6">
            {renderEventList(registeredEvents)}
          </TabsContent>
        </Tabs>
        </div>
      )}

      {/* Learn More Details Dialog */}
      <Dialog open={detailEvent !== null} onOpenChange={(open) => { if (!open) setDetailEvent(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto rounded-[2rem] p-8 bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900">{detailEvent?.title}</DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Event Details & Description
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-4">


            <div
              className="text-sm text-slate-600 font-medium space-y-2 [&_p]:text-sm [&_p]:text-slate-600 [&_p]:leading-relaxed [&_p]:my-0 [&_h1]:text-base [&_h1]:font-black [&_h1]:text-slate-900 [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-sm [&_h2]:font-black [&_h2]:text-slate-900 [&_h2]:mt-3 [&_h2]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_li]:text-sm [&_li]:text-slate-600"
              dangerouslySetInnerHTML={{ __html: detailEvent?.description || '' }}
            />

            <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-4 text-xs font-bold text-slate-500 uppercase">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-red-500" />
                <span>Date: {detailEvent ? new Date(detailEvent.date).toLocaleDateString(undefined, { dateStyle: 'long' }) : ''}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span>Time: {detailEvent?.time || 'N/A'}</span>
              </div>
              <div className="col-span-2 flex items-start gap-2 pt-2">
                {detailEvent?.mode === 'Online' ? (
                  <Video className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <MapPin className="h-4 w-4 text-amber-500 shrink-0" />
                )}
                <span className="truncate flex-1">
                  {detailEvent?.mode === 'Online' ? (
                    <>Online Session: <a href={detailEvent.linkOrLocation} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{detailEvent.linkOrLocation}</a></>
                  ) : (
                    <>Venue: {detailEvent?.linkOrLocation}</>
                  )}
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
