'use client';

import { UserProfile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Rocket, 
  Clock, 
  Calendar, 
  CheckCircle2,
  ArrowUpRight,
  FileText
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface UserDashboardProps {
  user: UserProfile;
}

const data = [
  { name: 'Jan', traction: 400 },
  { name: 'Feb', traction: 600 },
  { name: 'Mar', traction: 800 },
  { name: 'Apr', traction: 1200 },
  { name: 'May', traction: 1500 },
];

export default function UserDashboard({ user }: UserDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user.displayName}</h1>
          <p className="text-slate-500">Here's what's happening with {user.startupName || 'your startup'} today.</p>
        </div>
        <Button className="w-fit">
          <Rocket className="mr-2 h-4 w-4" /> Apply for New Programme
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Application Status</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Under Review</div>
            <p className="text-xs text-slate-500 mt-1">Incubation Programme 2026</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Profile Completion</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85%</div>
            <p className="text-xs text-slate-500 mt-1">Complete your pitch deck</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Meetings</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-slate-500 mt-1">Next: May 18, 2:00 PM</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Mentor Feedback</CardTitle>
            <FileText className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3 New</div>
            <p className="text-xs text-slate-500 mt-1">Action items pending</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Traction Growth</CardTitle>
            <CardDescription>Visualizing your startup's monthly progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="traction" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates from PIERC</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { title: 'Phase 1 Evaluation Scheduled', date: '2 hours ago', icon: Calendar },
                { title: 'Document Upload Successful', date: 'Yesterday', icon: CheckCircle2 },
                { title: 'New Mentor Assigned: Dr. Mehta', date: '2 days ago', icon: Rocket },
              ].map((activity, i) => (
                <div key={i} className="flex items-start space-x-3">
                  <div className="mt-0.5 bg-slate-100 p-1.5 rounded-full">
                    <activity.icon className="h-3.5 w-3.5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-slate-500">{activity.date}</p>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full mt-2" size="sm">
                View All Activity <ArrowUpRight className="ml-2 h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
