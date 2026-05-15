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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Upload, ChevronRight, ChevronLeft, Save } from 'lucide-react';
import { ref, push, set } from 'firebase/database';
import { db, storage } from '@/lib/firebase';
import { ref as sRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  startupName: z.string().min(2, "Startup name must be at least 2 characters"),
  website: z.string().url().optional().or(z.literal('')),
  industry: z.string().min(1, "Please select an industry"),
  stage: z.string().min(1, "Please select your current stage"),
  problemStatement: z.string().min(50, "Problem statement should be detailed"),
  solution: z.string().min(50, "Solution description should be detailed"),
  teamSize: z.string(),
  hasIncorporated: z.boolean().default(false),
});

export default function ApplicationForm({ programmeId, programmeTitle }: { programmeId: string, programmeTitle: string }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      startupName: "",
      website: "",
      industry: "",
      stage: "",
      problemStatement: "",
      solution: "",
      teamSize: "1-3",
      hasIncorporated: false,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    setLoading(true);
    try {
      const applicationsRef = ref(db, 'applications');
      const newAppRef = push(applicationsRef);
      
      const applicationData = {
        id: newAppRef.key,
        userId: user.uid,
        userName: user.displayName,
        programmeId,
        programmeTitle,
        status: 'Submitted',
        submittedAt: Date.now(),
        updatedAt: Date.now(),
        data: values,
        timeline: [
          { status: 'Submitted', timestamp: Date.now(), remarks: 'Application submitted successfully.' }
        ]
      };

      await set(newAppRef, applicationData);
      
      // Update user's application list
      const userAppsRef = ref(db, `users/${user.uid}/applications/${newAppRef.key}`);
      await set(userAppsRef, true);

      toast.success('Application submitted successfully!');
      router.push('/dashboard/applications');
    } catch (error) {
      toast.error('Failed to submit application');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-2">
            {[1, 2, 3].map((s) => (
              <div 
                key={s} 
                className={`h-2 w-12 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-slate-200'}`} 
              />
            ))}
          </div>
          <span className="text-sm font-medium text-slate-500">Step {step} of 3</span>
        </div>
        <CardTitle>Apply for {programmeTitle}</CardTitle>
        <CardDescription>Fill in the details about your startup to start the incubation process.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <FormField
                  control={form.control}
                  name="startupName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Startup Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Inc." {...field} />
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
                      <FormLabel>Website (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://acme.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="fintech">FinTech</SelectItem>
                            <SelectItem value="edtech">EdTech</SelectItem>
                            <SelectItem value="healthtech">HealthTech</SelectItem>
                            <SelectItem value="agritech">AgriTech</SelectItem>
                            <SelectItem value="deeptech">DeepTech</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="stage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Stage</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select stage" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ideation">Ideation</SelectItem>
                            <SelectItem value="prototype">Prototype / MVP</SelectItem>
                            <SelectItem value="early_traction">Early Traction</SelectItem>
                            <SelectItem value="scaling">Scaling</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <FormField
                  control={form.control}
                  name="problemStatement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Problem Statement</FormLabel>
                      <FormControl>
                        <textarea 
                          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="What problem are you solving?"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Minimum 50 characters.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="solution"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Solution</FormLabel>
                      <FormControl>
                        <textarea 
                          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="How does your startup solve the problem?"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Minimum 50 characters.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="teamSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team Size</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select size" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1-3">1 - 3 members</SelectItem>
                            <SelectItem value="4-10">4 - 10 members</SelectItem>
                            <SelectItem value="10+">10+ members</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="hasIncorporated"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Is your startup incorporated?
                        </FormLabel>
                        <FormDescription>
                          Check this if you have registered your company (Pvt Ltd, LLP, etc.)
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <Label>Pitch Deck (PDF)</Label>
                  <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">Click to upload or drag and drop</p>
                    <p className="text-xs text-slate-400 mt-1">Maximum file size: 10MB</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1 || loading}
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Previous
              </Button>
              
              {step < 3 ? (
                <Button
                  type="button"
                  onClick={() => setStep(step + 1)}
                >
                  Next Step <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={loading}>
                  {loading ? 'Submitting...' : <><Save className="mr-2 h-4 w-4" /> Submit Application</>}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
