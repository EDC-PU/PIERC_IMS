'use client';

import { useEffect, useState } from 'react';
import { ref, onValue, push, set } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Meeting, UserProfile } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Video, 
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

export default function MeetingsPage() {
  const { user } = useAuthStore();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Form state for scheduling
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '10:00',
    mode: 'Online',
    applicationId: ''
  });

  useEffect(() => {
    if (!user) return;

    const meetingsRef = ref(db, 'meetings');
    const unsubscribe = onValue(meetingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const meetingList = Object.values(data) as Meeting[];
        // Filter based on role: users see their own, admins see all
        const filtered = user.role === 'user' 
          ? meetingList.filter(m => m.attendees.includes(user.uid))
          : meetingList;
        setMeetings(filtered.sort((a, b) => a.startTime - b.startTime));
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSchedule = async () => {
    if (!newMeeting.title || !newMeeting.applicationId) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const meetingsRef = ref(db, 'meetings');
      const newRef = push(meetingsRef);
      
      const startTimestamp = new Date(`${newMeeting.date}T${newMeeting.startTime}`).getTime();
      
      const meetingData: Meeting = {
        id: newRef.key!,
        title: newMeeting.title,
        applicationId: newMeeting.applicationId,
        startTime: startTimestamp,
        endTime: startTimestamp + (60 * 60 * 1000), // 1 hour default
        mode: newMeeting.mode as any,
        attendees: [user!.uid], // Admin is attendee
        status: 'Scheduled',
        description: 'Programme evaluation meeting.'
      };

      await set(newRef, meetingData);
      toast.success('Meeting scheduled');
      setIsScheduleOpen(false);
    } catch (error) {
      toast.error('Failed to schedule meeting');
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Meetings & Sessions</h1>
          <p className="text-slate-500">Manage your evaluations and mentorship sessions.</p>
        </div>
        {isAdmin && (
          <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Schedule Meeting</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Schedule New Meeting</DialogTitle>
                <DialogDescription>Create a meeting for startup evaluation.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Meeting Title</Label>
                  <Input 
                    id="title" 
                    placeholder="Phase 1 Evaluation" 
                    value={newMeeting.title}
                    onChange={(e) => setNewMeeting({...newMeeting, title: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="appId">Application ID</Label>
                  <Input 
                    id="appId" 
                    placeholder="APP-123" 
                    value={newMeeting.applicationId}
                    onChange={(e) => setNewMeeting({...newMeeting, applicationId: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="date">Date</Label>
                    <Input 
                      id="date" 
                      type="date" 
                      value={newMeeting.date}
                      onChange={(e) => setNewMeeting({...newMeeting, date: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="time">Time</Label>
                    <Input 
                      id="time" 
                      type="time" 
                      value={newMeeting.startTime}
                      onChange={(e) => setNewMeeting({...newMeeting, startTime: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mode">Mode</Label>
                  <Select 
                    onValueChange={(val) => setNewMeeting({...newMeeting, mode: val})}
                    defaultValue={newMeeting.mode}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Online">Online (Google Meet)</SelectItem>
                      <SelectItem value="Offline">Offline (PIERC Campus)</SelectItem>
                      <SelectItem value="Hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsScheduleOpen(false)}>Cancel</Button>
                <Button onClick={handleSchedule}>Schedule</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{format(currentMonth, 'MMMM yyyy')}</CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500 mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {/* This is a simplified calendar view */}
              {Array.from({ length: 31 }).map((_, i) => (
                <div 
                  key={i} 
                  className={`aspect-square flex items-center justify-center rounded-full text-sm cursor-pointer hover:bg-slate-100 ${
                    i + 1 === 15 ? 'bg-primary text-white hover:bg-primary/90' : ''
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Upcoming Meetings</CardTitle>
            <CardDescription>Scheduled sessions for the next 7 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {meetings.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No meetings scheduled.</div>
              ) : (
                meetings.map((meeting) => (
                  <div key={meeting.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-xl hover:shadow-sm transition-all bg-white gap-4">
                    <div className="flex items-start gap-4">
                      <div className="bg-slate-100 p-3 rounded-lg text-center min-w-[60px]">
                        <p className="text-xs font-bold text-slate-500 uppercase">{format(meeting.startTime, 'MMM')}</p>
                        <p className="text-xl font-bold">{format(meeting.startTime, 'dd')}</p>
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-bold">{meeting.title}</h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" /> {format(meeting.startTime, 'hh:mm a')}
                          </span>
                          <span className="flex items-center gap-1">
                            {meeting.mode === 'Online' ? <Video className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                            {meeting.mode}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                      <Badge variant={meeting.status === 'Scheduled' ? 'secondary' : 'default'}>
                        {meeting.status}
                      </Badge>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
