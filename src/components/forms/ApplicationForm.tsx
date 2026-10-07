'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Upload, 
  Save, 
  CheckCircle2, 
  Rocket, 
  Briefcase, 
  FileText, 
  Layout, 
  Plus, 
  Trash2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Lightbulb,
  Cpu,
  TrendingUp,
  UserCheck,
  Building,
  Mail,
  Phone,
  ShieldCheck,
  Check,
  ArrowLeft,
  FileCheck2,
  Info
} from 'lucide-react';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref as sRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { triggerEmailNotification } from '@/lib/email-client';
import { getSubmissionEmailHtml } from '@/lib/email-templates';
import { cn } from '@/lib/utils';

const incubationSchema = z.object({
  teamMembers: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email").or(z.literal('')),
    phone: z.string().min(10, "Invalid phone").or(z.literal('')),
  })),
  startupTitle: z.string().min(2, "Startup title must be at least 2 characters"),
  problemStatement: z.string().min(50, "Problem statement should be detailed (at least 50 characters)"),
  solution: z.string().min(50, "Solution description should be detailed (at least 50 characters)"),
  uniqueness: z.string().min(20, "Please explain the uniqueness (at least 20 characters)"),
  currentStage: z.string().min(1, "Please select your current stage"),
});

const growthPadSchema = z.object({
  teamMembers: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email").or(z.literal('')),
    phone: z.string().min(10, "Invalid phone").or(z.literal('')),
  })),
  startupStudio: z.string().min(1, "Please select a studio"),
  startupName: z.string().min(1, "Startup name is required"),
  foundingYear: z.string().min(4, "Invalid year"),
  companyStatus: z.string().min(1, "Please select status"),
  description: z.string().min(50, "Please provide a detailed description (at least 50 characters)"),
  website: z.string().url().optional().or(z.literal('')),
  cityHQ: z.string().min(1, "City HQ is required"),
  sector: z.string().min(1, "Please select a sector"),
  isProductLive: z.string().min(1, "Required"),
  revenueGenerated: z.string().min(1, "Required"),
  capitalToRaise: z.string().min(1, "Required"),
});

