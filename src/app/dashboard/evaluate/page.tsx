'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, addDoc } from 'firebase/firestore';
import { Application, Meeting, UserProfile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ClipboardList,
  Star,
  CheckCircle2,
  ArrowLeft,
  Search,
  ChevronRight,
  TrendingUp,
  BrainCircuit,
  Users,
  Target,
  FileText,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Clock,
  Rocket,
  Download,
  Info,
  DollarSign,
  Briefcase,
  Lightbulb,
  FileDown,
  History as HistoryIcon,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { exportToCSV } from '@/lib/export';

export default function EvaluatePage() {
  const { user: currentUser } = useAuthStore();
  const [applications, setApplications] = useState<Application[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [userEvaluations, setUserEvaluations] = useState<Record<string, any>>({});
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Evaluation Form State
  const [marks, setMarks] = useState<number | ''>('');
  const [remarks, setRemarks] = useState('');
  const [recommendation, setRecommendation] = useState<string>('');

  useEffect(() => {
    if (!currentUser) return;

    const appsCol = collection(db, 'applications');
    const unsubscribeApps = onSnapshot(appsCol, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Application[];
      setApplications(list.filter(app => app.status !== 'Draft'));
      setLoading(false);
    });

    // Load meetings from top-level meetings collection
    const meetingsCol = collection(db, 'meetings');
    const unsubscribeMeetings = onSnapshot(meetingsCol, (snapshot) => {
      setMeetings(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Meeting[]);
    });

    // Load evaluations: `evaluations/{appId}/results/{evalDocId}`
    const evalsCol = collection(db, 'evaluations');
    const unsubscribeEvals = onSnapshot(evalsCol, (snapshot) => {
      // Each document IS an evaluation grouped by appId subcollection
      // For simplicity read from flat `evaluations` collection where doc id = `{appId}_{uid}_{phase}`
      const evMap: Record<string, any> = {};
      snapshot.docs.forEach(d => {
        const evalData = d.data();
        const appId = evalData.applicationId;
        const uid = evalData.evaluatorId;
        const phase = evalData.phase?.replace(' ', '_');
        if (appId && uid && phase) {
          if (!evMap[appId]) evMap[appId] = {};
          if (!evMap[appId][uid]) evMap[appId][uid] = {};
          evMap[appId][uid][phase] = evalData;
        }
      });
      setUserEvaluations(evMap);
    });

    return () => {
      unsubscribeApps();
      unsubscribeMeetings();
      unsubscribeEvals();
    };
  }, [currentUser]);

  const getPhase = (appId: string) => {
    const app = applications.find(a => a.id === appId);
    if (!app) return 'Phase 1';

    if (app.status === 'Submitted' || app.status === 'Revision Submitted' || app.status === 'Under Review' || app.status === 'Revision Needed') return 'Phase 1';
    if (app.status === 'Phase 1 Selected' || app.status === 'Phase 2 Selected') return 'Phase 2';
    if (app.status === 'Cohort Selected') return 'Final Review';

    return 'Phase 1';
  };

  const phase = selectedApp ? getPhase(selectedApp.id) : 'Phase 1';
  const alreadyEvaluated = selectedApp &&
    userEvaluations[selectedApp.id]?.[currentUser!.uid]?.[phase.replace(' ', '_')] &&
    selectedApp.status !== 'Revision Submitted';

  const handleSubmitEvaluation = async () => {
    if (!selectedApp || !currentUser) return;
    const currentPhase = getPhase(selectedApp.id);
    const isPhase1 = currentPhase === 'Phase 1';

    if (!recommendation) {
      toast.error('Please select a recommendation.');
      return;
    }

    if (recommendation === 'Revision Needed' && !remarks.trim()) {
      toast.error('Please enter comments/remarks explaining the requested revision.');
      return;
    }

    if (!isPhase1) {
      if (marks === '' || !remarks.trim()) {
        toast.error('Please provide both a score and detailed remarks.');
        return;
      }
      if (marks > 100) {
        toast.error('Marks cannot exceed 100');
        return;
      }
    }

    try {
      // Store evaluation in flat `evaluations` collection with composite doc ID
      const phaseKey = currentPhase.replace(/ /g, '_');
      const evalDocId = `${selectedApp.id}_${currentUser.uid}_${phaseKey}`;
      const evaluationData: any = {
        applicationId: selectedApp.id,
        evaluatorId: currentUser.uid,
        evaluatorName: currentUser.displayName,
        recommendation,
        submittedAt: Date.now(),
        phase: currentPhase
      };

      if (!isPhase1) {
        evaluationData.marks = marks;
        evaluationData.remarks = remarks;
      } else if (remarks.trim()) {
        evaluationData.remarks = remarks;
      }

      await setDoc(doc(db, 'evaluations', evalDocId), evaluationData);

      // Notify the Scheduler/Admin
      const currentMeeting = meetings.find(m =>
        m.applicationId === selectedApp.id &&
        m.title.includes(phase)
      );

      const schedulerId = currentMeeting?.attendees?.[0];
      if (schedulerId && schedulerId !== currentUser.uid) {
        await addDoc(collection(db, 'notifications', schedulerId, 'items'), {
          userId: schedulerId,
          title: 'New Evaluation Recorded',
          message: `${currentUser.displayName} has submitted the ${phase} review for ${selectedApp.data?.startupTitle || selectedApp.programmeTitle}.`,
          type: 'success',
          read: false,
          timestamp: Date.now(),
          link: `/dashboard/applications/${selectedApp.id}`
        });
      }

      toast.success('Evaluation submitted successfully');

      if (recommendation === 'Recommended') {
        await updateDoc(doc(db, 'applications', selectedApp.id), { status: 'Shortlisted' });
      }

      setMarks('');
      setRemarks('');
      setRecommendation('');
      setSelectedApp(null);
    } catch (error) {
      toast.error('Failed to submit evaluation');
    }
  };

  const handleMarkAbsent = async () => {
    if (!selectedApp || !currentUser) return;
    const currentPhase = getPhase(selectedApp.id);
    
    // Find the scheduled meeting for this application and phase
    const currentMeeting = meetings.find(m =>
      m.applicationId === selectedApp.id &&
      m.status === 'Scheduled' &&
      (
        (currentPhase === 'Phase 1' && m.title.toLowerCase().includes('phase 1')) ||
        (currentPhase === 'Phase 2' && m.title.toLowerCase().includes('phase 2')) ||
        (currentPhase === 'Final Review' && (m.title.toLowerCase().includes('final review') || m.title.toLowerCase().includes('review meeting')))
      )
    );

    if (!currentMeeting) {
      toast.error('No active scheduled meeting found for this project.');
      return;
    }

    try {
      await updateDoc(doc(db, 'meetings', currentMeeting.id), { status: 'Absent' });
      toast.success('Marked candidate as absent. The application has been returned to the scheduling queue.');
      setSelectedApp(null);
    } catch (error) {
      console.error('Failed to update meeting status to Absent:', error);
      toast.error('Failed to mark candidate as absent.');
    }
  };

  const filteredApps = applications.filter(app => {
    const phase = getPhase(app.id);
    const isEvaluated = userEvaluations[app.id]?.[currentUser?.uid || '']?.[phase.replace(' ', '_')];

    // COMMITTEE CHECK: Only show if user is an attendee in a scheduled meeting for this app
    const isCommitteeMember = meetings.some(m =>
      m.applicationId === app.id && m.status === 'Scheduled' &&
      m.attendees?.includes(currentUser?.uid || '')
    );

    // Only show if part of committee, NOT evaluated, and matches search
    const matchesSearch = app.data?.startupTitle?.toLowerCase().includes(search.toLowerCase()) ||
      app.userName?.toLowerCase().includes(search.toLowerCase());

    return isCommitteeMember && (!isEvaluated || app.status === 'Revision Submitted') && matchesSearch;
  });

  const evaluatedApps = applications.filter(app => {
    const isEvaluated = userEvaluations[app.id]?.[currentUser?.uid || ''];
    return isEvaluated;
  }).map(app => {
    const evals = userEvaluations[app.id]?.[currentUser?.uid || ''] || {};
    return {
      ...app,
      evals: Object.values(evals)
    };
  });

  const handleExportEvaluations = () => {
    const headers = [
      'Application ID',
      'Startup Title',
      'Phase',
      'Recommendation',
      'Marks',
      'Remarks',
      'Date Evaluated'
    ];
    const keys = [
      'applicationId',
      'startupTitle',
      'phase',
      'recommendation',
      'marks',
      'remarks',
      'submittedAt'
    ];

    const evaluationsToExport: any[] = [];
    evaluatedApps.forEach(app => {
      app.evals.forEach((e: any) => {
        evaluationsToExport.push({
          applicationId: app.id,
          startupTitle: app.data?.startupTitle || app.programmeTitle,
          phase: e.phase || 'N/A',
          recommendation: e.recommendation || 'N/A',
          marks: e.marks !== undefined && e.marks !== null ? e.marks : 'N/A',
          remarks: e.remarks || 'N/A',
          submittedAt: e.submittedAt ? format(new Date(e.submittedAt), 'yyyy-MM-dd HH:mm:ss') : 'N/A'
        });
      });
    });

    exportToCSV(evaluationsToExport, 'my_evaluations_report.csv', headers, keys);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[600px] space-y-4">
      <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-400">Loading Pipeline...</p>
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto p-6 md:p-8 animate-in fade-in duration-700">
      {!selectedApp ? (
        <Tabs defaultValue="pipeline" className="space-y-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-primary mb-2">
                <ClipboardList className="h-4 w-4" />
                <span>Expert Workspace</span>
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-slate-900">Evaluation Hub</h1>
              <p className="text-slate-500 font-medium mt-1">Review startup submissions and manage your evaluation history.</p>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={handleExportEvaluations} className="rounded-2xl h-14 px-6 font-bold flex items-center gap-2 border-slate-200 shadow-sm bg-white hover:bg-slate-50">
                <Download className="h-4 w-4" /> Export CSV
              </Button>
              <TabsList className="bg-slate-100/50 p-1 rounded-2xl border border-slate-200 h-14">
                <TabsTrigger value="pipeline" className="rounded-xl px-8 h-12 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md font-black text-[10px] uppercase tracking-widest text-slate-500">
                  Project Pipeline ({filteredApps.length})
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-xl px-8 h-12 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md font-black text-[10px] uppercase tracking-widest text-slate-500">
                  My History ({evaluatedApps.reduce((acc, app) => acc + app.evals.length, 0)})
                </TabsTrigger>
              </TabsList>

              <div className="relative w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search startups..."
                  className="pl-12 rounded-2xl h-14 border-slate-200 bg-white shadow-sm focus:ring-primary/10 transition-all"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          <TabsContent value="pipeline" className="mt-0 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredApps.length === 0 ? (
                <div className="col-span-full py-20 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                  <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No pending evaluations</p>
                </div>
              ) : (
                filteredApps.map((app) => (
                  <Card
                    key={app.id}
                    className="group border-none shadow-sm ring-1 ring-slate-200 rounded-[2rem] overflow-hidden hover:shadow-2xl hover:ring-primary/20 transition-all duration-500 cursor-pointer"
                    onClick={() => setSelectedApp(app)}
                  >
                    <CardHeader className="bg-slate-50/50 p-8">
                      <div className="flex justify-between items-start mb-4">
                        <Badge className="bg-white text-slate-900 border-slate-200 px-3 py-1 font-black text-[9px] uppercase tracking-widest rounded-full">
                          {getPhase(app.id)}
                        </Badge>
                        <div className="h-10 w-10 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-primary group-hover:text-white transition-colors duration-500">
                          <Rocket className="h-5 w-5" />
                        </div>
                      </div>
                      <CardTitle className="text-xl font-black leading-tight text-slate-900 group-hover:text-primary transition-colors">
                        {app.data?.startupTitle || app.programmeTitle}
                      </CardTitle>
                      <CardDescription className="font-bold text-[10px] uppercase tracking-widest mt-2">
                        <Link 
                          href={`/dashboard/profile/${app.userId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline hover:text-primary transition-colors"
                        >
                          {app.userName}
                        </Link>
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-0 outline-none">
            <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-[2rem] overflow-hidden">
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-slate-100">
                      <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 px-8">Startup / Project</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest py-6">Evaluation Phase</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest py-6">Score</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest py-6">Recommendation</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest py-6">Remarks</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 text-right px-8">Submission Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluatedApps.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">No evaluation history found</TableCell>
                      </TableRow>
                    ) : (
                      evaluatedApps.map((app) => (
                        app.evals.map((ev: any, idx) => (
                          <TableRow key={`${app.id}-${idx}`} className="border-slate-50 hover:bg-slate-50/30 transition-colors">
                            <TableCell className="py-6 px-8">
                              <p className="font-black text-slate-900">{app.data?.startupTitle || app.programmeTitle}</p>
                              <Link 
                                href={`/dashboard/profile/${app.userId}`}
                                className="text-[10px] font-bold text-slate-400 hover:text-primary hover:underline uppercase tracking-widest transition-colors block w-fit"
                              >
                                {app.userName}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="rounded-full border-slate-200 font-black text-[9px] uppercase tracking-widest px-3">
                                {ev.phase}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {ev.phase === 'Phase 1' ? (
                                <span className="text-slate-400 font-medium">-</span>
                              ) : (
                                <div className="flex items-center">
                                  <span className="text-lg font-black text-primary mr-1">{ev.marks}</span>
                                  <span className="text-[10px] font-bold text-slate-300">/ 100</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={cn(
                                "rounded-full font-black text-[9px] uppercase tracking-widest px-3 border-none",
                                ev.recommendation === 'Recommended' ? 'bg-green-100 text-green-700' :
                                  ev.recommendation === 'Revision Needed' ? 'bg-orange-100 text-orange-700' : 'bg-rose-100 text-rose-700'
                              )}>
                                {ev.recommendation}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              {ev.phase === 'Phase 1' ? (
                                <span className="text-slate-400 font-medium italic">-</span>
                              ) : (
                                <p className="text-[11px] font-medium text-slate-500 italic line-clamp-2 leading-relaxed">
                                  "{ev.remarks}"
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="text-right px-8 font-bold text-slate-400 text-xs whitespace-nowrap">
                              {format(ev.submittedAt, 'MMM dd, yyyy')}
                            </TableCell>
                          </TableRow>
                        ))
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-700">
          <Button
            variant="ghost"
            onClick={() => setSelectedApp(null)}
            className="group hover:bg-transparent -ml-4 text-slate-500 hover:text-primary font-black uppercase text-[10px] tracking-widest"
          >
            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Pipeline
          </Button>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            {/* Startup Data Panel */}
            <div className="xl:col-span-8 space-y-6">
              <div className="bg-white ring-1 ring-slate-100 rounded-[2.5rem] p-10 space-y-10 shadow-sm">
                {/* Header Information */}
                <div className="border-b border-slate-50 pb-8 flex flex-col md:flex-row justify-between items-start gap-6">
                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Startup Name</Label>
                    <h2 className="text-4xl font-black text-slate-900 mt-1 ">
                      {selectedApp.data?.startupTitle || "Untitled Innovation"}
                    </h2>
                    <div className="flex items-center space-x-3 mt-4">
                      <Badge className="bg-primary text-white font-black px-4 py-1 rounded-full border-none text-[9px] uppercase tracking-widest">
                        {getPhase(selectedApp.id)} Evaluation
                      </Badge>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Submitted by{' '}
                        <Link 
                          href={`/dashboard/profile/${selectedApp.userId}`}
                          className="hover:underline hover:text-primary transition-colors font-black text-slate-600"
                        >
                          {selectedApp.userName}
                        </Link>
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-3xl min-w-[200px]">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Stage</Label>
                    <p className="text-xl font-black text-primary mt-1 uppercase">{selectedApp.data?.currentStage || "Idea"}</p>
                  </div>
                </div>

                {/* Core Details Grid */}
                <div className="grid grid-cols-1 gap-10">
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 flex items-center">
                      <Users className="h-4 w-4 mr-2 text-primary" /> Team Members
                    </h3>
                    <div className="p-6 bg-slate-50 rounded-3xl font-bold text-slate-700 leading-relaxed">
                      {selectedApp.data?.teamDetails || selectedApp.data?.startupTitle || "Founder and Core Team"}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 flex items-center">
                      <Target className="h-4 w-4 mr-2 text-primary" /> Detailed Description / Problem Statement
                    </h3>
                    <div className="p-8 bg-slate-50 rounded-[2rem] font-medium text-slate-600 leading-loose">
                      {selectedApp.data?.problemStatement || "No problem statement provided."}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 flex items-center">
                      <BrainCircuit className="h-4 w-4 mr-2 text-primary" /> Solution
                    </h3>
                    <div className="p-8 bg-slate-50 rounded-[2rem] font-medium text-slate-600 leading-loose">
                      {selectedApp.data?.solutionStatement || "No solution statement provided."}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 flex items-center">
                      <Lightbulb className="h-4 w-4 mr-2 text-primary" /> Uniqueness
                    </h3>
                    <div className="p-6 bg-slate-50 rounded-3xl font-bold text-slate-700 leading-relaxed">
                      {selectedApp.data?.uniqueness || "Innovation in core technology and implementation."}
                    </div>
                  </div>
                </div>

                {/* Documents Section */}
                <div className="pt-8 border-t border-slate-50 space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">Submitted Documents</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedApp.documents?.pitchDeck && (
                      <div
                        className="flex items-center justify-between p-6 bg-slate-900 rounded-3xl text-white cursor-pointer hover:bg-slate-800 transition-all"
                        onClick={() => window.open(selectedApp.documents.pitchDeck, '_blank')}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-black text-sm">Pitch Deck.pdf</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phase 1 Submission</p>
                          </div>
                        </div>
                        <ExternalLink className="h-5 w-5 text-slate-400" />
                      </div>
                    )}

                    {selectedApp.documents?.phase2PPT && (
                      <div
                        className={cn(
                          "flex items-center justify-between p-6 rounded-3xl text-white cursor-pointer transition-all shadow-lg",
                          getPhase(selectedApp.id) === 'Phase 2'
                            ? "bg-primary scale-[1.02] shadow-primary/30 ring-4 ring-primary/10"
                            : "bg-orange-600 hover:bg-orange-700 shadow-orange-200"
                        )}
                        onClick={() => window.open(selectedApp.documents.phase2PPT, '_blank')}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center">
                            <Sparkles className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="font-black text-sm">Phase 2 PPT</p>
                            <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest">
                              {getPhase(selectedApp.id) === 'Phase 2' ? 'Primary Resource for this Phase' : 'Phase 2 Presentation'}
                            </p>
                          </div>
                        </div>
                        <div className="bg-white/20 p-2 rounded-xl">
                          <ExternalLink className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    )}

                    {!selectedApp.documents?.pitchDeck && !selectedApp.documents?.phase2PPT && (
                      <div className="col-span-full p-8 text-center bg-slate-50 rounded-2xl border border-dashed text-slate-400 font-medium">
                        No documents uploaded for this application.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Score Sidebar */}
            <div className="xl:col-span-4">
              <Card className="border-none shadow-2xl ring-1 ring-slate-200 rounded-[2.5rem] bg-white overflow-hidden sticky top-8">
                <CardHeader className="bg-slate-50/50 border-b p-10 text-center">
                  <CardTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">Evaluator Verdict</CardTitle>
                </CardHeader>
                <CardContent className="p-10 space-y-10">
                  {alreadyEvaluated ? (
                    <div className="py-12 text-center space-y-4 animate-in zoom-in duration-500">
                      <div className="h-24 w-24 bg-green-50 rounded-[2rem] flex items-center justify-center mx-auto shadow-sm">
                        <CheckCircle2 className="h-12 w-12 text-green-500" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xl font-black text-slate-900 uppercase tracking-tight">Review Recorded</p>
                        <p className="text-xs font-bold text-green-600 uppercase tracking-widest">Expert evaluation successfully logged</p>
                      </div>
                      <div className="pt-4 px-6">
                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed italic">
                          "You have already submitted your expert review for this phase. Your contribution is now being reviewed by the selection committee."
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {phase !== 'Phase 1' && (
                        <div className="space-y-4 text-center">
                          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Overall Marks (0-100)</Label>
                          <div className="relative flex justify-center">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={marks}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (val > 100) return;
                                setMarks(isNaN(val) ? '' : val);
                              }}
                              className="h-32 w-32 p-0 text-center text-6xl font-black rounded-[2rem] border-slate-100 bg-slate-50 focus:bg-white transition-all text-primary"
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Recommendation</Label>
                        <div className="grid grid-cols-1 gap-3">
                          {[
                            { id: 'Recommended', icon: ThumbsUp, color: 'text-green-600', active: 'bg-green-600 text-white border-green-600' },
                            { id: 'Not Recommended', icon: ThumbsDown, color: 'text-rose-600', active: 'bg-rose-600 text-white border-rose-600' },
                            { id: 'Revision Needed', icon: AlertCircle, color: 'text-orange-600', active: 'bg-orange-600 text-white border-orange-600' }
                          ].map((item) => (
                            <button
                              key={item.id}
                              onClick={() => setRecommendation(item.id)}
                              className={cn(
                                "flex items-center space-x-3 p-5 rounded-2xl border font-black text-xs uppercase tracking-tight transition-all",
                                recommendation === item.id ? item.active : "bg-white border-slate-100 text-slate-500 hover:border-primary/20"
                              )}
                            >
                              <item.icon className={cn("h-5 w-5", recommendation === item.id ? "text-white" : item.color)} />
                              <span>{item.id}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {(phase !== 'Phase 1' || recommendation === 'Revision Needed') && (
                        <div className="space-y-4">
                          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Comments</Label>
                          <Textarea
                            placeholder="Enter evaluation remarks..."
                            className="rounded-3xl min-h-[140px] border-slate-100 bg-slate-50 focus:bg-white transition-all p-6 font-medium text-slate-700"
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                          />
                        </div>
                      )}

                      <div className="space-y-3 pt-2">
                        <Button
                          onClick={handleSubmitEvaluation}
                          className="w-full h-16 rounded-3xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/30 transition-all"
                        >
                          Submit Evaluation
                        </Button>

                        <Button
                          onClick={handleMarkAbsent}
                          variant="outline"
                          className="w-full h-16 rounded-3xl border-rose-200 hover:bg-rose-50 hover:text-rose-700 text-rose-600 font-black uppercase tracking-widest text-xs transition-all"
                        >
                          Mark Candidate as Absent
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
