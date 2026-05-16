'use client';

import { UserProfile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Calendar, 
  MessageSquare, 
  ChevronRight,
  TrendingUp,
  Clock,
  Star
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface MentorDashboardProps {
  user: UserProfile;
}

export default function MentorDashboard({ user }: MentorDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mentor Dashboard</h1>
          <p className="text-slate-500">Welcome back, {user.displayName}. Here's your mentorship overview.</p>
        </div>
        <Button>
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
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-slate-500 mt-1">Actively mentoring</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Sessions</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-slate-500 mt-1">Scheduled for this week</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Assigned Startups</CardTitle>
            <CardDescription>Startups you are currently mentoring</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'EcoFlow Solutions', sector: 'GreenTech', stage: 'Early Traction', lastMeeting: '2 days ago' },
                { name: 'Zenith AgriTech', sector: 'AgriTech', stage: 'Prototype', lastMeeting: '1 week ago' },
                { name: 'Quantum Health', sector: 'HealthTech', stage: 'Ideation', lastMeeting: '3 days ago' },
              ].map((startup, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white border rounded-xl hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold">
                      {startup.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold">{startup.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{startup.sector}</Badge>
                        <span className="text-xs text-slate-500">{startup.stage}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right hidden md:block">
                    <p className="text-xs text-slate-500 italic">Last met: {startup.lastMeeting}</p>
                    <Button variant="ghost" size="sm" className="mt-1">View Details <ChevronRight className="ml-1 h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="justify-center border-t py-3">
            <Button variant="link">View All Startups</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Sessions</CardTitle>
            <CardDescription>Mentorship calendar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { startup: 'EcoFlow Solutions', time: 'Today, 2:00 PM', type: 'Online' },
                { startup: 'Zenith AgriTech', time: 'Tomorrow, 11:00 AM', type: 'Hybrid' },
                { startup: 'Quantum Health', time: 'May 18, 4:30 PM', type: 'Offline' },
              ].map((session, i) => (
                <div key={i} className="flex flex-col p-3 bg-slate-50 rounded-lg border-l-4 border-primary">
                  <p className="text-sm font-bold">{session.startup}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-slate-500 flex items-center">
                      <Clock className="w-3 h-3 mr-1" /> {session.time}
                    </p>
                    <Badge variant="secondary" className="text-[10px]">{session.type}</Badge>
                  </div>
                </div>
              ))}
              <Button className="w-full mt-4" variant="outline">
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
              <Button className="mt-4 w-full" variant="secondary">Submit Report</Button>
            </div>
            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
              <h3 className="font-bold flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600" /> Pending Feedback
              </h3>
              <p className="text-sm text-slate-600 mt-2">
                You have 2 sessions from last week waiting for feedback submission.
              </p>
              <Button className="mt-4 w-full" variant="outline">Submit Feedback</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
