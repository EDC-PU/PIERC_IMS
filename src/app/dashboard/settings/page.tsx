'use client';

import { useState, useEffect } from 'react';
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
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { doc, updateDoc, setDoc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { institutes } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { programmeDefaults } from '@/lib/programmes';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Globe, 
  ExternalLink,
  ShieldCheck,
  Bell,
  Save,
  Loader2,
  GraduationCap
} from 'lucide-react';

const profileSchema = z.object({
  email: z.string().optional(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  contactNumber: z.string().min(10, "Contact number must be at least 10 digits"),
  enrollmentNumber: z.string().optional(),
  category: z.string().optional(),
  othersSpecify: z.string().optional(),
  institute: z.string().optional(),
  linkedin: z.string().url().optional().or(z.literal('')),
  socialCategory: z.string().optional(),
  gender: z.string().optional(),
  caste: z.string().optional(),
}).superRefine((data, ctx) => {
  const isParulEmail = data.email?.toLowerCase().endsWith('@paruluniversity.ac.in');
  if (isParulEmail) {
    if (!data.enrollmentNumber || data.enrollmentNumber.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['enrollmentNumber'],
        message: 'Enrollment number is required',
      });
    }
    if (!data.category || data.category.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['category'],
        message: 'Please select a category',
      });
    }
  }
  if (!data.institute || data.institute.trim() === "") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['institute'],
      message: isParulEmail ? 'Please select your institute' : 'Please enter your institute name',
    });
  }
});

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const { user, setUser } = useAuthStore();
  const isParulEmail = user?.email?.toLowerCase().endsWith('@paruluniversity.ac.in');
  const [notifPrefs, setNotifPrefs] = useState({
    applications: true,
    meetings: true,
    messages: true,
    marketing: false,
  });
  const [programmes, setProgrammes] = useState<{ id: string; name: string; isApplicationOpen: boolean }[]>([]);
  const [programmeLoading, setProgrammeLoading] = useState(false);
  const [pendingProgrammeIds, setPendingProgrammeIds] = useState<string[]>([]);

  useEffect(() => {
    if (user?.notifications) {
      setNotifPrefs(user.notifications);
    }
  }, [user]);

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      email: user?.email || "",
      name: user?.displayName || "",
      contactNumber: user?.contactNumber || "",
      enrollmentNumber: user?.enrollmentNumber || "",
      category: user?.category || "",
      othersSpecify: user?.othersSpecify || "",
      institute: user?.institute || "",
      linkedin: user?.linkedin || "",
      socialCategory: user?.socialCategory || "",
      gender: user?.gender || "",
      caste: user?.caste || "",
    },
  });

  useEffect(() => {
    if (user) {
      const isParulEmail = user.email?.toLowerCase().endsWith('@paruluniversity.ac.in');
      profileForm.reset({
        email: user.email || "",
        name: user.displayName,
        contactNumber: user.contactNumber || "",
        enrollmentNumber: user.enrollmentNumber || "",
        category: user.category || (isParulEmail ? "PU Student" : ""),
        othersSpecify: user.othersSpecify || "",
        institute: user.institute || "",
        linkedin: user.linkedin || "",
        socialCategory: user.socialCategory || "",
        gender: user.gender || "",
        caste: user.caste || "",
      });
    }
  }, [user, profileForm]);

  async function onProfileSubmit(values: z.infer<typeof profileSchema>) {
    if (!user) return;
    setLoading(true);
    try {
      const isParulEmail = values.email?.toLowerCase().endsWith('@paruluniversity.ac.in');
      const updates = {
        displayName: values.name,
        contactNumber: values.contactNumber,
        enrollmentNumber: isParulEmail ? (values.enrollmentNumber || '') : '',
        category: isParulEmail ? (values.category || '') : '',
        othersSpecify: (isParulEmail && values.category === 'Others') ? (values.othersSpecify || '') : '',
        institute: values.institute || '',
        linkedin: values.linkedin || '',
        socialCategory: values.socialCategory || '',
        gender: values.gender || '',
        caste: values.caste || '',
        updatedAt: Date.now(),
      };
      await updateDoc(doc(db, 'users', user.uid), updates);
      setUser({ ...user, ...updates });
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  }


  async function saveNotifications() {
    if (!user) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        notifications: notifPrefs,
        updatedAt: Date.now(),
      });
      setUser({ ...user, notifications: notifPrefs });
      toast.success('Notification preferences updated');
    } catch (error) {
      toast.error('Failed to update preferences');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role !== 'super_admin') {
      setProgrammes([]);
      return;
    }

    setProgrammeLoading(true);
    const programmesCol = collection(db, 'programmes');
    const unsubscribe = onSnapshot(programmesCol, (snapshot) => {
      const data: Record<string, any> = {};
      snapshot.docs.forEach(d => { data[d.id] = d.data(); });
      const programmeList = programmeDefaults.map((defaultProgramme) => {
        const programmeData = data[defaultProgramme.id];
        return {
          id: defaultProgramme.id,
          name: programmeData?.title || programmeData?.name || defaultProgramme.title,
          isApplicationOpen: programmeData?.isApplicationOpen ?? defaultProgramme.active,
        };
      });
      setProgrammes(programmeList);
      setProgrammeLoading(false);
    }, (error) => {
      console.error('Programme load error:', error);
      toast.error('Unable to load programme settings.');
      setProgrammes(programmeDefaults.map((defaultProgramme) => ({
        id: defaultProgramme.id,
        name: defaultProgramme.title,
        isApplicationOpen: defaultProgramme.active,
      })));
      setProgrammeLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user?.role]);

  const toggleProgrammeStatus = async (programmeId: string, currentStatus: boolean) => {
    if (!user) return;

    const newStatus = !currentStatus;
    setPendingProgrammeIds((prev) => [...prev, programmeId]);
    setProgrammes((prev) => prev.map((prog) => prog.id === programmeId ? { ...prog, isApplicationOpen: newStatus } : prog));

    try {
      await setDoc(doc(db, 'programmes', programmeId), { isApplicationOpen: newStatus }, { merge: true });
      toast.success(`Programme ${newStatus ? 'opened' : 'closed'} successfully`);
    } catch (error) {
      setProgrammes((prev) => prev.map((prog) => prog.id === programmeId ? { ...prog, isApplicationOpen: currentStatus } : prog));
      toast.error('Failed to update programme status');
    } finally {
      setPendingProgrammeIds((prev) => prev.filter((id) => id !== programmeId));
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Settings</h1>
          <p className="text-slate-500 font-medium mt-1">Manage your account and profile preferences.</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-xl h-12 w-full sm:w-auto grid grid-cols-2 sm:flex">
          <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-8">Profile</TabsTrigger>
          <TabsTrigger value="account" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-8">Account</TabsTrigger>
          {user?.role === 'super_admin' && (
            <TabsTrigger value="programme" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-8">Programme Control</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="space-y-6 outline-none">
          <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b pb-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16 ring-4 ring-white shadow-md">
                  <AvatarImage src={user?.photoURL} />
                  <AvatarFallback className="bg-primary text-white text-xl font-bold">{user?.displayName?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-xl">Personal Information</CardTitle>
                  <CardDescription>Update your personal and educational details.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-8">
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Full Name</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                              <Input {...field} className="pl-10 h-11 rounded-xl" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormItem>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input value={user?.email || ""} disabled className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200 text-slate-400" />
                        </div>
                      <p className="text-[10px] text-slate-500 mt-1">Email cannot be changed.</p>
                    </FormItem>
                  </div>

                  <div className={cn(
                    "grid grid-cols-1 gap-6",
                    isParulEmail ? "md:grid-cols-2" : "md:grid-cols-1"
                  )}>
                    <FormField
                      control={profileForm.control}
                      name="contactNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Contact Number</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                              <Input {...field} className="pl-10 h-11 rounded-xl" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {isParulEmail && (
                      <FormField
                        control={profileForm.control}
                        name="enrollmentNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Enrollment Number</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <GraduationCap className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input {...field} className="pl-10 h-11 rounded-xl" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <div className={cn(
                    "grid grid-cols-1 gap-6",
                    isParulEmail ? "md:grid-cols-2" : "md:grid-cols-1"
                  )}>
                    {isParulEmail && (
                      <FormField
                        control={profileForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Applicant Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="w-full h-11 rounded-xl">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="PU Student">Parul University Student</SelectItem>
                                <SelectItem value="PU Staff member">Parul University Staff member</SelectItem>
                                <SelectItem value="PU Alumni">Parul University Alumni</SelectItem>
                                <SelectItem value="Others">Others</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <FormField
                      control={profileForm.control}
                      name="institute"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            {isParulEmail ? "Institute / College" : "Institute / College Name"}
                          </FormLabel>
                          {isParulEmail ? (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="w-full h-11 rounded-xl">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-[300px] overflow-y-auto">
                                {institutes.map((inst, idx) => (
                                  <SelectItem key={idx} value={inst}>{inst}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <FormControl>
                              <Input placeholder="Enter your institute/college name" {...field} className="h-11 rounded-xl" />
                            </FormControl>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {isParulEmail && profileForm.watch("category") === "Others" && (
                    <FormField
                      control={profileForm.control}
                      name="othersSpecify"
                      render={({ field }) => (
                        <FormItem className="animate-in slide-in-from-top-2">
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Specify Institute Name</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-11 rounded-xl" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={profileForm.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Gender</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="w-full h-11 rounded-xl">
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="socialCategory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="w-full h-11 rounded-xl">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="General (Open)">General (Open)</SelectItem>
                              <SelectItem value="OBC">OBC</SelectItem>
                              <SelectItem value="SC">SC</SelectItem>
                              <SelectItem value="ST">ST</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={profileForm.control}
                    name="caste"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Caste</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter your caste" className="h-11 rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="linkedin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">LinkedIn Profile URL</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <ExternalLink className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input {...field} placeholder="https://linkedin.com/in/yourprofile" className="pl-10 h-11 rounded-xl" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-4 border-t flex justify-end">
                    <Button type="submit" className="rounded-xl px-8 h-11 font-bold shadow-lg shadow-primary/20" disabled={loading}>
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="account" className="space-y-6 outline-none">
          <Card className="border-none shadow-sm ring-1 ring-slate-200">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="text-xl">Account Settings</CardTitle>
              <CardDescription>Technical details and security preferences.</CardDescription>
            </CardHeader>
            <CardContent className="pt-8 space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Account Role</p>
                    <p className="text-xs text-slate-500 capitalize">{user?.role?.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Joined On</p>
                  <p className="text-sm font-bold text-slate-700">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-primary/50 transition-all">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Email Notifications</p>
                    <p className="text-xs text-slate-500">Manage how you receive alerts.</p>
                  </div>
                </div>
                <Dialog>
                  <DialogTrigger render={<Button variant="outline" className="rounded-xl h-9 text-xs font-bold hover:bg-primary hover:text-white transition-all" />}>
                    Configure
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] rounded-3xl border-none shadow-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-black">Email Preferences</DialogTitle>
                      <DialogDescription>
                        Choose which updates you'd like to receive via email.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-6 space-y-6">
                      {[
                        { id: 'applications', label: 'Application Updates', desc: 'Alerts when your application status changes.' },
                        { id: 'meetings', label: 'Meeting Reminders', desc: 'Notifications for upcoming mentor sessions.' },
                        { id: 'messages', label: 'Direct Messages', desc: 'Emails when you receive a new chat message.' },
                        { id: 'marketing', label: 'Newsletter & Events', desc: 'Weekly updates on PIERC ecosystem events.' },
                      ].map((pref) => (
                        <div key={pref.id} className="flex items-start space-x-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                          <Checkbox 
                            id={pref.id} 
                            checked={(notifPrefs as any)[pref.id]} 
                            onCheckedChange={(checked) => setNotifPrefs(prev => ({ ...prev, [pref.id]: checked }))}
                          />
                          <div className="space-y-1 cursor-pointer" onClick={() => setNotifPrefs(prev => ({ ...prev, [pref.id]: !(prev as any)[pref.id] }))}>
                            <label htmlFor={pref.id} className="text-sm font-bold text-slate-900 cursor-pointer">{pref.label}</label>
                            <p className="text-xs text-slate-500 leading-relaxed">{pref.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <DialogFooter>
                      <Button className="w-full h-12 rounded-2xl font-bold shadow-lg shadow-primary/20" onClick={saveNotifications} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Preferences'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="pt-6 border-t flex flex-col items-center space-y-2">
                <p className="text-xs text-slate-400">Unique Identifier: <span className="font-mono">{user?.uid}</span></p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {user?.role === 'super_admin' && (
          <TabsContent value="programme" className="space-y-6 outline-none">
            <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Programme Application Control</CardTitle>
                    <CardDescription>Open or close programme applications for each track.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-8 space-y-6">
                {programmeLoading ? (
                  <p className="text-slate-500">Loading programme controls...</p>
                ) : programmes.length === 0 ? (
                  <p className="text-slate-500">No programme configuration found. Please add programmes to the database.</p>
                ) : (
                  <div className="space-y-4">
                    {programmes.map((programme) => (
                      <div key={programme.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{programme.name}</h3>
                          <p className={`text-sm font-medium ${programme.isApplicationOpen ? 'text-emerald-600' : 'text-rose-600'}`}>
                            Applications are currently <span className="font-semibold">{programme.isApplicationOpen ? 'OPEN' : 'CLOSED'}</span>
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant={programme.isApplicationOpen ? 'destructive' : 'secondary'}
                          size="lg"
                          disabled={pendingProgrammeIds.includes(programme.id)}
                          onClick={() => toggleProgrammeStatus(programme.id, programme.isApplicationOpen)}
                        >
                          {pendingProgrammeIds.includes(programme.id)
                            ? 'Saving...'
                            : programme.isApplicationOpen
                              ? 'Close Applications'
                              : 'Open Applications'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
