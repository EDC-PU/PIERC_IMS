'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Rocket, 
  Zap, 
  DollarSign 
} from 'lucide-react';

const funnelData = [
  { name: 'Total Apps', value: 500, fill: '#3b82f6' },
  { name: 'Shortlisted', value: 150, fill: '#60a5fa' },
  { name: 'Phase 2', value: 80, fill: '#93c5fd' },
  { name: 'Funding', value: 30, fill: '#bfdbfe' },
  { name: 'Incubated', value: 20, fill: '#10b981' },
];

const growthData = [
  { month: 'Jan', apps: 45, conversions: 5 },
  { month: 'Feb', apps: 52, conversions: 8 },
  { month: 'Mar', apps: 85, conversions: 12 },
  { month: 'Apr', apps: 65, conversions: 10 },
  { month: 'May', apps: 120, conversions: 18 },
];

const sectorData = [
  { name: 'FinTech', value: 35 },
  { name: 'HealthTech', value: 25 },
  { name: 'AgriTech', value: 20 },
  { name: 'DeepTech', value: 15 },
  { name: 'Others', value: 5 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ecosystem Analytics</h1>
        <p className="text-slate-500">Comprehensive overview of PIERC incubation performance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Startups', value: '142', icon: Rocket, change: '+14%', trend: 'up' },
          { title: 'Active Mentors', value: '48', icon: Users, change: '+2%', trend: 'up' },
          { title: 'Avg. Valuation', value: '$2.4M', icon: DollarSign, change: '+28%', trend: 'up' },
          { title: 'Success Rate', value: '18.2%', icon: Zap, change: '-1.5%', trend: 'down' },
        ].map((stat, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className={`flex items-center text-xs mt-1 ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {stat.trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {stat.change} from last year
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
            <CardDescription>Application dropout rates across stages.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={funnelData} margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Growth</CardTitle>
            <CardDescription>Comparison between applications and conversions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="apps" stroke="#3b82f6" name="Applications" />
                  <Line type="monotone" dataKey="conversions" stroke="#10b981" name="Conversions" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sector Distribution</CardTitle>
            <CardDescription>Startups classified by industry sectors.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sectorData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {sectorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Funding Pipeline</CardTitle>
            <CardDescription>Projected vs Actual funding across startups.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
               <p className="text-slate-400 text-sm">Funding data visualization coming soon.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
