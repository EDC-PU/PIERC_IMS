'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { db, storage } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Cohort, Application, UserProfile, PortalEvent } from '@/types';
import RoleGuard from '@/components/auth/RoleGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Megaphone,
  Calendar as CalendarIcon,
  MapPin,
  Video,
  Loader2,
  Users,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Trash2,
  Upload,
  FileText,
  Image as ImageIcon,
  Plus,
  Eye,
  CheckCircle,
  FileSpreadsheet,
  CalendarDays,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { triggerEmailNotification } from '@/lib/email-client';
import { getEmailHtmlTemplate } from '@/lib/email-templates';

type TargetAudienceOption = 'all_users' | 'pu_staff' | 'pu_student' | 'cohort_leaders' | 'cohort_participants';

export default function AnnounceEventPage() {
  const { user: currentUser } = useAuthStore();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [events, setEvents] = useState<PortalEvent[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loadingCohorts, setLoadingCohorts] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [mode, setMode] = useState<'Online' | 'Offline'>('Online');
  const [linkOrLocation, setLinkOrLocation] = useState('');
  const [targetAudience, setTargetAudience] = useState<TargetAudienceOption[]>(['all_users']);
  const [selectedCohortIds, setSelectedCohortIds] = useState<string[]>([]);
  const [sendEmails, setSendEmails] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Flyer upload and crop states
  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [flyerPreviewUrl, setFlyerPreviewUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isUploading, setIsUploading] = useState(false);

  // Open/Close Add Event Dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PortalEvent | null>(null);
  const [allowCancellation, setAllowCancellation] = useState(true);
  const [activeTab, setActiveTab] = useState('all_events');

  // Selected Event for viewing participation
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Rich Text editor ref
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
      return;
    }

    // 1. Listen to cohorts
    const cohortsCol = collection(db, 'cohorts');
    const unsubCohorts = onSnapshot(cohortsCol, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Cohort[];
      list.sort((a, b) => b.createdAt - a.createdAt);
      setCohorts(list);
      setLoadingCohorts(false);
    }, (error) => {
      console.error('Error loading cohorts:', error);
      setLoadingCohorts(false);
    });

    // 2. Listen to events
    const eventsCol = collection(db, 'events');
    const unsubEvents = onSnapshot(eventsCol, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PortalEvent[];
      list.sort((a, b) => b.createdAt - a.createdAt);
      setEvents(list);
      setLoadingEvents(false);
    }, (error) => {
      console.error('Error loading events:', error);
      setLoadingEvents(false);
    });

    // 3. Listen to users list (to cross-reference event registrations)
    const usersCol = collection(db, 'users');
    const unsubUsers = onSnapshot(usersCol, (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as UserProfile);
      setUsersList(list);
      setLoadingUsers(false);
    }, (error) => {
      console.error('Error loading users:', error);
      setLoadingUsers(false);
    });

    return () => {
      unsubCohorts();
      unsubEvents();
      unsubUsers();
    };
  }, [currentUser]);

  const handleCohortToggle = (id: string) => {
    setSelectedCohortIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const getCroppedImgBlob = (imageUrl: string, zoom: number, panX: number, panY: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.src = imageUrl;
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No canvas context'));
          return;
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 600, 600);

        const scale = zoom;
        
        ctx.save();
        ctx.translate(300, 300);
        ctx.translate(panX * (600 / 256), panY * (600 / 256));
        ctx.scale(scale, scale);
        
        const renderWidth = image.width * (600 / Math.max(image.width, image.height));
        const renderHeight = image.height * (600 / Math.max(image.width, image.height));
        
        ctx.drawImage(
          image,
          -renderWidth / 2,
          -renderHeight / 2,
          renderWidth,
          renderHeight
        );
        ctx.restore();

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob failed'));
        }, 'image/jpeg', 0.9);
      };
      image.onerror = (err) => reject(err);
    });
  };

  const handleAudienceToggle = (val: TargetAudienceOption) => {
    setTargetAudience(prev =>
      prev.includes(val) ? prev.filter(item => item !== val) : [...prev, val]
    );
  };

  // Rich text formatting commands
  const executeCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setDescription(editorRef.current.innerHTML);
    }
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      setDescription(editorRef.current.innerHTML);
    }
  };

  const handleAnnounce = async (e: React.FormEvent, status: 'published' | 'draft') => {
    e.preventDefault();

    const finalDescription = description.trim() === '<br>' || description.trim() === '' ? '' : description;

    if (!title.trim() || !finalDescription || !date || !time || !linkOrLocation.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }

    const eventDateTime = new Date(`${date}T${time}`);
    if (eventDateTime < new Date()) {
      toast.error('Event date and time cannot be in the past.');
      return;
    }

    if (targetAudience.length === 0) {
      toast.error('Please select at least one target audience.');
      return;
    }

    const showCohortsChecklist = targetAudience.includes('cohort_leaders') || targetAudience.includes('cohort_participants');
    if (showCohortsChecklist && selectedCohortIds.length === 0) {
      toast.error('Please select at least one cohort.');
      return;
    }

    setSubmitting(true);
    try {
      let uploadedFlyerUrl = '';

      let fileToUpload: File | Blob | null = flyerFile;

      if (flyerPreviewUrl && flyerFile && flyerFile.type.startsWith('image/')) {
        setIsUploading(true);
        toast.info('Cropping and preparing flyer...');
        try {
          fileToUpload = await getCroppedImgBlob(flyerPreviewUrl, zoom, panX, panY);
        } catch (cropErr) {
          console.warn('Failed to crop image, uploading original instead:', cropErr);
        }
      }

      // Upload flyer if exists
      if (fileToUpload) {
        setIsUploading(true);
        toast.info('Uploading event flyer...');
        const fileName = flyerFile ? flyerFile.name : 'flyer.jpg';
        const fileRef = storageRef(storage, `event-flyers/${Date.now()}_${fileName}`);
        const snapshot = await uploadBytes(fileRef, fileToUpload);
        uploadedFlyerUrl = await getDownloadURL(snapshot.ref);
        setIsUploading(false);
      }

      const cohortNames = cohorts
        .filter(c => selectedCohortIds.includes(c.id))
        .map(c => c.name);

      // 1. Create or Update the event in Firestore
      const eventData: any = {
        title: title.trim(),
        description: finalDescription,
        date,
        time,
        mode,
        linkOrLocation: linkOrLocation.trim(),
        targetAudience,
        cohortIds: showCohortsChecklist ? selectedCohortIds : [],
        cohortNames: showCohortsChecklist ? cohortNames : [],
        status,
        allowCancellation,
        updatedAt: Date.now()
      };

      if (uploadedFlyerUrl) {
        eventData.flyerUrl = uploadedFlyerUrl;
      } else if (editingEvent && flyerPreviewUrl) {
        eventData.flyerUrl = flyerPreviewUrl;
      }

      if (editingEvent) {
        const eventRef = doc(db, 'events', editingEvent.id);
        await updateDoc(eventRef, eventData);
        toast.success('Event updated successfully!');
      } else {
        eventData.registeredUsers = [];
        eventData.createdBy = currentUser?.uid || '';
        eventData.createdAt = Date.now();
        const eventsCol = collection(db, 'events');
        await addDoc(eventsCol, eventData);
        toast.success('Event created successfully!');
      }

      // 2. If published and email notifications checked, fetch emails and send
      if (status === 'published' && sendEmails) {
        toast.info('Calculating target recipients for emails...');
        let targetEmails: string[] = [];
        const needsAllUsers = targetAudience.includes('all_users');
        const needsStaff = targetAudience.includes('pu_staff');
        const needsStudents = targetAudience.includes('pu_student');
        const needsCohortLeaders = targetAudience.includes('cohort_leaders');
        const needsCohortParticipants = targetAudience.includes('cohort_participants');

        if (needsAllUsers || needsStaff || needsStudents) {
          // Fetch all users
          const usersCol = collection(db, 'users');
          const usersSnap = await getDocs(usersCol);
          const usersList = usersSnap.docs.map(doc => doc.data() as UserProfile);

          if (needsAllUsers) {
            targetEmails.push(...usersList.map(u => u.email).filter(Boolean));
          } else {
            if (needsStaff) {
              const staffEmails = usersList
                .filter(u => u.category === 'PU Staff member' || (u.email?.toLowerCase().endsWith('@paruluniversity.ac.in') && u.category !== 'PU Student'))
                .map(u => u.email)
                .filter(Boolean);
              targetEmails.push(...staffEmails);
            }
            if (needsStudents) {
              const studentEmails = usersList
                .filter(u => u.category === 'PU Student')
                .map(u => u.email)
                .filter(Boolean);
              targetEmails.push(...studentEmails);
            }
          }
        }

        if (needsCohortLeaders || needsCohortParticipants) {
          // Fetch applications for selected cohorts
          const appsCol = collection(db, 'applications');
          const appsSnap = await getDocs(appsCol);
          const appsList = appsSnap.docs.map(doc => doc.data() as Application);

          const matchingApps = appsList.filter(app => app.cohortId && selectedCohortIds.includes(app.cohortId));

          if (needsCohortParticipants) {
            matchingApps.forEach(app => {
              if (app.userEmail) targetEmails.push(app.userEmail);
              if (Array.isArray(app.data?.teamMembers)) {
                app.data.teamMembers.forEach((m: any) => {
                  if (m.email) targetEmails.push(m.email);
                });
              }
            });
          } else if (needsCohortLeaders) {
            targetEmails.push(...matchingApps.map(app => app.userEmail).filter(Boolean) as string[]);
          }
        }

        // Deduplicate and filter out empty
        const uniqueEmails = Array.from(new Set(targetEmails.map(e => e.trim().toLowerCase()))).filter(Boolean);

        if (uniqueEmails.length > 0) {
          toast.info(`Sending notification emails to ${uniqueEmails.length} recipients...`);

          const emailSubject = `Upcoming Event: ${title}`;
          const formattedDate = new Date(date).toLocaleDateString('en-US', { dateStyle: 'long' });

          const linkOrLocationHtml = mode === 'Online'
            ? `<strong>Meeting Link:</strong> <a href="${linkOrLocation}" target="_blank" style="color: #d40924; text-decoration: underline;">${linkOrLocation}</a>`
            : `<strong>Venue Location:</strong> ${linkOrLocation}`;

          const isImage = flyerFile ? flyerFile.type.startsWith('image/') : (uploadedFlyerUrl && /\.(jpg|jpeg|png|webp|gif)$/i.test(uploadedFlyerUrl));
          const flyerImageHtml = (uploadedFlyerUrl && isImage)
            ? `<div style="margin: 20px 0; text-align: center;"><img src="${uploadedFlyerUrl}" alt="Event Flyer" style="max-width: 100%; border-radius: 12px; border: 1px solid #e2e8f0; display: block; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);" /></div>`
            : '';

          const emailHtml = getEmailHtmlTemplate({
            headerTitle: 'Upcoming Event Announcement',
            bodyHtml: `
              <h3 style="color: #0f172a; margin-top: 0; margin-bottom: 12px; font-size: 18px; font-weight: 800;">${title}</h3>
              <div style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">${finalDescription}</div>
              
              <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0;">
                <p style="margin: 0 0 10px 0; color: #475569; font-size: 14px;"><strong>Date:</strong> ${formattedDate}</p>
                <p style="margin: 0 0 10px 0; color: #475569; font-size: 14px;"><strong>Time:</strong> ${time}</p>
                <p style="margin: 0 0 10px 0; color: #475569; font-size: 14px;"><strong>Format:</strong> ${mode}</p>
                <p style="margin: 0; color: #475569; font-size: 14px;">${linkOrLocationHtml}</p>
              </div>

              ${flyerImageHtml}
              
              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 0;">Please log in to the PIERC Portal dashboard to register for this event.</p>
            `,
            ctaText: uploadedFlyerUrl ? 'View Event Flyer / Document' : 'Go to Dashboard',
            ctaLink: uploadedFlyerUrl || 'https://pierc-portal-9bd82.web.app/dashboard'
          });

          const response = await triggerEmailNotification({
            to: uniqueEmails,
            subject: emailSubject,
            html: emailHtml
          });

          if (response.success) {
            toast.success('Emails dispatched successfully!');
          } else {
            console.error('Email dispatch failure:', response.error);
            toast.error('Event announced, but failed to dispatch emails.');
          }
        }
      }

      toast.success(status === 'published' ? 'Event announced successfully!' : 'Event saved as draft.');
      setShowAddDialog(false);

      // Reset form
      setTitle('');
      setDescription('');
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      setDate('');
      setTime('');
      setLinkOrLocation('');
      setTargetAudience(['all_users']);
      setSelectedCohortIds([]);
      setSendEmails(false);
      setFlyerFile(null);
      setEditingEvent(null);
      setFlyerPreviewUrl(null);
      setAllowCancellation(true);

    } catch (err) {
      console.error('Announce event error:', err);
      toast.error('Failed to announce event.');
    } finally {
      setSubmitting(false);
      setIsUploading(false);
    }
  };

  const handlePublishDraft = async (eventId: string) => {
    try {
      const eventRef = doc(db, 'events', eventId);
      await updateDoc(eventRef, {
        status: 'published'
      });
      toast.success('Event published successfully!');
    } catch (error) {
      console.error('Publish error:', error);
      toast.error('Failed to publish event.');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await deleteDoc(doc(db, 'events', eventId));
      toast.success('Event deleted successfully.');
      if (selectedEventId === eventId) {
        setSelectedEventId(null);
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete event.');
    }
  };

  const handleOpenChange = (open: boolean) => {
    setShowAddDialog(open);
    if (!open) {
      setTitle('');
      setDescription('');
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      setDate('');
      setTime('');
      setLinkOrLocation('');
      setTargetAudience(['all_users']);
      setSelectedCohortIds([]);
      setSendEmails(false);
      setFlyerFile(null);
      setEditingEvent(null);
      setFlyerPreviewUrl(null);
      setAllowCancellation(true);
    }
  };

  const startEditEvent = (event: PortalEvent) => {
    setEditingEvent(event);
    setTitle(event.title);
    setDescription(event.description);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = event.description;
      }
    }, 100);
    setDate(event.date);
    setTime(event.time);
    setMode(event.mode);
    setLinkOrLocation(event.linkOrLocation);
    setTargetAudience(event.targetAudience as any || []);
    setSelectedCohortIds(event.cohortIds || []);
    setFlyerFile(null);
    setFlyerPreviewUrl(event.flyerUrl || null);
    setAllowCancellation(event.allowCancellation !== false);
    setShowAddDialog(true);
  };

  // Calculate matching users who registered for the selected event
  const selectedEvent = events.find(e => e.id === selectedEventId);
  const registeredParticipants = usersList.filter(u =>
    selectedEvent?.registeredUsers?.includes(u.uid)
  );

  const exportParticipantsCSV = () => {
    if (!selectedEvent || registeredParticipants.length === 0) return;

    const headers = ['Name', 'Email', 'Category', 'Contact Number', 'Institute'];
    const rows = registeredParticipants.map(u => [
      u.displayName || 'N/A',
      u.email || 'N/A',
      u.category || 'N/A',
      u.contactNumber || 'N/A',
      u.institute || 'N/A'
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `event_participants_${selectedEvent.title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const showCohortsChecklist = targetAudience.includes('cohort_leaders') || targetAudience.includes('cohort_participants');

  return (
    <RoleGuard allowedRoles={['admin', 'super_admin']} fallbackMessage="Only Admins and Managers can access this page.">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <Megaphone className="h-8 w-8 text-[#D91A2A]" /> Announce & Manage Events
            </h1>
            <p className="text-slate-500 font-medium">Broadcast bootcamps and workshops, and track attendance lists.</p>
          </div>

          <Dialog open={showAddDialog} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-[#D91A2A] text-white hover:bg-[#D91A2A]/90 font-black px-6 shadow-lg shadow-primary/20 h-12">
                <Plus className="mr-2 h-4 w-4" /> Add New Event
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-[2rem] p-8 bg-white shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-slate-900">
                  {editingEvent ? 'Edit Event Details' : 'Add New Portal Event'}
                </DialogTitle>
                <DialogDescription className="font-bold text-[10px] uppercase tracking-widest text-slate-400">
                  {editingEvent ? 'Modify fields to update this event' : 'Fill in details and select target groups'}
                </DialogDescription>
              </DialogHeader>

              <form className="space-y-5 pt-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Event Title *</label>
                  <Input
                    placeholder="e.g. Workshop on IP Rights & Patent Filing"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                    className="h-11 rounded-xl border-slate-200"
                  />
                </div>

                {/* Rich Text Description */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Event Description *</label>
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/30">
                    <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 border-b border-slate-200">
                      <button
                        type="button"
                        onClick={() => executeCommand('bold')}
                        className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                        title="Bold"
                      >
                        <Bold className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => executeCommand('italic')}
                        className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                        title="Italic"
                      >
                        <Italic className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => executeCommand('underline')}
                        className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                        title="Underline"
                      >
                        <Underline className="h-4 w-4" />
                      </button>
                      <div className="h-4 w-[1px] bg-slate-300 mx-1" />
                      <button
                        type="button"
                        onClick={() => executeCommand('formatBlock', '<h1>')}
                        className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                        title="Heading 1"
                      >
                        <Heading1 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => executeCommand('formatBlock', '<h2>')}
                        className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                        title="Heading 2"
                      >
                        <Heading2 className="h-4 w-4" />
                      </button>
                      <div className="h-4 w-[1px] bg-slate-300 mx-1" />
                      <button
                        type="button"
                        onClick={() => executeCommand('insertUnorderedList')}
                        className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                        title="Bullet List"
                      >
                        <List className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => executeCommand('insertOrderedList')}
                        className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                        title="Numbered List"
                      >
                        <ListOrdered className="h-4 w-4" />
                      </button>
                    </div>

                    <div
                      ref={editorRef}
                      contentEditable
                      onInput={handleEditorInput}
                      className="p-4 min-h-[120px] bg-white focus:outline-none text-sm prose max-w-none"
                      style={{ outline: 'none' }}
                    />
                  </div>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Date *</label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        required
                        className="h-11 pl-10 rounded-xl border-slate-200"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Time *</label>
                    <Input
                      type="time"
                      value={time}
                      onChange={e => setTime(e.target.value)}
                      required
                      className="h-11 rounded-xl border-slate-200"
                    />
                  </div>
                </div>

                {/* Mode & Link */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Mode *</label>
                    <Select value={mode} onValueChange={(val) => { if (val) setMode(val as 'Online' | 'Offline'); }}>
                      <SelectTrigger className="h-11 rounded-xl border-slate-200">
                        <SelectValue placeholder="Select Mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Online">Online Session</SelectItem>
                        <SelectItem value="Offline">Offline Venue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      {mode === 'Online' ? 'Meeting Link *' : 'Venue Location *'}
                    </label>
                    <div className="relative">
                      {mode === 'Online' ? (
                        <Video className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      ) : (
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      )}
                      <Input
                        placeholder={mode === 'Online' ? 'e.g. Zoom link' : 'e.g. Auditorium 1'}
                        value={linkOrLocation}
                        onChange={e => setLinkOrLocation(e.target.value)}
                        required
                        className="h-11 pl-10 rounded-xl border-slate-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Flyer Upload */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Event Flyer (Image / PDF)</label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFlyerFile(file);
                            if (file.type.startsWith('image/')) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                setFlyerPreviewUrl(event.target?.result as string);
                                setZoom(1);
                                setPanX(0);
                                setPanY(0);
                              };
                              reader.readAsDataURL(file);
                            } else {
                              setFlyerPreviewUrl(null);
                            }
                          }
                        }}
                        className="hidden"
                        id="dialog-flyer-input"
                      />
                      <label
                        htmlFor="dialog-flyer-input"
                        className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors text-xs font-bold text-slate-600"
                      >
                        {flyerFile ? (
                          <>
                            {flyerFile.type.includes('pdf') ? (
                              <FileText className="h-4 w-4 text-rose-500" />
                            ) : (
                              <ImageIcon className="h-4 w-4 text-blue-500" />
                            )}
                            <span>{flyerFile.name}</span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 text-slate-400" />
                            <span>Choose Flyer Image or PDF</span>
                          </>
                        )}
                      </label>
                    </div>
                    {flyerFile && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setFlyerFile(null);
                          setFlyerPreviewUrl(null);
                        }}
                        className="h-11 w-11 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Crop editor for image flyers */}
                {flyerPreviewUrl && flyerFile && flyerFile.type.startsWith('image/') && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Position and Crop Square Flyer (Drag to Position, Slide to Zoom)
                    </span>
                    <div 
                      className="relative w-64 h-64 border rounded-xl overflow-hidden cursor-move bg-slate-200 select-none"
                      onMouseDown={(e) => {
                        setIsDragging(true);
                        setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
                      }}
                      onMouseMove={(e) => {
                        if (!isDragging) return;
                        setPanX(e.clientX - dragStart.x);
                        setPanY(e.clientY - dragStart.y);
                      }}
                      onMouseUp={() => setIsDragging(false)}
                      onMouseLeave={() => setIsDragging(false)}
                    >
                      <img
                        src={flyerPreviewUrl}
                        alt="Crop Preview"
                        draggable={false}
                        className="absolute max-w-none origin-center"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`,
                          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                        }}
                      />
                      {/* Grid overlay for cropping guide */}
                      <div className="absolute inset-0 border border-dashed border-white/40 pointer-events-none grid grid-cols-3 grid-rows-3">
                        <div className="border-r border-b border-white/20"></div>
                        <div className="border-r border-b border-white/20"></div>
                        <div className="border-b border-white/20"></div>
                        <div className="border-r border-b border-white/20"></div>
                        <div className="border-r border-b border-white/20"></div>
                        <div className="border-b border-white/20"></div>
                        <div className="border-r border-white/20"></div>
                        <div className="border-r border-white/20"></div>
                        <div></div>
                      </div>
                    </div>
                    <div className="w-full max-w-xs flex items-center gap-2">
                      <span className="text-[9px] font-bold text-slate-400">ZOOM</span>
                      <input
                        type="range"
                        min="1"
                        max="3"
                        step="0.1"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="flex-1 accent-primary"
                      />
                      <span className="text-[10px] font-bold text-slate-600">{zoom.toFixed(1)}x</span>
                    </div>
                  </div>
                )}

                {/* Target Audience Checkboxes */}
                <div className="space-y-2 border-t pt-4">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-2">Target Audience *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { value: 'all_users', label: 'All Users on Portal' },
                      { value: 'pu_staff', label: 'Parul University All Staff' },
                      { value: 'pu_student', label: 'Parul University All Students' },
                      { value: 'cohort_leaders', label: 'Cohort Leaders (Founders)' },
                      { value: 'cohort_participants', label: 'Cohort Participants (Founders + Team)' }
                    ].map((audience) => {
                      const isChecked = targetAudience.includes(audience.value as TargetAudienceOption);
                      return (
                        <div key={audience.value} className="flex items-center space-x-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100 shadow-sm hover:bg-slate-100/50 transition-colors">
                          <Checkbox
                            id={`audience-${audience.value}`}
                            checked={isChecked}
                            onCheckedChange={() => handleAudienceToggle(audience.value as TargetAudienceOption)}
                          />
                          <label htmlFor={`audience-${audience.value}`} className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                            {audience.label}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Cohorts check list */}
                {showCohortsChecklist && (
                  <div className="space-y-2 p-5 bg-slate-50 rounded-2xl">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-primary" /> Select Target Cohort(s) *
                    </label>
                    {loadingCohorts ? (
                      <div className="text-xs text-slate-400 py-1">Loading cohorts...</div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                        {cohorts.map(c => (
                          <div key={c.id} className="flex items-center space-x-2 p-2 bg-white rounded-lg border border-slate-100">
                            <Checkbox
                              id={`dlg-cohort-${c.id}`}
                              checked={selectedCohortIds.includes(c.id)}
                              onCheckedChange={() => handleCohortToggle(c.id)}
                            />
                            <label htmlFor={`dlg-cohort-${c.id}`} className="text-xs font-bold text-slate-700 cursor-pointer">
                              {c.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Email notify checkbox */}
                <div className="flex items-start space-x-2 p-3 bg-red-50/30 rounded-xl border border-red-100/30">
                  <Checkbox
                    id="dlg-send-emails"
                    checked={sendEmails}
                    onCheckedChange={checked => setSendEmails(!!checked)}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <label htmlFor="dlg-send-emails" className="text-xs font-bold text-slate-800 cursor-pointer">
                      Send Email Notification to target recipients
                    </label>
                    <p className="text-[9px] text-slate-500 font-medium">
                      Note: Emails will only be dispatched if you select "Announce & Publish".
                    </p>
                  </div>
                </div>

                {/* Allow Cancellation Checkbox */}
                <div className="flex items-start space-x-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <Checkbox
                    id="dlg-allow-cancellation"
                    checked={allowCancellation}
                    onCheckedChange={checked => setAllowCancellation(!!checked)}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <label htmlFor="dlg-allow-cancellation" className="text-xs font-bold text-slate-800 cursor-pointer">
                      Allow users to cancel registration
                    </label>
                    <p className="text-[9px] text-slate-500 font-medium">
                      If unchecked, registered users will not be able to cancel their registration.
                    </p>
                  </div>
                </div>

                {/* Submit Options */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={submitting || isUploading}
                    onClick={(e) => handleAnnounce(e, 'draft')}
                    className="h-11 px-5 rounded-xl border-slate-200 font-bold text-xs uppercase"
                  >
                    {submitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null} 
                    {editingEvent ? 'Save as Draft' : 'Save as Draft'}
                  </Button>
                  <Button
                    type="button"
                    disabled={submitting || isUploading}
                    onClick={(e) => handleAnnounce(e, 'published')}
                    className="h-11 px-6 rounded-xl bg-[#D91A2A] text-white hover:bg-[#D91A2A]/90 font-black text-xs uppercase tracking-wider"
                  >
                    {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null} 
                    {editingEvent ? 'Update & Publish' : 'Announce & Publish'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-slate-100 p-1 rounded-xl h-12">
            <TabsTrigger value="all_events" className="rounded-lg font-bold text-xs uppercase">All Events</TabsTrigger>
            <TabsTrigger value="participation" className="rounded-lg font-bold text-xs uppercase">Participation Registry</TabsTrigger>
          </TabsList>

          <TabsContent value="all_events" className="mt-6">
            <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
              <CardHeader className="border-b bg-slate-50/50 p-6">
                <CardTitle className="text-lg font-black text-slate-900">Announce Events</CardTitle>
                <CardDescription className="text-xs text-slate-500 font-medium">
                  Monitor event formats, target audiences, and publication states.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loadingEvents ? (
                  <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-wider text-xs">
                    Loading events...
                  </div>
                ) : events.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs italic">
                    No events announced yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-bold uppercase text-[10px] text-slate-400 tracking-wider">Event Details</TableHead>
                          <TableHead className="font-bold uppercase text-[10px] text-slate-400 tracking-wider">Target Group(s)</TableHead>
                          <TableHead className="font-bold uppercase text-[10px] text-slate-400 tracking-wider">Date & Time</TableHead>
                          <TableHead className="font-bold uppercase text-[10px] text-slate-400 tracking-wider text-center">Registrations</TableHead>
                          <TableHead className="font-bold uppercase text-[10px] text-slate-400 tracking-wider text-center">Flyer</TableHead>
                          <TableHead className="font-bold uppercase text-[10px] text-slate-400 tracking-wider text-center">Status</TableHead>
                          <TableHead className="font-bold uppercase text-[10px] text-slate-400 tracking-wider text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {events.map((event) => (
                          <TableRow key={event.id}>
                            <TableCell>
                              <div className="space-y-1">
                                <span className="font-black text-slate-900 block text-xs">{event.title}</span>
                                <span 
                                  className="text-[10px] font-medium text-slate-500 block truncate max-w-xs" 
                                  title={event.description.replace(/<[^>]*>/g, '')}
                                >
                                  {event.description.replace(/<[^>]*>/g, '') || 'No description'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {(Array.isArray(event.targetAudience) ? event.targetAudience : [event.targetAudience]).map(audience => (
                                  <Badge key={audience} variant="outline" className="text-[8px] font-black uppercase bg-slate-50 px-1 py-0.5">
                                    {audience.replace('_', ' ')}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-[10px] font-bold text-slate-600 flex flex-col">
                                <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3 text-red-500" /> {new Date(event.date).toLocaleDateString()}</span>
                                <span className="flex items-center gap-1 mt-0.5"><Video className="h-3 w-3 text-blue-500" /> {event.time} ({event.mode})</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedEventId(event.id);
                                  setActiveTab('participation');
                                }}
                                className="h-8 px-2.5 rounded-lg text-emerald-600 hover:bg-emerald-50 text-xs font-bold"
                                title="Click to view details"
                              >
                                {event.registeredUsers?.length || 0} Registered
                              </Button>
                            </TableCell>
                            <TableCell className="text-center">
                              {event.flyerUrl ? (
                                <a
                                  href={event.flyerUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center p-2 rounded-lg bg-red-50 hover:bg-red-100 text-[#D91A2A] transition-colors"
                                  title="View Flyer"
                                >
                                  <Eye className="h-4 w-4" />
                                </a>
                              ) : (
                                <span className="text-[10px] font-medium text-slate-400 italic">None</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {event.status === 'published' ? (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none font-bold uppercase text-[9px] px-2 py-0.5">
                                  Published
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none font-bold uppercase text-[9px] px-2 py-0.5">
                                  Draft
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {event.status === 'draft' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handlePublishDraft(event.id)}
                                    className="h-8 rounded-lg bg-green-600 text-white hover:bg-green-700 text-[10px] font-black uppercase px-3 shadow-md"
                                  >
                                    Publish
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEditEvent(event)}
                                  className="h-8 rounded-lg text-blue-600 hover:bg-blue-50 px-2.5 text-[10px] font-black uppercase"
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteEvent(event.id)}
                                  className="h-8 w-8 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 p-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="participation" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Event selector panel */}
              <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
                <CardHeader className="border-b bg-slate-50/50 p-6">
                  <CardTitle className="text-base font-black text-slate-900 flex items-center gap-1.5">
                    <CalendarDays className="h-5 w-5 text-primary" /> Select Event
                  </CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Choose event to view registry list
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
                  {events.filter(e => e.status === 'published').length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase italic">
                      No published events yet
                    </div>
                  ) : (
                    events.filter(e => e.status === 'published').map((event) => (
                      <button
                        key={event.id}
                        onClick={() => setSelectedEventId(event.id)}
                        className={`w-full text-left p-5 hover:bg-slate-50 transition-colors flex flex-col gap-1.5 ${selectedEventId === event.id ? 'bg-red-50/30 border-l-4 border-[#D91A2A]' : ''
                          }`}
                      >
                        <span className="font-black text-slate-900 text-xs leading-snug block">{event.title}</span>
                        <div className="flex items-center justify-between w-full mt-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">
                            {new Date(event.date).toLocaleDateString()}
                          </span>
                          <Badge variant="outline" className="text-[9px] font-black bg-white flex items-center gap-1 text-slate-600 px-1.5">
                            <UserCheck className="h-3 w-3 text-green-600" /> {event.registeredUsers?.length || 0}
                          </Badge>
                        </div>
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Registration list registry */}
              <Card className="lg:col-span-2 border-none shadow-xl bg-white rounded-3xl overflow-hidden">
                <CardHeader className="border-b bg-slate-50/50 p-6 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-black text-slate-900 flex items-center gap-1.5">
                      <UserCheck className="h-5 w-5 text-[#D91A2A]" /> Registered Participants
                    </CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {selectedEvent ? `Attendee Registry for: ${selectedEvent.title}` : 'Select an event from the left panel'}
                    </CardDescription>
                  </div>
                  {selectedEvent && registeredParticipants.length > 0 && (
                    <Button
                      size="sm"
                      onClick={exportParticipantsCSV}
                      className="rounded-xl border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 font-bold text-[10px] uppercase h-9 px-4 flex items-center gap-1.5 shadow-sm"
                    >
                      <FileSpreadsheet className="h-4 w-4" /> Export CSV
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  {!selectedEventId ? (
                    <div className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">
                      Please select an announced event to view registered participants.
                    </div>
                  ) : loadingUsers ? (
                    <div className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-wider animate-pulse">
                      Synchronizing registry list...
                    </div>
                  ) : registeredParticipants.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">
                      No users have registered for this event yet.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-bold uppercase text-[10px] text-slate-400 tracking-wider">User</TableHead>
                          <TableHead className="font-bold uppercase text-[10px] text-slate-400 tracking-wider">Email</TableHead>
                          <TableHead className="font-bold uppercase text-[10px] text-slate-400 tracking-wider">Category</TableHead>
                          <TableHead className="font-bold uppercase text-[10px] text-slate-400 tracking-wider">Contact</TableHead>
                          <TableHead className="font-bold uppercase text-[10px] text-slate-400 tracking-wider">Institute</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {registeredParticipants.map((u) => (
                          <TableRow key={u.uid}>
                            <TableCell className="font-black text-slate-900 text-xs">{u.displayName}</TableCell>
                            <TableCell className="text-xs font-mono">{u.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[9px] font-black bg-slate-50 px-2 py-0.5">
                                {u.category || 'User'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-slate-600">{u.contactNumber || u.phoneNumber || 'N/A'}</TableCell>
                            <TableCell className="text-xs text-slate-600">{u.institute || 'N/A'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  );
}
