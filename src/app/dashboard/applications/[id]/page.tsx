'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ref, onValue, update, push, remove, set, get } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Application, UserProfile } from '@/types';
import { useAuthStore } from '@/store/authStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  CheckCircle2,
  Clock,
  FileText,
  Calendar,
  MessageCircle,
  Building2,
  MapPin,
  Users,
  ExternalLink,
  Download,
  Rocket,
  Activity,
  User,
  Edit3,
  Upload,
  Trash2,
  AlertTriangle,
  Hash,
  Sparkles,
  BrainCircuit,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { classifySector } from '@/lib/gemini';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function ApplicationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user } = useAuthStore();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [allEvaluations, setAllEvaluations] = useState<any[]>([]);

  // Edit states
  const [editingIdea, setEditingIdea] = useState(false);
  const [newIdea, setNewIdea] = useState('');
  const [newSolution, setNewSolution] = useState('');
  const [newStartupName, setNewStartupName] = useState('');
  const [newCurrentStage, setNewCurrentStage] = useState('');
  const [newTeamMembers, setNewTeamMembers] = useState<any[]>([]);
  const [newPitchDeck, setNewPitchDeck] = useState<File | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [revisionComments, setRevisionComments] = useState('');
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [phase2PPT, setPhase2PPT] = useState<File | null>(null);
  const [isUploadingPPT, setIsUploadingPPT] = useState(false);

  // Mentor Assignment states
  const [mentors, setMentors] = useState<UserProfile[]>([]);
  const [showCohortDialog, setShowCohortDialog] = useState(false);
  const [cohortMentorId, setCohortMentorId] = useState('');

  const handleUploadPhase2PPT = async () => {
    if (!phase2PPT || !id || !application) return;
    setIsUploadingPPT(true);
    try {
      const fileRef = storageRef(storage, `applications/${id}/phase2_ppt_${Date.now()}`);
      const snapshot = await uploadBytes(fileRef, phase2PPT);
      const downloadURL = await getDownloadURL(snapshot.ref);

      await update(ref(db, `applications/${id}/documents`), {
        phase2PPT: downloadURL,
      });

      // Notify Administrators (via Programme Manager if assigned)
      try {
        const progRef = ref(db, `programmes/${application.programmeId}`);
        const progSnapshot = await get(progRef);

        if (progSnapshot.exists()) {
          const managerId = progSnapshot.val().managerId;
          if (managerId) {
            const notifRef = ref(db, `notifications/${managerId}`);
            const newNotifRef = push(notifRef);
            await set(newNotifRef, {
              id: newNotifRef.key!,
              userId: managerId,
              title: 'Phase 2 PPT Submitted',
              message: `${application.userName} has submitted the Phase 2 Presentation for ${application.data?.startupTitle || application.programmeTitle}.`,
              type: 'info',
              read: false,
              timestamp: Date.now(),
              link: `/dashboard/applications/${id}`
            });
          }
        }
      } catch (notifError) {
        console.warn("Could not notify manager directly. Admin can still view PPT in application details.");
      }

      toast.success('Phase 2 PPT uploaded successfully');
      setPhase2PPT(null);
    } catch (error) {
      console.error('PPT Upload Error:', error);
      toast.error('Failed to upload PPT');
    } finally {
      setIsUploadingPPT(false);
    }
  };

  useEffect(() => {
    const appRef = ref(db, `applications/${id}`);
    const unsubscribe = onValue(appRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setApplication(data);
        setNewIdea(data.data?.problemStatement || '');
        setNewSolution(data.data?.solution || '');
        setNewStartupName(data.data?.startupName || data.data?.startupTitle || '');
        setNewCurrentStage(data.data?.currentStage || '');
        setNewTeamMembers(data.data?.teamMembers || []);

        // Extract meetings from application
        if (data.meetings) {
          setMeetings(Object.values(data.meetings));
        } else {
          setMeetings([]);
        }
      }
      setLoading(false);
    });

    const evalRef = ref(db, `evaluations/${id}`);
    const evalUnsubscribe = onValue(evalRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const evals: any[] = [];
        Object.entries(data).forEach(([evaluatorId, phases]: [string, any]) => {
          Object.entries(phases).forEach(([phaseKey, record]: [string, any]) => {
            evals.push({ ...record, phaseKey, evaluatorId });
          });
        });
        setAllEvaluations(evals.sort((a, b) => b.submittedAt - a.submittedAt));
      } else {
        setAllEvaluations([]);
      }
    });

    const usersRef = ref(db, 'users');
    const usersUnsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const mentorList = Object.values(data)
          .filter((u: any) => u.role === 'mentor') as UserProfile[];
        setMentors(mentorList);
      } else {
        setMentors([]);
      }
    });

    return () => {
      unsubscribe();
      evalUnsubscribe();
      usersUnsubscribe();
    };
  }, [id]);

  const updateStatus = async (newStatus: string, remarks?: string, mentorId?: string, mentorName?: string) => {
    if (!application || !user || user.role === 'user') return;

    try {
      const updates: any = {
        status: newStatus,
        updatedAt: Date.now(),
      };

      if (newStatus === 'Revision Needed') {
        updates.revisionRemarks = remarks;
      }

      if (newStatus === 'Cohort Selected' && mentorId && mentorName) {
        updates.mentorId = mentorId;
        updates.mentorName = mentorName;
      }

      const timelineRemark = remarks || (newStatus === 'Cohort Selected' && mentorName
        ? `Selected for Final Cohort and assigned mentor ${mentorName} by ${user.displayName}`
        : `Status updated to ${newStatus} by ${user.displayName}`);

      const newTimeline = [
        ...application.timeline || [],
        {
          status: newStatus,
          timestamp: Date.now(),
          remarks: timelineRemark
        }
      ];
      updates.timeline = newTimeline;

      await update(ref(db, `applications/${id}`), updates);

      // Push notification to applicant
      const notifRef = ref(db, `notifications/${application.userId}`);
      const newNotifRef = push(notifRef);
      await set(newNotifRef, {
        id: newNotifRef.key!,
        userId: application.userId,
        title: `Application Status Update`,
        message: newStatus === 'Phase 2 Selected'
          ? `Congratulations! You have been selected for Phase 2 for ${application.programmeTitle}. Please upload your Phase 2 PPT in the application portal.`
          : `Your application status for ${application.programmeTitle} has been updated to ${newStatus}.`,
        type: newStatus.includes('Rejected') ? 'error' : newStatus.includes('Selected') || newStatus === 'Incubated' ? 'success' : 'info',
        read: false,
        timestamp: Date.now(),
        link: `/dashboard/applications/${id}`
      });

      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleUpdateIdea = async () => {
    if (!id || !user) return;
    setIsUpdating(true);
    try {
      const updates: any = {
        'data/problemStatement': newIdea,
        'data/solution': newSolution,
        'data/startupName': newStartupName,
        'data/startupTitle': newStartupName,
        'data/currentStage': newCurrentStage,
        'data/teamMembers': newTeamMembers,
        updatedAt: Date.now()
      };

      if (newPitchDeck) {
        const fileRef = storageRef(storage, `applications/${id}/pitch_deck_${Date.now()}`);
        const snapshot = await uploadBytes(fileRef, newPitchDeck);
        const downloadURL = await getDownloadURL(snapshot.ref);
        updates['documents/pitchDeck'] = downloadURL;
      }

      await update(ref(db, `applications/${id}`), updates);
      toast.success('Application updated successfully');
      setEditingIdea(false);
    } catch (error) {
      toast.error('Failed to update application');
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse text-slate-400">Loading Application Details...</div>;
  if (!application) return <div className="p-8 text-center text-rose-500 font-bold">Application not found</div>;

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isOwner = user?.uid === application.userId;
  const isRevisionNeeded = application.status === 'Revision Needed';
  const canEdit = isOwner && (isRevisionNeeded || (meetings.length === 0 && (application.status === 'Submitted' || application.status === 'Under Review')));
  const data = application.data || {};
  const isGrowthPad = application.programmeId.toLowerCase().includes('growth');

  const handleDelete = async () => {
    if (user?.role !== 'super_admin' || !application) return;
    try {
      // Notify the applicant before deletion
      const notifRef = ref(db, `notifications/${application.userId}`);
      const newNotifRef = push(notifRef);
      await set(newNotifRef, {
        id: newNotifRef.key!,
        userId: application.userId,
        title: 'Application Record Removed',
        message: `Your application for ${application.programmeTitle} (${application.data?.startupTitle || 'Innovation'}) has been permanently removed from the portal by an administrator.`,
        type: 'error',
        read: false,
        timestamp: Date.now(),
        link: '/dashboard/applications'
      });

      await remove(ref(db, `applications/${id}`));
      toast.success('Application deleted permanently');
      router.push('/dashboard/applications');
    } catch (error) {
      toast.error('Failed to delete application');
    }
  };


  const handleAutoClassify = async () => {
    if (!application || !isAdmin) return;
    setIsClassifying(true);
    try {
      const sector = await classifySector(
        application.data?.startupTitle || application.programmeTitle,
        application.data?.briefDescription || application.data?.ideaDetails || ""
      );

      await update(ref(db, `applications/${id}`), {
        'data/sector': sector,
        updatedAt: Date.now()
      });

      toast.success(`AI Classified as ${sector}`);
    } catch (error) {
      toast.error('AI Classification failed');
    } finally {
      setIsClassifying(false);
    }
  };

  const handleSubmitRevision = async () => {
    if (!application || !user) return;
    setIsUpdating(true);
    try {
      const updates: any = {
        status: 'Revision Submitted',
        updatedAt: Date.now(),
      };

      const newTimeline = [
        ...application.timeline || [],
        {
          status: 'Revision Submitted',
          timestamp: Date.now(),
          remarks: `Revision submitted by applicant ${user.displayName}`
        }
      ];
      updates.timeline = newTimeline;

      await update(ref(db, `applications/${id}`), updates);
      toast.success('Revision submitted successfully! Your application is back in the review queue.');
    } catch (error) {
      toast.error('Failed to submit revision');
    } finally {
      setIsUpdating(false);
    }
  };

  const InfoBlock = ({ label, value, icon: Icon }: { label: string, value?: any, icon?: any }) => (
    <div className="space-y-1">
      <div className="flex items-center space-x-2 text-slate-400">
        {Icon && <Icon className="h-3 w-3" />}
        <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
      </div>
      {Array.isArray(value) ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {value.map((m: any, i: number) => (
            <div key={i} className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 flex flex-col group hover:border-primary/20 transition-colors">
              <span className="text-xs font-black text-slate-900">{m.name}</span>
              <span className="text-[10px] font-bold text-slate-500 mt-0.5">{m.email}</span>
              <span className="text-[10px] font-bold text-slate-400">{m.phone}</span>
            </div>
          ))}
          {value.length === 0 && <p className="text-xs text-slate-400 italic">No team members registered.</p>}
        </div>
      ) : (
        <p className="text-sm font-bold text-slate-900">{value || 'N/A'}</p>
      )}
    </div>
  );

  const hasChanges =
    newIdea !== (application.data?.problemStatement || '') ||
    newSolution !== (application.data?.solution || '') ||
    newStartupName !== (application.data?.startupName || application.data?.startupTitle || '') ||
    newCurrentStage !== (application.data?.currentStage || '') ||
    JSON.stringify(newTeamMembers) !== JSON.stringify(application.data?.teamMembers || []) ||
    newPitchDeck !== null;

  const revisionEvent = [...(application.timeline || [])].reverse().find(e => e.status === 'Revision Needed');
  const revisionTimestamp = revisionEvent?.timestamp || 0;
  const isDataUpdatedAfterRevision = application.updatedAt > revisionTimestamp;

  return (
    <div className="space-y-8 p-6 md:p-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-slate-900">{application.programmeTitle}</h1>
            <Badge className="bg-primary/10 text-primary border-none font-black px-4 py-1">
              {application.status.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center space-x-4 text-xs font-medium text-slate-400">
            <span className="flex items-center"><Hash className="h-3 w-3 mr-1" /> {application.id}</span>
            <span className="flex items-center"><Clock className="h-3 w-3 mr-1" /> Applied on {format(application.submittedAt, 'MMM dd, yyyy')}</span>
          </div>
        </div>

        {isOwner && isRevisionNeeded && (
          <Button
            className="rounded-xl h-12 px-8 bg-orange-600 hover:bg-orange-700 text-white font-black shadow-lg shadow-orange-200"
            onClick={handleSubmitRevision}
            disabled={isUpdating || !isDataUpdatedAfterRevision}
          >
            {isUpdating ? 'Submitting...' : 'Submit Final Revision'}
          </Button>
        )}

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-3">

            {/* Phase 1 Decision: Show if a Phase 1 meeting exists or it is Shortlisted by experts */}
            {(application.status === 'Submitted' || application.status === 'Under Review' || application.status === 'Shortlisted') && meetings.length > 0 && (
              <div className="flex gap-2">
                <Button className="rounded-xl h-11 bg-green-600 hover:bg-green-700 text-white border-none" onClick={() => updateStatus('Phase 2 Selected')}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Select for Phase 2
                </Button>
                <Button className="rounded-xl h-11 bg-rose-600 hover:bg-rose-700 text-white border-none" onClick={() => updateStatus('Phase 1 Rejected')}>
                  Reject Phase 1
                </Button>
              </div>
            )}

            {/* Phase 2 Decision: Show if a Phase 2 meeting exists and we haven't passed it */}
            {(application.status === 'Phase 2 Selected' || application.status === 'Phase 2 Evaluation') && meetings.some(m => m.title.toLowerCase().includes('phase 2')) && (
              <div className="flex gap-2">
                <Button className="rounded-xl h-11 bg-green-600 hover:bg-green-700 text-white border-none" onClick={() => setShowCohortDialog(true)}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Final Selection (Cohort)
                </Button>
                <Button className="rounded-xl h-11 bg-rose-600 hover:bg-rose-700 text-white border-none" onClick={() => updateStatus('Phase 2 Rejected')}>
                  Reject Phase 2
                </Button>
              </div>
            )}

            {application.status === 'Cohort Selected' && (
              <Button className="rounded-xl h-11 bg-primary font-black" onClick={() => updateStatus('Incubated')}>
                🚀 Mark Incubated
              </Button>
            )}

            {application.status !== 'Submitted' && application.status !== 'Under Review' && (
              <Dialog open={showRevisionDialog} onOpenChange={setShowRevisionDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="rounded-xl h-11 text-orange-600 hover:bg-orange-50">
                    Request Revision
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-[2rem] border-none shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-slate-900">Request Revision</DialogTitle>
                    <DialogDescription className="text-slate-500 font-medium pt-2">
                      Please specify what changes or clarifications are needed from the applicant.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Textarea
                      placeholder="Enter your feedback/instructions here..."
                      className="rounded-2xl min-h-[120px] bg-slate-50 border-none focus:ring-primary/20 p-4"
                      value={revisionComments}
                      onChange={(e) => setRevisionComments(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" className="rounded-xl" onClick={() => setShowRevisionDialog(false)}>Cancel</Button>
                    <Button
                      className="rounded-xl bg-orange-600 hover:bg-orange-700 font-bold"
                      onClick={() => {
                        updateStatus('Revision Needed', revisionComments);
                        setShowRevisionDialog(false);
                        setRevisionComments('');
                      }}
                      disabled={!revisionComments.trim()}
                    >
                      Send Feedback
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Mentor Assignment Dialog for Cohort Selection */}
            <Dialog open={showCohortDialog} onOpenChange={setShowCohortDialog}>
              <DialogContent className="rounded-[2rem] border-none shadow-2xl bg-white max-w-md w-full p-6">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black text-slate-900">Assign Mentor</DialogTitle>
                  <DialogDescription className="text-slate-500 font-medium pt-2">
                    Before marking this startup as "Cohort Selected", please assign a mentor from the available list of active mentors.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-6 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available Mentors</Label>
                    <Select onValueChange={(val) => setCohortMentorId(val || '')} value={cohortMentorId}>
                      <SelectTrigger className="w-full h-12 rounded-xl bg-slate-50 border-none focus:ring-primary/20 font-bold flex justify-between items-center px-4">
                        <SelectValue>
                          {cohortMentorId ? mentors.find(m => m.uid === cohortMentorId)?.displayName : "Choose a mentor..."}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-2xl border-none ring-1 ring-slate-100 bg-white p-1">
                        {mentors.length === 0 ? (
                          <SelectItem value="" disabled className="text-slate-400">No active mentors found</SelectItem>
                        ) : (
                          mentors.map(m => (
                            <SelectItem key={m.uid} value={m.uid} className="cursor-pointer hover:bg-slate-50 rounded-lg py-2 px-3">
                              {m.displayName}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="flex gap-2">
                  <Button variant="ghost" className="rounded-xl" onClick={() => {
                    setShowCohortDialog(false);
                    setCohortMentorId('');
                  }}>Cancel</Button>
                  <Button
                    className="rounded-xl bg-green-600 hover:bg-green-700 font-bold text-white px-6"
                    onClick={async () => {
                      const selectedMentor = mentors.find(m => m.uid === cohortMentorId);
                      if (selectedMentor) {
                        await updateStatus('Cohort Selected', undefined, selectedMentor.uid, selectedMentor.displayName);
                        setShowCohortDialog(false);
                        setCohortMentorId('');
                      } else {
                        toast.error('Please select a valid mentor');
                      }
                    }}
                    disabled={!cohortMentorId}
                  >
                    Approve & Assign Mentor
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {user?.role === 'super_admin' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="rounded-xl h-11 text-rose-600 hover:bg-rose-50">
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl">
                  <AlertDialogHeader>
                    <div className="h-12 w-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-4">
                      <AlertTriangle className="h-6 w-6" />
                    </div>
                    <AlertDialogTitle className="text-2xl font-black text-slate-900">Permanent Deletion</AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-500 font-medium pt-2">
                      This action cannot be undone. This will permanently delete the application for <strong>{application.data?.startupTitle || application.programmeTitle}</strong> and remove all associated records from our database.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="pt-6">
                    <AlertDialogCancel className="rounded-xl h-11 border-slate-200 font-bold">Cancel Action</AlertDialogCancel>
                    <AlertDialogAction
                      className="rounded-xl h-11 bg-rose-600 hover:bg-rose-700 font-bold"
                      onClick={handleDelete}
                    >
                      Confirm Deletion
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
      </div>

      {isOwner && isRevisionNeeded && application.revisionRemarks && (
        <div className="bg-orange-50 border border-orange-100 rounded-3xl p-8 flex items-start gap-4 animate-in slide-in-from-top-4 duration-500">
          <div className="h-10 w-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 flex-shrink-0">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-black text-orange-900  tracking-wider">Revision Feedback from PIERC:</h3>
            <p className="text-slate-700 font-medium leading-relaxed">"{application.revisionRemarks}"</p>
            <p className="text-xs text-orange-500 font-bold tracking-tight pt-2 italic">Please update your proposal details below as per feedback and click 'Submit Final Revision' to resubmit.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Applicant Profile Snapshot */}
          <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center">
                <User className="h-4 w-4 mr-2 text-primary" /> Applicant Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <InfoBlock label="Name" value={application.userName} />
              <InfoBlock label="Email" value={application.userEmail} />
              <InfoBlock label="Contact" value={application.userContact} />
              <InfoBlock label="Category" value={application.userCategory} />
              <InfoBlock label="Institute" value={application.userInstitute} />
              <InfoBlock label="Enrollment" value={application.userEnrollment} />
              <InfoBlock label="Gender" value={application.userGender} />
              <InfoBlock label="Social Category" value={application.userSocialCategory} />
              <InfoBlock label="Caste" value={application.userCaste} />
              {(application.status === 'Cohort Selected' || application.status === 'Incubated') && (
                <InfoBlock label="Assigned Mentor" value={application.mentorName || 'None'} icon={User} />
              )}
            </CardContent>
          </Card>

          {/* Startup Details */}
          <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center">
                <Building2 className="h-4 w-4 mr-2 text-primary" /> {isGrowthPad ? 'Startup Profile' : 'Innovation Details'}
              </CardTitle>
              {canEdit && !editingIdea && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl font-bold h-9 border-primary/20 text-primary hover:bg-primary hover:text-white transition-all"
                  onClick={() => setEditingIdea(true)}
                >
                  <Edit3 className="h-4 w-4 mr-2" /> Update Proposal
                </Button>
              )}
              {editingIdea && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="rounded-xl h-9" onClick={() => setEditingIdea(false)}>Cancel</Button>
                  <Button
                    size="sm"
                    className="rounded-xl h-9 font-bold px-4"
                    onClick={handleUpdateIdea}
                    disabled={isUpdating}
                  >
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {editingIdea ? (
                  <>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Startup Name</Label>
                      <Input
                        value={newStartupName}
                        onChange={(e) => setNewStartupName(e.target.value)}
                        className="rounded-xl bg-slate-50 border-none focus:ring-primary/20 h-11 font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Stage</Label>
                      <Input
                        value={newCurrentStage}
                        onChange={(e) => setNewCurrentStage(e.target.value)}
                        className="rounded-xl bg-slate-50 border-none focus:ring-primary/20 h-11 font-bold"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Team Members</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[9px] font-black uppercase tracking-widest rounded-lg"
                          onClick={() => setNewTeamMembers([...newTeamMembers, { name: '', email: '', phone: '' }])}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add Member
                        </Button>
                      </div>
                      <div className="border rounded-2xl overflow-hidden bg-slate-50/50">
                        <Table>
                          <TableHeader className="bg-slate-100/50">
                            <TableRow className="border-slate-100">
                              <TableHead className="text-[9px] font-black uppercase tracking-widest py-2">Name</TableHead>
                              <th className="text-[9px] font-black uppercase tracking-widest py-2 text-left px-4">Email</th>
                              <th className="text-right py-2 pr-4"></th>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {newTeamMembers.map((member, index) => (
                              <TableRow key={index} className="border-slate-100">
                                <TableCell className="py-2">
                                  <input
                                    className="bg-transparent border-none text-xs font-bold w-full focus:ring-0 outline-none"
                                    value={member.name}
                                    onChange={(e) => {
                                      const updated = [...newTeamMembers];
                                      updated[index].name = e.target.value;
                                      setNewTeamMembers(updated);
                                    }}
                                    placeholder="Name"
                                  />
                                </TableCell>
                                <TableCell className="py-2 px-4">
                                  <input
                                    className="bg-transparent border-none text-xs font-bold w-full focus:ring-0 outline-none"
                                    value={member.email}
                                    onChange={(e) => {
                                      const updated = [...newTeamMembers];
                                      updated[index].email = e.target.value;
                                      setNewTeamMembers(updated);
                                    }}
                                    placeholder="Email"
                                  />
                                </TableCell>
                                <TableCell className="py-2 text-right pr-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-50 rounded-lg"
                                    onClick={() => {
                                      const updated = [...newTeamMembers];
                                      updated.splice(index, 1);
                                      setNewTeamMembers(updated);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                            {newTeamMembers.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={3} className="py-4 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">
                                  No team members added
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <InfoBlock label="Startup Name" value={data.startupName || data.startupTitle} icon={Building2} />
                    {isGrowthPad ? (
                      <>
                        <InfoBlock label="Studio" value={data.startupStudio} icon={MapPin} />
                        <InfoBlock label="Founding Year" value={data.foundingYear} icon={Calendar} />
                        <InfoBlock label="Company Status" value={data.companyStatus} icon={Activity} />
                        <InfoBlock label="City HQ" value={data.cityHQ} icon={MapPin} />
                        <InfoBlock label="Sector" value={data.sector} icon={Hash} />
                      </>
                    ) : (
                      <>
                        <InfoBlock label="Current Stage" value={data.currentStage} icon={Activity} />
                        <div className="md:col-span-2">
                          <InfoBlock label="Team Members" value={data.teamMembers} icon={Users} />
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              <div className="space-y-6 pt-4 border-t">
                {editingIdea ? (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Problem Statement</Label>
                      <Textarea
                        value={newIdea}
                        onChange={(e) => setNewIdea(e.target.value)}
                        className="rounded-2xl min-h-[150px] bg-slate-50 border-none focus:ring-primary/20 p-4"
                        placeholder="What specific problem are you solving?"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Solution</Label>
                      <Textarea
                        value={newSolution}
                        onChange={(e) => setNewSolution(e.target.value)}
                        className="rounded-2xl min-h-[150px] bg-slate-50 border-none focus:ring-primary/20 p-4"
                        placeholder="How does your innovation solve the problem?"
                      />
                    </div>
                    {application.programmeId.trim().toLowerCase() !== 'incubation' && (
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Update Pitch Deck (Optional)</Label>
                        <div className="flex items-center gap-4">
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl h-12 flex-1 border-dashed bg-slate-50 border-slate-200"
                            onClick={() => document.getElementById('new-pitch')?.click()}
                          >
                            <Upload className="h-4 w-4 mr-2" /> {newPitchDeck ? newPitchDeck.name : 'Choose New PDF'}
                          </Button>
                          <input id="new-pitch" type="file" className="hidden" onChange={(e) => setNewPitchDeck(e.target.files?.[0] || null)} accept=".pdf" />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <InfoBlock label="Detailed Description / Problem Statement" value={data.description || data.problemStatement} />
                    {!isGrowthPad && (
                      <>
                        <InfoBlock label="Solution" value={data.solution} />
                        <InfoBlock label="Uniqueness" value={data.uniqueness} />
                      </>
                    )}
                  </>
                )}
              </div>

              {isGrowthPad && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
                  <InfoBlock label="Product Live" value={data.isProductLive} />
                  <InfoBlock label="Revenue" value={data.revenueGenerated} />
                  <InfoBlock label="Capital Goal" value={data.capitalToRaise} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents Section */}
          <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900">Submitted Documents</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {application.documents?.pitchDeck && (
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group transition-all hover:bg-white hover:shadow-md">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm text-primary">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">Pitch Deck.pdf</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Phase 1 Submission</p>
                    </div>
                  </div>
                  <Button variant="outline" className="rounded-xl" onClick={() => window.open(application.documents.pitchDeck, '_blank')}>
                    <Download className="mr-2 h-4 w-4" /> View / Download
                  </Button>
                </div>
              )}

              {application.documents?.phase2PPT && (
                <div className="flex items-center justify-between p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 group transition-all hover:bg-white hover:shadow-md">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm text-emerald-600">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">Phase 2 Presentation</p>
                    </div>
                  </div>
                  <Button variant="default" className="rounded-xl bg-emerald-600 hover:bg-emerald-700" onClick={() => window.open(application.documents.phase2PPT, '_blank')}>
                    <Download className="mr-2 h-4 w-4" /> View / Download
                  </Button>
                </div>
              )}

              {isOwner && application.status === 'Phase 2 Selected' && (
                <div className="mt-8 p-8 bg-orange-50/50 rounded-[2.5rem] border-2 border-dashed border-orange-200 flex flex-col items-center text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                  <div className="h-20 w-20 bg-white rounded-3xl flex items-center justify-center shadow-xl shadow-orange-200/50 text-orange-600">
                    <Upload className="h-10 w-10" />
                  </div>
                  <div className="max-w-xs">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Phase 2 Submission</h3>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-3">Upload your latest PPT to proceed with evaluation</p>
                  </div>

                  <input
                    id="phase2-ppt"
                    type="file"
                    className="hidden"
                    accept=".pdf,.pptx,.ppt"
                    onChange={(e) => setPhase2PPT(e.target.files?.[0] || null)}
                  />

                  <div className="flex flex-col gap-3 w-full max-w-sm">
                    <Button
                      variant="outline"
                      className="h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] border-orange-200 text-orange-600 hover:bg-orange-600 hover:text-white transition-all shadow-sm"
                      onClick={() => document.getElementById('phase2-ppt')?.click()}
                      disabled={isUploadingPPT}
                    >
                      {phase2PPT ? phase2PPT.name : 'Select Presentation File'}
                    </Button>

                    {phase2PPT && (
                      <Button
                        className="h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-orange-600 hover:bg-orange-700 text-white shadow-2xl shadow-orange-300 transition-all"
                        onClick={handleUploadPhase2PPT}
                        disabled={isUploadingPPT}
                      >
                        {isUploadingPPT ? 'Uploading...' : 'Confirm & Upload PPT'}
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-[9px] text-slate-400 font-black uppercase tracking-widest">
                    <span>PDF</span>
                    <span className="h-1 w-1 bg-slate-300 rounded-full" />
                    <span>PPTX</span>
                    <span className="h-1 w-1 bg-slate-300 rounded-full" />
                    <span>PPT</span>
                  </div>
                </div>
              )}

              {!application.documents?.pitchDeck && !application.documents?.phase2PPT && application.status !== 'Phase 2 Selected' && (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed text-slate-400 font-medium">
                  No documents uploaded with this application.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Meetings Section */}
          <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-primary" /> Associated Meetings & Interviews
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {meetings.length === 0 ? (
                <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-dashed text-slate-400 font-medium italic">
                  No meetings have been scheduled for this application yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {meetings.sort((a, b) => b.startTime - a.startTime).map((m: any) => (
                    <div key={m.id} className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-2">
                          <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] uppercase tracking-widest px-3">
                            {m.mode} Session
                          </Badge>
                          <h3 className="text-lg font-black text-slate-900">{m.title}</h3>
                          <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-500 uppercase tracking-tight">
                            <span className="flex items-center"><Clock className="h-3.5 w-3.5 mr-1.5 text-primary/60" /> {format(m.startTime, 'MMM dd, yyyy @ HH:mm')}</span>
                            <span className="flex items-center"><MapPin className="h-3.5 w-3.5 mr-1.5 text-primary/60" /> {m.location}</span>
                          </div>
                        </div>
                        <div className="flex -space-x-2">
                          {m.attendees?.map((uid: string, i: number) => (
                            <div key={i} title={uid} className="h-8 w-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-black uppercase shadow-sm overflow-hidden">
                              {uid.substring(0, 2)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {isAdmin && (
            <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden bg-gradient-to-br from-indigo-50/50 to-white">
              <CardHeader className="border-b bg-white/50">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center">
                  <Sparkles className="h-3 w-3 mr-2" /> AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Sector</p>
                  <p className="text-sm font-bold text-slate-900">{application.data?.sector || 'Unclassified'}</p>
                </div>
                <Button
                  onClick={handleAutoClassify}
                  disabled={isClassifying}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold h-10 text-[11px] uppercase tracking-wider"
                >
                  {isClassifying ? (
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Classifying...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="h-4 w-4" /> Auto-Classify Sector
                    </div>
                  )}
                </Button>
                <p className="text-[9px] text-slate-400 font-medium italic">Gemini AI analyzes startup description to categorize the venture.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Timeline & Meta */}
        <div className="space-y-8">
          <Card className="border-none shadow-sm ring-1 ring-slate-200">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-8 pl-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                {(application.timeline || []).map((event: any, i: number) => (
                  <div key={i} className="relative group">
                    <div className={cn(
                      "absolute -left-[31px] top-1 h-6 w-6 rounded-full border-4 border-white flex items-center justify-center shadow-sm",
                      i === application.timeline!.length - 1 ? "bg-primary" : "bg-slate-200"
                    )} />
                    <div className="space-y-1">
                      <p className="text-xs font-black text-slate-900">{event.status}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{format(event.timestamp, 'MMM dd, yyyy • HH:mm')}</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed italic mt-1 bg-slate-50 p-2 rounded-lg">{event.remarks}</p>
                    </div>
                  </div>
                )).reverse()}
              </div>
            </CardContent>
          </Card>

          {isAdmin && (
            <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center">
                  <Activity className="h-4 w-4 mr-2 text-primary" /> Evaluation Records
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {allEvaluations.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-medium italic">No evaluations recorded yet.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {allEvaluations.map((ev, i) => {
                      const isPhase1 = ev.phaseKey === 'Phase_1' || ev.phase === 'Phase 1' || ev.phaseKey?.toLowerCase().includes('phase_1') || ev.phaseKey?.toLowerCase().includes('phase 1');
                      return (
                        <div key={i} className="p-6 space-y-4 hover:bg-slate-50/50 transition-colors">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs font-black text-slate-900">{ev.evaluatorName}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{ev.phaseKey?.replace('_', ' ')}</p>
                            </div>
                            {!isPhase1 && (
                              <Badge className={cn(
                                "border-none font-black text-[9px] uppercase",
                                ev.recommendation === 'Recommended' ? "bg-green-100 text-green-600" :
                                  ev.recommendation === 'Revision Needed' ? "bg-orange-100 text-orange-600" :
                                    "bg-rose-100 text-rose-600"
                              )}>
                                {ev.marks}/100
                              </Badge>
                            )}
                          </div>
                          {!isPhase1 && ev.remarks && (
                            <div className="bg-white p-4 rounded-2xl border border-slate-100">
                              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter mb-2">Mentor Remarks</p>
                              <p className="text-xs text-slate-600 leading-relaxed italic">"{ev.remarks}"</p>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-[8px] font-black uppercase tracking-tighter border-slate-200 text-slate-400">
                              {format(ev.submittedAt, 'MMM dd, HH:mm')}
                            </Badge>
                            <span className={cn(
                              "text-[10px] font-black uppercase",
                              ev.recommendation === 'Recommended' ? "text-green-600" :
                                ev.recommendation === 'Revision Needed' ? "text-orange-600" :
                                  "text-rose-600"
                            )}>{ev.recommendation}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {isAdmin && (
            <Card className="border-none shadow-sm ring-1 ring-slate-200 bg-primary text-white overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Rocket className="h-24 w-24" />
              </div>
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-widest">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 relative z-10">
                <Link href={`/dashboard/messages?userId=${application.userId}`} className="block w-full">
                  <Button
                    className="w-full bg-white text-primary hover:bg-white/90 rounded-xl font-bold h-11"
                    variant="secondary"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" /> Message Applicant
                  </Button>
                </Link>
                <Link href="/dashboard/meetings" className="block w-full">
                  <Button className="w-full bg-white/10 hover:bg-white/20 text-white border-none rounded-xl font-bold h-11">
                    <Calendar className="mr-2 h-4 w-4" /> Schedule Interview
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

