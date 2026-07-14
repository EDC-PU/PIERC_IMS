'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, onSnapshot, getDoc, getDocs, updateDoc, deleteDoc, collection, query, where, addDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Application, UserProfile, Cohort, GrantTransaction } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { triggerEmailNotification } from '@/lib/email-client';
import { getStatusUpdateEmailHtml, getApplicationUpdatedEmailHtml, getApplicationRemovedEmailHtml, getEmailHtmlTemplate } from '@/lib/email-templates';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Loader2,
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
  Plus,
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  Layers,
  MessageSquare,
  Coins,
  Check,
  X,
  Search,
  Receipt
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
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
  const [assignedCohort, setAssignedCohort] = useState<Cohort | null>(null);

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

  // Yukti Portal Credential states
  const [yuktiId, setYuktiId] = useState('');
  const [yuktiPassword, setYuktiPassword] = useState('');
  const [isSavingYukti, setIsSavingYukti] = useState(false);
  const [showYuktiPassword, setShowYuktiPassword] = useState(false);

  // Mentor Assignment states
  const [mentors, setMentors] = useState<UserProfile[]>([]);
  const [showCohortDialog, setShowCohortDialog] = useState(false);
  const [cohortMentorId, setCohortMentorId] = useState('');
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState('');

  // Incubation states
  const [showIncubationDialog, setShowIncubationDialog] = useState(false);
  const [incubationType, setIncubationType] = useState<'Only Incubation' | 'Selected for Funding' | 'On Hold'>('Only Incubation');
  const [fundingPhases, setFundingPhases] = useState<{ phaseName: string; amount: number }[]>([
    { phaseName: 'Phase 1', amount: 0 },
    { phaseName: 'Phase 2', amount: 0 },
    { phaseName: 'Phase 3', amount: 0 },
  ]);
  const [fundingSource, setFundingSource] = useState('SSIP PU');

  // Monthly report states (for editing)
  const [activeReportMonth, setActiveReportMonth] = useState<'month1' | 'month2' | 'month3'>('month1');
  const [reportProgress, setReportProgress] = useState('');
  const [reportMarketVal, setReportMarketVal] = useState('');
  const [isSavingReport, setIsSavingReport] = useState(false);

  // Incubation Profile & Milestone States
  const [editingIncubatedDetails, setEditingIncubatedDetails] = useState(false);
  const [dpiitNumber, setDpiitNumber] = useState('');
  const [sector, setSector] = useState('General');
  const [isSavingIncubatedDetails, setIsSavingIncubatedDetails] = useState(false);
  const [incorporationFile, setIncorporationFile] = useState<File | null>(null);

  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDesc, setNewMilestoneDesc] = useState('');
  const [newMilestonePhase, setNewMilestonePhase] = useState<'Phase 1' | 'Phase 2' | 'Incubation' | 'Graduation'>('Incubation');
  const [newMilestoneDueDate, setNewMilestoneDueDate] = useState('');
  const [isSavingMilestone, setIsSavingMilestone] = useState(false);

  // Milestone completion states
  const [completingMilestone, setCompletingMilestone] = useState<any | null>(null);
  const [completionDetails, setCompletionDetails] = useState('');
  const [completionDocFile, setCompletionDocFile] = useState<File | null>(null);
  const [isCompletingMilestone, setIsCompletingMilestone] = useState(false);

  // Transaction logging states
  const [transactions, setTransactions] = useState<GrantTransaction[]>([]);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [txVendorName, setTxVendorName] = useState('');
  const [txGstNumber, setTxGstNumber] = useState('');
  const [txInvoiceDate, setTxInvoiceDate] = useState('');
  const [txInvoiceFile, setTxInvoiceFile] = useState<File | null>(null);
  const [txAmount, setTxAmount] = useState('');
  const [txDescription, setTxDescription] = useState('');
  const [isSavingTransaction, setIsSavingTransaction] = useState(false);
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [txSelectedPhase, setTxSelectedPhase] = useState('');
  const [txUploading, setTxUploading] = useState(false);
  const [txSearchQuery, setTxSearchQuery] = useState('');
  const [txStatusFilter, setTxStatusFilter] = useState('all');

  // Onboarding upload state
  const [uploadingDocKey, setUploadingDocKey] = useState<string | null>(null);

  const handleSaveYuktiCredentials = async () => {
    if (!yuktiId.trim() || !yuktiPassword.trim()) {
      toast.error('Please enter both your Yukti Portal ID and password.');
      return;
    }
    setIsSavingYukti(true);
    try {
      await updateDoc(doc(db, 'applications', id), {
        'documents.yuktiPortalId': yuktiId.trim(),
        'documents.yuktiPortalPassword': yuktiPassword.trim(),
        updatedAt: Date.now(),
      });

      // Notify super admins and assigned mentor
      try {
        // Notify programme manager / super admin via programme
        const progSnap = await getDoc(doc(db, 'programmes', application!.programmeId));
        if (progSnap.exists()) {
          const managerId = progSnap.data().managerId;
          if (managerId) {
            await addDoc(collection(db, 'notifications', managerId, 'items'), {
              userId: managerId,
              title: 'Yukti Portal Credentials Submitted',
              message: `${application!.userName} has submitted their Yukti Portal credentials for ${application!.programmeTitle}.`,
              type: 'info',
              read: false,
              timestamp: Date.now(),
              link: `/dashboard/applications/${id}`,
            });
          }
        }

        // Notify assigned mentor if any
        if (application!.mentorId) {
          await addDoc(collection(db, 'notifications', application!.mentorId, 'items'), {
            userId: application!.mentorId,
            title: 'Yukti Portal Credentials Submitted',
            message: `${application!.userName} has submitted their Yukti Portal credentials. Please review.`,
            type: 'info',
            read: false,
            timestamp: Date.now(),
            link: `/dashboard/applications/${id}`,
          });
        }
      } catch (notifErr) {
        console.warn('Could not send Yukti notification:', notifErr);
      }

      toast.success('Yukti Portal credentials saved successfully!');
      setYuktiId('');
      setYuktiPassword('');
    } catch (err) {
      console.error('Yukti Save Error:', err);
      toast.error('Failed to save credentials. Please try again.');
    } finally {
      setIsSavingYukti(false);
    }
  };

  const handleUploadPhase2PPT = async () => {
    if (!phase2PPT || !id || !application) return;
    setIsUploadingPPT(true);
    try {
      const fileRef = storageRef(storage, `applications/${id}/phase2_ppt_${Date.now()}`);
      const snapshot = await uploadBytes(fileRef, phase2PPT);
      const downloadURL = await getDownloadURL(snapshot.ref);

      await updateDoc(doc(db, 'applications', id), {
        'documents.phase2PPT': downloadURL,
      });

      // Notify Administrators (via Programme Manager if assigned)
      try {
        const progSnap = await getDoc(doc(db, 'programmes', application.programmeId));

        if (progSnap.exists()) {
          const managerId = progSnap.data().managerId;
          if (managerId) {
            await addDoc(collection(db, 'notifications', managerId, 'items'), {
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
    // 1. Fetch application details
    const appDocRef = doc(db, 'applications', id);
    const unsubscribe = onSnapshot(appDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = { id: snapshot.id, ...snapshot.data() } as Application;
        setApplication(data);
        setNewIdea(data.data?.problemStatement || '');
        setNewSolution(data.data?.solution || '');
        setNewStartupName(data.data?.startupName || data.data?.startupTitle || '');
        setNewCurrentStage(data.data?.currentStage || '');
        setNewTeamMembers(data.data?.teamMembers || []);
        setDpiitNumber(data.data?.dpiitNumber || '');
        setSector(data.data?.sector || 'General');
      }
      setLoading(false);
    });

    // 2. Fetch meetings for this application
    const meetingsCol = collection(db, 'meetings');
    const meetingsQuery = query(meetingsCol, where('applicationId', '==', id));
    const unsubscribeMeetings = onSnapshot(meetingsQuery, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMeetings(list);
    });

    // 3. Fetch evaluations for this application
    const evalCol = collection(db, 'evaluations');
    const evalQuery = query(evalCol, where('applicationId', '==', id));
    const evalUnsubscribe = onSnapshot(evalQuery, (snapshot) => {
      const evals = snapshot.docs.map(doc => doc.data());
      setAllEvaluations(evals.sort((a, b) => b.submittedAt - a.submittedAt));
    });

    // 4. Fetch mentors from users collection (Admins only)
    let usersUnsubscribe = () => { };
    if (user?.role === 'admin' || user?.role === 'super_admin') {
      const usersCol = collection(db, 'users');
      usersUnsubscribe = onSnapshot(usersCol, (snapshot) => {
        const mentorList = snapshot.docs
          .map(doc => doc.data() as UserProfile)
          .filter(u => u.role === 'mentor');
        setMentors(mentorList);
      });
    }

    // 5. Fetch cohorts (Admins only)
    let cohortsUnsubscribe = () => { };
    if (user?.role === 'admin' || user?.role === 'super_admin') {
      const cohortsCol = collection(db, 'cohorts');
      cohortsUnsubscribe = onSnapshot(cohortsCol, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCohorts(list);
      });
    }

    // 6. Fetch transactions for this application
    const transCol = collection(db, 'transactions');
    const transQuery = query(transCol, where('applicationId', '==', id));
    const unsubscribeTrans = onSnapshot(transQuery, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as GrantTransaction[];
      setTransactions(list.sort((a, b) => b.createdAt - a.createdAt));
    }, (error) => {
      console.error("Error loading transactions in detail page: ", error);
    });

    return () => {
      unsubscribe();
      unsubscribeMeetings();
      evalUnsubscribe();
      usersUnsubscribe();
      cohortsUnsubscribe();
      unsubscribeTrans();
    };
  }, [id, user]);

  useEffect(() => {
    if (application?.monthlyReports?.[activeReportMonth]) {
      setReportProgress(application.monthlyReports[activeReportMonth].progressReport || '');
      setReportMarketVal(application.monthlyReports[activeReportMonth].marketValidationUpdate || '');
    } else {
      setReportProgress('');
      setReportMarketVal('');
    }
  }, [application, activeReportMonth]);

  useEffect(() => {
    if (!application?.cohortId) {
      setAssignedCohort(null);
      return;
    }
    const cohortDocRef = doc(db, 'cohorts', application.cohortId);
    const unsubscribe = onSnapshot(cohortDocRef, (snapshot) => {
      if (snapshot.exists()) {
        setAssignedCohort({ id: snapshot.id, ...snapshot.data() } as Cohort);
      }
    });
    return () => unsubscribe();
  }, [application?.cohortId]);

  const handleSaveMonthlyReport = async () => {
    if (!reportProgress.trim() || !reportMarketVal.trim()) {
      toast.error('Please fill out both the Progress Report and Market Validation Update.');
      return;
    }

    const today = new Date();
    const day = today.getDate();
    if (day < 1 || day > 8) {
      toast.error('Submission window is locked. Updates are only allowed between the 1st and 8th of every month.');
      return;
    }

    setIsSavingReport(true);
    try {
      const reports = application?.monthlyReports || {};
      const updatedReports = {
        ...reports,
        [activeReportMonth]: {
          progressReport: reportProgress.trim(),
          marketValidationUpdate: reportMarketVal.trim(),
          updatedAt: Date.now(),
        }
      };

      await updateDoc(doc(db, 'applications', id), {
        monthlyReports: updatedReports,
        updatedAt: Date.now(),
      });

      toast.success('Monthly progress report saved successfully!');
      sendMailNotification('report', `Submitted monthly progress report for ${activeReportMonth}`);
    } catch (err) {
      console.error('Save Report Error:', err);
      toast.error('Failed to save monthly report. Please try again.');
    } finally {
      setIsSavingReport(false);
    }
  };

  const getAdminAndMentorEmails = async (): Promise<string[]> => {
    const emails: string[] = [];
    try {
      const usersCol = collection(db, 'users');
      const usersSnap = await getDocs(usersCol);
      usersSnap.docs.forEach(docSnap => {
        const u = docSnap.data();
        if ((u.role === 'admin' || u.role === 'super_admin') && u.email) {
          emails.push(u.email.trim());
        }
      });

      if (application?.mentorEmail) {
        emails.push(application.mentorEmail.trim());
      } else if (application?.mentorId) {
        const mentorSnap = await getDoc(doc(db, 'users', application.mentorId));
        if (mentorSnap.exists() && mentorSnap.data().email) {
          emails.push(mentorSnap.data().email.trim());
        }
      }
    } catch (err) {
      console.warn('Failed to retrieve admin/mentor emails:', err);
    }
    return Array.from(new Set(emails.map(e => e.toLowerCase()))).filter(Boolean);
  };

  const sendMailNotification = async (type: 'report' | 'milestone' | 'profile', detail: string) => {
    try {
      const recipientEmails = await getAdminAndMentorEmails();
      if (recipientEmails.length === 0) return;

      const startupName = application?.data?.startupName || application?.data?.startupTitle || 'Incubated Startup';
      const subject = type === 'report'
        ? `[Monthly Report Submitted] ${startupName}`
        : type === 'profile'
          ? `[Startup Profile Update] ${startupName}`
          : `[Milestone Update] ${startupName}`;

      const bodyHtml = type === 'report'
        ? `
          <h3 style="color: #0f172a; margin-top: 0; margin-bottom: 12px; font-size: 16px; font-weight: 800;">Monthly progress report submitted</h3>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
            Startup <strong>${startupName}</strong> has submitted their progress report for <strong>${activeReportMonth}</strong>.
          </p>
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569;"><strong>Progress Summary:</strong> ${reportProgress.substring(0, 150)}...</p>
            <p style="margin: 0; font-size: 14px; color: #475569;"><strong>Market Validation Update:</strong> ${reportMarketVal.substring(0, 150)}...</p>
          </div>
        `
        : type === 'profile'
          ? `
          <h3 style="color: #0f172a; margin-top: 0; margin-bottom: 12px; font-size: 16px; font-weight: 800;">Startup profile updated</h3>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
            Startup <strong>${startupName}</strong> has updated their ERP details (DPIIT registration, sector, or incorporation certificate).
          </p>
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
            <p style="margin: 0; font-size: 14px; color: #475569;"><strong>Details:</strong> ${detail}</p>
          </div>
        `
          : `
          <h3 style="color: #0f172a; margin-top: 0; margin-bottom: 12px; font-size: 16px; font-weight: 800;">Milestone Roadmap Updated</h3>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
            A milestone status was updated or created for <strong>${startupName}</strong>.
          </p>
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
            <p style="margin: 0; font-size: 14px; color: #475569;"><strong>Details:</strong> ${detail}</p>
          </div>
        `;

      const emailHtml = getEmailHtmlTemplate({
        headerTitle: type === 'report' ? 'Monthly Report Activity' : type === 'profile' ? 'Profile Update Activity' : 'Milestone Update Activity',
        bodyHtml,
        ctaText: 'View Startup Profile',
        ctaLink: `https://pierc-portal-9bd82.web.app/dashboard/applications/${id}`
      });

      await triggerEmailNotification({
        to: recipientEmails,
        subject,
        html: emailHtml
      });
    } catch (error) {
      console.error('Failed to dispatch notification email:', error);
    }
  };

  const handleSaveIncubatedDetails = async () => {
    setIsSavingIncubatedDetails(true);
    try {
      const updates: any = {
        'data.dpiitNumber': dpiitNumber.trim(),
        'data.sector': sector,
        updatedAt: Date.now()
      };

      if (incorporationFile) {
        toast.info('Uploading incorporation certificate...');
        const fileRef = storageRef(storage, `applications/${id}/incorporation_cert_${Date.now()}_${incorporationFile.name}`);
        const snapshot = await uploadBytes(fileRef, incorporationFile);
        const downloadURL = await getDownloadURL(snapshot.ref);
        updates['documents.incorporationCert'] = downloadURL;
      }

      await updateDoc(doc(db, 'applications', id), updates);
      toast.success('Incubation profile updated successfully!');
      setEditingIncubatedDetails(false);
      setIncorporationFile(null);

      // Notify admins and mentor
      let detailMsg = `Updated Sector: ${sector}.`;
      if (dpiitNumber.trim()) {
        detailMsg += ` DPIIT Number: ${dpiitNumber.trim()}.`;
      }
      if (incorporationFile) {
        detailMsg += ` Uploaded incorporation certificate document (${incorporationFile.name}).`;
      }
      sendMailNotification('profile', detailMsg);
    } catch (error) {
      console.error('Error saving details:', error);
      toast.error('Failed to update incubation details.');
    } finally {
      setIsSavingIncubatedDetails(false);
    }
  };

  const handleSaveMilestone = async () => {
    if (!newMilestoneTitle.trim()) {
      toast.error('Milestone title is required.');
      return;
    }

    setIsSavingMilestone(true);
    try {
      const milestone = {
        id: `ms-${Date.now()}`,
        title: newMilestoneTitle.trim(),
        description: newMilestoneDesc.trim(),
        status: 'Pending',
        updatedBy: user?.uid || ''
      };

      const updatedMilestones = [...(application?.milestones || []), milestone];
      await updateDoc(doc(db, 'applications', id), {
        milestones: updatedMilestones,
        updatedAt: Date.now()
      });

      toast.success('Milestone added successfully!');
      setNewMilestoneTitle('');
      setNewMilestoneDesc('');
    } catch (err) {
      console.error('Save Milestone Error:', err);
      toast.error('Failed to add milestone.');
    } finally {
      setIsSavingMilestone(false);
    }
  };

  const handleUpdateMilestoneStatus = async (milestoneId: string, newStatus: 'Pending' | 'Completed' | 'Delayed') => {
    if (!application) return;

    try {
      const updatedMilestones = (application.milestones || []).map((ms) => {
        if (ms.id === milestoneId) {
          return {
            ...ms,
            status: newStatus,
            completedAt: newStatus === 'Completed' ? Date.now() : undefined,
            updatedBy: user?.uid || ''
          };
        }
        return ms;
      });

      await updateDoc(doc(db, 'applications', id), {
        milestones: updatedMilestones,
        updatedAt: Date.now()
      });

      const updatedMs = updatedMilestones.find(ms => ms.id === milestoneId);
      toast.success('Milestone status updated!');
      if (updatedMs) {
        sendMailNotification('milestone', `Updated status of milestone "${updatedMs.title}" to ${newStatus}.`);
      }
    } catch (err) {
      console.error('Update Milestone Error:', err);
      toast.error('Failed to update milestone status.');
    }
  };

  const handleCompleteMilestoneSubmit = async () => {
    if (!completingMilestone || !application) return;
    if (!completionDetails.trim()) {
      toast.error('Please enter completion details.');
      return;
    }

    setIsCompletingMilestone(true);
    try {
      let documentUrl = '';
      let documentName = '';

      if (completionDocFile) {
        toast.info('Uploading milestone document...');
        const fileRef = storageRef(storage, `milestone-documents/${Date.now()}_${completionDocFile.name}`);
        const snapshot = await uploadBytes(fileRef, completionDocFile);
        documentUrl = await getDownloadURL(snapshot.ref);
        documentName = completionDocFile.name;
      }

      const updatedMilestones = (application.milestones || []).map((ms) => {
        if (ms.id === completingMilestone.id) {
          return {
            ...ms,
            status: 'Completed' as const,
            completedAt: Date.now(),
            completionDetails: completionDetails.trim(),
            documentUrl: documentUrl || undefined,
            documentName: documentName || undefined,
            updatedBy: user?.uid || ''
          };
        }
        return ms;
      });

      await updateDoc(doc(db, 'applications', id), {
        milestones: updatedMilestones,
        updatedAt: Date.now()
      });

      toast.success('Milestone marked as completed!');
      sendMailNotification('milestone', `Completed milestone "${completingMilestone.title}". Details: ${completionDetails.trim()}`);

      setCompletingMilestone(null);
      setCompletionDetails('');
      setCompletionDocFile(null);
    } catch (err) {
      console.error('Milestone Completion Error:', err);
      toast.error('Failed to complete milestone.');
    } finally {
      setIsCompletingMilestone(false);
    }
  };

  const handleSaveTransaction = async () => {
    if (!application) return;
    if (!txVendorName.trim() || !txGstNumber.trim() || !txInvoiceDate || !txAmount || !txDescription.trim()) {
      toast.error('Please fill in all transaction fields.');
      return;
    }
    if (!txInvoiceFile) {
      toast.error('Please upload an invoice document.');
      return;
    }

    setIsSavingTransaction(true);
    try {
      toast.info('Uploading invoice document...');
      const fileRef = storageRef(storage, `applications/${id}/invoices/${Date.now()}_${txInvoiceFile.name}`);
      const snapshot = await uploadBytes(fileRef, txInvoiceFile);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const newTx = {
        id: `tx-${Date.now()}`,
        vendorName: txVendorName.trim(),
        gstNumber: txGstNumber.trim(),
        invoiceDate: txInvoiceDate,
        invoiceUrl: downloadURL,
        invoiceName: txInvoiceFile.name,
        amount: parseFloat(txAmount),
        description: txDescription.trim(),
        submittedAt: Date.now()
      };

      const updatedTransactions = [...(application.transactions || []), newTx];

      await updateDoc(doc(db, 'applications', id), {
        transactions: updatedTransactions,
        updatedAt: Date.now()
      });

      toast.success('Transaction logged successfully!');

      // Reset state
      setTxVendorName('');
      setTxGstNumber('');
      setTxInvoiceDate('');
      setTxInvoiceFile(null);
      setTxAmount('');
      setTxDescription('');
      setShowAddTransaction(false);
    } catch (err) {
      console.error('Transaction Logging Error:', err);
      toast.error('Failed to log transaction.');
    } finally {
      setIsSavingTransaction(false);
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!confirm('Are you sure you want to delete this milestone?') || !application) return;

    try {
      const updatedMilestones = (application.milestones || []).filter((ms) => ms.id !== milestoneId);
      await updateDoc(doc(db, 'applications', id), {
        milestones: updatedMilestones,
        updatedAt: Date.now()
      });

      toast.success('Milestone deleted.');
    } catch (err) {
      console.error('Delete Milestone Error:', err);
      toast.error('Failed to delete milestone.');
    }
  };

  const defaultMilestones = [
    { title: 'Startup Registered (Company Incorporated)', description: 'Official registration/incorporation of the legal entity.' },
    { title: 'Logo Created', description: 'Creating the official startup brand identity logo.' },
    { title: 'DPIIT Recognition Obtained', description: 'Obtaining the DPIIT recognition certificate.' },
    { title: 'Website Launched', description: 'Launch of the official website or web presence.' },
    { title: 'MVP/Prototype Developed', description: 'Development of the Minimum Viable Product or working prototype.' },
    { title: 'Product/Service Launched', description: 'Official launch of the product/service in the market.' },
    { title: 'First Customer Acquired', description: 'Acquiring the first paying customer.' },
    { title: 'First Revenue Generated', description: 'Logging the first commercial transaction.' },
    { title: 'External Grant/Funding Secured', description: 'Securing seed funding, external grants, or investor funds.' },
    { title: 'Trademark/Patent Filed', description: 'Filing IP protections for the startup technology.' },
    { title: 'Team Expanded (First Employee Hired)', description: 'Hiring the first team member/employee.' },
    { title: 'Startup Graduated', description: 'Successful graduation from PIERC incubation.' }
  ];

  const handleInitializeDefaultMilestones = async () => {
    if (!application) return;
    setIsSavingMilestone(true);
    try {
      const milestones = defaultMilestones.map((dm, idx) => ({
        id: `ms-default-${idx}-${Date.now()}`,
        title: dm.title,
        description: dm.description,
        status: 'Pending' as const,
        updatedBy: user?.uid || ''
      }));

      await updateDoc(doc(db, 'applications', id), {
        milestones: milestones,
        updatedAt: Date.now()
      });

      toast.success('Default milestones initialized successfully!');
    } catch (err) {
      console.error('Initialize Milestones Error:', err);
      toast.error('Failed to initialize default milestones.');
    } finally {
      setIsSavingMilestone(false);
    }
  };

  const updateStatus = async (newStatus: string, remarks?: string, mentorId?: string, mentorName?: string, extraUpdates?: any) => {
    if (!application || !user || user.role === 'user') return;

    try {
      const updates: any = {
        status: newStatus,
        updatedAt: Date.now(),
        ...extraUpdates
      };

      if (newStatus === 'Incubated') {
        const milestones = defaultMilestones.map((dm, idx) => ({
          id: `ms-default-${idx}-${Date.now()}`,
          title: dm.title,
          description: dm.description,
          status: 'Pending' as const,
          updatedBy: user?.uid || ''
        }));
        updates.milestones = milestones;
      }

      if (newStatus === 'Revision Needed') {
        updates.revisionRemarks = remarks;
        updates.preRevisionData = {
          startupName: application.data?.startupName || application.data?.startupTitle || '',
          problemStatement: application.data?.problemStatement || '',
          solution: application.data?.solution || '',
          currentStage: application.data?.currentStage || '',
          teamMembers: application.data?.teamMembers || [],
          pitchDeck: application.documents?.pitchDeck || ''
        };
        updates.revisedFields = [];
      }

      let mentorEmail = '';
      let mentorContact = '';

      if (newStatus === 'Cohort Selected' && mentorId && mentorName) {
        updates.mentorId = mentorId;
        updates.mentorName = mentorName;
        try {
          const mentorSnap = await getDoc(doc(db, 'users', mentorId));
          if (mentorSnap.exists()) {
            mentorEmail = mentorSnap.data().email || '';
            mentorContact = mentorSnap.data().contactNumber || mentorSnap.data().phoneNumber || 'N/A';
            updates.mentorEmail = mentorEmail;
            updates.mentorContact = mentorContact;
          }
        } catch (e) {
          console.warn('Failed to fetch mentor details:', e);
        }
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

      await updateDoc(doc(db, 'applications', id), updates);

      // Push notification to applicant
      await addDoc(collection(db, 'notifications', application.userId, 'items'), {
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

      // Send email notifications to applicant and team members
      const recipientEmails = [
        application.userEmail,
        ...(application.data?.teamMembers || []).map((m: any) => m.email)
      ].filter(Boolean);

      if (recipientEmails.length > 0) {
        const startupName = application.data?.startupName || application.data?.startupTitle || 'Your Innovation Project';
        let emailSubject = `Update regarding your idea: ${startupName}`;

        if (newStatus === 'Revision Needed') {
          emailSubject = `⚠️ Action Required: Revision requested for ${startupName}`;
        } else if (newStatus.includes('Selected') || newStatus === 'Incubated' || newStatus === 'Funding Approved') {
          emailSubject = `🎉 Congratulations! ${startupName} status: ${newStatus}`;
        } else if (newStatus.includes('Rejected')) {
          emailSubject = `Update regarding your application: ${startupName}`;
        } else {
          emailSubject = `🔄 Application Update: ${startupName} status is ${newStatus}`;
        }

        const emailHtml = getStatusUpdateEmailHtml({
          startupName,
          newStatus,
          programmeTitle: application.programmeTitle,
          remarks: remarks || undefined,
          viewLink: `${window.location.origin}/dashboard/applications/${id}`,
          mentorName: newStatus === 'Cohort Selected' ? mentorName : undefined,
          mentorEmail: newStatus === 'Cohort Selected' ? mentorEmail : undefined,
          mentorContact: newStatus === 'Cohort Selected' ? mentorContact : undefined,
          fundingPhases: extraUpdates?.fundingPhases || application.fundingPhases || undefined,
          fundingSource: extraUpdates?.fundingSource || application.fundingSource || undefined,
        });

        triggerEmailNotification({
          to: recipientEmails,
          subject: emailSubject,
          html: emailHtml,
          attachPhase2Template: newStatus === 'Phase 2 Selected',
        }).catch(err => console.error('Failed to send status update email:', err));
      }

      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleUpdateIdea = async () => {
    if (!id || !user || !application) return;
    setIsUpdating(true);
    try {
      const changedFields: string[] = [];
      if (newStartupName !== (application.data?.startupName || application.data?.startupTitle || '')) {
        changedFields.push('Startup Name');
      }
      if (newIdea !== (application.data?.problemStatement || '')) {
        changedFields.push('Problem Statement / Idea');
      }
      if (newSolution !== (application.data?.solution || '')) {
        changedFields.push('Solution');
      }
      if (newCurrentStage !== (application.data?.currentStage || '')) {
        changedFields.push('Current Stage');
      }
      if (JSON.stringify(newTeamMembers) !== JSON.stringify(application.data?.teamMembers || [])) {
        changedFields.push('Team Members');
      }
      if (newPitchDeck) {
        changedFields.push('Pitch Deck');
      }

      const updates: any = {
        'data.problemStatement': newIdea,
        'data.solution': newSolution,
        'data.startupName': newStartupName,
        'data.startupTitle': newStartupName,
        'data.currentStage': newCurrentStage,
        'data.teamMembers': newTeamMembers,
        updatedAt: Date.now()
      };

      if (changedFields.length > 0 && application.status === 'Revision Needed') {
        const existingRevisedFields = application.revisedFields || [];
        updates.revisedFields = Array.from(new Set([...existingRevisedFields, ...changedFields]));
      }

      if (newPitchDeck) {
        const fileRef = storageRef(storage, `applications/${id}/pitch_deck_${Date.now()}`);
        const snapshot = await uploadBytes(fileRef, newPitchDeck);
        const downloadURL = await getDownloadURL(snapshot.ref);
        updates['documents.pitchDeck'] = downloadURL;
      }

      await updateDoc(doc(db, 'applications', id), updates);

      // Send email notifications to applicant and team members
      const recipientEmails = [
        application.userEmail || user.email,
        ...(newTeamMembers || []).map((m: any) => m.email)
      ].filter(Boolean);

      if (recipientEmails.length > 0) {
        const startupName = newStartupName || 'Your Innovation Project';
        triggerEmailNotification({
          to: recipientEmails,
          subject: `📝 Application Details Updated: ${startupName}`,
          html: getApplicationUpdatedEmailHtml({
            startupName,
            programmeTitle: application.programmeTitle,
            viewLink: `${window.location.origin}/dashboard/applications/${id}`,
          }),
        }).catch(err => console.error('Failed to send update confirmation email:', err));
      }

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
  const isOwner = user?.uid === application.userId ||
    (Array.isArray(application.data?.teamMembers) && application.data.teamMembers.some((m: any) => m.email?.toLowerCase() === user?.email?.toLowerCase()));
  const isRevisionNeeded = application.status === 'Revision Needed';
  const canEdit = isOwner && (isRevisionNeeded || (meetings.length === 0 && (application.status === 'Submitted' || application.status === 'Under Review')));
  const data = application.data || {};
  const isGrowthPad = application.programmeId.toLowerCase().includes('growth');
  const hasBeenSelectedForPhase2 = application.timeline?.some((event: any) => event.status === 'Phase 2 Selected') || false;

  const handleDelete = async () => {
    if (user?.role !== 'super_admin' || !application) return;
    try {
      // Notify the applicant before deletion
      await addDoc(collection(db, 'notifications', application.userId, 'items'), {
        userId: application.userId,
        title: 'Application Record Removed',
        message: `Your application for ${application.programmeTitle} (${application.data?.startupTitle || 'Innovation'}) has been permanently removed from the portal by an administrator.`,
        type: 'error',
        read: false,
        timestamp: Date.now(),
        link: '/dashboard/applications'
      });

      // Send deletion email notification to applicant and team members
      const recipientEmails = [
        application.userEmail,
        ...(application.data?.teamMembers || []).map((m: any) => m.email)
      ].filter(Boolean);

      if (recipientEmails.length > 0) {
        const startupName = application.data?.startupName || application.data?.startupTitle || 'Your Innovation Project';
        triggerEmailNotification({
          to: recipientEmails,
          subject: `⚠️ Application Permanently Removed: ${startupName}`,
          html: getApplicationRemovedEmailHtml({
            startupName,
            programmeTitle: application.programmeTitle,
          }),
        }).catch(err => console.error('Failed to send deletion confirmation email:', err));
      }

      await deleteDoc(doc(db, 'applications', id));
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

      await updateDoc(doc(db, 'applications', id), {
        'data.sector': sector,
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

      await updateDoc(doc(db, 'applications', id), updates);
      toast.success('Revision submitted successfully! Your application is back in the review queue.');
    } catch (error) {
      toast.error('Failed to submit revision');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!application) return;

    if (!txVendorName.trim()) return toast.error('Vendor Name is required.');
    if (!txGstNumber.trim()) return toast.error('GST Number is required.');
    if (!txAmount || parseFloat(txAmount) <= 0) return toast.error('Valid invoice amount is required.');
    if (!txInvoiceDate) return toast.error('Invoice Date is required.');
    if (!txSelectedPhase) return toast.error('Please allocate this invoice to a funding phase.');

    const phases = application.fundingPhases || [];
    const targetPhase = phases.find(p => p.phaseName === txSelectedPhase);
    if (targetPhase) {
      const phaseSpent = transactions
        .filter(t => t.phaseName === txSelectedPhase && t.status === 'Approved')
        .reduce((acc, t) => acc + t.amount, 0);

      if (phaseSpent + parseFloat(txAmount) > targetPhase.amount) {
        toast.warning(`This transaction exceeds the approved budget for ${txSelectedPhase} (Remaining: ₹${(targetPhase.amount - phaseSpent).toLocaleString()})`);
      }
    }

    setTxUploading(true);
    try {
      let fileUrl = '';
      let fileName = '';

      if (txInvoiceFile) {
        const fileRef = storageRef(
          storage,
          `applications/${application.id}/invoices/${Date.now()}_${txInvoiceFile.name}`
        );
        const snapshot = await uploadBytes(fileRef, txInvoiceFile);
        fileUrl = await getDownloadURL(snapshot.ref);
        fileName = txInvoiceFile.name;
      }

      const transactionData = {
        userId: application.userId,
        applicationId: application.id,
        startupName: application.data?.startupTitle || application.programmeTitle,
        vendorName: txVendorName,
        gstNumber: txGstNumber,
        amount: parseFloat(txAmount),
        invoiceDate: new Date(txInvoiceDate).getTime(),
        description: txDescription || '',
        phaseName: txSelectedPhase,
        invoiceUrl: fileUrl,
        invoiceFileName: fileName,
        status: 'Pending Review',
        createdAt: Date.now(),
      };

      await addDoc(collection(db, 'transactions'), transactionData);

      await addDoc(collection(db, 'notifications', application.userId, 'items'), {
        title: "Transaction Logged",
        message: `Invoice for ₹${parseFloat(txAmount).toLocaleString()} from ${txVendorName} logged successfully. Awaiting admin review.`,
        type: 'info',
        read: false,
        timestamp: Date.now()
      });

      toast.success('Transaction logged successfully! Sent to admin for review.');
      setTxVendorName('');
      setTxGstNumber('');
      setTxAmount('');
      setTxInvoiceDate('');
      setTxDescription('');
      setTxSelectedPhase('');
      setTxInvoiceFile(null);
      setShowAddTxModal(false);
    } catch (error) {
      console.error("Error creating transaction: ", error);
      toast.error('Failed to log transaction.');
    } finally {
      setTxUploading(false);
    }
  };

  const handleUpdateTxStatus = async (transactionId: string, newStatus: 'Approved' | 'Rejected') => {
    try {
      const transRef = doc(db, 'transactions', transactionId);
      const transaction = transactions.find(t => t.id === transactionId);
      if (!transaction) return;

      await updateDoc(transRef, { status: newStatus });

      await addDoc(collection(db, 'notifications', transaction.userId, 'items'), {
        title: `Transaction ${newStatus}`,
        message: `Your transaction of ₹${transaction.amount.toLocaleString()} to ${transaction.vendorName} has been ${newStatus.toLowerCase()}.`,
        type: newStatus === 'Approved' ? 'success' : 'warning',
        read: false,
        timestamp: Date.now()
      });

      toast.success(`Transaction successfully ${newStatus.toLowerCase()}.`);
    } catch (error) {
      console.error("Error updating transaction: ", error);
      toast.error("Failed to update transaction status.");
    }
  };

  const handleDeleteTx = async (transactionId: string) => {
    if (!confirm('Are you sure you want to delete this transaction record?')) return;
    try {
      await deleteDoc(doc(db, 'transactions', transactionId));
      toast.success('Transaction deleted successfully.');
    } catch (error) {
      console.error("Error deleting transaction: ", error);
      toast.error("Failed to delete transaction.");
    }
  };

  const handleUploadOnboardingDoc = async (key: string, file: File) => {
    if (!application) return;
    setUploadingDocKey(key);
    try {
      const fileRef = storageRef(
        storage,
        `applications/${application.id}/onboarding/${key}_${Date.now()}_${file.name}`
      );
      const snapshot = await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      const docUpdates = {
        [`documents.${key}`]: downloadUrl,
        updatedAt: Date.now(),
      };

      await updateDoc(doc(db, 'applications', application.id), docUpdates);

      await addDoc(collection(db, 'notifications', application.userId, 'items'), {
        title: "Onboarding Document Submitted",
        message: `Onboarding document was uploaded successfully.`,
        type: 'success',
        read: false,
        timestamp: Date.now()
      });

      toast.success('Document uploaded successfully!');
    } catch (error) {
      console.error("Error uploading onboarding document: ", error);
      toast.error('Failed to upload onboarding document.');
    } finally {
      setUploadingDocKey(null);
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
  const onboardingDocs = [
    {
      key: 'signedApplicationForm',
      label: '1) Application form (Proposal) duly signed by all members and faculty mentor.',
      template: '/1_Application form.docx',
      templateLabel: 'Download Application Form Template'
    },
    {
      key: 'selfAttestedIDs',
      label: '2) Self attested copy of Student ID/ Staff ID of all members and faculty mentor.'
    },
    {
      key: 'selfAttestedAadharCards',
      label: '3) Self attested copy of Aadhar Card of all members and faculty mentor.'
    },
    {
      key: 'passportPhotographs',
      label: '4) Passport size photographs of all the members and a faculty mentor.'
    },
    {
      key: 'pitchDeckPPT',
      label: '5) Pitch Deck (PowerPoint slides)',
      template: '/PRE INCUBATION TEMPLET.pptx',
      templateLabel: 'Download Pitch Deck Template'
    },
    {
      key: 'fundBifurcationSheet',
      label: '6) Fund requirement bifurcation sheet as per the format available in Annexure-A of application form.'
    },
    {
      key: 'validationForm',
      label: '7) Validation form duly signed and sealed by Field experts as per the format available in Annexure-B of Application form.'
    },
    {
      key: 'cancelledCheque',
      label: '8) Cancelled cheque of the Bank account of team leader.'
    },
    {
      key: 'signedAffidavit',
      label: '9) Affidavit duly signed by all the members including faculty mentor.'
    }
  ];

  // Grant calculations
  const txPhases = application?.fundingPhases || [];
  const totalGrantAmount = txPhases.reduce((acc, phase) => acc + (phase.amount || 0), 0);
  const approvedSpent = transactions
    .filter(t => t.status === 'Approved')
    .reduce((acc, t) => acc + t.amount, 0);
  const pendingSpent = transactions
    .filter(t => t.status === 'Pending Review')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalSpent = approvedSpent + pendingSpent;
  const remainingBalance = totalGrantAmount - approvedSpent;

  const chartData = txPhases.map(phase => {
    const phaseSpent = transactions
      .filter(t => t.phaseName === phase.phaseName && t.status === 'Approved')
      .reduce((acc, t) => acc + t.amount, 0);

    const phasePending = transactions
      .filter(t => t.phaseName === phase.phaseName && t.status === 'Pending Review')
      .reduce((acc, t) => acc + t.amount, 0);

    return {
      name: phase.phaseName,
      Budget: phase.amount,
      Spent: phaseSpent,
      Pending: phasePending,
    };
  });

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch =
      t.vendorName.toLowerCase().includes(txSearchQuery.toLowerCase()) ||
      t.gstNumber.toLowerCase().includes(txSearchQuery.toLowerCase()) ||
      t.phaseName.toLowerCase().includes(txSearchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(txSearchQuery.toLowerCase()));

    const matchesStatus = txStatusFilter === 'all' || t.status === txStatusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 p-6 md:p-8 animate-in fade-in duration-700">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="group hover:bg-transparent -ml-4 text-slate-500 hover:text-primary font-black uppercase text-[10px] tracking-widest flex items-center"
      >
        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back
      </Button>

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

            {/* Phase 1 Decision: Show if a Phase 1 meeting exists or it is Shortlisted by experts, and they have not been selected for Phase 2 yet */}
            {!hasBeenSelectedForPhase2 && (application.status === 'Submitted' || application.status === 'Under Review' || application.status === 'Shortlisted') && meetings.length > 0 && (
              <div className="flex gap-2">
                <Button className="rounded-xl h-11 bg-green-600 hover:bg-green-700 text-white border-none" onClick={() => updateStatus('Phase 2 Selected')}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Select for Phase 2
                </Button>
                <Button className="rounded-xl h-11 bg-rose-600 hover:bg-rose-700 text-white border-none" onClick={() => updateStatus('Phase 1 Rejected')}>
                  Reject Phase 1
                </Button>
              </div>
            )}

            {/* Phase 2 Decision: Show if they have already been selected for Phase 2 or are currently in Phase 2 evaluation, and status is not final */}
            {(hasBeenSelectedForPhase2 || application.status === 'Phase 2 Selected' || application.status === 'Phase 2 Evaluation') &&
              application.status !== 'Cohort Selected' &&
              application.status !== 'Incubated' &&
              application.status !== 'Phase 2 Rejected' && (
                <div className="flex gap-2">
                  <Button className="rounded-xl h-11 bg-green-600 hover:bg-green-700 text-white border-none" onClick={() => setShowCohortDialog(true)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Final Selection (Cohort)
                  </Button>
                  <Button className="rounded-xl h-11 bg-rose-600 hover:bg-rose-700 text-white border-none" onClick={() => updateStatus('Phase 2 Rejected')}>
                    Reject Phase 2
                  </Button>
                </div>
              )}

            {application.status === 'Cohort Selected' && user?.role === 'super_admin' && (
              <Button className="rounded-xl h-11 bg-primary font-black" onClick={() => setShowIncubationDialog(true)}>
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
                  <DialogTitle className="text-2xl font-black text-slate-900">Cohort & Mentor Assignment</DialogTitle>
                  <DialogDescription className="text-slate-500 font-medium pt-2">
                    Before marking this startup as "Cohort Selected", please select a cohort and assign a mentor.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-6 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Cohort</Label>
                    <Select onValueChange={(val) => setSelectedCohortId(val || '')} value={selectedCohortId}>
                      <SelectTrigger className="w-full h-12 rounded-xl bg-slate-50 border-none focus:ring-primary/20 font-bold flex justify-between items-center px-4">
                        <SelectValue>
                          {selectedCohortId ? cohorts.find(c => c.id === selectedCohortId)?.name : "Choose a cohort..."}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-2xl border-none ring-1 ring-slate-100 bg-white p-1">
                        {cohorts.length === 0 ? (
                          <SelectItem value="" disabled className="text-slate-400">No active cohorts found</SelectItem>
                        ) : (
                          cohorts.map(c => (
                            <SelectItem key={c.id} value={c.id} className="cursor-pointer hover:bg-slate-50 rounded-lg py-2 px-3">
                              {c.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

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
                    setSelectedCohortId('');
                  }}>Cancel</Button>
                  <Button
                    className="rounded-xl bg-green-600 hover:bg-green-700 font-bold text-white px-6"
                    onClick={async () => {
                      const selectedMentor = mentors.find(m => m.uid === cohortMentorId);
                      const selectedCohort = cohorts.find(c => c.id === selectedCohortId);
                      if (!selectedCohort) {
                        toast.error('Please select a valid cohort');
                        return;
                      }
                      if (!selectedMentor) {
                        toast.error('Please select a valid mentor');
                        return;
                      }
                      await updateStatus(
                        'Cohort Selected',
                        undefined,
                        selectedMentor.uid,
                        selectedMentor.displayName,
                        { cohortId: selectedCohort.id, cohortName: selectedCohort.name }
                      );
                      setShowCohortDialog(false);
                      setCohortMentorId('');
                      setSelectedCohortId('');
                    }}
                    disabled={!cohortMentorId || !selectedCohortId}
                  >
                    Approve & Assign Cohort
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Incubation Type and Funding Phase Selection Dialog */}
            <Dialog open={showIncubationDialog} onOpenChange={setShowIncubationDialog}>
              <DialogContent className="rounded-[2rem] border-none shadow-2xl bg-white max-w-lg w-full p-6">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black text-slate-900">Mark as Incubated</DialogTitle>
                  <DialogDescription className="text-slate-500 font-medium pt-2">
                    Select the incubation model for this startup and set any funding grants if applicable.
                  </DialogDescription>
                </DialogHeader>

                <div className="py-6 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Incubation Option</Label>
                    <Select
                      value={incubationType}
                      onValueChange={(val: any) => setIncubationType(val)}
                    >
                      <SelectTrigger className="w-full h-12 rounded-xl bg-slate-50 border-none focus:ring-primary/20 font-bold flex justify-between items-center px-4">
                        <SelectValue placeholder="Select option..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-2xl border-none ring-1 ring-slate-100 bg-white p-1">
                        <SelectItem value="Only Incubation" className="cursor-pointer hover:bg-slate-50 rounded-lg py-2 px-3">
                          Only Incubation
                        </SelectItem>
                        <SelectItem value="Selected for Funding" className="cursor-pointer hover:bg-slate-50 rounded-lg py-2 px-3">
                          Selected for Funding
                        </SelectItem>
                        <SelectItem value="On Hold" className="cursor-pointer hover:bg-slate-50 rounded-lg py-2 px-3">
                          On Hold
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* If Selected for Funding: Phase-wise Grant Amount Setup */}
                  {incubationType === 'Selected for Funding' && (
                    <div className="space-y-4 pt-2 border-t">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Source of Funding</Label>
                        <Select
                          value={fundingSource}
                          onValueChange={(val: any) => setFundingSource(val)}
                        >
                          <SelectTrigger className="w-full h-12 rounded-xl bg-slate-50 border-none focus:ring-primary/20 font-bold flex justify-between items-center px-4">
                            <SelectValue placeholder="Select source..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl shadow-2xl border-none ring-1 ring-slate-100 bg-white p-1">
                            <SelectItem value="SSIP PU" className="cursor-pointer hover:bg-slate-50 rounded-lg py-2 px-3">
                              SSIP PU
                            </SelectItem>
                            <SelectItem value="SSIP PIET" className="cursor-pointer hover:bg-slate-50 rounded-lg py-2 px-3">
                              SSIP PIET
                            </SelectItem>
                            <SelectItem value="SSIP PIT" className="cursor-pointer hover:bg-slate-50 rounded-lg py-2 px-3">
                              SSIP PIT
                            </SelectItem>
                            <SelectItem value="SSIP PIMSR" className="cursor-pointer hover:bg-slate-50 rounded-lg py-2 px-3">
                              SSIP PIMSR
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phase-wise Grants</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[9px] font-black uppercase tracking-widest rounded-lg"
                          onClick={() => setFundingPhases([...fundingPhases, { phaseName: `Phase ${fundingPhases.length + 1}`, amount: 0 }])}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add Phase
                        </Button>
                      </div>

                      <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                        {fundingPhases.map((phase, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <Input
                              value={phase.phaseName}
                              onChange={(e) => {
                                const updated = [...fundingPhases];
                                updated[idx].phaseName = e.target.value;
                                setFundingPhases(updated);
                              }}
                              className="rounded-xl bg-slate-50 border-none h-11 font-bold flex-1"
                              placeholder="Phase Name"
                            />
                            <Input
                              type="number"
                              value={phase.amount || ''}
                              onChange={(e) => {
                                const updated = [...fundingPhases];
                                updated[idx].amount = Number(e.target.value);
                                setFundingPhases(updated);
                              }}
                              className="rounded-xl bg-slate-50 border-none h-11 font-bold w-32"
                              placeholder="Amount"
                            />
                            {fundingPhases.length > 1 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-9 w-9 p-0 text-rose-500 hover:bg-rose-50 rounded-lg flex-shrink-0"
                                onClick={() => {
                                  const updated = [...fundingPhases];
                                  updated.splice(idx, 1);
                                  setFundingPhases(updated);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter className="flex gap-2">
                  <Button
                    variant="ghost"
                    className="rounded-xl"
                    onClick={() => {
                      setShowIncubationDialog(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="rounded-xl bg-primary hover:bg-primary/95 font-bold text-white px-6"
                    onClick={async () => {
                      const extraUpdates: any = {
                        incubationType,
                      };
                      if (incubationType === 'Selected for Funding') {
                        extraUpdates.fundingPhases = fundingPhases;
                        extraUpdates.fundingSource = fundingSource;
                      }

                      await updateStatus('Incubated', `Startup marked as Incubated (${incubationType})`, undefined, undefined, extraUpdates);
                      setShowIncubationDialog(false);
                    }}
                  >
                    Confirm Incubation
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
          {/* Startup ERP Profile (DPIIT & Sector) */}
          {application.status === 'Incubated' && (
            <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden bg-white rounded-3xl">
              <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between space-y-0 p-6">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center">
                  <ShieldCheck className="h-4 w-4 mr-2 text-primary" /> Startup Profile
                </CardTitle>
                {(isOwner || isAdmin) && !editingIncubatedDetails && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl font-bold h-9 border-primary/20 text-primary hover:bg-primary hover:text-white transition-all"
                    onClick={() => setEditingIncubatedDetails(true)}
                  >
                    <Edit3 className="h-4 w-4 mr-2" /> Update Details
                  </Button>
                )}
                {editingIncubatedDetails && (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="rounded-xl h-9" onClick={() => setEditingIncubatedDetails(false)}>Cancel</Button>
                    <Button
                      size="sm"
                      className="rounded-xl h-9 font-bold px-4 bg-primary hover:bg-primary/90 text-white"
                      onClick={handleSaveIncubatedDetails}
                      disabled={isSavingIncubatedDetails}
                    >
                      {isSavingIncubatedDetails ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {editingIncubatedDetails ? (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">DPIIT Registration Number</Label>
                      <Input
                        placeholder="e.g. DIPP12345"
                        value={dpiitNumber}
                        onChange={(e) => setDpiitNumber(e.target.value)}
                        className="h-11 rounded-xl border-slate-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Startup Sector</Label>
                      <Select value={sector} onValueChange={(val) => setSector(val || 'General')}>
                        <SelectTrigger className="h-11 rounded-xl border-slate-200">
                          <SelectValue placeholder="Select Sector" />
                        </SelectTrigger>
                        <SelectContent>
                          {['AI', 'HealthTech', 'AgriTech', 'FinTech', 'EdTech', 'SaaS', 'CleanTech', 'DeepTech', 'General', 'Other'].map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 md:col-span-2 border-t pt-4">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Incorporation / Registration Certificate</Label>
                      <div className="relative">
                        <input
                          id="incorporation-cert-upload"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => setIncorporationFile(e.target.files?.[0] || null)}
                        />
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => document.getElementById('incorporation-cert-upload')?.click()}
                          className="w-full h-11 rounded-xl border-dashed border-slate-300 hover:bg-slate-50 justify-start px-4 text-xs font-bold text-slate-600"
                        >
                          {incorporationFile ? (
                            <>
                              <FileText className="h-4 w-4 text-emerald-500 mr-2" />
                              <span className="truncate">{incorporationFile.name}</span>
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 text-slate-400 mr-2" />
                              <span>Select Incorporation Certificate PDF or Image</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">DPIIT Registered</span>
                      <p className="text-sm font-bold text-slate-900">{application.data?.dpiitNumber ? `Yes (${application.data.dpiitNumber})` : 'No / Not Uploaded'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sector</span>
                      <p className="text-sm font-bold text-slate-900">{application.data?.sector || 'General'}</p>
                    </div>
                    <div className="space-y-1 md:col-span-2 border-t pt-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Incorporation Certificate</span>
                      {application.documents?.incorporationCert ? (
                        <div className="flex items-center gap-2 mt-1">
                          <FileText className="h-4 w-4 text-primary" />
                          <a
                            href={application.documents.incorporationCert}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-primary hover:underline"
                          >
                            View Incorporation Certificate Document
                          </a>
                        </div>
                      ) : (
                        <p className="text-xs font-bold text-slate-400 italic mt-1">No document uploaded yet.</p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Applicant Profile Snapshot */}
          <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center">
                <User className="h-4 w-4 mr-2 text-primary" /> Applicant Information
              </CardTitle>
              {!isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl font-bold h-9 border-primary/20 text-primary hover:bg-primary hover:text-white transition-all"
                  onClick={() => router.push(`/dashboard/messages?userId=${application.userId}`)}
                >
                  <MessageCircle className="h-4 w-4 mr-2" /> Message Applicant
                </Button>
              )}
              {isOwner && (application.status === 'Cohort Selected' || application.status === 'Incubated') && application.mentorId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl font-bold h-9 border-primary/20 text-primary hover:bg-primary hover:text-white transition-all"
                  onClick={() => router.push(`/dashboard/messages?userId=${application.mentorId}`)}
                >
                  <MessageCircle className="h-4 w-4 mr-2" /> Chat with Mentor
                </Button>
              )}
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
              {application.userCaste && <InfoBlock label="Caste" value={application.userCaste} />}
              {(application.status === 'Cohort Selected' || application.status === 'Incubated') && (
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-slate-400">
                    <User className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Assigned Mentor</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">{application.mentorName || 'None'}</p>
                    {isOwner && application.mentorId && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs font-bold text-primary hover:no-underline flex items-center gap-1"
                        onClick={() => router.push(`/dashboard/messages?userId=${application.mentorId}`)}
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> Chat
                      </Button>
                    )}
                  </div>
                </div>
              )}
              {application.cohortId && (
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-slate-400">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Assigned Cohort</span>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-slate-900">{application.cohortName || 'None'}</p>
                    {assignedCohort?.startDate && assignedCohort?.endDate && (
                      <p className="text-[10px] font-semibold text-slate-500">
                        Duration: {new Date(assignedCohort.startDate).toLocaleDateString(undefined, { dateStyle: 'medium' })} - {new Date(assignedCohort.endDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </p>
                    )}
                    {assignedCohort?.whatsappLink && (
                      <a
                        href={assignedCohort.whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-black text-green-600 hover:text-green-700 hover:underline flex items-center gap-1 mt-1"
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> Join WhatsApp Group
                      </a>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Startup Details */}
          <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 space-y-0">
              <div className="flex flex-wrap items-center gap-3">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center">
                  <Building2 className="h-4 w-4 mr-2 text-primary" /> {isGrowthPad ? 'Startup Profile' : 'Innovation Details'}
                </CardTitle>
                {isAdmin && application.status === 'Revision Submitted' && application.revisedFields && application.revisedFields.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      Revised:
                    </span>
                    {application.revisedFields.map((field, idx) => (
                      <Badge key={idx} variant="outline" className="text-[8px] font-black uppercase tracking-tight bg-indigo-50 border-indigo-200 text-indigo-700 px-2 py-0.5">
                        {field}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              {canEdit && !editingIdea && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl font-bold h-9 border-primary/20 text-primary hover:bg-primary hover:text-white transition-all"
                  onClick={() => setEditingIdea(true)}
                >
                  <Edit3 className="h-4 w-4 mr-2" /> Update Submission
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
                    {/* Startup Name Field */}
                    {isAdmin && application.status === 'Revision Submitted' && application.revisedFields?.includes('Startup Name') ? (
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-slate-400">
                          <Building2 className="h-3 w-3" />
                          <span className="text-[10px] font-black uppercase tracking-wider">Startup Name</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <p className="text-xs font-medium text-rose-500 line-through">
                            {application.preRevisionData?.startupName || 'N/A'}
                          </p>
                          <p className="text-sm font-bold text-emerald-600">
                            {data.startupName || data.startupTitle || 'N/A'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <InfoBlock label="Startup Name" value={data.startupName || data.startupTitle} icon={Building2} />
                    )}

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
                        {/* Current Stage Field */}
                        {isAdmin && application.status === 'Revision Submitted' && application.revisedFields?.includes('Current Stage') ? (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2 text-slate-400">
                              <Activity className="h-3 w-3" />
                              <span className="text-[10px] font-black uppercase tracking-wider">Current Stage</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <p className="text-xs font-medium text-rose-500 line-through">
                                {application.preRevisionData?.currentStage || 'N/A'}
                              </p>
                              <p className="text-sm font-bold text-emerald-600">
                                {data.currentStage || 'N/A'}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <InfoBlock label="Current Stage" value={data.currentStage} icon={Activity} />
                        )}

                        {/* Team Members Field */}
                        {isAdmin && application.status === 'Revision Submitted' && application.revisedFields?.includes('Team Members') ? (
                          <div className="space-y-1 md:col-span-2">
                            <div className="flex items-center space-x-2 text-slate-400">
                              <Users className="h-3.5 w-3.5" />
                              <span className="text-[10px] font-black uppercase tracking-wider">Team Members</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                              <div className="space-y-2 p-3 bg-rose-50/20 border border-rose-100/50 rounded-2xl">
                                <p className="text-[9px] font-black uppercase tracking-widest text-rose-500 mb-1">Original Team</p>
                                <div className="space-y-2 opacity-70">
                                  {(application.preRevisionData?.teamMembers || []).map((m: any, i: number) => (
                                    <div key={i} className="bg-rose-50/50 p-2 rounded-xl border border-rose-100 flex flex-col line-through text-rose-500">
                                      <span className="text-xs font-black">{m.name}</span>
                                      <span className="text-[10px] font-bold mt-0.5">{m.email}</span>
                                      <span className="text-[10px] font-bold">{m.phone}</span>
                                    </div>
                                  ))}
                                  {(application.preRevisionData?.teamMembers || []).length === 0 && <p className="text-xs text-slate-400 italic">None</p>}
                                </div>
                              </div>
                              <div className="space-y-2 p-3 bg-emerald-50/20 border border-emerald-100 rounded-2xl">
                                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-1">Revised Team</p>
                                <div className="space-y-2">
                                  {(data.teamMembers || []).map((m: any, i: number) => (
                                    <div key={i} className="bg-emerald-50/50 p-2 rounded-xl border border-emerald-100 flex flex-col text-emerald-700">
                                      <span className="text-xs font-black">{m.name}</span>
                                      <span className="text-[10px] font-bold mt-0.5">{m.email}</span>
                                      <span className="text-[10px] font-bold">{m.phone}</span>
                                    </div>
                                  ))}
                                  {(data.teamMembers || []).length === 0 && <p className="text-xs text-slate-400 italic">None</p>}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="md:col-span-2">
                            <InfoBlock label="Team Members" value={data.teamMembers} icon={Users} />
                          </div>
                        )}
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
                    {/* Problem Statement Field */}
                    {isAdmin && application.status === 'Revision Submitted' && application.revisedFields?.includes('Problem Statement / Idea') ? (
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-slate-400">
                          <span className="text-[10px] font-black uppercase tracking-wider">Detailed Description / Problem Statement</span>
                        </div>
                        <div className="space-y-2 pt-1">
                          <div className="p-4 bg-rose-50/20 border border-rose-100/50 rounded-2xl line-through text-rose-500/80 text-xs whitespace-pre-wrap">
                            <p className="text-[9px] font-black uppercase tracking-widest text-rose-500 mb-2">Original Submission</p>
                            {application.preRevisionData?.problemStatement || 'N/A'}
                          </div>
                          <div className="p-4 bg-emerald-50/20 border border-emerald-100 rounded-2xl text-emerald-700 font-bold text-sm whitespace-pre-wrap">
                            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-2 font-black">Revised Submission</p>
                            {data.description || data.problemStatement || 'N/A'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <InfoBlock label="Detailed Description / Problem Statement" value={data.description || data.problemStatement} />
                    )}

                    {!isGrowthPad && (
                      <>
                        {/* Solution Field */}
                        {isAdmin && application.status === 'Revision Submitted' && application.revisedFields?.includes('Solution') ? (
                          <div className="space-y-1 pt-2">
                            <div className="flex items-center space-x-2 text-slate-400">
                              <span className="text-[10px] font-black uppercase tracking-wider">Solution</span>
                            </div>
                            <div className="space-y-2 pt-1">
                              <div className="p-4 bg-rose-50/20 border border-rose-100/50 rounded-2xl line-through text-rose-500/80 text-xs whitespace-pre-wrap">
                                <p className="text-[9px] font-black uppercase tracking-widest text-rose-500 mb-2">Original Solution</p>
                                {application.preRevisionData?.solution || 'N/A'}
                              </div>
                              <div className="p-4 bg-emerald-50/20 border border-emerald-100 rounded-2xl text-emerald-700 font-bold text-sm whitespace-pre-wrap">
                                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-2 font-black">Revised Solution</p>
                                {data.solution || 'N/A'}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <InfoBlock label="Solution" value={data.solution} />
                        )}

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

          {/* Incubation Status Details Section */}
          {application.status === 'Incubated' && (
            <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden bg-white rounded-3xl">
              <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between p-6">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center">
                  <Rocket className="h-4 w-4 mr-2 text-primary" /> Monthly Progress Tracking
                </CardTitle>
                <Badge className="bg-emerald-100 text-emerald-800 border-none font-bold">
                  {application.incubationType || 'Incubated'}
                </Badge>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                    <div>
                      <h3 className="text-xs font-bold text-slate-500">Required updates submitted between 1st - 8th of every month</h3>

                    </div>

                    {/* Month Switcher Tabs */}
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      {(['month1', 'month2', 'month3'] as const).map((mKey) => (
                        <button
                          key={mKey}
                          onClick={() => setActiveReportMonth(mKey)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                            activeReportMonth === mKey
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-500 hover:text-slate-900"
                          )}
                        >
                          {mKey === 'month1' ? 'Month 1' : mKey === 'month2' ? 'Month 2' : 'Month 3'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Window Status Banner */}
                  {(isOwner || application.data?.teamMembers?.some((m: any) => m.email === user?.email)) && (
                    <div className={cn(
                      "p-4 rounded-2xl border text-xs font-medium flex items-start gap-3",
                      (new Date().getDate() >= 1 && new Date().getDate() <= 8)
                        ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                        : "bg-amber-50 border-amber-100 text-amber-800"
                    )}>
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      <div>
                        <p className="font-bold">
                          {(new Date().getDate() >= 1 && new Date().getDate() <= 8)
                            ? "Submission window is open!"
                            : "Submission window is locked."}
                        </p>
                        <p className="text-[11px] opacity-90 mt-0.5">
                          Submissions and updates are only permitted between the 1st and 8th of every month. Currently, it is day {new Date().getDate()} of the month.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Report Form / Details */}
                  <div className="space-y-4">
                    {/* For editing (Owners/Team members) */}
                    {(isOwner || application.data?.teamMembers?.some((m: any) => m.email === user?.email)) ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Progress Report</Label>
                          <Textarea
                            value={reportProgress}
                            onChange={(e) => setReportProgress(e.target.value)}
                            placeholder="Describe your progress during this month..."
                            className="rounded-2xl min-h-[100px] bg-slate-50 border-none focus:ring-primary/20 p-4 font-medium"
                            disabled={!(new Date().getDate() >= 1 && new Date().getDate() <= 8)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Market Validation Update</Label>
                          <Textarea
                            value={reportMarketVal}
                            onChange={(e) => setReportMarketVal(e.target.value)}
                            placeholder="Detail any market validation activities or updates..."
                            className="rounded-2xl min-h-[100px] bg-slate-50 border-none focus:ring-primary/20 p-4 font-medium"
                            disabled={!(new Date().getDate() >= 1 && new Date().getDate() <= 8)}
                          />
                        </div>

                        {new Date().getDate() >= 1 && new Date().getDate() <= 8 && (
                          <Button
                            onClick={handleSaveMonthlyReport}
                            disabled={isSavingReport}
                            className="w-full h-11 rounded-xl bg-primary text-white font-bold"
                          >
                            {isSavingReport ? 'Saving Report...' : 'Save Progress & Validation Update'}
                          </Button>
                        )}
                      </div>
                    ) : (
                      // For Admin / Mentors viewing reports
                      <div className="space-y-4">
                        {application.monthlyReports?.[activeReportMonth] ? (
                          <div className="space-y-4">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Progress Report</h4>
                              <p className="text-xs font-medium text-slate-700 whitespace-pre-line">
                                {application.monthlyReports[activeReportMonth].progressReport}
                              </p>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Market Validation Update</h4>
                              <p className="text-xs font-medium text-slate-700 whitespace-pre-line">
                                {application.monthlyReports[activeReportMonth].marketValidationUpdate}
                              </p>
                            </div>

                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-right">
                              Last Updated: {format(application.monthlyReports[activeReportMonth].updatedAt, 'MMM dd, yyyy • HH:mm')}
                            </div>
                          </div>
                        ) : (
                          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <p className="text-xs text-slate-400 font-bold italic">
                              No report has been submitted for {activeReportMonth === 'month1' ? 'Month 1' : activeReportMonth === 'month2' ? 'Month 2' : 'Month 3'} yet.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Incubation Onboarding Documents Section */}
          {application.status === 'Incubated' && application.incubationType === 'Selected for Funding' && (
            <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" /> Incubation Onboarding Documents
                  </CardTitle>
                  <CardDescription className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                    Required documents for startups incubated with funding
                  </CardDescription>
                </div>
                <Badge className={cn("border-none font-bold text-xs px-3 py-1",
                  onboardingDocs.filter(d => application?.documents?.[d.key as keyof typeof application.documents]).length === 9 ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"
                )}>
                  {onboardingDocs.filter(d => application?.documents?.[d.key as keyof typeof application.documents]).length} / 9 Completed
                </Badge>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {/* Onboarding progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                    <span>Onboarding Progress</span>
                    <span>{Math.round((onboardingDocs.filter(d => application?.documents?.[d.key as keyof typeof application.documents]).length / 9) * 100)}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${(onboardingDocs.filter(d => application?.documents?.[d.key as keyof typeof application.documents]).length / 9) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Checklist items */}
                <div className="divide-y divide-slate-150 border rounded-2xl overflow-hidden bg-slate-50/10">
                  {onboardingDocs.map((docItem) => {
                    const docUrl = application.documents?.[docItem.key as keyof typeof application.documents] as string | undefined;

                    return (
                      <div key={docItem.key} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="mt-0.5 flex-shrink-0">
                            {docUrl ? (
                              <div className="h-5 w-5 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                <Check className="h-3 w-3" />
                              </div>
                            ) : (
                              <div className="h-5 w-5 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                                <Clock className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-800 leading-tight">
                              {docItem.label}
                            </p>
                            {docItem.template && (
                              <a
                                href={docItem.template}
                                download
                                className="inline-flex items-center text-[9px] font-black uppercase text-primary hover:underline mt-1"
                              >
                                <Download className="h-2.5 w-2.5 mr-1" /> {docItem.templateLabel}
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {docUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl h-9 text-xs font-bold flex items-center gap-1 border-slate-200"
                              onClick={() => window.open(docUrl, '_blank')}
                            >
                              <ExternalLink className="h-3.5 w-3.5" /> View / Download
                            </Button>
                          )}

                          {isOwner ? (
                            <>
                              <input
                                type="file"
                                id={`file-input-${docItem.key}`}
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleUploadOnboardingDoc(docItem.key, file);
                                  }
                                }}
                              />
                              <Button
                                variant={docUrl ? "ghost" : "default"}
                                size="sm"
                                className={cn("rounded-xl h-9 text-xs font-bold", docUrl ? "text-slate-500 hover:bg-slate-100" : "bg-primary hover:bg-primary/95 text-white")}
                                onClick={() => document.getElementById(`file-input-${docItem.key}`)?.click()}
                                disabled={uploadingDocKey === docItem.key}
                              >
                                {uploadingDocKey === docItem.key ? (
                                  <>
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Uploading...
                                  </>
                                ) : docUrl ? 'Replace' : 'Upload'}
                              </Button>
                            </>
                          ) : (
                            !docUrl && (
                              <span className="text-[10px] text-slate-400 font-bold uppercase italic">
                                Not submitted yet
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Grant Utilization & Ledger Section */}
          {application.status === 'Incubated' && application.incubationType === 'Selected for Funding' && (
            <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                  <Coins className="h-4 w-4 text-[#D91A2A]" /> Grant Utilization & Ledger
                </CardTitle>
                {isOwner && (
                  <Dialog open={showAddTxModal} onOpenChange={setShowAddTxModal}>
                    <DialogTrigger asChild>
                      <Button className="rounded-xl shadow-lg shadow-red-200/50 bg-[#D91A2A] text-white hover:bg-[#D91A2A]/90 font-bold border-none h-10 px-4 text-xs">
                        <Plus className="mr-2 h-3.5 w-3.5" /> Log Transaction
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-[2rem] border-none shadow-2xl bg-white max-w-6xl w-[90vw] md:w-[40vw] sm:max-w-none p-6 overflow-y-auto max-h-[90vh]">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-2">
                          <Receipt className="h-6 w-6 text-[#D91A2A]" /> Log Grant Transaction
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium">
                          Submit details of vendor invoice paid from your allocated grant for admin review.
                        </DialogDescription>
                      </DialogHeader>

                      <form onSubmit={handleAddTransaction} className="space-y-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vendor Name</label>
                            <Input
                              required
                              placeholder="e.g. Acme Corporation"
                              className="h-12 rounded-xl bg-slate-50 border-none focus:ring-primary/20 px-4 font-medium"
                              value={txVendorName}
                              onChange={(e) => setTxVendorName(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">GST Number</label>
                            <Input
                              required
                              placeholder="e.g. 24AAAAC1234A1Z1"
                              className="h-12 rounded-xl bg-slate-50 border-none focus:ring-primary/20 px-4 font-medium"
                              value={txGstNumber}
                              onChange={(e) => setTxGstNumber(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice Amount (₹)</label>
                            <Input
                              required
                              type="number"
                              min="1"
                              step="0.01"
                              placeholder="e.g. 52000"
                              className="h-12 rounded-xl bg-slate-50 border-none focus:ring-primary/20 px-4 font-medium"
                              value={txAmount}
                              onChange={(e) => setTxAmount(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice Date</label>
                            <Input
                              required
                              type="date"
                              className="h-12 rounded-xl bg-slate-50 border-none focus:ring-primary/20 px-4 font-medium"
                              value={txInvoiceDate}
                              onChange={(e) => setTxInvoiceDate(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Allocate to Phase</label>
                          <select
                            required
                            value={txSelectedPhase}
                            onChange={(e) => setTxSelectedPhase(e.target.value)}
                            className="w-full h-12 rounded-xl bg-slate-50 border-none focus:ring-primary/20 px-4 font-medium text-sm outline-none text-slate-700"
                          >
                            <option value="" disabled>Select phase...</option>
                            {txPhases.map((phase) => (
                              <option key={phase.phaseName} value={phase.phaseName}>
                                {phase.phaseName} (Budget: ₹{phase.amount.toLocaleString()})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description / Purpose</label>
                          <Input
                            placeholder="e.g. Hardware purchase for prototype building"
                            className="h-12 rounded-xl bg-slate-50 border-none focus:ring-primary/20 px-4 font-medium"
                            value={txDescription}
                            onChange={(e) => setTxDescription(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Upload Invoice PDF/Image (Optional)</label>
                          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100/50 transition-colors">
                            <Upload className="h-6 w-6 text-slate-400 mb-2" />
                            <input
                              type="file"
                              accept=".pdf,image/*"
                              onChange={(e) => setTxInvoiceFile(e.target.files?.[0] || null)}
                              className="text-xs text-slate-500 max-w-full file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer"
                            />
                            {txInvoiceFile && (
                              <p className="text-[11px] font-bold text-[#D91A2A] mt-2 flex items-center">
                                Selected: {txInvoiceFile.name} ({(txInvoiceFile.size / 1024 / 1024).toFixed(2)} MB)
                              </p>
                            )}
                          </div>
                        </div>

                        <DialogFooter className="pt-4 gap-2">
                          <Button type="button" variant="ghost" onClick={() => setShowAddTxModal(false)} className="rounded-xl font-bold">
                            Cancel
                          </Button>
                          <Button type="submit" disabled={txUploading} className="rounded-xl font-bold bg-[#D91A2A] hover:bg-[#D91A2A]/90 text-white shadow-lg shadow-red-200/50 border-none px-6">
                            {txUploading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                              </>
                            ) : 'Submit Transaction'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent className="pt-6 space-y-6">

                {/* Stats row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Approved Grant</p>
                    <p className="text-xl font-black text-slate-900 mt-1">₹{totalGrantAmount.toLocaleString('en-IN')}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Across {txPhases.length} Phases</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Spent</p>
                    <p className="text-xl font-black text-slate-900 mt-1">₹{totalSpent.toLocaleString('en-IN')}</p>
                    <div className="flex gap-2 text-[9px] font-bold text-slate-500 uppercase mt-0.5">
                      <span>Approved: ₹{approvedSpent.toLocaleString('en-IN')}</span>
                      {pendingSpent > 0 && <span className="text-orange-500">Pending: ₹{pendingSpent.toLocaleString('en-IN')}</span>}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Remaining Balance</p>
                    <p className="text-xl font-black text-slate-900 mt-1">₹{remainingBalance.toLocaleString('en-IN')}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Available for disbursement</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Utilization and Progress */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Utilization per Phase</h4>
                      {txPhases.map((phase) => {
                        const phaseSpent = transactions
                          .filter(t => t.phaseName === phase.phaseName && t.status === 'Approved')
                          .reduce((acc, t) => acc + t.amount, 0);

                        const phasePending = transactions
                          .filter(t => t.phaseName === phase.phaseName && t.status === 'Pending Review')
                          .reduce((acc, t) => acc + t.amount, 0);

                        const totalLogged = phaseSpent + phasePending;
                        const percent = Math.min(100, Math.round((phaseSpent / phase.amount) * 100));
                        const pendingPercent = Math.min(100 - percent, Math.round((phasePending / phase.amount) * 100));

                        return (
                          <div key={phase.phaseName} className="space-y-1.5">
                            <div className="flex justify-between items-end text-xs">
                              <div>
                                <span className="font-bold text-slate-800">{phase.phaseName}</span>
                                <span className="text-[9px] text-slate-400 font-bold ml-1.5 uppercase">
                                  (Limit: ₹{phase.amount.toLocaleString('en-IN')})
                                </span>
                              </div>
                              <span className="font-black text-slate-700">₹{totalLogged.toLocaleString('en-IN')} logged</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                              <div className="h-full bg-emerald-500" style={{ width: `${percent}%` }} />
                              <div className="h-full bg-orange-400 animate-pulse" style={{ width: `${pendingPercent}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Chart visualizer */}
                    {txPhases.length > 0 && (
                      <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Utilization Graph</h4>
                        <div className="h-[180px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94a3b8' }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94a3b8' }} />
                              <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '8px' }}
                                labelStyle={{ fontWeight: 'black', fontSize: '9px', textTransform: 'uppercase', marginBottom: '2px' }}
                              />
                              <Bar dataKey="Budget" fill="#cbd5e1" radius={[2, 2, 0, 0]} name="Budget" />
                              <Bar dataKey="Spent" fill="#10b981" radius={[2, 2, 0, 0]} name="Spent" />
                              <Bar dataKey="Pending" fill="#fb923c" radius={[2, 2, 0, 0]} name="Pending" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Transaction Ledger */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="flex flex-col sm:flex-row items-center gap-2 justify-between pb-1 border-b">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Expense Ledger</h4>
                      <div className="flex gap-1.5 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-36">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                          <Input
                            placeholder="Search..."
                            className="h-8 pl-8 rounded-lg border-slate-100 bg-slate-50/50 font-medium text-[10px] w-full focus:ring-primary/20"
                            value={txSearchQuery}
                            onChange={(e) => setTxSearchQuery(e.target.value)}
                          />
                        </div>
                        <select
                          className="h-8 px-2 rounded-lg border border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-600 outline-none w-24"
                          value={txStatusFilter}
                          onChange={(e) => setTxStatusFilter(e.target.value)}
                        >
                          <option value="all">All Status</option>
                          <option value="Approved">Approved</option>
                          <option value="Pending Review">Pending</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </div>
                    </div>

                    {filteredTransactions.length === 0 ? (
                      <div className="p-10 text-center text-slate-400 font-bold uppercase text-[9px] tracking-widest italic space-y-2 border border-dashed border-slate-150 rounded-2xl">
                        <Receipt className="h-6 w-6 mx-auto text-slate-200" />
                        <p>No expense transactions logged</p>
                      </div>
                    ) : (
                      <div className="border rounded-2xl overflow-hidden bg-slate-50/20 max-h-[300px] overflow-y-auto">
                        <Table>
                          <TableHeader className="bg-slate-100/50 sticky top-0 z-10">
                            <TableRow className="border-slate-100">
                              <TableHead className="text-[9px] font-black uppercase tracking-widest py-2">Vendor / GST</TableHead>
                              <TableHead className="text-[9px] font-black uppercase tracking-widest py-2">Phase</TableHead>
                              <TableHead className="text-[9px] font-black uppercase tracking-widest py-2">Amount</TableHead>
                              <TableHead className="text-[9px] font-black uppercase tracking-widest py-2">Status</TableHead>
                              <TableHead className="text-[9px] font-black uppercase tracking-widest py-2 text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredTransactions.map((tx) => (
                              <TableRow key={tx.id} className="border-slate-100 hover:bg-white transition-colors">
                                <TableCell className="py-2.5">
                                  <div>
                                    <p className="text-xs font-black text-slate-900 leading-none">{tx.vendorName}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                                      GST: {tx.gstNumber} • {format(tx.invoiceDate, 'MMM dd, yyyy')}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell className="py-2.5">
                                  <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[8px] font-black uppercase">
                                    {tx.phaseName}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-2.5 text-xs font-black text-slate-900">
                                  ₹{tx.amount.toLocaleString('en-IN')}
                                </TableCell>
                                <TableCell className="py-2.5">
                                  <Badge className={`border-none font-bold text-[8px] uppercase px-1.5 py-0.5 rounded ${tx.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' :
                                    tx.status === 'Rejected' ? 'bg-rose-50 text-rose-600' :
                                      'bg-orange-50 text-orange-600'
                                    }`}>
                                    {tx.status === 'Pending Review' ? 'Pending' : tx.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-2.5 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    {tx.invoiceUrl && (
                                      <a
                                        href={tx.invoiceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-colors"
                                        title="View Invoice Document"
                                      >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                      </a>
                                    )}

                                    {isAdmin && tx.status === 'Pending Review' && (
                                      <>
                                        <button
                                          onClick={() => handleUpdateTxStatus(tx.id, 'Approved')}
                                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                                          title="Approve Transaction"
                                        >
                                          <Check className="h-4.5 w-4.5" />
                                        </button>
                                        <button
                                          onClick={() => handleUpdateTxStatus(tx.id, 'Rejected')}
                                          className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                          title="Reject Transaction"
                                        >
                                          <X className="h-4.5 w-4.5" />
                                        </button>
                                      </>
                                    )}

                                    {(!isAdmin && tx.status === 'Pending Review') && (
                                      <button
                                        onClick={() => handleDeleteTx(tx.id)}
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                        title="Delete Log"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                    {isAdmin && (
                                      <button
                                        onClick={() => handleDeleteTx(tx.id)}
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                        title="Admin Delete Log"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </div>

              </CardContent>
            </Card>
          )}

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

                  <div className="w-full max-w-sm">
                    <a
                      href="/PHASE-2 PPT Template.pptx"
                      download="PHASE-2 PPT Template.pptx"
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "w-full h-12 rounded-xl font-bold bg-white text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700 transition-all flex items-center justify-center gap-2"
                      )}
                    >
                      <Download className="h-4 w-4" /> Download Phase 2 Template
                    </a>
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

          {/* Yukti Portal Credentials — Phase 2 requirement */}
          {hasBeenSelectedForPhase2 && (
            <Card className="border-none shadow-sm ring-1 ring-violet-200 overflow-hidden bg-gradient-to-br from-violet-50/60 to-white">
              <CardHeader className="bg-violet-50/80 border-b border-violet-100 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-violet-800 flex items-center">
                  <ShieldCheck className="h-4 w-4 mr-2 text-violet-600" /> Yukti Portal Credentials
                </CardTitle>
                {application.documents?.yuktiPortalId && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Submitted
                  </span>
                )}
              </CardHeader>
              <CardContent className="pt-6 space-y-6">

                {/* Instruction banner for owner */}
                {isOwner && (
                  <div className="flex items-start gap-4 p-4 bg-violet-100/60 rounded-2xl border border-violet-200">
                    <div className="h-9 w-9 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0 shadow">
                      <KeyRound className="h-4 w-4 text-white" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-black text-violet-900">Action Required — Yukti Innovation Portal</p>
                      <p className="text-[11px] text-violet-700 font-medium leading-relaxed">
                        Congratulations on being selected for Phase 2! You are required to create an account on the{' '}
                        <a
                          href="https://yukti.mic.gov.in"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline font-black hover:text-violet-900"
                        >
                          Yukti Innovation Portal
                        </a>{' '}
                        and submit your login credentials below. These will be shared only with PIERC administrators and your assigned mentor.
                      </p>
                    </div>
                  </div>
                )}

                {/* Submission form — visible to owner only */}
                {isOwner && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Yukti Portal User ID</Label>
                      <Input
                        placeholder="Enter your Yukti Portal User ID"
                        value={yuktiId || application.documents?.yuktiPortalId || ''}
                        onChange={(e) => setYuktiId(e.target.value)}
                        className="rounded-xl bg-slate-50 border-none focus:ring-violet-300 h-11 font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Yukti Portal Password</Label>
                      <div className="relative">
                        <Input
                          type={showYuktiPassword ? 'text' : 'password'}
                          placeholder="Enter your Yukti Portal Password"
                          value={yuktiPassword || application.documents?.yuktiPortalPassword || ''}
                          onChange={(e) => setYuktiPassword(e.target.value)}
                          className="rounded-xl bg-slate-50 border-none focus:ring-violet-300 h-11 font-bold pr-12"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                          onClick={() => setShowYuktiPassword(!showYuktiPassword)}
                          aria-label={showYuktiPassword ? 'Hide password' : 'Show password'}
                        >
                          {showYuktiPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button
                      className="w-full h-12 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-violet-200 transition-all"
                      onClick={handleSaveYuktiCredentials}
                      disabled={isSavingYukti}
                    >
                      {isSavingYukti ? 'Saving...' : application.documents?.yuktiPortalId ? 'Update Credentials' : 'Submit Credentials'}
                    </Button>
                    <p className="text-[9px] text-slate-400 font-medium italic text-center">
                      Your credentials are stored securely and visible only to PIERC administrators and your assigned mentor.
                    </p>
                  </div>
                )}

                {/* View credentials — visible to super_admin and assigned mentor only */}
                {(user?.role === 'super_admin' || (user?.role === 'mentor' && user?.uid === application.mentorId)) && (
                  <div className="space-y-4">
                    {application.documents?.yuktiPortalId ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1 p-4 bg-white rounded-2xl border border-violet-100 shadow-sm">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Yukti User ID</p>
                          <p className="text-sm font-black text-slate-900 break-all">{application.documents.yuktiPortalId}</p>
                        </div>
                        <div className="space-y-2 p-4 bg-white rounded-2xl border border-violet-100 shadow-sm">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Password</p>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-slate-900 break-all flex-1">
                              {showYuktiPassword
                                ? application.documents.yuktiPortalPassword
                                : '•'.repeat(Math.min(application.documents.yuktiPortalPassword?.length ?? 8, 12))}
                            </p>
                            <button
                              type="button"
                              className="text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0"
                              onClick={() => setShowYuktiPassword(!showYuktiPassword)}
                              aria-label={showYuktiPassword ? 'Hide password' : 'Reveal password'}
                            >
                              {showYuktiPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <KeyRound className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-400 font-bold">The startup has not yet submitted their Yukti Portal credentials.</p>
                      </div>
                    )}
                  </div>
                )}

              </CardContent>
            </Card>
          )}

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
          {isOwner && (application.status === 'Cohort Selected' || application.status === 'Incubated') && application.mentorId && (
            <Card className="border-none shadow-sm ring-1 ring-slate-200 bg-primary text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <MessageCircle className="h-24 w-24" />
              </div>
              <CardHeader>
                <CardTitle className="text-xs font-black uppercase tracking-widest text-white/95 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" /> Mentor Support
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 relative z-10">
                <p className="text-xs text-white/90 font-medium leading-relaxed">
                  Congratulations on your selection! You have been assigned <strong>{application.mentorName}</strong> as your primary mentor to support your journey.
                </p>
                <Button
                  className="w-full bg-white text-primary hover:bg-white/90 rounded-xl font-bold h-11"
                  variant="secondary"
                  onClick={() => router.push(`/dashboard/messages?userId=${application.mentorId}`)}
                >
                  <MessageCircle className="mr-2 h-4 w-4" /> Chat with Mentor
                </Button>
              </CardContent>
            </Card>
          )}

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

          {/* Standalone Milestones Roadmap Card */}
          {application.status === 'Incubated' && (
            <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden bg-white rounded-3xl mt-6">
              <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between p-6">
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center">
                    <Rocket className="h-4 w-4 mr-2 text-primary animate-pulse" /> Startup Milestones Roadmap
                  </CardTitle>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">
                    Track cohort milestones and key compliance targets for graduation.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Milestones Checklist */}
                <div className="space-y-3">
                  {(application.milestones || []).length > 0 ? (
                    (application.milestones || []).map((ms) => (
                      <div key={ms.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-sm transition-all gap-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            {ms.status === 'Completed' ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            ) : ms.status === 'Delayed' ? (
                              <AlertTriangle className="h-5 w-5 text-rose-500" />
                            ) : (
                              <Clock className="h-5 w-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <h4 className={cn("text-sm font-bold text-slate-900", ms.status === 'Completed' && "line-through text-slate-400")}>{ms.title}</h4>
                            {ms.description && <p className="text-xs text-slate-500 mt-0.5">{ms.description}</p>}
                            {ms.status === 'Completed' && ms.completionDetails && (
                              <div className="mt-3 p-3 bg-emerald-50/40 rounded-xl border border-emerald-100/50 space-y-1 max-w-xl">
                                <p className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Completion Proof & Details</p>
                                <p className="text-xs text-slate-600 font-medium whitespace-pre-line">{ms.completionDetails}</p>
                                {ms.documentUrl && (
                                  <div className="pt-1.5 flex items-center gap-1.5 text-[10px] font-bold text-emerald-700">
                                    <FileText className="h-3.5 w-3.5 text-emerald-600" />
                                    <a href={ms.documentUrl} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-xs">
                                      {ms.documentName || 'Download Document'}
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-center">
                          {ms.status !== 'Completed' && (isOwner || isAdmin) ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                setCompletingMilestone(ms);
                                setCompletionDetails('');
                                setCompletionDocFile(null);
                              }}
                              className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
                            >
                              Complete Milestone
                            </Button>
                          ) : null}

                          {ms.status === 'Completed' && (
                            <Badge className="bg-emerald-100 text-emerald-800 border-none font-bold text-[10px] px-3 py-1">
                              Completed
                            </Badge>
                          )}

                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-9 w-9 p-0 text-rose-600 hover:bg-rose-50 rounded-xl"
                              onClick={() => handleDeleteMilestone(ms.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-3">
                      <p className="text-xs text-slate-400 font-bold italic">No milestones defined for this startup yet.</p>
                      {isAdmin && (
                        <Button
                          onClick={handleInitializeDefaultMilestones}
                          disabled={isSavingMilestone}
                          className="rounded-xl h-10 bg-primary text-white font-bold text-xs px-4"
                        >
                          Initialize Default Milestones
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Admin/User Add Milestone Section */}
                {(isAdmin || isOwner) && (
                  <Card className="border border-slate-100 bg-slate-50/50 rounded-2xl overflow-hidden mt-6">
                    <CardHeader className="bg-slate-100/50 p-4 border-b">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-600">Create New Milestone</h4>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Milestone Title</Label>
                          <Input
                            placeholder="e.g. Complete Prototype MVP"
                            value={newMilestoneTitle}
                            onChange={(e) => setNewMilestoneTitle(e.target.value)}
                            className="h-10 rounded-xl bg-white border-slate-200"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Description (Optional)</Label>
                          <Input
                            placeholder="e.g. Upload final pitch deck and video URL"
                            value={newMilestoneDesc}
                            onChange={(e) => setNewMilestoneDesc(e.target.value)}
                            className="h-10 rounded-xl bg-white border-slate-200"
                          />
                        </div>
                      </div>

                      <Button
                        onClick={handleSaveMilestone}
                        disabled={isSavingMilestone}
                        className="w-full h-10 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold text-xs"
                      >
                        {isSavingMilestone ? 'Adding Milestone...' : 'Add Milestone to Roadmap'}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          )}

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

      {/* Milestone Completion Dialog */}
      <Dialog open={completingMilestone !== null} onOpenChange={(open) => { if (!open) setCompletingMilestone(null); }}>
        <DialogContent className="sm:max-w-lg rounded-[2rem] p-8 bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900">Complete Milestone</DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest text-slate-400">
              {completingMilestone?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="milestone-details" className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Completion Details *
              </Label>
              <textarea
                id="milestone-details"
                placeholder="Explain how this milestone was achieved, key highlights, URL links, etc."
                value={completionDetails}
                onChange={e => setCompletionDetails(e.target.value)}
                required
                className="w-full min-h-[100px] p-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-slate-50/50"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Relevant Document / Proof (Optional)
              </Label>
              <div className="relative">
                <input
                  type="file"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) setCompletionDocFile(file);
                  }}
                  className="hidden"
                  id="milestone-doc-input"
                />
                <label
                  htmlFor="milestone-doc-input"
                  className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors text-xs font-bold text-slate-600"
                >
                  {completionDocFile ? (
                    <>
                      <FileText className="h-4 w-4 text-emerald-500" />
                      <span className="truncate max-w-[250px]">{completionDocFile.name}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 text-slate-400" />
                      <span>Choose Document or Proof PDF/Image</span>
                    </>
                  )}
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                disabled={isCompletingMilestone}
                onClick={() => setCompletingMilestone(null)}
                className="h-11 px-5 rounded-xl border-slate-200 font-bold text-xs uppercase"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isCompletingMilestone || !completionDetails.trim()}
                onClick={handleCompleteMilestoneSubmit}
                className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider"
              >
                {isCompletingMilestone ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Submit Completion Proof
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

