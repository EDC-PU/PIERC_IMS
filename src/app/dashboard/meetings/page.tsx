'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
import { Application, Meeting, UserProfile } from '@/types';
import { triggerEmailNotification } from '@/lib/email-client';
import { getMeetingScheduledEmailHtml, getMeetingCancelledEmailHtml } from '@/lib/email-templates';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
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
  MoreVertical,
  Download
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isPast } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { exportToCSV } from '@/lib/export';

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

    // Fetch Evaluations (subcollection approach: collectionGroup)
    // For simplicity, we load evaluations per application when needed.
    // Skipping global evaluation load here; evaluate page handles it.

    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';

    // Fetch Applications
    const appsCol = collection(db, 'applications');
    const unsubscribeApps = onSnapshot(appsCol, (snapshot) => {
      const appList = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Application[];
      setApplications(appList);
      setLoading(false);
    });

    // Fetch Meetings from top-level meetings collection
    const meetingsCol = collection(db, 'meetings');
    const unsubscribeMeetings = onSnapshot(meetingsCol, (snapshot) => {
      const allMeetings = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Meeting[];
      const filtered = currentUser.role === 'user'
        ? allMeetings.filter(m => m.attendees?.includes(currentUser.uid))
        : allMeetings;
      setMeetings(filtered.sort((a, b) => a.startTime - b.startTime));
    });

    if (isAdmin) {
      const usersCol = collection(db, 'users');
      onSnapshot(usersCol, (snapshot) => {
        const userMap: Record<string, UserProfile> = {};
        const list = snapshot.docs.map(d => { const u = d.data() as UserProfile; userMap[u.uid] = u; return u; });
        setAllUsers(userMap);
        setEvaluators(list.filter(u => u.role === 'mentor' || u.role === 'admin' || u.role === 'super_admin'));
      });
    }

    return () => {
      unsubscribeApps();
      unsubscribeMeetings();
    };
  }, [currentUser]);

  // Categorization Logic
  const getAppMeetingCount = (appId: string) => meetings.filter(m => m.applicationId === appId).length;

  const hasScheduledMeeting = (appId: string, phase: string) => {
    return meetings.some(m => {
      if (m.applicationId !== appId || m.status !== 'Scheduled') return false;
      const titleLower = m.title.toLowerCase();
      if (phase === 'phase1') return titleLower.includes('phase 1');
      if (phase === 'phase2') return titleLower.includes('phase 2');
      if (phase === 'review') return titleLower.includes('final review') || titleLower.includes('review meeting');
      return false;
    });
  };

  const getPreRevisionStatus = (app: Application) => {
    if (!app.timeline) return 'Submitted';
    const reversedTimeline = [...app.timeline].reverse();
    const found = reversedTimeline.find(
      (event: any) => event.status !== 'Revision Needed' && event.status !== 'Revision Submitted'
    );
    return found ? found.status : 'Submitted';
  };

  const phase1Apps = applications.filter(app => {
    if (app.status === 'Revision Submitted') {
      const preStatus = getPreRevisionStatus(app);
      const isPhase1 = preStatus === 'Submitted' || preStatus === 'Under Review' || preStatus === 'Shortlisted' || preStatus === 'Phase 1 Evaluation' || preStatus === 'Revision Needed';
      return isPhase1 && !hasScheduledMeeting(app.id, 'phase1');
    }
    return (app.status === 'Submitted' || app.status === 'Under Review' || app.status === 'Phase 1 Evaluation' || app.status === 'Revision Needed' || app.status === 'Shortlisted')
      && !hasScheduledMeeting(app.id, 'phase1');
  });

  const phase2Apps = applications.filter(app => {
    if (app.status === 'Revision Submitted') {
      const preStatus = getPreRevisionStatus(app);
      const isPhase2 = preStatus === 'Phase 2 Selected' || preStatus === 'Phase 2 Evaluation';
      return isPhase2 && !hasScheduledMeeting(app.id, 'phase2');
    }
    return (app.status === 'Phase 2 Selected' || app.status === 'Phase 2 Evaluation')
      && !hasScheduledMeeting(app.id, 'phase2');
  });

  const reviewApps = applications.filter(app => {
    if (app.status === 'Revision Submitted') {
      const preStatus = getPreRevisionStatus(app);
      const isReview = preStatus === 'Cohort Selected' || preStatus === 'Final Review';
      return isReview && !hasScheduledMeeting(app.id, 'review');
    }
    return (app.status === 'Cohort Selected' || app.status === 'Final Review')
      && !hasScheduledMeeting(app.id, 'review');
  });

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

        const phaseTitle = activePhase === 'phase1' ? 'Phase 1 Evaluation' :
          activePhase === 'phase2' ? 'Phase 2 Evaluation' : 'Final Review Meeting';

        const isPhase1 = activePhase === 'phase1';
        const attendeesList = Array.from(new Set([
          currentUser!.uid,
          ...(!isPhase1 && selectedEvaluator ? [selectedEvaluator] : []),
          app.userId
        ]));

        const meetingData = {
          applicationId: appId,
          title: `${phaseTitle}: ${app.data?.startupTitle || app.programmeTitle || 'Project'}`,
          startTime: startTimestamp,
          endTime: startTimestamp + (60 * 60 * 1000),
          mode: mode as any,
          location: mode === 'Offline' ? venue : 'Online',
          link: mode === 'Online' ? meetingLink : '',
          attendees: attendeesList,
          status: 'Scheduled',
          description: `${phaseTitle} session bulk-scheduled.`
        };

        // Single write to top-level meetings collection
        const newMeetingDoc = await addDoc(collection(db, 'meetings'), meetingData);
        // Patch the id field back onto the document
        await updateDoc(doc(db, 'meetings', newMeetingDoc.id), { id: newMeetingDoc.id });

        // Push Notifications to all attendees
        const attendees = Array.from(new Set([
          app.userId,
          ...(!isPhase1 && selectedEvaluator ? [selectedEvaluator] : []),
          currentUser!.uid
        ]));
        const notifyPromises = attendees.map(uid =>
          addDoc(collection(db, 'notifications', uid, 'items'), {
            userId: uid,
            title: 'New Meeting Scheduled',
            message: `Your ${phaseTitle} session for ${app.data?.startupTitle || app.programmeTitle} is scheduled for ${format(startTimestamp, 'MMM dd, hh:mm a')}.`,
            type: 'info',
            read: false,
            timestamp: Date.now(),
            link: '/dashboard/meetings'
          })
        );
        await Promise.all(notifyPromises);

        // Send email invitations to attendees
        const startupName = app.data?.startupName || app.data?.startupTitle || 'Innovation Project';
        const teamEmails = [
          app.userEmail,
          ...(app.data?.teamMembers || []).map((m: any) => m.email)
        ].filter(Boolean);

        const mentorEmail = !isPhase1 && selectedEvaluator ? allUsers[selectedEvaluator]?.email : null;
        const allRecipientEmails = [...teamEmails, ...(mentorEmail ? [mentorEmail] : [])].filter(Boolean);

        if (allRecipientEmails.length > 0) {
          const formattedDate = format(startTimestamp, 'MMMM dd, yyyy');
          const formattedTime = format(startTimestamp, 'hh:mm a');
          const locationDetails = mode === 'Offline' ? venue : 'Online';

          triggerEmailNotification({
            to: allRecipientEmails,
            subject: `📅 Session Scheduled: ${phaseTitle} - ${startupName}`,
            html: getMeetingScheduledEmailHtml({
              startupName,
              phaseTitle,
              formattedDate,
              formattedTime,
              mode,
              locationDetails,
              meetingLink: meetingLink || undefined,
              viewLink: `${window.location.origin}/dashboard/meetings`,
            }),
          }).catch(err => console.error('Failed to send meeting scheduling email:', err));
        }
      });
      await Promise.all(promises);
      toast.success(`Scheduled meetings for ${selectedApps.length} project(s)`);
      setSelectedApps([]);
    } catch (error) {
      console.error('Scheduling error:', error);
      toast.error('Scheduling failed. Please check your inputs.');
    }
  };

  const handleUpdateMeetingStatus = async (meeting: Meeting, newStatus: 'Scheduled' | 'Completed' | 'Cancelled' | 'Absent') => {
    try {
      await updateDoc(doc(db, 'meetings', meeting.id), { status: newStatus });
      toast.success(`Meeting status updated to ${newStatus}`);

      if (newStatus === 'Cancelled') {
        const app = applications.find(a => a.id === meeting.applicationId);
        const teamEmails = app ? [app.userEmail, ...(app.data?.teamMembers || []).map((m: any) => m.email)] : [];
        const attendeeEmails = (meeting.attendees || []).map(uid => allUsers[uid]?.email);
        const allRecipientEmails = Array.from(new Set([...teamEmails, ...attendeeEmails])).filter(Boolean);

        if (allRecipientEmails.length > 0) {
          const formattedDate = format(meeting.startTime, 'MMMM dd, yyyy');
          const formattedTime = format(meeting.startTime, 'hh:mm a');

          triggerEmailNotification({
            to: allRecipientEmails,
            subject: `❌ Meeting Cancelled: ${meeting.title}`,
            html: getMeetingCancelledEmailHtml({
              meetingTitle: meeting.title,
              formattedDate,
              formattedTime,
            }),
          }).catch(err => console.error('Failed to send meeting cancellation email:', err));
        }
      }
    } catch (error) {
      console.error('Failed to update meeting status:', error);
      toast.error('Failed to update meeting status');
    }
  };

  const handleExportMeetings = () => {
    const headers = [
      'Meeting ID',
      'Title',
      'Application ID',
      'Date & Time',
      'Mode',
      'Venue',
      'Meeting Link',
      'Status',
      'Attendees Count'
    ];
    const keys = [
      'id',
      'title',
      'applicationId',
      'formattedTime',
      'mode',
      'venue',
      'meetingLink',
      'status',
      'attendeesCount'
    ];

    const dataToExport = meetings.map(m => ({
      ...m,
      formattedTime: m.startTime ? format(new Date(m.startTime), 'yyyy-MM-dd HH:mm:ss') : 'N/A',
      attendeesCount: m.attendees?.length || 0
    }));

    exportToCSV(dataToExport, 'meetings_report.csv', headers, keys);
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
        <div>
          <Button variant="outline" onClick={handleExportMeetings} className="rounded-2xl h-12 px-6 font-bold flex items-center gap-2 border-slate-200 shadow-sm bg-white hover:bg-slate-50">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <Tabs 
        defaultValue={isAdmin ? "phase1" : "calendar"} 
        className="w-full" 
        onValueChange={(val) => {
          setActivePhase(val);
          setSelectedEvaluator('');
        }}
      >
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
                    <div className="w-full overflow-x-auto">
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
                                <TableCell className="py-6 max-w-[220px] md:max-w-[320px] whitespace-normal break-words">
                                  <Link 
                                    href={`/dashboard/applications/${app.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className={cn("font-bold text-sm break-words whitespace-normal hover:underline", selectedApps.includes(app.id) ? "text-primary" : "text-slate-900")}
                                  >
                                    {app.data?.startupTitle || app.programmeTitle}
                                  </Link>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider break-words whitespace-normal">{app.programmeTitle}</p>
                                </TableCell>
                                <TableCell className="py-6 max-w-[160px] whitespace-normal break-words">
                                  <Link 
                                    href={`/dashboard/profile/${app.userId}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-xs font-black text-slate-700 hover:text-primary hover:underline transition-colors break-words whitespace-normal"
                                  >
                                    {app.userName}
                                  </Link>
                                </TableCell>
                                <TableCell className="py-6 text-right">
                                  <span className="text-[11px] font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">{format(app.submittedAt, 'MMM dd, yyyy')}</span>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
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
                        <Input 
                          type="date" 
                          value={meetingDate} 
                          onChange={(e) => setMeetingDate(e.target.value)} 
                          min={format(new Date(), 'yyyy-MM-dd')}
                          className="rounded-xl h-11" 
                        />
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
                      {activePhase !== 'phase1' && (
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
                      )}
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
                  {currentUser?.role !== 'user' && (
                    <Button className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl h-11 px-6 shadow-lg shadow-primary/20">
                      <Send className="h-4 w-4 mr-2" /> Remind Evaluators
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="border-slate-100">
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-6 pl-8">Applicant</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-6">Meeting Date & Time</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-6">Venue / Mode</TableHead>
                      {currentUser?.role !== 'user' && (
                        <>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-6">Pending Evaluators</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-6">Completed Evaluators</TableHead>
                        </>
                      )}
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

                        // For Phase 1, check all evaluations submitted since no specific panelist was assigned
                        const completed = Object.keys(evaluations[m.applicationId] || {}).filter(uid =>
                          evaluations[m.applicationId]?.[uid]?.[phaseKey]
                        );
                        const pending = phaseKey === 'Phase_1'
                          ? []
                          : evaluatorIds.filter(uid =>
                              !evaluations[m.applicationId]?.[uid]?.[phaseKey]
                            );

                        return (
                          <TableRow key={m.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <TableCell className="py-8 pl-8 max-w-xs whitespace-normal break-words">
                              <Link 
                                href={`/dashboard/applications/${m.applicationId}`}
                                className="font-black text-sm text-primary leading-tight uppercase tracking-tight break-words whitespace-normal hover:underline"
                              >
                                {app?.data?.startupTitle || 'Unknown Project'}
                              </Link>
                              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase break-words whitespace-normal">
                                by{' '}
                                {app ? (
                                  <Link 
                                    href={`/dashboard/profile/${app.userId}`}
                                    className="hover:text-primary hover:underline transition-colors font-black text-slate-500"
                                  >
                                    {app.userName}
                                  </Link>
                                ) : (
                                  'N/A'
                                )}
                              </p>
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
                              <Badge className={cn(
                                "mt-2 font-black text-[9px] uppercase tracking-widest px-2 py-0.5 border-none rounded-full w-fit block",
                                m.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' :
                                m.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                                m.status === 'Absent' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                              )}>
                                {m.status}
                              </Badge>
                            </TableCell>
                            {currentUser?.role !== 'user' && (
                              <>
                                <TableCell className="py-8">
                                  {phaseKey === 'Phase_1' ? (
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">All Mentors Eligible</span>
                                  ) : pending.length === 0 ? (
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
                              </>
                            )}
                            <TableCell className="py-8 text-right pr-8">
                              {currentUser?.role !== 'user' ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-xl p-2 text-slate-400 hover:bg-slate-50 hover:text-primary transition-all outline-none h-10 w-10 cursor-pointer">
                                    <MoreVertical className="h-4 w-4" />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="rounded-2xl shadow-2xl border border-slate-100 p-2 bg-white min-w-[150px]">
                                    <DropdownMenuItem 
                                      className="rounded-xl p-3 cursor-pointer hover:bg-slate-50 text-slate-700 hover:text-primary font-bold text-xs outline-none"
                                      onClick={() => handleUpdateMeetingStatus(m, 'Absent')}
                                    >
                                      Mark as Absent
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="rounded-xl p-3 cursor-pointer hover:bg-slate-50 text-slate-700 hover:text-primary font-bold text-xs outline-none"
                                      onClick={() => handleUpdateMeetingStatus(m, 'Completed')}
                                    >
                                      Mark as Completed
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="rounded-xl p-3 cursor-pointer hover:bg-slate-50 text-slate-700 hover:text-primary font-bold text-xs outline-none"
                                      onClick={() => handleUpdateMeetingStatus(m, 'Cancelled')}
                                    >
                                      Cancel Meeting
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                <Button variant="ghost" size="icon" className="rounded-xl text-slate-400 cursor-not-allowed" disabled>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
