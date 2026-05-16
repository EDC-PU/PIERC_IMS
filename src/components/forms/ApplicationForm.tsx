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
  FormDescription
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Trash2 
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { ref, push, set } from 'firebase/database';
import { db, storage } from '@/lib/firebase';
import { ref as sRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

const incubationSchema = z.object({
  teamMembers: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email").or(z.literal('')),
    phone: z.string().min(10, "Invalid phone").or(z.literal('')),
  })),
  startupTitle: z.string().min(2, "Startup title must be at least 2 characters"),
  problemStatement: z.string().min(50, "Problem statement should be detailed"),
  solution: z.string().min(50, "Solution description should be detailed"),
  uniqueness: z.string().min(20, "Please explain the uniqueness"),
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
  description: z.string().min(50, "Please provide a detailed description"),
  website: z.string().url().optional().or(z.literal('')),
  cityHQ: z.string().min(1, "City HQ is required"),
  sector: z.string().min(1, "Please select a sector"),
  isProductLive: z.string().min(1, "Required"),
  revenueGenerated: z.string().min(1, "Required"),
  capitalToRaise: z.string().min(1, "Required"),
});

export default function ApplicationForm({ programmeId, programmeTitle }: { programmeId: string, programmeTitle: string }) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();
  const router = useRouter();

  const isGrowthPad = programmeId.toLowerCase().includes('growth');

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
  });

  const [file, setFile] = useState<File | null>(null);

  async function onSubmit(values: any) {
    if (!user) return;
    if (!file) {
      toast.error('Please upload your Pitch Deck');
      return;
    }
    setLoading(true);
    try {
      let pitchDeckUrl = "";
      const fileRef = sRef(storage, `applications/${user.uid}/${Date.now()}_${file.name}`);
      const uploadResult = await uploadBytes(fileRef, file);
      pitchDeckUrl = await getDownloadURL(uploadResult.ref);

      const applicationsRef = ref(db, 'applications');
      const newAppRef = push(applicationsRef);
      
      const applicationData = {
        id: newAppRef.key,
        userId: user.uid,
        userName: user.displayName,
        userEmail: user.email,
        userContact: user.contactNumber || "",
        userEnrollment: user.enrollmentNumber || "",
        userInstitute: user.institute || "",
        userCategory: user.category || "",
        startupTitle: isGrowthPad ? values.startupName : values.startupTitle,
        programmeId,
        programmeTitle,
        status: 'Submitted',
        submittedAt: Date.now(),
        updatedAt: Date.now(),
        data: values,
        documents: {
          pitchDeck: pitchDeckUrl,
        },
        timeline: [
          { status: 'Submitted', timestamp: Date.now(), remarks: 'Application submitted successfully.' }
        ]
      };

      await set(newAppRef, applicationData);
      
      const userAppsRef = ref(db, `users/${user.uid}/applications/${newAppRef.key}`);
      await set(userAppsRef, true);

      const notifRef = ref(db, `notifications/${user.uid}/${Date.now()}`);
      await set(notifRef, {
        id: Date.now().toString(),
        userId: user.uid,
        title: 'Application Submitted',
        message: `Your application for ${programmeTitle} has been received.`,
        type: 'success',
        read: false,
        timestamp: Date.now(),
      });

      toast.success('Application submitted successfully!');
      router.push('/dashboard/applications');
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit application');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-4xl mx-auto overflow-hidden border-none shadow-2xl ring-1 ring-slate-200">
      <CardHeader className="bg-slate-50/50 border-b pb-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Rocket className="h-5 w-5 text-primary" />
          </div>
          <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Programme Application</span>
        </div>
        <CardTitle className="text-3xl font-black tracking-tight text-slate-900">{programmeTitle}</CardTitle>
        <CardDescription className="text-slate-500 font-medium">Please provide all necessary details about your startup to complete the application.</CardDescription>
      </CardHeader>
      
      <CardContent className="pt-10">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
            
            {isGrowthPad ? (
              <div className="space-y-12">
                {/* Section 1: Identity */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-2 border-b pb-2">
                    <Layout className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Startup Identity</h3>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="startupStudio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Startup Studio</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full h-12 rounded-xl">
                              <SelectValue placeholder="Select Studio" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[300px] overflow-y-auto">
                            {["Ahmedabad Startup Studio", "Rajkot Startup Studio", "Vadodara Startup Studio", "Surat Startup Studio"].map(s => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="startupName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Startup Name</FormLabel>
                          <FormControl><Input {...field} placeholder="Name of your Startup" className="h-12 rounded-xl" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="foundingYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Founding Year</FormLabel>
                          <FormControl><Input {...field} placeholder="e.g. 2023" className="h-12 rounded-xl" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="teamMembers"
                    render={() => (
                      <FormItem className="space-y-4 pt-4">
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Founding Team Members</FormLabel>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest"
                            onClick={() => {
                              const currentTeam = form.getValues('teamMembers') || [];
                              form.setValue('teamMembers', [...currentTeam, { name: '', email: '', phone: '' }]);
                            }}
                          >
                            <Plus className="h-3 w-3 mr-2" /> Add Member
                          </Button>
                        </div>
                        
                        <div className="border rounded-2xl overflow-hidden bg-slate-50/30">
                          <Table>
                            <TableHeader className="bg-slate-100/50">
                              <TableRow className="border-slate-100">
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-3">Name</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-3">Email</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-3">Phone</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-3 text-right">Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {form.watch('teamMembers')?.map((member: any, index: number) => (
                                <TableRow key={index} className="border-slate-100 bg-white/50">
                                  <TableCell className="py-2">
                                    <Input 
                                      placeholder="Full Name" 
                                      className="h-9 text-xs rounded-lg border-none bg-transparent focus:ring-1 focus:ring-primary/20"
                                      value={member.name}
                                      onChange={(e) => {
                                        const team = [...form.getValues('teamMembers')];
                                        team[index].name = e.target.value;
                                        form.setValue('teamMembers', team);
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell className="py-2">
                                    <Input 
                                      placeholder="Email" 
                                      className="h-9 text-xs rounded-lg border-none bg-transparent focus:ring-1 focus:ring-primary/20"
                                      value={member.email}
                                      onChange={(e) => {
                                        const email = e.target.value;
                                        if (email.toLowerCase() === user?.email?.toLowerCase()) {
                                          toast.error('You are already the primary applicant. No need to add yourself to the team list.');
                                          return;
                                        }
                                        const team = [...form.getValues('teamMembers')];
                                        team[index].email = email;
                                        form.setValue('teamMembers', team);
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell className="py-2">
                                    <Input 
                                      placeholder="Phone" 
                                      className="h-9 text-xs rounded-lg border-none bg-transparent focus:ring-1 focus:ring-primary/20"
                                      value={member.phone}
                                      onChange={(e) => {
                                        const team = [...form.getValues('teamMembers')];
                                        team[index].phone = e.target.value;
                                        form.setValue('teamMembers', team);
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell className="py-2 text-right">
                                    <Button 
                                      type="button" 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50 rounded-lg"
                                      onClick={() => {
                                        const team = [...form.getValues('teamMembers')];
                                        team.splice(index, 1);
                                        form.setValue('teamMembers', team);
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Section 2: Business Status */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-2 border-b pb-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Business & Operations</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="companyStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Company Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      name="cityHQ"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">City HQ</FormLabel>
                          <FormControl><Input {...field} placeholder="Location" className="h-12 rounded-xl" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Startup Description</FormLabel>
                        <FormControl>
                          <textarea 
                            className="flex min-h-[120px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            placeholder="Tell us about your startup, your product, and your mission..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Website (Optional)</FormLabel>
                          <FormControl><Input {...field} placeholder="https://..." className="h-12 rounded-xl" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sector"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Startup Sector</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="w-full h-12 rounded-xl">
                                <SelectValue placeholder="Select sector" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-[300px] overflow-y-auto">
                              {["Aerospace", "Agriculture", "B2B Softwares", "D2C", "Deeptech", "Education", "Energy & Environment", "Fintech", "Heathcare/ Heath Tech", "Industrial", "Media/ Media Tech", "Real Estate & Construction", "HR Tech", "Marketplace", "Web3", "Other"].map(s => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="isProductLive"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Product Live?</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="w-full h-12 rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="Yes">Yes</SelectItem>
                              <SelectItem value="No">No</SelectItem>
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
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Revenue</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="w-full h-12 rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              {["Prerevenue", "Upto 5L", "5L-10L", "10L to 25L", "More than 25L"].map(s => (
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
                      name="capitalToRaise"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Capital to Raise</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="w-full h-12 rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              {["Upto 10L", "10 Lakhs to 25 Lakhs", "25 Lakhs to 50 Lakhs", "50 Lakhs to 1 Crore", "More than 1 Crore"].map(s => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-12">
                {/* Section 1: Idea Identity */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-2 border-b pb-2">
                    <Layout className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Project Identity</h3>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="startupTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Title of the Startup / Innovation</FormLabel>
                        <FormControl><Input placeholder="Give your idea a name" {...field} className="h-12 rounded-xl" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="teamMembers"
                    render={() => (
                      <FormItem className="space-y-4">
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Founding Team Members</FormLabel>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest"
                            onClick={() => {
                              const currentTeam = form.getValues('teamMembers') || [];
                              form.setValue('teamMembers', [...currentTeam, { name: '', email: '', phone: '' }]);
                            }}
                          >
                            <Plus className="h-3 w-3 mr-2" /> Add Member
                          </Button>
                        </div>
                        
                        <div className="border rounded-2xl overflow-hidden bg-slate-50/30">
                          <Table>
                            <TableHeader className="bg-slate-100/50">
                              <TableRow className="border-slate-100">
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-3">Name</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-3">Email</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-3">Phone</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-3 text-right">Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {form.watch('teamMembers')?.map((member: any, index: number) => (
                                <TableRow key={index} className="border-slate-100 bg-white/50">
                                  <TableCell className="py-2">
                                    <Input 
                                      placeholder="Full Name" 
                                      className="h-9 text-xs rounded-lg border-none bg-transparent focus:ring-1 focus:ring-primary/20"
                                      value={member.name}
                                      onChange={(e) => {
                                        const team = [...form.getValues('teamMembers')];
                                        team[index].name = e.target.value;
                                        form.setValue('teamMembers', team);
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell className="py-2">
                                    <Input 
                                      placeholder="Email" 
                                      className="h-9 text-xs rounded-lg border-none bg-transparent focus:ring-1 focus:ring-primary/20"
                                      value={member.email}
                                      onChange={(e) => {
                                        const email = e.target.value;
                                        if (email.toLowerCase() === user?.email?.toLowerCase()) {
                                          toast.error('You are already the primary applicant. No need to add yourself to the team list.');
                                          return;
                                        }
                                        const team = [...form.getValues('teamMembers')];
                                        team[index].email = email;
                                        form.setValue('teamMembers', team);
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell className="py-2">
                                    <Input 
                                      placeholder="Phone" 
                                      className="h-9 text-xs rounded-lg border-none bg-transparent focus:ring-1 focus:ring-primary/20"
                                      value={member.phone}
                                      onChange={(e) => {
                                        const team = [...form.getValues('teamMembers')];
                                        team[index].phone = e.target.value;
                                        form.setValue('teamMembers', team);
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell className="py-2 text-right">
                                    <Button 
                                      type="button" 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50 rounded-lg"
                                      onClick={() => {
                                        const team = [...form.getValues('teamMembers')];
                                        team.splice(index, 1);
                                        form.setValue('teamMembers', team);
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                              {(!form.watch('teamMembers') || form.watch('teamMembers').length === 0) && (
                                <TableRow>
                                  <TableCell colSpan={4} className="py-8 text-center text-slate-400 text-xs font-medium italic">
                                    No team members added yet. Click 'Add Member' to start.
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="currentStage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Current Stage</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="w-full h-12 rounded-xl"><SelectValue placeholder="Select current stage..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Idea">Idea / Concept</SelectItem>
                            <SelectItem value="Prototype Stage">Prototype / MVP Stage</SelectItem>
                            <SelectItem value="Startup Stage">Early Traction / Startup Stage</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Section 2: Core Proposition */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-2 border-b pb-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Value Proposition</h3>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="problemStatement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Problem Statement</FormLabel>
                        <FormControl><textarea {...field} placeholder="What specific problem are you solving?" className="flex min-h-[120px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="solution"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Solution</FormLabel>
                        <FormControl><textarea {...field} placeholder="How does your innovation solve the problem?" className="flex min-h-[120px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="uniqueness"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Why is this unique?</FormLabel>
                        <FormControl><textarea {...field} placeholder="What makes your solution better than existing ones?" className="flex min-h-[100px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Final Section: Documents (Always Visible at bottom) */}
            <div className="space-y-6 pt-12 border-t">
              <div className="flex items-center space-x-2 pb-2">
                <Upload className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Documentation</h3>
              </div>
              
              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-primary">Pitch Deck</label>
                <div 
                  className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer shadow-sm ${file ? 'border-primary bg-primary/5 ring-4 ring-primary/5' : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50'}`}
                  onClick={() => document.getElementById('pitchDeck')?.click()}
                >
                  <input id="pitchDeck" type="file" className="hidden" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  {file ? (
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <p className="text-base font-bold text-slate-900">{file.name}</p>
                        <p className="text-xs text-slate-500 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB • PDF Document</p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-rose-500 font-bold hover:bg-rose-50 rounded-xl" onClick={(e) => { e.stopPropagation(); setFile(null); }}>Remove and Replace</Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                        <Upload className="h-8 w-8 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-base font-bold text-slate-900">Click to upload Pitch Deck</p>
                        <p className="text-xs text-slate-500 mt-1">Maximum file size: 10MB • Format: PDF</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submission */}
            <div className="pt-8 border-t flex flex-col items-center space-y-4">
              <Button 
                type="submit" 
                className="w-full md:w-auto min-w-[280px] h-14 rounded-2xl text-lg font-black shadow-xl shadow-primary/25 hover:shadow-primary/35 transition-all" 
                disabled={loading}
              >
                {loading ? (
                  <>Processing Application...</>
                ) : (
                  <>
                    <Save className="mr-2 h-5 w-5" /> 
                    Submit Application
                  </>
                )}
              </Button>
              <p className="text-xs text-slate-400 font-medium italic">By submitting, you agree to PIERC incubation terms and conditions.</p>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