export default function ApplicationForm({ programmeId, programmeTitle }: { programmeId: string, programmeTitle: string }) {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const { user } = useAuthStore();
  const router = useRouter();

  const isGrowthPad = programmeId.toLowerCase().includes('growth');
  const isIncubation = programmeId.trim().toLowerCase() === 'incubation';

  // Co-founder inline addition state
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');

  const form = useForm<any>({
    resolver: zodResolver(isGrowthPad ? growthPadSchema : incubationSchema),
    defaultValues: isGrowthPad ? {
      teamMembers: [],
      startupStudio: "",
      startupName: "",
      foundingYear: "",
      companyStatus: "Yet To Incorporate",
      description: "",
      website: "",
      cityHQ: "",
      sector: "B2B Softwares",
      isProductLive: "No",
      revenueGenerated: "Prerevenue",
      capitalToRaise: "Upto 10L",
    } : {
      teamMembers: [],
      startupTitle: "",
      problemStatement: "",
      solution: "",
      uniqueness: "",
      currentStage: "Idea",
    },
    mode: 'onChange',
  });

  const [file, setFile] = useState<File | null>(null);

  // Stepper definition
  const steps = isGrowthPad ? [
    { number: 1, title: 'Identity & Studio', desc: 'Name, location & studio' },
    { number: 2, title: 'Business Profile', desc: 'Company status & mission' },
    { number: 3, title: 'Traction & Team', desc: 'Revenue, capital & members' },
    { number: 4, title: 'Pitch & Review', desc: 'Pitch deck & submission' },
  ] : [
    { number: 1, title: 'Startup Profile', desc: 'Idea name & venture stage' },
    { number: 2, title: 'Value Proposition', desc: 'Problem, solution & moat' },
    { number: 3, title: 'Founding Team', desc: 'Founders & co-founders' },
    { number: 4, title: 'Pitch & Review', desc: 'Documents & final review' },
  ];

  // Watch fields for live calculation and step indicators
  const watchedValues = form.watch();

  // Calculate live completion percentage
  const calculateCompleteness = () => {
    let completedFields = 0;
    let totalFields = isGrowthPad ? 10 : 5;

    if (isGrowthPad) {
      if (watchedValues.startupStudio) completedFields++;
      if (watchedValues.startupName) completedFields++;
      if (watchedValues.foundingYear) completedFields++;
      if (watchedValues.companyStatus) completedFields++;
      if (watchedValues.description?.length >= 50) completedFields++;
      if (watchedValues.cityHQ) completedFields++;
      if (watchedValues.sector) completedFields++;
      if (watchedValues.isProductLive) completedFields++;
      if (watchedValues.revenueGenerated) completedFields++;
      if (file) completedFields++;
    } else {
      if (watchedValues.startupTitle?.length >= 2) completedFields++;
      if (watchedValues.currentStage) completedFields++;
      if (watchedValues.problemStatement?.length >= 50) completedFields++;
      if (watchedValues.solution?.length >= 50) completedFields++;
      if (watchedValues.uniqueness?.length >= 20) completedFields++;
    }

    return Math.min(100, Math.round((completedFields / totalFields) * 100));
  };

  const completeness = calculateCompleteness();

  // Step advancement validation
  const handleNextStep = async () => {
    let fieldsToValidate: string[] = [];

    if (!isGrowthPad) {
      if (currentStep === 1) {
        fieldsToValidate = ['startupTitle', 'currentStage'];
      } else if (currentStep === 2) {
        fieldsToValidate = ['problemStatement', 'solution', 'uniqueness'];
      }
    } else {
      if (currentStep === 1) {
        fieldsToValidate = ['startupStudio', 'startupName', 'foundingYear', 'cityHQ'];
      } else if (currentStep === 2) {
        fieldsToValidate = ['companyStatus', 'description', 'sector'];
      } else if (currentStep === 3) {
        fieldsToValidate = ['isProductLive', 'revenueGenerated', 'capitalToRaise'];
      }
    }

    if (fieldsToValidate.length > 0) {
      const isValid = await form.trigger(fieldsToValidate as any);
      if (!isValid) {
        toast.error('Please fill in the required fields correctly before proceeding.');
        return;
      }
    }

    setCurrentStep((prev) => Math.min(4, prev + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Add a team member
  const handleAddMember = () => {
    if (!newMemberName.trim()) {
      toast.error('Member name is required');
      return;
    }
    if (newMemberEmail && newMemberEmail.toLowerCase() === user?.email?.toLowerCase()) {
      toast.error('You are already the primary applicant.');
      return;
    }

    const currentTeam = form.getValues('teamMembers') || [];
    if (newMemberEmail && currentTeam.some((m: any) => m.email.toLowerCase() === newMemberEmail.toLowerCase())) {
      toast.error('A team member with this email already exists.');
      return;
    }

    form.setValue('teamMembers', [
      ...currentTeam,
      { name: newMemberName.trim(), email: newMemberEmail.trim(), phone: newMemberPhone.trim() }
    ]);

    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberPhone('');
    setShowAddMember(false);
    toast.success('Team member added successfully!');
  };

  const handleRemoveMember = (index: number) => {
    const currentTeam = [...(form.getValues('teamMembers') || [])];
    currentTeam.splice(index, 1);
    form.setValue('teamMembers', currentTeam);
    toast.success('Member removed');
  };

  async function onSubmit(values: any) {
    if (!user) {
      toast.error('You must be logged in to submit an application');
      return;
    }

    if (isGrowthPad && !file) {
      toast.error('Please upload your Pitch Deck to complete GrowthPad application');
      return;
    }

    if (!agreeTerms) {
      toast.error('Please confirm that you agree to the PIERC incubation program terms.');
      return;
    }

    setLoading(true);
    try {
      let pitchDeckUrl = "";
      if (file) {
        const fileRef = sRef(storage, `applications/${user.uid}/${Date.now()}_${file.name}`);
        const uploadResult = await uploadBytes(fileRef, file);
        pitchDeckUrl = await getDownloadURL(uploadResult.ref);
      }

      const applicationsCol = collection(db, 'applications');
      
      const applicationData = {
        userId: user.uid,
        userName: user.displayName || 'Applicant',
        userEmail: user.email,
        userContact: user.contactNumber || "",
        userEnrollment: user.enrollmentNumber || "",
        userInstitute: user.institute || "",
        userCategory: user.category || "",
        userSocialCategory: (user as any).socialCategory || "",
        userGender: (user as any).gender || "",
        userCaste: (user as any).caste || "",
        startupTitle: isGrowthPad ? values.startupName : values.startupTitle,
        programmeId,
        programmeTitle,
        status: 'Under Review',
        submittedAt: Date.now(),
        updatedAt: Date.now(),
        data: values,
        documents: {
          pitchDeck: pitchDeckUrl,
        },
        timeline: [
          { status: 'Under Review', timestamp: Date.now(), remarks: 'Application submitted successfully.' }
        ]
      };

      const newAppDoc = await addDoc(applicationsCol, applicationData);
      
      // Update with own ID
      await setDoc(doc(db, 'applications', newAppDoc.id), { id: newAppDoc.id }, { merge: true });

      // Add notification
      await addDoc(collection(db, 'notifications', user.uid, 'items'), {
        userId: user.uid,
        title: 'Application Submitted',
        message: `Your application for ${programmeTitle} has been received.`,
        type: 'success',
        read: false,
        timestamp: Date.now(),
      });

      // Send email notifications
      const startupName = isGrowthPad ? values.startupName : values.startupTitle;
      const recipientEmails = [user.email, ...(values.teamMembers || []).map((m: any) => m.email)].filter(Boolean);
      
      if (recipientEmails.length > 0) {
        triggerEmailNotification({
          to: recipientEmails,
          subject: `🚀 Submission Received: ${startupName} - ${programmeTitle}`,
          html: getSubmissionEmailHtml({
            startupName,
            programmeTitle,
            viewLink: `${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/applications/${newAppDoc.id}`,
          }),
        }).catch(err => console.error('Failed to dispatch submission email:', err));
      }

      toast.success('🎉 Application submitted successfully!');
      router.push('/dashboard/applications');
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit application. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Link 
          href="/dashboard/programmes" 
          className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-primary transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5 transition-transform group-hover:-translate-x-1" />
          Back to Programmes
        </Link>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/80 font-bold px-3 py-1 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse" />
            Applications Open
          </Badge>
          <span className="text-xs font-semibold text-slate-400">Cohort 2026</span>
        </div>
      </div>

      {/* Hero Header */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden shadow-xl ring-1 ring-white/10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white text-[11px] font-black uppercase tracking-widest">
              <Rocket className="h-3.5 w-3.5 text-primary" />
              <span>{isIncubation ? 'Parul Innovation & Incubation Centre' : 'PIERC Accelerator'}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">{programmeTitle}</h1>
            <p className="text-slate-300 text-sm sm:text-base font-medium leading-relaxed">
              {isIncubation 
                ? 'Nurture your early-stage innovation with prototyping grants, laboratory infrastructure, and 1-on-1 industry mentorship.' 
                : 'Scale your revenue-generating venture and unlock strategic investment networks.'}
            </p>
          </div>

          <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 shrink-0 gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Application Progress</span>
            <div className="flex items-center gap-3">
              <div className="text-2xl font-black text-white">{completeness}%</div>
              <div className="w-16 h-2 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-orange-400 to-rose-500 transition-all duration-500 rounded-full" 
                  style={{ width: `${completeness}%` }}
                />
              </div>
            </div>
            <span className="text-[11px] font-medium text-slate-400">⏱ ~5 mins to complete</span>
          </div>
        </div>
      </div>

      {/* Stepper Navigation */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl p-2 sm:p-3 border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {steps.map((s) => {
            const isCompleted = currentStep > s.number;
            const isCurrent = currentStep === s.number;
            return (
              <button
                key={s.number}
                type="button"
                onClick={() => {
                  // Only allow jumping back to earlier steps or clicking current
                  if (s.number < currentStep) setCurrentStep(s.number);
                }}
                disabled={s.number > currentStep}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left cursor-pointer",
                  isCurrent && "bg-primary/10 border border-primary/20 shadow-xs",
                  isCompleted && "hover:bg-slate-50 cursor-pointer",
                  !isCurrent && !isCompleted && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 transition-all",
                  isCurrent && "bg-primary text-white shadow-md shadow-primary/25",
                  isCompleted && "bg-emerald-500 text-white",
                  !isCurrent && !isCompleted && "bg-slate-100 text-slate-400"
                )}>
                  {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : s.number}
                </div>
                <div className="min-w-0 hidden sm:block">
                  <p className={cn("text-xs font-bold truncate", isCurrent ? "text-primary" : "text-slate-800")}>
                    {s.title}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium truncate">{s.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 2-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Form Container (Left 8 Cols) */}
        <div className="lg:col-span-8">
          <Card className="border-slate-200/90 shadow-xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                    Step {currentStep} of {steps.length}
                  </span>
                  <CardTitle className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                    {steps[currentStep - 1].title}
                  </CardTitle>
                </div>
                <Badge variant="outline" className="font-bold text-xs bg-white text-slate-600 border-slate-200">
                  {steps[currentStep - 1].desc}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6 sm:p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  
                  {/* ============================================================== */}
                  {/* STEP 1: STARTUP PROFILE (INCUBATION) OR IDENTITY (GROWTHPAD) */}
                  {/* ============================================================== */}
                  {currentStep === 1 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      {isIncubation ? (
                        <>
                          <FormField
                            control={form.control}
                            name="startupTitle"
                            render={({ field }) => (
                              <FormItem className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                    Startup / Idea Title <span className="text-rose-500">*</span>
                                  </FormLabel>
                                  <span className="text-[10px] text-slate-400">Working name is fine</span>
                                </div>
                                <FormControl>
                                  <div className="relative">
                                    <Rocket className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    <Input 
                                      placeholder="e.g. AgroTech AI, SolarGlide Dynamics" 
                                      className="pl-11 h-12 rounded-xl text-base font-semibold border-slate-200 focus:ring-4 focus:ring-primary/10" 
                                      {...field} 
                                    />
                                  </div>
                                </FormControl>
                                <p className="text-xs text-slate-500">
                                  Give your innovation or venture a working title. You can always refine this during the program.
                                </p>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Interactive Stage Selector */}
                          <FormField
                            control={form.control}
                            name="currentStage"
                            render={({ field }) => (
                              <FormItem className="space-y-3 pt-2">
                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                  Current Venture Stage <span className="text-rose-500">*</span>
                                </FormLabel>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  {[
                                    {
                                      id: 'Idea',
                                      title: 'Idea / Concept',
                                      desc: 'Formulating the problem, market opportunity & thesis.',
                                      icon: Lightbulb,
                                      accent: 'text-amber-500 bg-amber-50',
                                    },
                                    {
                                      id: 'Prototype Stage',
                                      title: 'Prototype / MVP',
                                      desc: 'Working prototype, hardware sample, or code repo built.',
                                      icon: Cpu,
                                      accent: 'text-blue-500 bg-blue-50',
                                    },
                                    {
                                      id: 'Startup Stage',
                                      title: 'Early Traction',
                                      desc: 'Registered startup with pilot testers or early users.',
                                      icon: TrendingUp,
                                      accent: 'text-emerald-500 bg-emerald-50',
                                    },
                                  ].map((stage) => {
                                    const isSelected = field.value === stage.id;
                                    const IconComponent = stage.icon;
                                    return (
                                      <div
                                        key={stage.id}
                                        onClick={() => field.onChange(stage.id)}
                                        className={cn(
                                          "relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between text-left group",
                                          isSelected 
                                            ? "border-primary bg-primary/5 shadow-md ring-4 ring-primary/5" 
                                            : "border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/60"
                                        )}
                                      >
                                        <div>
                                          <div className="flex items-center justify-between mb-3">
                                            <div className={cn("p-2 rounded-xl", stage.accent)}>
                                              <IconComponent className="h-5 w-5" />
                                            </div>
                                            {isSelected && (
                                              <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center">
                                                <Check className="h-3 w-3 stroke-[3]" />
                                              </div>
                                            )}
                                          </div>
                                          <p className="font-bold text-sm text-slate-900 group-hover:text-primary transition-colors">
                                            {stage.title}
                                          </p>
                                          <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                                            {stage.desc}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      ) : (
                        /* GrowthPad Step 1 */
                        <div className="space-y-6">
                          <FormField
                            control={form.control}
                            name="startupStudio"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-600">Startup Studio *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger className="w-full h-12 rounded-xl">
                                      <SelectValue placeholder="Select Target Studio" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {["Ahmedabad Startup Studio", "Rajkot Startup Studio", "Vadodara Startup Studio", "Surat Startup Studio"].map(s => (
                                      <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="startupName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-600">Startup Name *</FormLabel>
                                  <FormControl><Input {...field} placeholder="Official Name" className="h-12 rounded-xl" /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="foundingYear"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-600">Founding Year *</FormLabel>
                                  <FormControl><Input {...field} placeholder="e.g. 2024" className="h-12 rounded-xl" /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name="cityHQ"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-600">City HQ *</FormLabel>
                                <FormControl><Input {...field} placeholder="e.g. Vadodara, Gujarat" className="h-12 rounded-xl" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* ============================================================== */}
                  {/* STEP 2: VALUE PROPOSITION (INCUBATION) OR BUSINESS (GROWTHPAD) */}
                  {/* ============================================================== */}
                  {currentStep === 2 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      {isIncubation ? (
                        <>
                          {/* Problem Statement with Live Gauge */}
                          <FormField
                            control={form.control}
                            name="problemStatement"
                            render={({ field }) => {
                              const charCount = field.value?.length || 0;
                              const isMet = charCount >= 50;
                              return (
                                <FormItem className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                      The Problem Statement <span className="text-rose-500">*</span>
                                    </FormLabel>
                                    <Badge 
                                      variant="outline" 
                                      className={cn(
                                        "text-[10px] font-bold transition-colors",
                                        isMet ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-amber-300 bg-amber-50 text-amber-700"
                                      )}
                                    >
                                      {charCount} / 50 min chars {isMet && "✓"}
                                    </Badge>
                                  </div>
                                  <FormControl>
                                    <textarea 
                                      {...field} 
                                      placeholder="What specific problem are you solving? Who faces this pain point daily?" 
                                      className="flex min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-sm focus:ring-4 focus:ring-primary/10 outline-none leading-relaxed transition-all" 
                                    />
                                  </FormControl>
                                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500">
                                    <Info className="h-4 w-4 text-primary shrink-0" />
                                    <span>Tip: Be specific about who experiences the pain point and how severe it is.</span>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              );
                            }}
                          />

                          {/* Solution with Live Gauge */}
                          <FormField
                            control={form.control}
                            name="solution"
                            render={({ field }) => {
                              const charCount = field.value?.length || 0;
                              const isMet = charCount >= 50;
                              return (
                                <FormItem className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                      Your Solution / Innovation <span className="text-rose-500">*</span>
                                    </FormLabel>
                                    <Badge 
                                      variant="outline" 
                                      className={cn(
                                        "text-[10px] font-bold transition-colors",
                                        isMet ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-amber-300 bg-amber-50 text-amber-700"
                                      )}
                                    >
                                      {charCount} / 50 min chars {isMet && "✓"}
                                    </Badge>
                                  </div>
                                  <FormControl>
                                    <textarea 
                                      {...field} 
                                      placeholder="How does your technology or approach solve the problem? What makes it work?" 
                                      className="flex min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-sm focus:ring-4 focus:ring-primary/10 outline-none leading-relaxed transition-all" 
                                    />
                                  </FormControl>
                                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500">
                                    <Info className="h-4 w-4 text-primary shrink-0" />
                                    <span>Tip: Describe the core mechanism, technology stack, or business workflow.</span>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              );
                            }}
                          />

                          {/* Uniqueness with Live Gauge */}
                          <FormField
                            control={form.control}
                            name="uniqueness"
                            render={({ field }) => {
                              const charCount = field.value?.length || 0;
                              const isMet = charCount >= 20;
                              return (
                                <FormItem className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                      Why is this Unique? (Moat / USP) <span className="text-rose-500">*</span>
                                    </FormLabel>
                                    <Badge 
                                      variant="outline" 
                                      className={cn(
                                        "text-[10px] font-bold transition-colors",
                                        isMet ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-amber-300 bg-amber-50 text-amber-700"
                                      )}
                                    >
                                      {charCount} / 20 min chars {isMet && "✓"}
                                    </Badge>
                                  </div>
                                  <FormControl>
                                    <textarea 
                                      {...field} 
                                      placeholder="What makes your solution 10x better than alternatives (cost, speed, proprietary design)?" 
                                      className="flex min-h-[100px] w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-sm focus:ring-4 focus:ring-primary/10 outline-none leading-relaxed transition-all" 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              );
                            }}
                          />
                        </>
                      ) : (
                        /* GrowthPad Step 2 */
                        <div className="space-y-6">
                          <FormField
                            control={form.control}
                            name="companyStatus"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-600">Company Status *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger className="w-full h-12 rounded-xl">
                                      <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {["Yet To Incorporate", "Incorporated In India", "Incorporated Outside Of India"].map(s => (
                                      <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="sector"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-600">Sector *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger className="w-full h-12 rounded-xl">
                                      <SelectValue placeholder="Select Sector" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {["B2B Softwares", "HealthTech", "FinTech", "EdTech", "CleanTech", "AgriTech", "Consumer / D2C", "Hardware / DeepTech"].map(s => (
                                      <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-600">Startup Description *</FormLabel>
                                <FormControl>
                                  <textarea 
                                    className="flex min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm focus:ring-4 focus:ring-primary/10 outline-none"
                                    placeholder="Tell us about your startup, your product, and your business model..."
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="website"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-600">Website URL (Optional)</FormLabel>
                                <FormControl><Input {...field} placeholder="https://yourstartup.com" className="h-12 rounded-xl" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* ============================================================== */}
                  {/* STEP 3: FOUNDING TEAM (INCUBATION) OR TRACTION (GROWTHPAD) */}
                  {/* ============================================================== */}
                  {currentStep === 3 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      {isIncubation ? (
                        <div className="space-y-6">
                          
                          {/* Primary Applicant Card */}
                          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-50 to-white border border-slate-200/90 shadow-xs">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Lead Applicant (You)
                              </span>
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                                Verified Profile
                              </Badge>
                            </div>
                            <div className="flex items-start sm:items-center gap-4">
                              <Avatar className="h-12 w-12 ring-2 ring-primary/20 shrink-0">
                                <AvatarImage src={user?.photoURL || ''} />
                                <AvatarFallback className="bg-primary text-white font-bold text-base">
                                  {(user?.displayName || user?.email || 'U')[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="space-y-1 min-w-0">
                                <p className="font-black text-slate-900 text-base leading-tight truncate">
                                  {user?.displayName || 'Lead Founder'}
                                </p>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {user?.email}</span>
                                  {user?.contactNumber && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {user?.contactNumber}</span>}
                                  {user?.institute && <span className="flex items-center gap-1"><Building className="h-3 w-3" /> {user?.institute}</span>}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Co-Founders Header & List */}
                          <div className="space-y-4 pt-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">Co-Founders & Team Members</h3>
                                <p className="text-xs text-slate-500">Add key partners, developers, or advisors on your founding team.</p>
                              </div>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                className="h-9 rounded-xl font-bold text-xs border-primary/30 text-primary hover:bg-primary/5 shadow-xs"
                                onClick={() => setShowAddMember(true)}
                              >
                                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Co-Founder
                              </Button>
                            </div>

                            {/* Add Member Form Drawer / Inline Card */}
                            {showAddMember && (
                              <div className="p-4 rounded-2xl border-2 border-primary/20 bg-primary/5 space-y-4 animate-in slide-in-from-top-2">
                                <div className="flex items-center justify-between border-b border-primary/10 pb-2">
                                  <span className="text-xs font-black uppercase tracking-wider text-primary">New Co-Founder Information</span>
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 text-xs text-slate-500 hover:text-slate-800"
                                    onClick={() => setShowAddMember(false)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <Input 
                                    placeholder="Full Name *" 
                                    value={newMemberName}
                                    onChange={(e) => setNewMemberName(e.target.value)}
                                    className="h-10 text-xs rounded-xl bg-white"
                                  />
                                  <Input 
                                    placeholder="Email Address" 
                                    type="email"
                                    value={newMemberEmail}
                                    onChange={(e) => setNewMemberEmail(e.target.value)}
                                    className="h-10 text-xs rounded-xl bg-white"
                                  />
                                  <Input 
                                    placeholder="Phone Number" 
                                    value={newMemberPhone}
                                    onChange={(e) => setNewMemberPhone(e.target.value)}
                                    className="h-10 text-xs rounded-xl bg-white"
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button 
                                    type="button" 
                                    size="sm" 
                                    className="h-9 px-4 rounded-xl font-bold text-xs shadow-md shadow-primary/20"
                                    onClick={handleAddMember}
                                  >
                                    <Check className="h-3.5 w-3.5 mr-1.5" /> Confirm & Add
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Team Member Cards */}
                            {form.watch('teamMembers')?.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {form.watch('teamMembers').map((m: any, idx: number) => (
                                  <div 
                                    key={idx}
                                    className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs flex items-center justify-between group hover:border-slate-300 transition-all"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-10 h-10 rounded-xl bg-slate-100 font-bold text-slate-700 flex items-center justify-center shrink-0">
                                        {(m.name || 'M')[0].toUpperCase()}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-bold text-sm text-slate-900 truncate">{m.name}</p>
                                        <p className="text-xs text-slate-500 truncate">{m.email || 'No email'}</p>
                                        {m.phone && <p className="text-[11px] text-slate-400 truncate">{m.phone}</p>}
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg shrink-0"
                                      onClick={() => handleRemoveMember(idx)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-center space-y-1">
                                <p className="text-xs font-bold text-slate-600">Solo Founder?</p>
                                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                  No problem! Solo applicants are welcome. You can add co-founders now or invite them after acceptance.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* GrowthPad Step 3 */
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <FormField
                              control={form.control}
                              name="isProductLive"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-600">Product Live? *</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value || ""}>
                                    <FormControl><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      <SelectItem value="Yes">Yes</SelectItem>
                                      <SelectItem value="No">No (In Beta)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="revenueGenerated"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-600">Revenue *</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value || ""}>
                                    <FormControl><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      <SelectItem value="Prerevenue">Pre-revenue</SelectItem>
                                      <SelectItem value="Upto 1L/mo">Up to ₹1L/month</SelectItem>
                                      <SelectItem value="1L-5L/mo">₹1L - ₹5L/month</SelectItem>
                                      <SelectItem value="5L+/mo">₹5L+/month</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="capitalToRaise"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-600">Target Capital *</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value || ""}>
                                    <FormControl><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      <SelectItem value="Upto 10L">Up to ₹10 Lakhs</SelectItem>
                                      <SelectItem value="10L-25L">₹10L - ₹25 Lakhs</SelectItem>
                                      <SelectItem value="25L-50L">₹25L - ₹50 Lakhs</SelectItem>
                                      <SelectItem value="50L+">₹50 Lakhs+</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Founding Team Table / Card */}
                          <div className="space-y-4 pt-4 border-t">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Founding Team</span>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                className="h-8 rounded-lg text-xs font-bold"
                                onClick={() => setShowAddMember(true)}
                              >
                                <Plus className="h-3 w-3 mr-1" /> Add Member
                              </Button>
                            </div>
                            {/* Same member display */}
                            {form.watch('teamMembers')?.map((m: any, idx: number) => (
                              <div key={idx} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                                <span className="font-bold text-xs">{m.name} ({m.email})</span>
                                <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveMember(idx)} className="h-7 text-rose-500">Remove</Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ============================================================== */}
                  {/* STEP 4: PITCH DECK & FINAL REVIEW */}
                  {/* ============================================================== */}
                  {currentStep === 4 && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                      
                      {/* Pitch Deck Upload Dropzone */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            Pitch Deck or Project Overview {isIncubation ? '(Optional)' : '<span className="text-rose-500">*</span>'}
                          </label>
                          <span className="text-[10px] text-slate-400">PDF Document • Max 15MB</span>
                        </div>

                        <div 
                          className={cn(
                            "border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer shadow-xs",
                            file 
                              ? "border-primary bg-primary/5 ring-4 ring-primary/5" 
                              : "border-slate-200 hover:border-primary/50 hover:bg-slate-50/70"
                          )}
                          onClick={() => document.getElementById('pitchDeckInput')?.click()}
                        >
                          <input 
                            id="pitchDeckInput" 
                            type="file" 
                            className="hidden" 
                            accept=".pdf" 
                            onChange={(e) => {
                              const uploaded = e.target.files?.[0];
                              if (uploaded && uploaded.size > 15 * 1024 * 1024) {
                                toast.error('File size must be under 15MB');
                                return;
                              }
                              setFile(uploaded || null);
                            }} 
                          />
                          {file ? (
                            <div className="space-y-3">
                              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary">
                                <CheckCircle2 className="h-8 w-8" />
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-900">{file.name}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for submission</p>
                              </div>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl font-bold text-xs"
                                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                              >
                                Remove and Replace
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                                <Upload className="h-7 w-7" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900">Click or drag & drop your Pitch Deck</p>
                                <p className="text-xs text-slate-400 mt-0.5">Include slides on problem, solution, team & market</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Application Summary Review Card */}
                      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                            <FileCheck2 className="h-4 w-4 text-primary" />
                            Application Summary Preview
                          </h4>
                          <span className="text-[10px] text-slate-400 font-semibold">Review before submitting</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Startup Name</span>
                            <p className="font-bold text-slate-900">{watchedValues.startupTitle || watchedValues.startupName || 'Not specified'}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stage / Status</span>
                            <p className="font-bold text-slate-900">{watchedValues.currentStage || watchedValues.companyStatus || 'Not specified'}</p>
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Problem Statement</span>
                            <p className="text-slate-600 line-clamp-2">{watchedValues.problemStatement || watchedValues.description || 'Not provided'}</p>
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Innovation / Solution</span>
                            <p className="text-slate-600 line-clamp-2">{watchedValues.solution || 'Not provided'}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Team Size</span>
                            <p className="font-bold text-slate-900">1 Lead Founder + {(watchedValues.teamMembers || []).length} Co-Founders</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pitch Deck</span>
                            <p className="font-bold text-slate-900">{file ? 'Attached (PDF)' : 'None attached'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Declaration Checkbox */}
                      <div className="flex items-start space-x-3 p-4 rounded-2xl bg-white border border-slate-200">
                        <input 
                          type="checkbox" 
                          id="agreeTerms" 
                          checked={agreeTerms}
                          onChange={(e) => setAgreeTerms(e.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                        />
                        <label htmlFor="agreeTerms" className="text-xs text-slate-600 font-medium leading-relaxed cursor-pointer">
                          I certify that all information submitted is accurate and represents original work. I agree to abide by the PIERC Incubation guidelines, code of conduct, and evaluation procedures.
                        </label>
                      </div>

                    </div>
                  )}

                  {/* Navigation Buttons (Back / Next / Submit) */}
                  <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
                    {currentStep > 1 ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePrevStep}
                        className="h-12 px-6 rounded-xl font-bold text-slate-700 border-slate-200 hover:bg-slate-50"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1.5" /> Previous
                      </Button>
                    ) : (
                      <div />
                    )}

                    {currentStep < 4 ? (
                      <Button
                        type="button"
                        onClick={handleNextStep}
                        className="h-12 px-8 rounded-xl font-black bg-primary text-white shadow-lg shadow-primary/25 hover:shadow-primary/35 transition-all"
                      >
                        Continue to Step {currentStep + 1} <ChevronRight className="h-4 w-4 ml-1.5" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={loading || !agreeTerms}
                        className="h-14 px-10 rounded-2xl font-black text-base bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-xl shadow-red-500/25 hover:shadow-red-500/35 transition-all"
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                            Submitting Application...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Save className="h-5 w-5" />
                            Submit Application 🚀
                          </span>
                        )}
                      </Button>
                    )}
                  </div>

                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Sticky Application Assistant Sidebar (Right 4 Cols) */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
          
          {/* Assistant Card */}
          <Card className="border-slate-200/90 shadow-xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-5">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-900">
                  Application Assistant
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              
              {/* Applicant Snapshot */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <Avatar className="h-10 w-10 ring-2 ring-white">
                  <AvatarImage src={user?.photoURL || ''} />
                  <AvatarFallback className="bg-primary text-white font-bold text-sm">
                    {(user?.displayName || user?.email || 'U')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{user?.displayName || 'Applicant'}</p>
                  <p className="text-[10px] text-slate-500 truncate">{user?.institute || user?.email}</p>
                </div>
              </div>

              {/* Evaluation Criteria Checklist */}
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  What Evaluators Look For
                </span>
                <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Problem Depth:</strong> Clear evidence of real market friction.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Feasibility:</strong> Realistic technology prototype or execution roadmap.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Defensibility:</strong> A defensible moat or 10x cost/speed advantage.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Team Dedication:</strong> Complementary skill sets and founder drive.</span>
                  </li>
                </ul>
              </div>

              {/* Accelerator Benefits Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-rose-50 border border-primary/10 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1">
                  <Rocket className="h-3.5 w-3.5" /> Incubation Perks
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Admitted startups receive up to ₹5 Lakhs in prototyping grants, dedicated lab facilities, patent filing support, and direct access to angel syndicates.
                </p>
              </div>

            </CardContent>
          </Card>

        </div>

      </div>

    </div>
  );
}
