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
  FormMessage 
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
import { ref, update, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { institutes } from '@/lib/constants';
import { Rocket, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

const onboardingSchema = z.object({
  email: z.string().email("Invalid email address"),
  contactNumber: z.string().min(10, "Contact number must be at least 10 digits"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  enrollmentNumber: z.string().optional(),
  category: z.string().optional(),
  othersSpecify: z.string().optional(),
  institute: z.string().optional(),
  socialCategory: z.string().min(1, "Please select a category"),
  gender: z.string().min(1, "Please select a gender"),
  caste: z.string().min(1, "Caste is required"),
}).superRefine((data, ctx) => {
  const isParulEmail = data.email?.toLowerCase().endsWith('@paruluniversity.ac.in');
  if (isParulEmail) {
    if (!data.enrollmentNumber || data.enrollmentNumber.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['enrollmentNumber'],
        message: 'Enrollment number is required for Parul University users',
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

export default function OnboardingForm() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();
  const router = useRouter();

  const form = useForm<z.infer<typeof onboardingSchema>>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      email: user?.email || "",
      contactNumber: "",
      name: user?.displayName || "",
      enrollmentNumber: "",
      category: "",
      othersSpecify: "",
      institute: "",
      socialCategory: "",
      gender: "",
      caste: "",
    },
  });

  // Update form when user state is available
  useEffect(() => {
    if (user) {
      const isParulEmail = user.email?.toLowerCase().endsWith('@paruluniversity.ac.in');
      form.reset({
        email: user.email || "",
        name: user.displayName || "",
        contactNumber: "",
        enrollmentNumber: "",
        category: isParulEmail ? "PU Student" : "",
        othersSpecify: "",
        institute: "",
        socialCategory: "",
        gender: "",
        caste: "",
      });
    }
  }, [user, form]);

  async function onSubmit(values: z.infer<typeof onboardingSchema>) {
    if (!user) return;
    setLoading(true);
    try {
      // Step 1: Check for uniqueness of enrollment number (only if email ends with @paruluniversity.ac.in)
      const isParulEmail = values.email?.toLowerCase().endsWith('@paruluniversity.ac.in');
      if (isParulEmail && values.enrollmentNumber && values.enrollmentNumber.trim() !== '') {
        const slugRef = ref(db, `enrollment_slugs/${values.enrollmentNumber}`);
        const slugSnap = await get(slugRef);
        
        if (slugSnap.exists() && slugSnap.val() !== user.uid) {
          toast.error('This Enrollment Number is already registered with another account.');
          setLoading(false);
          return;
        }
      }

      // Step 2: Atomic update for user profile and unique slug
      const updates: Record<string, any> = {
        [`users/${user.uid}`]: {
          ...user,
          ...values,
          displayName: values.name,
          enrollmentNumber: isParulEmail ? (values.enrollmentNumber || '') : '',
          category: isParulEmail ? (values.category || '') : '',
          othersSpecify: (isParulEmail && values.category === 'Others') ? (values.othersSpecify || '') : '',
          onboardingCompleted: true,
          updatedAt: Date.now(),
        }
      };

      if (isParulEmail && values.enrollmentNumber && values.enrollmentNumber.trim() !== '') {
        updates[`enrollment_slugs/${values.enrollmentNumber}`] = user.uid;
      }

      await update(ref(db), updates);

      toast.success('Onboarding complete! Welcome to PIERC.');
      router.push('/dashboard');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update profile. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  const isParulEmail = user?.email?.toLowerCase().endsWith('@paruluniversity.ac.in');

  return (
    <Card className="max-w-xl mx-auto shadow-2xl border-none glass-card">
      <CardHeader className="text-center pb-8">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20">
          <Rocket className="text-white h-8 w-8" />
        </div>
        <CardTitle className="text-3xl font-black tracking-tight">Complete Your Profile</CardTitle>
        <CardDescription className="text-slate-500 font-medium pt-2">
          Help us get to know you better to provide tailored startup support.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your full name" {...field} className="h-12 rounded-xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Email Address</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="name@example.com" 
                        {...field} 
                        className="h-12 rounded-xl bg-slate-50 border-slate-200 text-slate-500 font-medium cursor-not-allowed" 
                        disabled 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Contact Number</FormLabel>
                    <FormControl>
                      <Input placeholder="9876543210" {...field} className="h-12 rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isParulEmail && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="enrollmentNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Enrollment Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your enrollment number" {...field} className="h-12 rounded-xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Applicant Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full h-12 rounded-xl">
                            <SelectValue placeholder="Select category" />
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
              </div>
            )}

            {isParulEmail && form.watch("category") === "Others" && (
              <FormField
                control={form.control}
                name="othersSpecify"
                render={({ field }) => (
                  <FormItem className="animate-in slide-in-from-top-2 duration-300">
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Specify name of your institute</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter institute name" {...field} className="h-12 rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="institute"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {isParulEmail ? "Select your Institute" : "Institute / College Name"}
                  </FormLabel>
                  {isParulEmail ? (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full h-12 rounded-xl">
                          <SelectValue placeholder="Select your institute" />
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
                      <Input placeholder="Enter your institute/college name" {...field} className="h-12 rounded-xl" />
                    </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Gender</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full h-12 rounded-xl">
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
                control={form.control}
                name="socialCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full h-12 rounded-xl">
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
              control={form.control}
              name="caste"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Caste</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your caste" {...field} className="h-12 rounded-xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full h-14 text-lg font-bold rounded-2xl shadow-xl shadow-primary/20" disabled={loading}>
              {loading ? "Saving..." : "Start My Journey"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
