'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { db } from '@/lib/firebase';
import { ref, onValue, push, set } from 'firebase/database';
import { Application, Meeting, UserProfile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Video,
  Search,
  Users,
  CheckCircle2,
  ChevronRight,
  Info,
  CalendarDays,
  ChevronLeft,
  LayoutDashboard,
  Send,
  MoreVertical
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isPast } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function MeetingsPage() {
  const { user: currentUser } = useAuthStore();
  const [applications, setApplications] = useState<Application[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [evaluators, setEvaluators] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<Record<string, UserProfile>>({});
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Form State
  const [meetingDate, setMeetingDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [meetingTime, setMeetingTime] = useState('10:00');
  const [mode, setMode] = useState<'Online' | 'Offline'>('Offline');
  const [venue, setVenue] = useState('PIERC Office');
  const [meetingLink, setMeetingLink] = useState('https://meet.google.com/');
  const [selectedEvaluator, setSelectedEvaluator] = useState<string>('');
  const [evaluations, setEvaluations] = useState<any>({});
  const [activePhase, setActivePhase] = useState('phase1');

  useEffect(() => {
    if (!currentUser) return;

    // Fetch Evaluations
    const evalsRef = ref(db, 'evaluations');
    onValue(evalsRef, (snapshot) => {
      setEvaluations(snapshot.val() || {});
    });

    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';

    // Fetch Applications and Extract Meetings
    const appsRef = ref(db, 'applications');
    const unsubscribeApps = onValue(appsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const appList = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val
        })) as Application[];
        setApplications(appList);

        // Aggregate Meetings from all applications
        const allMeetings: Meeting[] = [];
        appList.forEach(app => {
          if (app.meetings) {
            Object.values(app.meetings).forEach((m: any) => {
              allMeetings.push(m);
            });
          }
        });

        const filtered = currentUser.role === 'user'
          ? allMeetings.filter(m => m.attendees.includes(currentUser.uid))
          : allMeetings;

        setMeetings(filtered.sort((a, b) => a.startTime - b.startTime));
      } else {
        setApplications([]);
        setMeetings([]);
      }
      setLoading(false);
    });

    if (isAdmin) {
      // Fetch Evaluators
      const usersRef = ref(db, 'users');
      onValue(usersRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const userMap = data as Record<string, UserProfile>;
          setAllUsers(userMap);
          const list = Object.values(data) as UserProfile[];
          setEvaluators(list.filter(u => u.role === 'mentor' || u.role === 'admin' || u.role === 'super_admin'));
        }
      });
    }

    return () => unsubscribeApps();
  }, [currentUser]);

  // Categorization Logic
  const getAppMeetingCount = (appId: string) => meetings.filter(m => m.applicationId === appId).length;

  const phase1Apps = applications.filter(app =>
    (app.status === 'Submitted' || app.status === 'Revision Submitted' || app.status === 'Phase 1 Evaluation' || app.status === 'Revision Needed' || app.status === 'Shortlisted')
  );

  const phase2Apps = applications.filter(app =>
    app.status === 'Phase 2 Selected' || app.status === 'Phase 2 Evaluation'
  );

  const reviewApps = applications.filter(app =>
    app.status === 'Cohort Selected' || app.status === 'Final Review'
  );

  const historyMeetings = meetings.filter(m => isPast(m.startTime));

  const getCurrentList = () => {
    if (activePhase === 'phase1') return phase1Apps;
    if (activePhase === 'phase2') return phase2Apps;
    if (activePhase === 'review') return reviewApps;
    return [];
  };

  const toggleSelect = (id: string) => {
    setSelectedApps(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleBulkSchedule = async () => {
    if (selectedApps.length === 0) {
      toast.error('Select at least one project');
      return;
    }
    try {
      const [year, month, day] = meetingDate.split('-').map(Number);
      const [hours, minutes] = meetingTime.split(':').map(Number);
      const startDate = new Date(year, month - 1, day, hours, minutes);
      const startTimestamp = startDate.getTime();

      if (isNaN(startTimestamp)) {
        toast.error('Invalid date or time selected');
        return;
      }

      if (startTimestamp < Date.now()) {
        toast.error('Cannot schedule meetings in the past. Please select a future date and time.');
        return;
      }

      const promises = selectedApps.map(async (appId) => {
        const app = applications.find(a => a.id === appId);
        if (!app) {
          console.warn(`Application ${appId} not found during bulk scheduling`);
          return;
        }

        const meetingsRef = ref(db, `applications/${appId}/meetings`);
        const newRef = push(meetingsRef);

        const phaseTitle = activePhase === 'phase1' ? 'Phase 1 Evaluation' :
          activePhase === 'phase2' ? 'Phase 2 Evaluation' : 'Final Review Meeting';

        const meetingData: Meeting = {
          id: newRef.key!,
          applicationId: appId,
          title: `${phaseTitle}: ${app.data?.startupTitle || app.programmeTitle || 'Project'}`,
          startTime: startTimestamp,
          endTime: startTimestamp + (60 * 60 * 1000),
          mode: mode as any,
          location: mode === 'Offline' ? venue : 'Online',
          link: mode === 'Online' ? meetingLink : '',
          attendees: Array.from(new Set([currentUser!.uid, ...(selectedEvaluator ? [selectedEvaluator] : []), app.userId])),
          status: 'Scheduled',
          description: `${phaseTitle} session bulk-scheduled.`
        };

        await set(newRef, meetingData);

        // Also write to top-level meetings node for central access
        const centralMeetingsRef = ref(db, `meetings/${newRef.key}`);
        await set(centralMeetingsRef, meetingData);

        // Push Notifications to all attendees
        const attendees = Array.from(new Set([app.userId, ...(selectedEvaluator ? [selectedEvaluator] : []), currentUser!.uid]));
        const notifyPromises = attendees.map(uid => {
          const notifRef = ref(db, `notifications/${uid}`);
          const newNotifRef = push(notifRef);
          return set(newNotifRef, {
            id: newNotifRef.key!,
            userId: uid,
            title: `New Meeting Scheduled`,
            message: `Your ${phaseTitle} session for ${app.data?.startupTitle || app.programmeTitle} is scheduled for ${format(startTimestamp, 'MMM dd, hh:mm a')}.`,
            type: 'info',
            read: false,
            timestamp: Date.now(),
            link: '/dashboard/meetings'
          });
        });
        await Promise.all(notifyPromises);
      });
      await Promise.all(promises);
      toast.success(`Scheduled meetings for ${selectedApps.length} project(s)`);
      setSelectedApps([]);
    } catch (error) {
      console.error('Scheduling error:', error);
      toast.error('Scheduling failed. Please check your inputs.');
    }
  };

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });

  if (loading) return <div className="p-8 text-center animate-pulse text-slate-400 font-bold">Loading Evaluation Pipeline...</div>;

  return (
    <div className="space-y-8 p-6 md:p-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Evaluation & Review Dashboard</h1>
          <p className="text-slate-500 font-medium mt-1">Coordinate multi-phase evaluations and project selection panels.</p>
        </div>
      </div>

      <Tabs defaultValue={isAdmin ? "phase1" : "calendar"} className="w-full" onValueChange={setActivePhase}>
        <TabsList className="bg-slate-100/50 p-1 rounded-2xl border border-slate-200 h-14 w-full justify-start space-x-2">
          {isAdmin && (
            <>
              <TabsTrigger value="phase1" className="rounded-xl px-8 h-12 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md font-black text-[10px] uppercase tracking-widest text-slate-500">
                Phase 1 ({phase1Apps.length})
              </TabsTrigger>
              <TabsTrigger value="phase2" className="rounded-xl px-8 h-12 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md font-black text-[10px] uppercase tracking-widest text-slate-500">
                Phase 2 ({phase2Apps.length})
              </TabsTrigger>
              <TabsTrigger value="review" className="rounded-xl px-8 h-12 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md font-black text-[10px] uppercase tracking-widest text-slate-500">
                Review Meeting ({reviewApps.length})
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="calendar" className="rounded-xl px-8 h-12 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md font-black text-[10px] uppercase tracking-widest text-slate-500">
            Calendar View
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl px-8 h-12 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md font-black text-[10px] uppercase tracking-widest text-slate-500">
            History
          </TabsTrigger>
        </TabsList>

        {/* Phase Tabs Content */}
        {['phase1', 'phase2', 'review'].map((phase) => (
          <TabsContent key={phase} value={phase} className="mt-8">
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
              <div className="xl:col-span-3 space-y-6">
                <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden rounded-3xl">
                  <CardHeader className="bg-slate-50/50 border-b p-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl font-black text-slate-900">
                          {phase === 'phase1' ? 'Pending Phase 1 Evaluations' :
                            phase === 'phase2' ? 'Pending Phase 2 Evaluations' : 'Projects for Final Review'}
                        </CardTitle>
                        <CardDescription className="font-medium text-slate-500">
                          {phase === 'review' ? 'Final evaluation before selection for funding.' : 'Select startups to schedule their next evaluation panel.'}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-slate-50/30">
                        <TableRow className="border-slate-100">
                          <TableHead className="w-16 py-6"></TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-6">Project Title</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-6">Applicant</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-6 text-right">Submission Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getCurrentList().length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="h-40 text-center text-slate-400 font-medium italic">No projects pending in this phase.</TableCell>
                          </TableRow>
                        ) : (
                          getCurrentList().map((app) => (
                            <TableRow key={app.id} className={cn("border-slate-100 hover:bg-slate-50/50 cursor-pointer", selectedApps.includes(app.id) && "bg-primary/[0.02]")} onClick={() => toggleSelect(app.id)}>
                              <TableCell className="py-6">
                                <Checkbox checked={selectedApps.includes(app.id)} onCheckedChange={() => toggleSelect(app.id)} className="rounded-md h-5 w-5 border-slate-300" />
                              </TableCell>
                              <TableCell className="py-6">
                                <p className={cn("font-bold text-sm", selectedApps.includes(app.id) ? "text-primary" : "text-slate-900")}>{app.data?.startupTitle || app.programmeTitle}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider">{app.programmeTitle}</p>
                              </TableCell>
                              <TableCell className="py-6">
                                <span className="text-xs font-black text-slate-700">{app.userName}</span>
                              </TableCell>
                              <TableCell className="py-6 text-right">
                                <span className="text-[11px] font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">{format(app.submittedAt, 'MMM dd, yyyy')}</span>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar Form */}
              <div className="space-y-6 h-fit sticky top-8">
                <Card className="border-none shadow-2xl ring-1 ring-slate-100 rounded-3xl overflow-hidden">
                  <CardHeader className="bg-slate-50/50 border-b p-6">
                    <CardTitle className="text-lg font-black text-slate-900">Schedule Bulk Session</CardTitle>
                    <CardDescription className="text-xs font-medium uppercase tracking-tighter">Assigning panels for {selectedApps.length} projects</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Meeting Date</Label>
                        <Input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="rounded-xl h-11" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Time</Label>
                        <Input type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} className="rounded-xl h-11" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mode</Label>
                        <div className="flex gap-2">
                          <Button variant={mode === 'Offline' ? 'default' : 'outline'} className="flex-1 rounded-xl h-11 text-xs font-bold" onClick={() => setMode('Offline')}>Offline</Button>
                          <Button variant={mode === 'Online' ? 'default' : 'outline'} className="flex-1 rounded-xl h-11 text-xs font-bold" onClick={() => setMode('Online')}>Online</Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {mode === 'Online' ? 'Meeting Link' : 'Venue'}
                        </Label>
                        {mode === 'Online' ? (
                          <div className="relative">
                            <Video className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input 
                              value={meetingLink} 
                              onChange={(e) => setMeetingLink(e.target.value)} 
                              placeholder="https://meet.google.com/..." 
                              className="pl-10 rounded-xl h-11 bg-slate-50 border-none focus:ring-primary/20" 
                            />
                          </div>
                        ) : (
                          <div className="relative">
                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input 
                              value={venue} 
                              onChange={(e) => setVenue(e.target.value)} 
                              placeholder="PIERC Office"
                              className="pl-10 rounded-xl h-11 bg-slate-50 border-none focus:ring-primary/20" 
                            />
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Evaluator / Panelist</Label>
                        <Select onValueChange={(val) => setSelectedEvaluator(val || '')} value={selectedEvaluator}>
                          <SelectTrigger className="rounded-xl h-11">
                            <SelectValue>
                              {selectedEvaluator ? allUsers[selectedEvaluator]?.displayName : "Choose an evaluator"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="rounded-xl shadow-2xl border-none ring-1 ring-slate-100">
                            {evaluators.map(ev => <SelectItem key={ev.uid} value={ev.uid}>{ev.displayName}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button onClick={handleBulkSchedule} disabled={selectedApps.length === 0} className="w-full h-14 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20">
                      Schedule for Selected
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        ))}

        {/* Calendar Content */}
        <TabsContent value="calendar" className="mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 border-none shadow-sm ring-1 ring-slate-200 rounded-3xl overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between">
                <CardTitle className="font-black text-slate-900">{format(currentMonth, 'MMMM yyyy')}</CardTitle>
                <div className="flex space-x-2">
                  <Button variant="outline" size="icon" className="rounded-xl h-9 w-9" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" className="rounded-xl h-9 w-9" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-7 gap-px bg-slate-100">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="bg-slate-50/50 p-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">{day}</div>
                  ))}
                  {days.map((day, i) => {
                    const dayMeetings = meetings.filter(m => isSameDay(m.startTime, day));
                    return (
                      <div key={i} className={cn("min-h-[120px] bg-white p-3 border-b border-r border-slate-100", isSameDay(day, new Date()) && "bg-primary/[0.01]")}>
                        <span className={cn("text-xs font-black", isSameDay(day, new Date()) ? "text-primary" : "text-slate-400")}>{format(day, 'd')}</span>
                        <div className="mt-2 space-y-1">
                          {dayMeetings.map(m => (
                            <div key={m.id} className="text-[9px] p-2 bg-primary/10 text-primary rounded-lg font-bold truncate border border-primary/5">{format(m.startTime, 'HH:mm')} {m.title}</div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-3xl overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-primary" /> Active Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {meetings.filter(m => isSameDay(m.startTime, new Date())).length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8 font-medium">No sessions for today.</p>
                  ) : (
                    meetings.filter(m => isSameDay(m.startTime, new Date())).map(m => (
                      <div key={m.id} className="flex items-center space-x-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="p-2.5 bg-white rounded-xl shadow-sm text-primary"><Clock className="h-4 w-4" /></div>
                        <div>
                          <p className="text-sm font-black text-slate-900">{m.title}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase">{format(m.startTime, 'hh:mm a')}</p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* History Content */}
        <TabsContent value="history" className="mt-8">
          <Card className="border-none shadow-2xl ring-1 ring-slate-100 rounded-[2rem] overflow-hidden bg-white">
            <CardHeader className="bg-slate-900 text-white p-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <CardTitle className="text-2xl font-black tracking-tight">Scheduled Meetings History</CardTitle>
                  <CardDescription className="text-slate-400 font-medium mt-1">A log of all past and future scheduled incubation meetings.</CardDescription>
                </div>
                <div className="flex items-center space-x-3">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white rounded-xl h-11">
                      <SelectValue placeholder="All Meetings" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Meetings</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl h-11 px-6 shadow-lg shadow-primary/20">
                    <Send className="h-4 w-4 mr-2" /> Remind Evaluators
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-slate-100">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-6 pl-8">Applicant</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-6">Meeting Date & Time</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-6">Venue / Mode</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-6">Pending Evaluators</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-6">Completed Evaluators</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-6 text-right pr-8">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meetings.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-40 text-center text-slate-400 font-medium italic">No meeting history available.</TableCell></TableRow>
                  ) : (
                    meetings.sort((a, b) => b.startTime - a.startTime).map(m => {
                      const app = applications.find(a => a.id === m.applicationId);
                      const phaseKey = m.title.toLowerCase().includes('phase 1') ? 'Phase_1' :
                        m.title.toLowerCase().includes('phase 2') ? 'Phase_2' : 'Final_Review';

                      const attendees = m.attendees || [];
                      // Filter for evaluators only (roles: admin, super_admin, mentor)
                      const evaluatorIds = attendees.filter(uid => {
                        const role = allUsers[uid]?.role;
                        return role === 'admin' || role === 'super_admin' || role === 'mentor';
                      });

                      const completed = evaluatorIds.filter(uid =>
                        evaluations[m.applicationId]?.[uid]?.[phaseKey]
                      );
                      const pending = evaluatorIds.filter(uid =>
                        !evaluations[m.applicationId]?.[uid]?.[phaseKey]
                      );

                      return (
                        <TableRow key={m.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <TableCell className="py-8 pl-8 max-w-xs">
                            <p className="font-black text-sm text-primary leading-tight uppercase tracking-tight">{app?.data?.startupTitle || 'Unknown Project'}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">by {app?.userName || 'N/A'}</p>
                          </TableCell>
                          <TableCell className="py-8">
                            <p className="font-black text-slate-900 text-sm">{format(m.startTime, 'MMM dd,')}</p>
                            <p className="text-xs font-bold text-slate-500 mt-0.5">{format(m.startTime, 'yyyy @ HH:mm')}</p>
                          </TableCell>
                          <TableCell className="py-8">
                            {m.mode === 'Online' && m.link ? (
                              <a 
                                href={m.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary hover:underline font-black text-xs flex items-center"
                              >
                                <Video className="h-3 w-3 mr-1" /> Join Link
                              </a>
                            ) : (
                              <p className="font-black text-slate-900 text-xs">{m.location}</p>
                            )}
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">({m.mode})</p>
                          </TableCell>
                          <TableCell className="py-8">
                            {pending.length === 0 ? (
                              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">None</span>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {Array.from(new Set(pending)).map(uid => {
                                  const profile = allUsers[uid];
                                  return (
                                    <Link
                                      key={uid}
                                      href={`/dashboard/profile/${profile?.enrollmentNumber || uid}`}
                                      className="text-[11px] font-black text-slate-700 hover:text-primary transition-colors"
                                    >
                                      {profile?.displayName}
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="py-8">
                            {completed.length === 0 ? (
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">None</span>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {completed.map(uid => (
                                  <Link key={uid} href={`/dashboard/profile/${uid}`} className="text-[11px] font-black text-emerald-600 flex items-center hover:text-primary transition-colors">
                                    <CheckCircle2 className="h-3 w-3 mr-1.5" />
                                    {allUsers[uid]?.displayName}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="py-8 text-right pr-8">
                            <Button variant="ghost" size="icon" className="rounded-xl text-slate-400 hover:text-primary">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
