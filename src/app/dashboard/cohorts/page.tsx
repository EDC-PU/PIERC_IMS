'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, addDoc, getDocs, updateDoc } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Layers,
  Plus,
  Rocket,
  ShieldAlert,
  Building2,
  Calendar,
  User,
  ExternalLink,
  Pencil
} from 'lucide-react';
import { toast } from 'sonner';
import { Cohort, Application } from '@/types';
import Link from 'next/link';
import { triggerEmailNotification } from '@/lib/email-client';
import { getCohortScheduleEmailHtml } from '@/lib/email-templates';

export default function CohortsPage() {
  const { user: currentUser } = useAuthStore();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCohortName, setNewCohortName] = useState('');
  const [newCohortStartDate, setNewCohortStartDate] = useState('');
  const [newCohortEndDate, setNewCohortEndDate] = useState('');
  const [newCohortWhatsappLink, setNewCohortWhatsappLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Cohort state variables
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editCohortName, setEditCohortName] = useState('');
  const [editCohortStartDate, setEditCohortStartDate] = useState('');
  const [editCohortEndDate, setEditCohortEndDate] = useState('');
  const [editCohortWhatsappLink, setEditCohortWhatsappLink] = useState('');
  const [showConfirmEmailDialog, setShowConfirmEmailDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmails, setIsSendingEmails] = useState(false);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'super_admin') {
      setLoading(false);
      return;
    }

    setLoading(true);
    // Real-time cohorts listener
    const cohortsCol = collection(db, 'cohorts');
    const unsubCohorts = onSnapshot(cohortsCol, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Cohort[];
      // Sort newest first
      list.sort((a, b) => b.createdAt - a.createdAt);
      setCohorts(list);
    }, (error) => {
      console.error('Cohorts load error:', error);
      toast.error('Failed to load cohorts.');
    });

    // Real-time applications listener (to map them to cohorts)
    const appsCol = collection(db, 'applications');
    const unsubApps = onSnapshot(appsCol, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Application[];
      setApplications(list);
      setLoading(false);
    }, (error) => {
      console.error('Applications load error:', error);
      toast.error('Failed to load applications.');
      setLoading(false);
    });

    return () => {
      unsubCohorts();
      unsubApps();
    };
  }, [currentUser]);

  const handleOpenEdit = (cohort: Cohort) => {
    setEditingCohort(cohort);
    setEditCohortName(cohort.name);
    setEditCohortStartDate(cohort.startDate || '');
    setEditCohortEndDate(cohort.endDate || '');
    setEditCohortWhatsappLink(cohort.whatsappLink || '');
    setShowEditDialog(true);
  };

  const handleCreateCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCohortName.trim()) {
      toast.error('Please enter a valid cohort name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const cohortsCol = collection(db, 'cohorts');
      await addDoc(cohortsCol, {
        name: newCohortName.trim(),
        startDate: newCohortStartDate || null,
        endDate: newCohortEndDate || null,
        whatsappLink: newCohortWhatsappLink.trim() || null,
        createdAt: Date.now()
      });
      toast.success('Cohort created successfully!');
      setNewCohortName('');
      setNewCohortStartDate('');
      setNewCohortEndDate('');
      setNewCohortWhatsappLink('');
      setShowCreateDialog(false);
    } catch (err) {
      console.error('Create cohort error:', err);
      toast.error('Failed to create cohort.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCohort) return;
    if (!editCohortName.trim()) {
      toast.error('Please enter a valid cohort name.');
      return;
    }

    setIsSaving(true);
    try {
      const cohortDocRef = doc(db, 'cohorts', editingCohort.id);
      await updateDoc(cohortDocRef, {
        name: editCohortName.trim(),
        startDate: editCohortStartDate || null,
        endDate: editCohortEndDate || null,
        whatsappLink: editCohortWhatsappLink.trim() || null
      });
      
      toast.success('Cohort updated successfully!');
      setShowEditDialog(false);
      
      // Determine if there are startups in this cohort to notify
      const cohortApps = applications.filter(app => app.cohortId === editingCohort.id);
      if (cohortApps.length > 0) {
        setShowConfirmEmailDialog(true);
      } else {
        setEditingCohort(null);
      }
    } catch (err) {
      console.error('Update cohort error:', err);
      toast.error('Failed to update cohort.');
      setEditingCohort(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendEmails = async (send: boolean) => {
    if (!editingCohort) return;
    
    if (!send) {
      setShowConfirmEmailDialog(false);
      setEditingCohort(null);
      return;
    }

    setIsSendingEmails(true);
    try {
      const cohortApps = applications.filter(app => app.cohortId === editingCohort.id);
      
      // Collect all recipient emails
      const emails: string[] = [];
      cohortApps.forEach(app => {
        if (app.userEmail) emails.push(app.userEmail);
        if (Array.isArray(app.data?.teamMembers)) {
          app.data.teamMembers.forEach((m: any) => {
            if (m.email) emails.push(m.email);
          });
        }
      });

      const uniqueEmails = Array.from(new Set(emails.map(e => e.toLowerCase().trim())));

      if (uniqueEmails.length === 0) {
        toast.info('No founders or team members found in this cohort to email.');
      } else {
        const formattedStart = editCohortStartDate ? new Date(editCohortStartDate).toLocaleDateString('en-US', { dateStyle: 'long' }) : 'N/A';
        const formattedEnd = editCohortEndDate ? new Date(editCohortEndDate).toLocaleDateString('en-US', { dateStyle: 'long' }) : 'N/A';

        const emailHtml = getCohortScheduleEmailHtml({
          cohortName: editCohortName,
          startDate: formattedStart,
          endDate: formattedEnd,
          whatsappLink: editCohortWhatsappLink.trim() || undefined,
          viewLink: `${window.location.origin}/dashboard/applications`
        });

        await triggerEmailNotification({
          to: uniqueEmails,
          subject: `🗓️ Cohort Schedule Confirmed: ${editCohortName}`,
          html: emailHtml
        });

        toast.success(`Emails sent successfully to ${uniqueEmails.length} recipient(s)!`);
      }
    } catch (err) {
      console.error('Email send error:', err);
      toast.error('Failed to notify cohort members via email.');
    } finally {
      setIsSendingEmails(false);
      setShowConfirmEmailDialog(false);
      setEditingCohort(null);
    }
  };

  if (currentUser?.role !== 'super_admin') {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-rose-50 rounded-full">
          <ShieldAlert className="h-12 w-12 text-[#D91A2A]" />
        </div>
        <h1 className="text-2xl font-black text-slate-900">Access Denied</h1>
        <p className="text-slate-500 font-medium">Only Super Administrators can manage cohorts.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest">Synchronizing cohorts...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cohort Management</h1>
          <p className="text-slate-500">Create cohorts and view assigned startups.</p>
        </div>
        <div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="rounded-xl shadow-lg shadow-red-200/50 bg-[#D91A2A] text-white hover:bg-[#D91A2A]/90 font-bold border-none px-6">
                <Plus className="mr-2 h-4 w-4" /> Create Cohort
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2rem] border-none shadow-2xl bg-white max-w-md w-full p-6">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-slate-900">Create New Cohort</DialogTitle>
                <DialogDescription className="text-slate-500 font-medium pt-2">
                  Enter the name of the new cohort to add to the system.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateCohort} className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cohort Name</label>
                  <Input
                    required
                    placeholder="e.g. Winter Cohort 2026"
                    className="h-12 rounded-xl bg-slate-50 border-none focus:ring-primary/20 px-4 font-medium"
                    value={newCohortName}
                    onChange={(e) => setNewCohortName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Start Date</label>
                    <Input
                      type="date"
                      className="h-12 rounded-xl bg-slate-50 border-none focus:ring-primary/20 px-4 font-medium"
                      value={newCohortStartDate}
                      onChange={(e) => setNewCohortStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">End Date</label>
                    <Input
                      type="date"
                      className="h-12 rounded-xl bg-slate-50 border-none focus:ring-primary/20 px-4 font-medium"
                      value={newCohortEndDate}
                      onChange={(e) => setNewCohortEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">WhatsApp Group Link</label>
                  <Input
                    placeholder="https://chat.whatsapp.com/..."
                    className="h-12 rounded-xl bg-slate-50 border-none focus:ring-primary/20 px-4 font-medium"
                    value={newCohortWhatsappLink}
                    onChange={(e) => setNewCohortWhatsappLink(e.target.value)}
                  />
                </div>
                <DialogFooter className="pt-4 flex gap-2">
                  <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="rounded-xl bg-[#D91A2A] text-white hover:bg-[#D91A2A]/90 font-bold px-6">
                    {isSubmitting ? 'Creating...' : 'Create Cohort'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {cohorts.length === 0 ? (
        <Card className="border-none shadow-sm text-center p-12 bg-white rounded-3xl">
          <CardContent className="space-y-4">
            <div className="p-4 bg-slate-50 inline-block rounded-full">
              <Layers className="h-12 w-12 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-700">No Cohorts Yet</h3>
            <p className="text-slate-500 max-w-sm mx-auto">Create your first cohort to begin grouping and tracking selected startups.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cohorts.map((cohort) => {
            const cohortApps = applications.filter(app => app.cohortId === cohort.id);
            const leadersCount = cohortApps.length;
            const membersCount = cohortApps.reduce((acc, app) => acc + (app.data?.teamMembers?.length || 0), 0);
            const totalParticipants = leadersCount + membersCount;
            return (
              <Card key={cohort.id} className="border-none shadow-lg bg-white rounded-[2rem] overflow-hidden flex flex-col justify-between">
                <CardHeader className="border-b bg-slate-50/50 p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-black text-slate-900 leading-tight">{cohort.name}</CardTitle>
                      <CardDescription className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                        <Calendar className="h-3 w-3" /> Created {new Date(cohort.createdAt).toLocaleDateString()}
                      </CardDescription>
                      {cohort.startDate && cohort.endDate && (
                        <div className="mt-2 text-[10px] font-black text-slate-500 bg-slate-100/50 border border-slate-100 rounded-lg px-2 py-0.5 inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-red-600" />
                          <span>
                            {new Date(cohort.startDate).toLocaleDateString(undefined, { dateStyle: 'short' })} - {new Date(cohort.endDate).toLocaleDateString(undefined, { dateStyle: 'short' })}
                          </span>
                        </div>
                      )}
                      {cohort.whatsappLink && (
                        <div className="mt-2 text-[10px] font-black text-green-600 bg-green-50 border border-green-100 rounded-lg px-2 py-0.5 inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                          <span>WhatsApp Group Link Added</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-start gap-1">
                      <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 text-slate-400 hover:text-red-600 mt-0.5" onClick={() => handleOpenEdit(cohort)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className="rounded-full bg-slate-100 font-bold border-none px-2 py-1 text-slate-600 text-[10px] whitespace-nowrap">
                          {cohortApps.length} {cohortApps.length === 1 ? 'Startup' : 'Startups'}
                        </Badge>
                        {cohortApps.length > 0 && (
                          <span className="text-[10px] font-black text-slate-400 mt-1 text-right leading-tight">
                            {totalParticipants} {totalParticipants === 1 ? 'Participant' : 'Participants'}
                            <span className="block text-[9px] font-bold text-slate-400 mt-0.5">
                              ({leadersCount} {leadersCount === 1 ? 'Leader' : 'Leaders'}, {membersCount} {membersCount === 1 ? 'Member' : 'Members'})
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 flex-1 flex flex-col">
                  {cohortApps.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-8 text-slate-400 text-sm space-y-2">
                      <Rocket className="h-8 w-8 opacity-45" />
                      <p className="font-medium text-xs">No startups in this cohort</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assigned Startups</p>
                      <div className="divide-y max-h-[220px] overflow-y-auto pr-1">
                        {cohortApps.map((app) => (
                          <div key={app.id} className="py-2.5 flex items-center justify-between group">
                            <div className="flex items-center space-x-2.5">
                              <div className="p-2 bg-red-50 rounded-xl">
                                <Building2 className="h-4 w-4 text-[#D91A2A]" />
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-xs font-bold text-slate-800 line-clamp-1">
                                  {app.data?.startupName || app.data?.startupTitle || 'Untitled Startup'}
                                </p>
                                <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                  <User className="h-2.5 w-2.5" /> {app.userName || 'No Name'}
                                </p>
                              </div>
                            </div>
                            <Link
                              href={`/dashboard/applications/${app.id}`}
                              className="p-1.5 text-slate-400 hover:text-[#D91A2A] hover:bg-slate-50 rounded-lg transition-colors"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Cohort Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="rounded-[2rem] border-none shadow-2xl bg-white max-w-md w-full p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900">Edit Cohort Details</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium pt-2">
              Update the cohort name and schedule duration.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCohort} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cohort Name</label>
              <Input
                required
                placeholder="e.g. Winter Cohort 2026"
                className="h-12 rounded-xl bg-slate-50 border-none focus:ring-primary/20 px-4 font-medium"
                value={editCohortName}
                onChange={(e) => setEditCohortName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Start Date</label>
                <Input
                  type="date"
                  className="h-12 rounded-xl bg-slate-50 border-none focus:ring-primary/20 px-4 font-medium"
                  value={editCohortStartDate}
                  onChange={(e) => setEditCohortStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">End Date</label>
                <Input
                  type="date"
                  className="h-12 rounded-xl bg-slate-50 border-none focus:ring-primary/20 px-4 font-medium"
                  value={editCohortEndDate}
                  onChange={(e) => setEditCohortEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">WhatsApp Group Link</label>
              <Input
                placeholder="https://chat.whatsapp.com/..."
                className="h-12 rounded-xl bg-slate-50 border-none focus:ring-primary/20 px-4 font-medium"
                value={editCohortWhatsappLink}
                onChange={(e) => setEditCohortWhatsappLink(e.target.value)}
              />
            </div>
            <DialogFooter className="pt-4 flex gap-2">
              <Button type="button" variant="ghost" className="rounded-xl" onClick={() => { setShowEditDialog(false); setEditingCohort(null); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="rounded-xl bg-[#D91A2A] text-white hover:bg-[#D91A2A]/90 font-bold px-6">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Email Notification Dialog */}
      <Dialog open={showConfirmEmailDialog} onOpenChange={setShowConfirmEmailDialog}>
        <DialogContent className="rounded-[2rem] border-none shadow-2xl bg-white max-w-md w-full p-8 text-center space-y-6">
          <DialogHeader className="space-y-3">
            <div className="mx-auto w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
              <Calendar className="h-6 w-6" />
            </div>
            <DialogTitle className="text-2xl font-black text-slate-900">Notify Cohort Members?</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium leading-relaxed">
              The schedule for <strong>{editCohortName}</strong> has been saved. Would you like to send an automated email to all assigned startup founders and team members to inform them that the cohort dates have been fixed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl w-full h-12 font-bold order-2 sm:order-1"
              disabled={isSendingEmails}
              onClick={() => handleSendEmails(false)}
            >
              No, Just Save
            </Button>
            <Button
              type="button"
              className="rounded-xl w-full h-12 bg-red-600 text-white hover:bg-red-700 font-black uppercase tracking-widest text-[10px] order-1 sm:order-2 shadow-lg shadow-red-200/50"
              disabled={isSendingEmails}
              onClick={() => handleSendEmails(true)}
            >
              {isSendingEmails ? 'Sending...' : 'Yes, Send Emails'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
