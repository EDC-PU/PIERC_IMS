'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Application, Meeting, UserProfile } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Check, 
  Rocket, 
  FileText, 
  Video, 
  Award, 
  Coins, 
  ArrowRight, 
  Sparkles, 
  Clock, 
  AlertCircle, 
  ChevronRight, 
  Calendar, 
  ShieldCheck, 
  ExternalLink,
  Lock,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface FounderMilestoneTrackerProps {
  user: UserProfile;
  latestApp?: Application;
  meetings: Meeting[];
  evaluations: any;
}

interface MilestoneStage {
  id: string;
  stageNumber: number;
  title: string;
  shortLabel: string;
  duration: string;
  icon: any;
  description: string;
  deliverables: string[];
  perksUnlocked: string[];
  status: 'completed' | 'current' | 'upcoming' | 'action_needed';
}

export default function FounderMilestoneTracker({
  user,
  latestApp,
  meetings,
  evaluations
}: FounderMilestoneTrackerProps) {
  const router = useRouter();

  // Find relevant scheduled meetings
  const phase1Meeting = meetings.find(m => m && m.title?.toLowerCase().includes('phase 1'));
  const phase2Meeting = meetings.find(m => m && m.title?.toLowerCase().includes('phase 2'));
  const nextMeeting = meetings.find(m => m && m.startTime && m.startTime > Date.now());

  // Determine stage statuses based on actual Firestore application & evaluation states
  const appStatus = latestApp?.status || '';
  const isRevisionNeeded = appStatus === 'Revision Needed';

  // Helper flags
  const isSubmitted = !!latestApp && appStatus !== 'Draft';
  const isPhase1Done = [
    'Phase 2 Selected', 
    'Phase 2 Evaluation', 
    'Cohort Selected', 
    'Incubated'
  ].includes(appStatus) || !!evaluations.Phase_1;

  const isPhase1Active = (isSubmitted && !isPhase1Done) || appStatus === 'Phase 1 Evaluation' || !!phase1Meeting;

  const isPhase2Done = [
    'Cohort Selected', 
    'Incubated'
  ].includes(appStatus) || !!evaluations.Phase_2;

  const isPhase2Active = (isPhase1Done && !isPhase2Done) || appStatus === 'Phase 2 Evaluation' || !!phase2Meeting;

  const isCohortSelected = ['Cohort Selected', 'Incubated'].includes(appStatus);
  const isCohortActive = isPhase2Done && !isCohortSelected;

  const isIncubated = appStatus === 'Incubated';
  const isIncubatedActive = isCohortSelected && !isIncubated;

  // Stages configuration
  const stages: MilestoneStage[] = [
    {
      id: 'screening',
      stageNumber: 1,
      title: 'Application & Screening',
      shortLabel: 'Screening',
      duration: 'Week 1 - 2',
      icon: FileText,
      description: 'Your startup submission is audited by the PIERC scrutiny committee for initial eligibility, prototype viability, and domain alignment.',
      deliverables: ['Startup Value Proposition', 'Founding Team Credentials', 'Initial Pitch Deck'],
      perksUnlocked: ['Direct access to PIERC community', 'Official Application ID', 'Scrutiny audit review'],
      status: isSubmitted 
        ? (isPhase1Done || isPhase1Active ? 'completed' : 'current') 
        : (isRevisionNeeded ? 'action_needed' : 'current'),
    },
    {
      id: 'phase1_pitch',
      stageNumber: 2,
      title: 'Phase 1 Committee Pitch',
      shortLabel: 'Phase 1 Pitch',
      duration: 'Week 3 - 4',
      icon: Video,
      description: 'Present your prototype and problem statement in a 10-minute live presentation before the internal evaluation panel.',
      deliverables: ['Live Pitch Deck Presentation', 'Product / Architecture Demo', 'Q&A Defense'],
      perksUnlocked: ['1-on-1 Evaluator Feedback Report', 'Shortlisting for Seed Grants'],
      status: isPhase1Done 
        ? 'completed' 
        : (isPhase1Active ? (isRevisionNeeded ? 'action_needed' : 'current') : 'upcoming'),
    },
    {
      id: 'phase2_diligence',
      stageNumber: 3,
      title: 'Phase 2 Due Diligence',
      shortLabel: 'Deep Diligence',
      duration: 'Week 5 - 6',
      icon: ShieldCheck,
      description: 'Deep technical and commercial evaluation with senior external industry mentors, patent attorneys, and sector specialists.',
      deliverables: ['Financial & Cost Projections', 'Intellectual Property Roadmap', 'Pilot Traction Review'],
      perksUnlocked: ['Patent Filing Grant Eligibility', 'Industry Expert Advisory Access'],
      status: isPhase2Done 
        ? 'completed' 
        : (isPhase2Active ? 'current' : 'upcoming'),
    },
    {
      id: 'cohort_induction',
      stageNumber: 4,
      title: 'Cohort Induction',
      shortLabel: 'Final Induction',
      duration: 'Week 7',
      icon: Award,
      description: 'Official selection into the PIERC Incubation Cohort. Finalization of the incubation agreement and milestones roadmap.',
      deliverables: ['Incubation Agreement Signoff', 'Quarterly Milestone Setting', 'Co-Founder Equity Deed'],
      perksUnlocked: ['Dedicated Co-Working & Prototyping Lab Space', 'Official PIERC Incubatee Badge'],
      status: isCohortSelected 
        ? 'completed' 
        : (isCohortActive ? 'current' : 'upcoming'),
    },
    {
      id: 'active_incubation',
      stageNumber: 5,
      title: 'Grants & Incubation',
      shortLabel: 'Incubated & Scaling',
      duration: '6 - 12 Months',
      icon: Rocket,
      description: 'Full-throttle incubation backing. Seed grant milestone tranches, prototyping lab access, and VC demo day presentations.',
      deliverables: ['Milestone Expenditure Audits', 'Monthly Traction Reports', 'Investor Demo Day Pitch'],
      perksUnlocked: ['Up to ₹5 Lakhs Seed Grants', 'Access to Startup Nivesh Angel Syndicate', 'Cloud & Tech Credits'],
      status: isIncubated 
        ? 'completed' 
        : (isIncubatedActive ? 'current' : 'upcoming'),
    },
  ];

  // Active step selection (for the bottom detailed expansion)
  const currentStageIndex = stages.findIndex(s => s.status === 'current' || s.status === 'action_needed');
  const activeIndex = currentStageIndex !== -1 ? currentStageIndex : (isIncubated ? 4 : 0);
  const [selectedStageIndex, setSelectedStageIndex] = useState<number>(activeIndex);

  const activeStage = stages[selectedStageIndex];

  // Calculate percentage of journey completed
  const completedCount = stages.filter(s => s.status === 'completed').length;
  const progressPercent = Math.min(100, Math.round(((completedCount + (stages[activeIndex]?.status === 'current' ? 0.5 : 0)) / stages.length) * 100));

  return (
    <Card className="border-none shadow-xl ring-1 ring-slate-200/90 rounded-3xl overflow-hidden bg-white">
      
      {/* Top Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded-md bg-primary/20 text-primary">
                <Rocket className="h-4 w-4" />
              </span>
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-300">
                Founder Incubation Pipeline
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {latestApp ? (latestApp.data?.startupTitle || (latestApp as any).startupTitle || latestApp.data?.startupName || 'Your Venture Journey') : 'Launch Your Startup Journey'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-xl">
              Track your real-time incubation milestones from initial screening to prototyping grants and demo days.
            </p>
          </div>

          {/* Overall Progress Gauge */}
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-white/10 shrink-0">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">Journey Progress</span>
                <span className="text-xs font-black text-white">{progressPercent}%</span>
              </div>
              <div className="w-36 h-2 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 via-rose-500 to-primary rounded-full transition-all duration-700 ease-out" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-300 font-medium">
                Stage {activeIndex + 1} of 5: <span className="font-bold text-white">{stages[activeIndex]?.shortLabel}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Stepper Timeline */}
      <div className="p-6 sm:p-8 bg-slate-50/50 border-b border-slate-100 overflow-x-auto">
        <div className="min-w-[680px]">
          <div className="relative flex items-center justify-between">
            
            {/* Background Connector Line */}
            <div className="absolute top-5 left-8 right-8 h-1 bg-slate-200 -z-0 rounded-full" />
            
            {/* Colored Active Connector Line */}
            <div 
              className="absolute top-5 left-8 h-1 bg-gradient-to-r from-emerald-500 via-rose-500 to-primary -z-0 rounded-full transition-all duration-500" 
              style={{ width: `${(Math.max(0, completedCount) / (stages.length - 1)) * 90}%` }}
            />

            {stages.map((stage, idx) => {
              const isSelected = selectedStageIndex === idx;
              const IconComp = stage.icon;

              return (
                <div 
                  key={stage.id} 
                  className="relative z-10 flex flex-col items-center cursor-pointer group"
                  onClick={() => setSelectedStageIndex(idx)}
                >
                  {/* Stepper Node Circle */}
                  <div className={cn(
                    "w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-xs transition-all duration-300 shadow-sm",
                    stage.status === 'completed' && "bg-emerald-500 text-white shadow-emerald-500/25 ring-4 ring-emerald-50 hover:scale-105",
                    stage.status === 'current' && "bg-primary text-white shadow-primary/30 ring-4 ring-primary/15 animate-pulse hover:scale-105",
                    stage.status === 'action_needed' && "bg-amber-500 text-white shadow-amber-500/25 ring-4 ring-amber-100 animate-bounce",
                    stage.status === 'upcoming' && "bg-white text-slate-400 border border-slate-200 hover:border-slate-300 group-hover:scale-105",
                    isSelected && "ring-4 ring-slate-900/10 scale-110"
                  )}>
                    {stage.status === 'completed' ? (
                      <Check className="h-5 w-5 stroke-[3]" />
                    ) : stage.status === 'action_needed' ? (
                      <AlertCircle className="h-5 w-5" />
                    ) : (
                      <IconComp className="h-5 w-5" />
                    )}
                  </div>

                  {/* Stage Label */}
                  <div className="text-center mt-3 space-y-0.5">
                    <p className={cn(
                      "text-xs font-black uppercase tracking-tight transition-colors",
                      isSelected ? "text-primary" : (stage.status === 'upcoming' ? "text-slate-400" : "text-slate-800")
                    )}>
                      {stage.shortLabel}
                    </p>
                    <span className="text-[10px] font-bold text-slate-400 block">
                      {stage.duration}
                    </span>
                  </div>

                  {/* Stage Status Badge */}
                  <div className="mt-1.5">
                    {stage.status === 'completed' && (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-black uppercase px-2 py-0.5">
                        Cleared
                      </Badge>
                    )}
                    {stage.status === 'current' && (
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase px-2 py-0.5">
                        Active
                      </Badge>
                    )}
                    {stage.status === 'action_needed' && (
                      <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] font-black uppercase px-2 py-0.5 animate-pulse">
                        Action Due
                      </Badge>
                    )}
                    {stage.status === 'upcoming' && (
                      <span className="text-[9px] font-bold text-slate-300 uppercase">
                        Locked
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interactive Detail Box for Selected Stage */}
      <div className="p-6 sm:p-8 bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Stage Overview & Deliverables (Left 8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm",
                  activeStage.status === 'completed' ? "bg-emerald-100 text-emerald-700" :
                  activeStage.status === 'current' ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500"
                )}>
                  {activeStage.stageNumber}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">
                    {activeStage.title}
                  </h3>
                  <span className="text-xs text-slate-400 font-semibold">
                    Expected Timeline: {activeStage.duration}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeStage.status === 'completed' && (
                  <Badge className="bg-emerald-500 text-white font-bold text-xs px-3 py-1">
                    ✓ Stage Completed
                  </Badge>
                )}
                {activeStage.status === 'current' && (
                  <Badge className="bg-primary text-white font-bold text-xs px-3 py-1 shadow-sm shadow-primary/20">
                    ● Currently in Progress
                  </Badge>
                )}
                {activeStage.status === 'action_needed' && (
                  <Badge className="bg-amber-500 text-white font-bold text-xs px-3 py-1">
                    ⚠️ Action Required
                  </Badge>
                )}
                {activeStage.status === 'upcoming' && (
                  <Badge variant="outline" className="text-slate-400 border-slate-200 text-xs px-3 py-1 font-semibold">
                    🔒 Upcoming Stage
                  </Badge>
                )}
              </div>
            </div>

            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              {activeStage.description}
            </p>

            {/* Deliverables Checklist */}
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Key Deliverables & Assessment Criteria
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {activeStage.deliverables.map((item, i) => (
                  <div 
                    key={i} 
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-2.5"
                  >
                    <CheckCircle2 className={cn(
                      "h-4 w-4 shrink-0 mt-0.5",
                      activeStage.status === 'completed' ? "text-emerald-500" : "text-primary"
                    )} />
                    <span className="text-xs font-bold text-slate-800 leading-snug">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Meeting Schedule Notice if present in this stage */}
            {activeStage.stageNumber === 2 && phase1Meeting && (
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-blue-500 text-white">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-blue-950">Phase 1 Pitch Session Scheduled</p>
                    <p className="text-[11px] text-blue-700 font-medium mt-0.5">
                      {format(phase1Meeting.startTime, 'EEEE, MMM dd • hh:mm a')}
                    </p>
                  </div>
                </div>
                {phase1Meeting.link && (
                  <a
                    href={phase1Meeting.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs font-bold bg-blue-600 text-white px-3.5 py-2 rounded-xl shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-colors"
                  >
                    <Video className="h-3.5 w-3.5 mr-1.5" /> Join Session
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Stage Perks & Direct Action CTA (Right 4 cols) */}
          <div className="lg:col-span-4 space-y-6 lg:border-l lg:border-slate-100 lg:pl-8">
            
            {/* Unlocked Perks Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/5 via-slate-50 to-rose-50/30 border border-primary/10 space-y-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Milestone Unlocks
                </span>
              </div>
              <ul className="space-y-2 text-xs font-semibold text-slate-600">
                {activeStage.perksUnlocked.map((perk, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary font-bold">✦</span>
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Stage Action CTA */}
            <div className="space-y-2">
              {!latestApp ? (
                <Link href="/dashboard/programmes/incubation/apply" className="block">
                  <Button className="w-full h-12 rounded-xl font-black bg-primary text-white shadow-lg shadow-primary/25 hover:shadow-primary/35 transition-all text-xs">
                    Start Incubation Application <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </Link>
              ) : isRevisionNeeded ? (
                <Link href={`/dashboard/applications/${latestApp.id}`} className="block">
                  <Button className="w-full h-12 rounded-xl font-black bg-amber-500 text-white shadow-lg shadow-amber-500/25 hover:bg-amber-600 transition-all text-xs">
                    <AlertCircle className="h-4 w-4 mr-1.5" /> Submit Required Revisions
                  </Button>
                </Link>
              ) : (
                <Link href={`/dashboard/applications/${latestApp.id}`} className="block">
                  <Button 
                    variant="outline" 
                    className="w-full h-12 rounded-xl font-bold border-slate-200 hover:bg-slate-50 text-slate-800 text-xs shadow-xs"
                  >
                    View Application & Scorecards <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              )}

              <p className="text-[10px] text-center text-slate-400 font-medium">
                Need guidance? Reach out to the incubation cell at <span className="underline">pierc@paruluniversity.ac.in</span>
              </p>
            </div>

          </div>

        </div>
      </div>

    </Card>
  );
}
