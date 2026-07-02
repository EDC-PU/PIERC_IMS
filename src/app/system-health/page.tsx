'use client';

import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Database, 
  Lock, 
  HardDrive, 
  Activity, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  Info,
  Server,
  Cloud,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function SystemHealthPage() {
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system-health');
      const data = await res.json();
      setHealthData(data);
    } catch (error) {
      console.error('Health check failed', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === 'SUCCESS') return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">SUCCESS</Badge>;
    if (status === 'ERROR') return <Badge className="bg-rose-100 text-rose-700 border-rose-200">ERROR</Badge>;
    return <Badge className="bg-amber-100 text-amber-700 border-amber-200">WARNING</Badge>;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center space-x-2 text-primary mb-2">
            <Activity className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Diagnostics</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">System Health</h1>
          <p className="text-slate-500 font-medium mt-1">Monitor the health and connectivity of Firebase services</p>
        </div>
        <div className="flex items-center space-x-4">
          {healthData && (
            <div className="flex items-center space-x-2 px-4 py-2 bg-white rounded-2xl shadow-sm border border-slate-100">
              <div className={`h-3 w-3 rounded-full ${healthData.overallStatus === 'success' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
              <span className="text-xs font-black uppercase tracking-widest text-slate-700">{healthData.overallStatus}</span>
            </div>
          )}
          <Button 
            onClick={checkHealth} 
            disabled={loading}
            className="rounded-2xl h-12 px-6 font-bold shadow-lg shadow-primary/20"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Run Health Check
          </Button>
        </div>
      </div>

      {healthData?.overallStatus === 'success' && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center space-x-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-white p-2 rounded-xl shadow-sm text-emerald-500">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <p className="text-emerald-800 font-bold">All Firebase services are working correctly.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Env Vars */}
        <Card className="border-none shadow-2xl ring-1 ring-slate-200 overflow-hidden rounded-3xl">
          <CardHeader className="bg-slate-50/50 border-b">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white rounded-xl shadow-sm text-blue-500">
                  <Server className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Environment Variables</CardTitle>
                  <CardDescription className="text-xs">Status of required server-side variables</CardDescription>
                </div>
              </div>
              <StatusBadge status={healthData?.env?.status} />
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {healthData?.env?.variables && Object.entries(healthData.env.variables).map(([key, set]) => (
              <div key={key} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                <code className="text-[10px] font-mono text-slate-500">{key}:</code>
                <Badge variant={set ? "secondary" : "destructive"} className="text-[10px] font-bold uppercase tracking-widest">
                  {set ? 'Set' : 'Missing'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Firestore */}
        <Card className="border-none shadow-2xl ring-1 ring-slate-200 overflow-hidden rounded-3xl">
          <CardHeader className="bg-slate-50/50 border-b">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white rounded-xl shadow-sm text-amber-500">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Firestore Database</CardTitle>
                  <CardDescription className="text-xs">NoSQL cloud database service</CardDescription>
                </div>
              </div>
              <StatusBadge status={healthData?.firestore?.status} />
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Can Read</p>
                <div className="flex items-center space-x-2">
                  {healthData?.firestore?.canRead ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-rose-500" />}
                  <span className="font-bold text-slate-700">{healthData?.firestore?.canRead ? 'Yes' : 'No'}</span>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Can Write</p>
                <div className="flex items-center space-x-2">
                  {healthData?.firestore?.canWrite ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-rose-500" />}
                  <span className="font-bold text-slate-700">{healthData?.firestore?.canWrite ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
            <div className={`p-4 rounded-2xl text-xs font-medium ${healthData?.firestore?.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {healthData?.firestore?.message || 'Waiting for check...'}
            </div>
          </CardContent>
        </Card>

        {/* Auth */}
        <Card className="border-none shadow-2xl ring-1 ring-slate-200 overflow-hidden rounded-3xl">
          <CardHeader className="bg-slate-50/50 border-b">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white rounded-xl shadow-sm text-purple-500">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Firebase Authentication</CardTitle>
                  <CardDescription className="text-xs">Authentication service connectivity</CardDescription>
                </div>
              </div>
              <StatusBadge status={healthData?.auth?.status} />
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Can List Users</p>
              <div className="flex items-center space-x-2">
                {healthData?.auth?.canListUsers ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-rose-500" />}
                <span className="font-bold text-slate-700">{healthData?.auth?.canListUsers ? 'Yes' : 'No'}</span>
              </div>
            </div>
            <div className={`p-4 rounded-2xl text-xs font-medium ${healthData?.auth?.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {healthData?.auth?.message || 'Waiting for check...'}
            </div>
          </CardContent>
        </Card>

        {/* Storage */}
        <Card className="border-none shadow-2xl ring-1 ring-slate-200 overflow-hidden rounded-3xl">
          <CardHeader className="bg-slate-50/50 border-b">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white rounded-xl shadow-sm text-cyan-500">
                  <Cloud className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Firebase Storage</CardTitle>
                  <CardDescription className="text-xs">File storage connectivity and permissions</CardDescription>
                </div>
              </div>
              <StatusBadge status={healthData?.storage?.status} />
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Bucket Exists</p>
                <div className="flex items-center space-x-2">
                  {healthData?.storage?.bucketExists ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-rose-500" />}
                  <span className="font-bold text-slate-700">{healthData?.storage?.bucketExists ? 'Yes' : 'No'}</span>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Bucket</p>
                <p className="text-xs font-mono text-slate-600 truncate">{healthData?.storage?.bucket || 'N/A'}</p>
              </div>
            </div>
            <div className={`p-4 rounded-2xl text-xs font-medium ${healthData?.storage?.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {healthData?.storage?.message || 'Waiting for check...'}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400">
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Last Check: {healthData?.timestamp || 'Never'}</span>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest bg-white px-4 py-2 rounded-full shadow-sm ring-1 ring-slate-100">
          Overall Status: <span className={healthData?.overallStatus === 'success' ? 'text-emerald-500' : 'text-amber-500'}>{healthData?.overallStatus || 'unknown'}</span>
        </p>
      </div>
    </div>
  );
}
