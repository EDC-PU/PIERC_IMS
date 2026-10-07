'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useAuthStore } from '@/store/authStore';
import { auth, db, storage } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  addDoc,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { triggerEmailNotification } from '@/lib/email-client';
import { getEmailHtmlTemplate } from '@/lib/email-templates';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Send,
  Search,
  MessageSquare,
  User,
  Clock,
  MoreVertical,
  Phone,
  Video,
  Info,
  Hash,
  CheckCircle2,
  ArrowLeft,
  Paperclip,
  FileText,
  FileSpreadsheet,
  FileArchive,
  Image as ImageIcon,
  X,
  Download,
  ExternalLink,
  Loader2,
  Plus,
  Users,
  Crown,
  Shield,
  Trash2,
  Check,
  UserCheck,
  Calendar,
  Copy,
  RefreshCw,
  Sparkles,
  Pencil
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { UserProfile } from '@/types';
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB strictly

const formatFileSize = (bytes?: number) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface MessageAttachment {
  url: string;
  name: string;
  size: number;
  type: 'image' | 'document';
  mimeType?: string;
}

export interface MessageMeeting {
  meetingId: string;
  title: string;
  startTime: number;
  endTime: number;
  link: string;
  calendarUrl?: string;
  creatorName?: string;
  description?: string;
}

interface Message {
  id: string;
  senderId: string;
  senderName?: string;
  senderRole?: string;
  senderPhoto?: string;
  text?: string;
  timestamp: number;
  attachment?: MessageAttachment;
  meeting?: MessageMeeting;
  edited?: boolean;
  editedAt?: number;
}

interface ChatPreview {
  id: string;
  otherUser: UserProfile;
  lastMessage: string;
  timestamp: number;
  unread: boolean;
}

export interface MessageGroup {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  creatorName?: string;
  createdAt: number;
  members: string[]; // array of UIDs
  lastMessage?: string;
  lastMessageSender?: string;
  lastMessageTimestamp?: number;
}

function MessagesContent() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get('userId');

  const isSuperAdmin = user?.role === 'super_admin';

  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [groups, setGroups] = useState<MessageGroup[]>([]);
  const [selectedChat, setSelectedChat] = useState<UserProfile | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<MessageGroup | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);

  // File attachment state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Group creation modal state
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedMemberUids, setSelectedMemberUids] = useState<string[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState<'all' | 'user' | 'mentor' | 'admin'>('all');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // Group details modal state
  const [isGroupDetailsOpen, setIsGroupDetailsOpen] = useState(false);

  // Google Meet scheduling state
  const [isScheduleMeetOpen, setIsScheduleMeetOpen] = useState(false);
  const [meetTitle, setMeetTitle] = useState('');
  const [meetDate, setMeetDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [meetTime, setMeetTime] = useState('14:00');
  const [meetDuration, setMeetDuration] = useState('30');
  const [meetLink, setMeetLink] = useState('');
  const [meetDescription, setMeetDescription] = useState('');
  const [isGeneratingMeet, setIsGeneratingMeet] = useState(false);
  const [isSubmittingMeet, setIsSubmittingMeet] = useState(false);

  // Message edit state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-select chat if targetUserId is provided
  useEffect(() => {
    if (targetUserId && users.length > 0) {
      const targetUser = users.find(u => u.uid === targetUserId);
      if (targetUser) {
        setSelectedChat(targetUser);
        setSelectedGroup(null);
      }
    }
  }, [targetUserId, users]);

  // Clean up attachment and edit state when conversation selection changes
  useEffect(() => {
    handleRemoveSelectedFile();
    setEditingMessageId(null);
    setEditingText('');
  }, [selectedChat, selectedGroup]);

  // Load all accessible users for direct chat and member picking
  useEffect(() => {
    if (!user) return;

    let usersQuery;
    if (user.role === 'admin' || user.role === 'super_admin' || user.role === 'mentor') {
      usersQuery = collection(db, 'users');
    } else {
      const usersCol = collection(db, 'users');
      usersQuery = query(usersCol, where('role', 'in', ['admin', 'super_admin', 'mentor']));
    }

    return onSnapshot(usersQuery, (snapshot) => {
      const userList = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as UserProfile[];
      setUsers(userList.filter(u => u.uid !== user?.uid));
    }, (error) => {
      console.error('Failed to load chat users:', error);
    });
  }, [user]);

  // Load groups in real time
  useEffect(() => {
    if (!user) return;

    let groupsQuery;
    if (user.role === 'super_admin' || user.role === 'admin') {
      groupsQuery = collection(db, 'message_groups');
    } else {
      groupsQuery = query(
        collection(db, 'message_groups'),
        where('members', 'array-contains', user.uid)
      );
    }

    return onSnapshot(groupsQuery, (snapshot) => {
      const groupList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MessageGroup[];

      // Sort by newest lastMessageTimestamp in memory
      groupList.sort((a, b) => (b.lastMessageTimestamp || b.createdAt || 0) - (a.lastMessageTimestamp || a.createdAt || 0));
      setGroups(groupList);

      // Keep selectedGroup state synchronized if currently open
      setSelectedGroup(prev => {
        if (!prev) return null;
        const updated = groupList.find(g => g.id === prev.id);
        return updated || null;
      });
    }, (err) => {
      console.warn('Failed to load message groups:', err);
    });
  }, [user]);

  // Load direct chat previews with real-time last messages
  useEffect(() => {
    if (!user || users.length === 0) return;

    const unsubscribes = users.map(u => {
      const chatId = [user.uid, u.uid].sort().join('_');
      const messagesCol = collection(db, 'messages', chatId, 'messages');
      const lastMsgQuery = query(messagesCol, orderBy('timestamp', 'desc'), limit(1));

      return onSnapshot(lastMsgQuery, (snapshot) => {
        let lastMsg = 'Start a conversation...';
        let ts = Date.now();

        if (!snapshot.empty) {
          const msg = snapshot.docs[0].data() as any;
          if (msg.meeting) {
            lastMsg = `🎥 Meet: ${msg.meeting.title}`;
          } else if (msg.text) {
            lastMsg = msg.text;
          } else if (msg.attachment) {
            lastMsg = msg.attachment.type === 'image' ? '📷 Image' : `📎 ${msg.attachment.name || 'Document'}`;
          }
          ts = msg.timestamp || ts;
        }

        setChats(prev => {
          const filtered = prev.filter(c => c.otherUser.uid !== u.uid);
          return [...filtered, {
            id: chatId,
            otherUser: u,
            lastMessage: lastMsg,
            timestamp: ts,
            unread: false
          }].sort((a, b) => b.timestamp - a.timestamp);
        });
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [users, user]);

  // Load messages for selected conversation (either direct chat or group)
  useEffect(() => {
    if (!user) return;

    if (selectedGroup) {
      const messagesCol = collection(db, 'message_groups', selectedGroup.id, 'messages');
      const messagesQuery = query(messagesCol, orderBy('timestamp', 'asc'), limit(50));

      return onSnapshot(messagesQuery, (snapshot) => {
        const msgList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Message));
        setMessages(msgList);
        setTimeout(() => {
          scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }, (err) => {
        console.warn('Failed to load group messages:', err);
      });
    }

    if (selectedChat) {
      const chatId = [user.uid, selectedChat.uid].sort().join('_');
      const messagesCol = collection(db, 'messages', chatId, 'messages');
      const messagesQuery = query(messagesCol, orderBy('timestamp', 'asc'), limit(50));

      return onSnapshot(messagesQuery, (snapshot) => {
        const msgList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Message));
        setMessages(msgList);
        setTimeout(() => {
          scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }, (err) => {
        console.warn('Failed to load direct messages:', err);
      });
    }

    setMessages([]);
  }, [selectedChat, selectedGroup, user]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict 5 MB check
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File exceeds 5MB limit', {
        description: `Selected file is ${(file.size / (1024 * 1024)).toFixed(2)} MB. Please choose an image or document below 5 MB.`
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const preview = URL.createObjectURL(file);
      setFilePreviewUrl(preview);
    } else {
      setFilePreviewUrl(null);
    }
  };

  const handleRemoveSelectedFile = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setSelectedFile(null);
    setFilePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Live Google Meet space creation using Google Meet REST API (meet.googleapis.com/v2/spaces)
  const handleCreateViaGoogleMeetApi = async () => {
    setIsGeneratingMeet(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/meetings.space.created');
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (!token) {
        throw new Error('Google OAuth access token was not returned. Please check popup permissions.');
      }

      // Call Google Meet REST API v2 spaces endpoint
      const res = await fetch('https://meet.googleapis.com/v2/spaces', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error.message || 'Google Meet API returned an error');
      }

      if (data.meetingUri) {
        setMeetLink(data.meetingUri);
        toast.success('Live Google Meet space created!', {
          description: data.meetingUri
        });
      }
    } catch (err: any) {
      console.warn('Google Meet API creation error:', err);
      toast.error('Google Meet space notice', {
        description: err?.message || 'Could not create space automatically. Please open meet.google.com/new to get your link.'
      });
    } finally {
      setIsGeneratingMeet(false);
    }
  };

  // Schedule Google Meeting handler
  const handleScheduleGoogleMeet = async () => {
    if (!user || !selectedGroup) return;
    if (!meetTitle.trim()) {
      toast.error('Meeting title is required');
      return;
    }

    const [year, month, day] = meetDate.split('-').map(Number);
    const [hours, minutes] = meetTime.split(':').map(Number);
    const startTimestamp = new Date(year, month - 1, day, hours, minutes).getTime();

    if (isNaN(startTimestamp)) {
      toast.error('Invalid date or time selected');
      return;
    }

    let activeLink = meetLink.trim();
    if (activeLink && !activeLink.startsWith('http://') && !activeLink.startsWith('https://')) {
      activeLink = `https://${activeLink}`;
    }

    if (!activeLink) {
      toast.error('Active Google Meet link required', {
        description: "Please click 'Create via Google Meet API' or 'Open meet.google.com/new' to generate an active room."
      });
      return;
    }

    const durationMinutes = parseInt(meetDuration, 10) || 30;
    const endTimestamp = startTimestamp + (durationMinutes * 60 * 1000);

    setIsSubmittingMeet(true);
    try {
      // 1. Google Calendar URL creation
      const startIso = new Date(startTimestamp).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      const endIso = new Date(endTimestamp).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      const calDetails = [
        meetDescription.trim(),
        '',
        `Join Google Meet: ${activeLink}`,
        `Group: #${selectedGroup.name}`,
        'PIERC Innovation & Incubation Center'
      ].filter(Boolean).join('\n');

      const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
        meetTitle.trim()
      )}&dates=${startIso}/${endIso}&details=${encodeURIComponent(
        calDetails
      )}&location=${encodeURIComponent(activeLink)}`;

      // 2. Write to top-level meetings collection
      const meetingDocRef = await addDoc(collection(db, 'meetings'), {
        title: meetTitle.trim(),
        startTime: startTimestamp,
        endTime: endTimestamp,
        mode: 'Online',
        location: 'Google Meet',
        link: activeLink,
        calendarUrl,
        groupId: selectedGroup.id,
        groupName: selectedGroup.name,
        attendees: selectedGroup.members,
        creatorId: user.uid,
        creatorName: user.displayName || user.email || 'Member',
        status: 'Scheduled',
        description: meetDescription.trim() || `Google Meet scheduled in #${selectedGroup.name}`,
        createdAt: Date.now()
      });

      // 3. Post rich Meeting Card message into group
      const formattedDate = new Date(startTimestamp).toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
      const formattedTime = new Date(startTimestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });

      await addDoc(collection(db, 'message_groups', selectedGroup.id, 'messages'), {
        senderId: user.uid,
        senderName: user.displayName || user.email || 'Member',
        senderRole: user.role || 'user',
        senderPhoto: user.photoURL || '',
        text: `📅 Scheduled a Google Meet: "${meetTitle.trim()}" for ${formattedDate} at ${formattedTime}`,
        meeting: {
          meetingId: meetingDocRef.id,
          title: meetTitle.trim(),
          startTime: startTimestamp,
          endTime: endTimestamp,
          link: activeLink,
          calendarUrl,
          creatorName: user.displayName || user.email || 'Member',
          description: meetDescription.trim()
        },
        timestamp: Date.now()
      });

      // 4. Update group lastMessage
      await updateDoc(doc(db, 'message_groups', selectedGroup.id), {
        lastMessage: `🎥 Google Meet: ${meetTitle.trim()}`,
        lastMessageSender: user.displayName || 'Member',
        lastMessageTimestamp: Date.now()
      }).catch(err => console.warn('Error updating group last message:', err));

      // 5. In-app notifications to all group members
      selectedGroup.members.forEach(async (memberId) => {
        if (memberId !== user.uid) {
          try {
            await addDoc(collection(db, 'notifications', memberId, 'items'), {
              userId: memberId,
              title: 'Google Meet Scheduled',
              message: `${user.displayName || 'A member'} scheduled "${meetTitle.trim()}" in #${selectedGroup.name} for ${formattedDate} at ${formattedTime}.`,
              type: 'info',
              read: false,
              createdAt: Date.now(),
              link: '/dashboard/messages'
            });
          } catch (e) {
            console.warn('Failed to notify member of meeting:', e);
          }
        }
      });

      toast.success('Google Meet scheduled successfully!', {
        description: `Posted to #${selectedGroup.name} with join links and calendar invites.`
      });

      setIsScheduleMeetOpen(false);
      setMeetTitle('');
      setMeetDescription('');
      setMeetLink('');
    } catch (err: any) {
      console.error('Error scheduling Google Meet:', err);
      toast.error('Failed to schedule meeting', { description: err?.message });
    } finally {
      setIsSubmittingMeet(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!selectedChat && !selectedGroup) || isUploading) return;
    if (!newMessage.trim() && !selectedFile) return;

    const messageText = newMessage.trim();
    const fileToUpload = selectedFile;

    setIsUploading(true);
    setNewMessage('');
    handleRemoveSelectedFile();

    try {
      let attachmentData: MessageAttachment | undefined;

      // Handle file upload if present
      if (fileToUpload) {
        const isImage = fileToUpload.type.startsWith('image/');
        const safeName = fileToUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uploadPath = `users/${user.uid}/chat_attachments/${Date.now()}_${safeName}`;
        const fileRef = storageRef(storage, uploadPath);

        const uploadSnapshot = await uploadBytes(fileRef, fileToUpload);
        const downloadUrl = await getDownloadURL(uploadSnapshot.ref);

        attachmentData = {
          url: downloadUrl,
          name: fileToUpload.name,
          size: fileToUpload.size,
          type: isImage ? 'image' : 'document',
          mimeType: fileToUpload.type || 'application/octet-stream',
        };
      }

      const msgPreview = messageText || (attachmentData?.type === 'image' ? '📷 Image' : `📎 ${attachmentData?.name || 'Document'}`);

      // Case 1: Sending to a Group
      if (selectedGroup) {
        const groupMessagesCol = collection(db, 'message_groups', selectedGroup.id, 'messages');
        const groupMsgDoc: any = {
          senderId: user.uid,
          senderName: user.displayName || user.email || 'Member',
          senderRole: user.role || 'user',
          senderPhoto: user.photoURL || '',
          timestamp: Date.now(),
        };
        if (messageText) groupMsgDoc.text = messageText;
        if (attachmentData) groupMsgDoc.attachment = attachmentData;

        await addDoc(groupMessagesCol, groupMsgDoc);

        // Update group document last message metadata
        const groupDocRef = doc(db, 'message_groups', selectedGroup.id);
        await updateDoc(groupDocRef, {
          lastMessage: msgPreview,
          lastMessageSender: user.displayName || user.email || 'Member',
          lastMessageTimestamp: Date.now(),
        }).catch(err => console.warn('Error updating group last message:', err));

        return;
      }

      // Case 2: Sending Direct Message
      if (selectedChat) {
        const chatId = [user.uid, selectedChat.uid].sort().join('_');
        const messagesCol = collection(db, 'messages', chatId, 'messages');

        // Check if we should notify by email (not a live, continuous chat)
        let shouldNotify = true;
        try {
          const lastMsgQuery = query(messagesCol, orderBy('timestamp', 'desc'), limit(1));
          const querySnapshot = await getDocs(lastMsgQuery);
          if (!querySnapshot.empty) {
            const lastMsg = querySnapshot.docs[0].data();
            const timeDiff = Date.now() - lastMsg.timestamp;
            if (timeDiff < 3 * 60 * 1000) {
              shouldNotify = false;
            }
          }
        } catch (err) {
          console.warn('Error checking last message for continuous chat check:', err);
        }

        const messageDocData: any = {
          senderId: user.uid,
          timestamp: Date.now(),
        };
        if (messageText) messageDocData.text = messageText;
        if (attachmentData) messageDocData.attachment = attachmentData;

        await addDoc(messagesCol, messageDocData);

        // Dispatch email notification
        if (shouldNotify && selectedChat.email) {
          try {
            const senderName = user.displayName || user.email || 'Someone';
            const subject = `[New Message] ${senderName} sent you a message on PIERC Portal`;
            const notificationPreview = messageText || (attachmentData?.type === 'image' ? '[Sent an image attachment]' : `[Sent document: ${attachmentData?.name}]`);
            const emailHtml = getEmailHtmlTemplate({
              headerTitle: 'New Message Received',
              bodyHtml: `
                <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 16px;">
                  Hello <strong>${selectedChat.displayName || 'User'}</strong>,
                </p>
                <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 16px;">
                  You have received a new message from <strong>${senderName}</strong> on the PIERC:
                </p>
                <div style="background-color: #f8fafc; border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0; color: #0f172a; font-size: 14px; font-weight: 500; margin-bottom: 20px;">
                  "${notificationPreview}"
                </div>
                <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 0;">
                  Log in to the portal messenger to reply to this conversation.
                </p>
              `,
              ctaText: 'Open Messenger',
              ctaLink: `https://pierc-portal-9bd82.web.app/dashboard/messages?userId=${user.uid}`
            });

            triggerEmailNotification({
              to: [selectedChat.email],
              subject,
              html: emailHtml
            }).catch(err => console.error('Failed to trigger message notification email:', err));
          } catch (emailErr) {
            console.error('Error constructing message email:', emailErr);
          }
        }
      }
    } catch (error: any) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message', {
        description: error?.message || 'Please check your connection and try again.'
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Edit message handlers
  const handleStartEdit = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditingText(msg.text || '');
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  const handleSaveEditMessage = async (messageId: string) => {
    if (!editingText.trim() || !user) return;
    setIsSavingEdit(true);
    try {
      if (selectedGroup) {
        const msgRef = doc(db, 'message_groups', selectedGroup.id, 'messages', messageId);
        await updateDoc(msgRef, {
          text: editingText.trim(),
          edited: true,
          editedAt: Date.now()
        });

        // Update group last message preview if this was the last message
        if (messages.length > 0 && messages[messages.length - 1].id === messageId) {
          await updateDoc(doc(db, 'message_groups', selectedGroup.id), {
            lastMessage: editingText.trim()
          }).catch(() => { });
        }
      } else if (selectedChat) {
        const chatId = [user.uid, selectedChat.uid].sort().join('_');
        const msgRef = doc(db, 'messages', chatId, 'messages', messageId);
        await updateDoc(msgRef, {
          text: editingText.trim(),
          edited: true,
          editedAt: Date.now()
        });
      }
      toast.success('Message updated');
      setEditingMessageId(null);
      setEditingText('');
    } catch (err: any) {
      console.error('Error updating message:', err);
      toast.error('Failed to update message', { description: err?.message });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Create Group handler (Super Admin only)
  const handleCreateGroup = async () => {
    if (!user || user.role !== 'super_admin') {
      toast.error('Permission denied', { description: 'Only Super Admins can create message groups.' });
      return;
    }

    if (!newGroupName.trim()) {
      toast.error('Group Name is required');
      return;
    }

    if (selectedMemberUids.length === 0) {
      toast.error('Select at least one member', { description: 'Please choose members for this group.' });
      return;
    }

    setIsCreatingGroup(true);
    try {
      const allMembers = Array.from(new Set([user.uid, ...selectedMemberUids]));
      const groupData = {
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || '',
        createdBy: user.uid,
        creatorName: user.displayName || user.email || 'Super Admin',
        createdAt: Date.now(),
        members: allMembers,
        lastMessage: `Group created by ${user.displayName || 'Super Admin'}`,
        lastMessageSender: user.displayName || 'Super Admin',
        lastMessageTimestamp: Date.now(),
      };

      const groupDocRef = await addDoc(collection(db, 'message_groups'), groupData);
      const newGroupId = groupDocRef.id;

      // Add initial welcome announcement message in group
      await addDoc(collection(db, 'message_groups', newGroupId, 'messages'), {
        senderId: user.uid,
        senderName: user.displayName || 'Super Admin',
        senderRole: 'super_admin',
        text: `Welcome to ${newGroupName.trim()}! This channel was created by ${user.displayName || 'Super Admin'} for collaboration.`,
        timestamp: Date.now(),
      });

      // Dispatch in-app notifications to all invited members
      selectedMemberUids.forEach(async (memberId) => {
        try {
          await addDoc(collection(db, 'notifications', memberId, 'items'), {
            title: 'Added to Message Group',
            message: `You were added to the group "${newGroupName.trim()}" by ${user.displayName || 'Super Admin'}.`,
            type: 'info',
            read: false,
            createdAt: Date.now(),
            link: '/dashboard/messages'
          });
        } catch (e) {
          console.warn('Failed to dispatch notification to member:', memberId, e);
        }
      });

      toast.success(`Group "${newGroupName.trim()}" created!`, {
        description: `Added ${allMembers.length} members.`
      });

      // Reset and close
      setNewGroupName('');
      setNewGroupDescription('');
      setSelectedMemberUids([]);
      setIsCreateGroupOpen(false);

      // Immediately switch to the new group
      setSelectedGroup({
        id: newGroupId,
        ...groupData,
      });
      setSelectedChat(null);
    } catch (err: any) {
      console.error('Error creating message group:', err);
      toast.error('Failed to create group', {
        description: err?.message || 'Check Firestore rules and connection.'
      });
    } finally {
      setIsCreatingGroup(false);
    }
  };

  // Delete Group handler (Super Admin only)
  const handleDeleteGroup = async (groupId: string) => {
    if (!user || user.role !== 'super_admin') return;
    if (!confirm('Are you sure you want to delete this group? All participants will lose access.')) return;

    try {
      await deleteDoc(doc(db, 'message_groups', groupId));
      toast.success('Group deleted successfully');
      setIsGroupDetailsOpen(false);
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
      }
    } catch (err: any) {
      console.error('Failed to delete group:', err);
      toast.error('Failed to delete group', { description: err?.message });
    }
  };

  const getDocIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) return FileSpreadsheet;
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) return FileArchive;
    return FileText;
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200 text-[10px] px-1.5 py-0 h-4">Super Admin</Badge>;
      case 'admin':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 text-[10px] px-1.5 py-0 h-4">Admin</Badge>;
      case 'mentor':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 text-[10px] px-1.5 py-0 h-4">Mentor</Badge>;
      default:
        return <Badge variant="outline" className="text-slate-600 text-[10px] px-1.5 py-0 h-4">Startup</Badge>;
    }
  };

  // Filtering for Sidebar
  const filteredChats = chats.filter(c =>
    (c.otherUser.displayName || c.otherUser.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.description || '').toLowerCase().includes(search.toLowerCase())
  );

  // Filtering for Member Selection Dialog
  const filteredUsersForModal = users.filter(u => {
    const matchesSearch =
      (u.displayName || '').toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(memberSearchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (memberRoleFilter === 'all') return true;
    if (memberRoleFilter === 'admin') return u.role === 'admin' || u.role === 'super_admin';
    if (memberRoleFilter === 'mentor') return u.role === 'mentor';
    if (memberRoleFilter === 'user') return u.role === 'user' || !u.role;
    return true;
  });

  const activeConversationTitle = selectedGroup
    ? selectedGroup.name
    : selectedChat
      ? (selectedChat.displayName || selectedChat.email || 'User')
      : '';

  return (
    <div className="flex h-[calc(100vh-8.5rem)] sm:h-[calc(100vh-10rem)] md:h-[calc(100vh-12rem)] overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 animate-in fade-in zoom-in-95 duration-500">
      {/* Sidebar */}
      <div className={cn(
        "w-full md:w-80 flex-col border-r bg-slate-50/50 backdrop-blur-xl shrink-0",
        (selectedChat || selectedGroup) ? "hidden md:flex" : "flex"
      )}>
        {/* Sidebar Header */}
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">Messages</h1>
            </div>
            <div className="flex items-center gap-1.5">
              {isSuperAdmin && (
                <Button
                  size="sm"
                  onClick={() => setIsCreateGroupOpen(true)}
                  className="h-8 px-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 font-bold shadow-sm shadow-primary/20 flex items-center gap-1 text-xs transition-all hover:scale-105 active:scale-95"
                  title="Create a new Message Group (Super Admin)"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Group</span>
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white shadow-sm ring-1 ring-slate-100">
                <MessageSquare className="h-4 w-4 text-primary" />
              </Button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              ref={searchInputRef}
              placeholder="Search chats or groups..."
              className="pl-9 h-10 rounded-xl bg-white border-none shadow-sm ring-1 ring-slate-100 focus:ring-2 focus:ring-primary/20 transition-all text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          <div className="px-3 pb-6 space-y-1">
            {/* GROUPS LIST */}
            {filteredGroups.length > 0 && (
              <div className="mb-2">
                <div className="px-3 py-1 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <span>Groups & Channels</span>
                  <span>{filteredGroups.length}</span>
                </div>
                {filteredGroups.map((group) => {
                  const isSelected = selectedGroup?.id === group.id;
                  return (
                    <button
                      key={group.id}
                      onClick={() => {
                        setSelectedGroup(group);
                        setSelectedChat(null);
                      }}
                      className={cn(
                        "w-full flex items-center p-3 rounded-2xl transition-all duration-200 group text-left",
                        isSelected
                          ? "bg-white shadow-md ring-1 ring-slate-200"
                          : "hover:bg-white/70"
                      )}
                    >
                      <div className="relative shrink-0">
                        <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-sm ring-2 ring-white">
                          <Users className="h-5 w-5" />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-indigo-500 border-2 border-white rounded-full flex items-center justify-center text-[8px] text-white font-bold">
                          #
                        </div>
                      </div>
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <h3 className="font-bold text-slate-900 truncate text-sm flex items-center gap-1.5">
                            <span className="truncate">{group.name}</span>
                          </h3>
                          <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-1">
                            {new Date(group.lastMessageTimestamp || group.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs text-slate-500 truncate font-medium flex-1">
                            {group.lastMessageSender && (
                              <span className="text-slate-700 font-semibold">{group.lastMessageSender}: </span>
                            )}
                            {group.lastMessage || 'No messages yet'}
                          </p>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-slate-200 text-slate-500 shrink-0">
                            {group.members.length} members
                          </Badge>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* DIRECT CHATS LIST */}
            {filteredChats.length > 0 && (
              <div>
                <div className="px-3 py-1 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <span>Direct Messages</span>
                  <span>{filteredChats.length}</span>
                </div>
                {filteredChats.map((chat) => {
                  const isSelected = selectedChat?.uid === chat.otherUser.uid;
                  return (
                    <button
                      key={chat.id}
                      onClick={() => {
                        setSelectedChat(chat.otherUser);
                        setSelectedGroup(null);
                      }}
                      className={cn(
                        "w-full flex items-center p-3 rounded-2xl transition-all duration-200 group text-left",
                        isSelected
                          ? "bg-white shadow-md ring-1 ring-slate-200"
                          : "hover:bg-white/70"
                      )}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="h-11 w-11 ring-2 ring-white">
                          <AvatarImage src={chat.otherUser.photoURL} />
                          <AvatarFallback className="bg-primary text-white font-bold">
                            {(chat.otherUser.displayName || chat.otherUser.email || 'U')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
                      </div>
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <h3 className="font-bold text-slate-900 truncate text-sm">
                            {chat.otherUser.displayName || chat.otherUser.email || 'User'}
                          </h3>
                          <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-1">
                            {new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs text-slate-500 truncate font-medium flex-1">
                            {chat.lastMessage}
                          </p>
                          {chat.otherUser.role && getRoleBadge(chat.otherUser.role)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {filteredChats.length === 0 && filteredGroups.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                No conversations found matching &quot;{search}&quot;.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className={cn(
        "flex-1 flex-col bg-white min-w-0",
        (selectedChat || selectedGroup) ? "flex" : "hidden md:flex"
      )}>
        {(selectedChat || selectedGroup) ? (
          <>
            {/* Chat Header */}
            <div className="p-3 sm:p-4 border-b flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedChat(null);
                    setSelectedGroup(null);
                  }}
                  className="md:hidden mr-2 -ml-1 rounded-xl text-slate-500 hover:bg-slate-100 shrink-0"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>

                {selectedGroup ? (
                  <div className="h-9 sm:h-10 w-9 sm:w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white ring-2 ring-indigo-100 shrink-0">
                    <Users className="h-5 w-5" />
                  </div>
                ) : (
                  <Avatar className="h-9 sm:h-10 w-9 sm:w-10 ring-2 ring-primary/10 shrink-0">
                    <AvatarImage src={selectedChat?.photoURL} />
                    <AvatarFallback className="bg-primary text-white font-bold">
                      {(selectedChat?.displayName || selectedChat?.email || 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div className="ml-3 sm:ml-4 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2
                      onClick={() => selectedGroup && setIsGroupDetailsOpen(true)}
                      className={cn(
                        "font-black text-slate-900 text-sm truncate",
                        selectedGroup && "cursor-pointer hover:underline"
                      )}
                    >
                      {activeConversationTitle}
                    </h2>
                    {selectedGroup && (
                      <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] px-1.5 py-0 h-4 font-semibold">
                        Group Channel
                      </Badge>
                    )}
                    {selectedChat?.role && getRoleBadge(selectedChat.role)}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate font-medium">
                    {selectedGroup
                      ? `${selectedGroup.members.length} members • Created by ${selectedGroup.creatorName || 'Super Admin'}`
                      : 'Online now'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1 shrink-0">
                {selectedGroup ? (
                  <>
                    {/* Schedule Google Meet button for ANY group member */}
                    <Button
                      size="sm"
                      onClick={() => setIsScheduleMeetOpen(true)}
                      className="h-8 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95"
                      title="Schedule a Google Meeting for this group"
                    >
                      <Video className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Schedule Meet</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsGroupDetailsOpen(true)}
                      className="rounded-xl text-slate-600 hover:text-primary gap-1 text-xs"
                      title="View Group Details & Members"
                    >
                      <Info className="h-4 w-4" />
                      <span className="hidden sm:inline">Details</span>
                    </Button>
                    {isSuperAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteGroup(selectedGroup.id)}
                        className="text-slate-400 hover:text-rose-600 rounded-xl"
                        title="Delete Group (Super Admin)"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-primary rounded-xl"><Phone className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-primary rounded-xl"><Video className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-primary rounded-xl"><Info className="h-4 w-4" /></Button>
                  </>
                )}
              </div>
            </div>

            {/* Messages Content */}
            <ScrollArea className="flex-1 p-4 sm:p-6 bg-slate-50/30">
              <div className="space-y-6">
                <div className="flex justify-center">
                  <Badge variant="secondary" className="bg-white/80 backdrop-blur-sm text-slate-400 text-[10px] px-4 py-1 border-none shadow-sm font-bold uppercase tracking-widest">
                    {selectedGroup ? `Group Channel: ${selectedGroup.name}` : 'Conversation started'}
                  </Badge>
                </div>

                {messages.length === 0 && (
                  <div className="text-center py-20 space-y-4">
                    <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto">
                      {selectedGroup ? <Users className="h-8 w-8 text-indigo-400" /> : <Hash className="h-8 w-8 text-primary/30" />}
                    </div>
                    <p className="text-slate-400 text-sm font-medium">
                      {selectedGroup
                        ? `Welcome to ${selectedGroup.name}. Send the first message or schedule a Google Meeting!`
                        : `Start your conversation with ${selectedChat?.displayName || selectedChat?.email || 'User'}`}
                    </p>
                  </div>
                )}

                {messages.map((msg, idx) => {
                  const isMe = msg.senderId === user?.uid;
                  const DocIcon = msg.attachment?.name ? getDocIcon(msg.attachment.name) : FileText;

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex animate-in fade-in slide-in-from-bottom-2 duration-300",
                        isMe ? "justify-end" : "justify-start"
                      )}
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
                      <div className="max-w-[85%] sm:max-w-[70%] space-y-1 relative group/msg">
                        {/* Group Sender Header when not current user */}
                        {selectedGroup && !isMe && (
                          <div className="flex items-center gap-1.5 px-1 text-[11px] font-bold text-slate-700">
                            <span className="truncate">{msg.senderName || 'Member'}</span>
                            {msg.senderRole && getRoleBadge(msg.senderRole)}
                          </div>
                        )}

                        <div className={cn(
                          "p-3.5 sm:p-4 rounded-2xl shadow-sm space-y-2 relative",
                          isMe
                            ? "bg-primary text-white rounded-tr-none"
                            : "bg-white text-slate-800 rounded-tl-none ring-1 ring-slate-100"
                        )}>
                          {/* Quick edit floating button on hover (for sender's messages) */}
                          {isMe && msg.text && !msg.meeting && editingMessageId !== msg.id && (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(msg)}
                              className="absolute -top-2.5 right-2 opacity-0 group-hover/msg:opacity-100 transition-all duration-200 bg-white text-slate-700 hover:text-primary hover:bg-slate-50 border border-slate-200 shadow-sm rounded-full px-2 py-0.5 flex items-center gap-1 text-[10px] font-bold z-10"
                              title="Edit sent message"
                            >
                              <Pencil className="h-2.5 w-2.5 text-primary" />
                              <span>Edit</span>
                            </button>
                          )}
                          {/* Image Attachment */}
                          {msg.attachment?.type === 'image' && (
                            <div className="relative group overflow-hidden rounded-xl bg-black/5 ring-1 ring-black/10">
                              <img
                                src={msg.attachment.url}
                                alt={msg.attachment.name || 'Attached Image'}
                                className="max-h-64 sm:max-h-80 w-auto rounded-xl object-contain mx-auto"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                                <a
                                  href={msg.attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-900 rounded-lg text-xs font-bold shadow-md hover:bg-slate-100 transition-colors"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" /> View Full
                                </a>
                                <a
                                  href={msg.attachment.url}
                                  download={msg.attachment.name}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 text-white rounded-lg text-xs font-bold shadow-md hover:bg-white/30 backdrop-blur-md transition-colors"
                                >
                                  <Download className="h-3.5 w-3.5" /> Save
                                </a>
                              </div>
                            </div>
                          )}

                          {/* Document Attachment */}
                          {msg.attachment?.type === 'document' && (
                            <div className={cn(
                              "flex items-center gap-3 p-3 rounded-xl border transition-all",
                              isMe
                                ? "bg-white/15 hover:bg-white/20 border-white/25 text-white"
                                : "bg-slate-50 hover:bg-slate-100/90 border-slate-200 text-slate-900"
                            )}>
                              <div className={cn(
                                "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                                isMe ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                              )}>
                                <DocIcon className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold truncate" title={msg.attachment.name}>
                                  {msg.attachment.name}
                                </p>
                                <p className={cn("text-[10px] font-medium", isMe ? "text-white/80" : "text-slate-500")}>
                                  {formatFileSize(msg.attachment.size)} • Document
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <a
                                  href={msg.attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={msg.attachment.name}
                                  className={cn(
                                    "p-1.5 rounded-lg transition-colors",
                                    isMe ? "hover:bg-white/20 text-white" : "hover:bg-slate-200 text-slate-600"
                                  )}
                                  title="Download / View document"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              </div>
                            </div>
                          )}

                          {/* GOOGLE MEET CARD */}
                          {msg.meeting && (
                            <div className={cn(
                              "p-3.5 sm:p-4 rounded-xl border space-y-2.5 transition-all text-left",
                              isMe
                                ? "bg-white/15 border-white/25 text-white"
                                : "bg-gradient-to-br from-emerald-50/80 via-white to-blue-50/60 border-emerald-200 text-slate-900 shadow-sm"
                            )}>
                              {/* Header */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className={cn(
                                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                                    isMe ? "bg-white/25 text-white" : "bg-emerald-600 text-white shadow-sm"
                                  )}>
                                    <Video className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <span className={cn("text-xs font-black tracking-wide flex items-center gap-1", isMe ? "text-white" : "text-emerald-900")}>
                                      Google Meet
                                    </span>
                                    <p className={cn("text-[10px]", isMe ? "text-white/80" : "text-slate-500")}>
                                      Hosted by {msg.meeting.creatorName || 'Member'}
                                    </p>
                                  </div>
                                </div>

                                {(() => {
                                  const now = Date.now();
                                  const isLive = now >= msg.meeting.startTime && now <= msg.meeting.endTime;
                                  const isPast = now > msg.meeting.endTime;
                                  if (isLive) {
                                    return (
                                      <Badge className="bg-emerald-500 text-white text-[9px] px-2 py-0.5 animate-pulse font-bold">
                                        ● LIVE NOW
                                      </Badge>
                                    );
                                  }
                                  if (isPast) {
                                    return (
                                      <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 font-medium", isMe ? "border-white/30 text-white/70" : "text-slate-400 border-slate-200")}>
                                        Ended
                                      </Badge>
                                    );
                                  }
                                  return (
                                    <Badge className={cn("text-[9px] px-2 py-0.5 font-bold", isMe ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700 border-blue-200")}>
                                      Upcoming
                                    </Badge>
                                  );
                                })()}
                              </div>

                              {/* Title & Description */}
                              <div>
                                <h4 className={cn("font-bold text-sm", isMe ? "text-white" : "text-slate-900")}>
                                  {msg.meeting.title}
                                </h4>
                                {msg.meeting.description && (
                                  <p className={cn("text-xs mt-1 leading-relaxed", isMe ? "text-white/90" : "text-slate-600")}>
                                    {msg.meeting.description}
                                  </p>
                                )}
                              </div>

                              {/* Timing Details */}
                              <div className={cn("flex flex-wrap items-center gap-3 text-xs pt-0.5", isMe ? "text-white/90" : "text-slate-600")}>
                                <div className="flex items-center gap-1 font-medium text-[11px]">
                                  <Calendar className="h-3 w-3 opacity-80" />
                                  <span>{new Date(msg.meeting.startTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                </div>
                                <div className="flex items-center gap-1 font-medium text-[11px]">
                                  <Clock className="h-3 w-3 opacity-80" />
                                  <span>
                                    {new Date(msg.meeting.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(msg.meeting.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-current/10">
                                <a
                                  href={msg.meeting.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn(
                                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm hover:scale-[1.02] active:scale-95",
                                    isMe
                                      ? "bg-white text-primary hover:bg-slate-100"
                                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                                  )}
                                >
                                  <Video className="h-3.5 w-3.5" /> Join Google Meet
                                </a>

                                {msg.meeting.calendarUrl && (
                                  <a
                                    href={msg.meeting.calendarUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={cn(
                                      "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                                      isMe
                                        ? "bg-white/20 text-white hover:bg-white/30"
                                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                    )}
                                    title="Add to your personal Google Calendar"
                                  >
                                    <Calendar className="h-3.5 w-3.5" /> Add to Calendar
                                  </a>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(msg.meeting!.link);
                                    toast.success('Google Meet link copied to clipboard');
                                  }}
                                  className={cn(
                                    "inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-colors",
                                    isMe ? "hover:bg-white/20 text-white/80" : "hover:bg-slate-100 text-slate-500"
                                  )}
                                  title="Copy meeting link"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Message Text or Inline Edit Form */}
                          {editingMessageId === msg.id ? (
                            <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                              <textarea
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSaveEditMessage(msg.id);
                                  } else if (e.key === 'Escape') {
                                    handleCancelEdit();
                                  }
                                }}
                                rows={Math.min(6, Math.max(2, editingText.split('\n').length))}
                                className={cn(
                                  "w-full text-sm rounded-xl p-2.5 outline-none resize-none transition-all leading-relaxed",
                                  isMe
                                    ? "bg-white/20 text-white placeholder-white/60 ring-1 ring-white/30 focus:ring-white/70"
                                    : "bg-slate-100 text-slate-900 placeholder-slate-400 ring-1 ring-slate-200 focus:ring-primary"
                                )}
                                placeholder="Edit your message..."
                                autoFocus
                              />
                              <div className="flex items-center justify-between gap-2 pt-0.5">
                                <span className={cn(
                                  "text-[10px]",
                                  isMe ? "text-white/75" : "text-slate-400"
                                )}>
                                  Enter to save • Esc to cancel
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleCancelEdit}
                                    disabled={isSavingEdit}
                                    className={cn(
                                      "h-7 px-2.5 text-xs rounded-lg font-medium",
                                      isMe
                                        ? "text-white hover:text-white hover:bg-white/20"
                                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                    )}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleSaveEditMessage(msg.id)}
                                    disabled={isSavingEdit || !editingText.trim()}
                                    className={cn(
                                      "h-7 px-3 text-xs rounded-lg font-bold flex items-center gap-1 shadow-sm",
                                      isMe
                                        ? "bg-white text-primary hover:bg-slate-100"
                                        : "bg-primary text-white hover:bg-primary/90"
                                    )}
                                  >
                                    {isSavingEdit ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Check className="h-3 w-3" />
                                    )}
                                    <span>Save</span>
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            msg.text && !msg.meeting && (
                              <p className="text-sm font-medium leading-relaxed break-words whitespace-pre-wrap">{msg.text}</p>
                            )
                          )}
                        </div>

                        <div className={cn("flex items-center space-x-2", isMe ? "justify-end" : "justify-start")}>
                          {msg.edited && (
                            <span className="text-[10px] text-slate-400 italic font-medium">
                              (edited)
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-bold uppercase">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                          {isMe && msg.text && !msg.meeting && editingMessageId !== msg.id && (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(msg)}
                              className="text-slate-400 hover:text-primary transition-colors p-0.5 rounded opacity-75 hover:opacity-100"
                              title="Edit sent message"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            {/* Input Bar */}
            <div className="p-3 sm:p-4 bg-white border-t">
              {/* Selected File Preview Chip */}
              {selectedFile && (
                <div className="mb-2.5 p-2 sm:p-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-200 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {filePreviewUrl ? (
                      <img
                        src={filePreviewUrl}
                        alt="Preview"
                        className="w-10 h-10 object-cover rounded-lg ring-1 ring-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        {(() => {
                          const IconComp = getDocIcon(selectedFile.name);
                          return <IconComp className="h-5 w-5" />;
                        })()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900 truncate max-w-[180px] sm:max-w-xs md:max-w-md">
                          {selectedFile.name}
                        </p>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-white text-slate-600 font-semibold border-slate-200 shrink-0">
                          {formatFileSize(selectedFile.size)}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="h-3 w-3 inline" /> Ready to attach (Below 5 MB)
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveSelectedFile}
                    disabled={isUploading}
                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0"
                    title="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-2 sm:gap-3">
                {/* Hidden File Input strictly accepting images & documents */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Attach File Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className={cn(
                    "h-11 sm:h-14 w-11 sm:w-14 rounded-xl sm:rounded-2xl border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-primary transition-all shrink-0",
                    selectedFile && "border-primary/40 bg-primary/5 text-primary"
                  )}
                  title="Attach image or document (Max 5MB)"
                >
                  <Paperclip className="h-4 sm:h-5 w-4 sm:w-5" />
                </Button>

                {/* Schedule Google Meet button in input bar when inside a group */}
                {selectedGroup && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setIsScheduleMeetOpen(true)}
                    disabled={isUploading}
                    className="h-11 sm:h-14 w-11 sm:w-14 rounded-xl sm:rounded-2xl border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 text-emerald-600 hover:text-emerald-700 transition-all shrink-0"
                    title="Schedule a Google Meeting for this group"
                  >
                    <Video className="h-4 sm:h-5 w-4 sm:w-5" />
                  </Button>
                )}

                <div className="flex-1 relative min-w-0">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={
                      selectedFile
                        ? 'Add a caption (optional)...'
                        : selectedGroup
                          ? `Write to #${selectedGroup.name}...`
                          : `Write to ${selectedChat?.displayName || selectedChat?.email || 'User'}...`
                    }
                    disabled={isUploading}
                    className="h-11 sm:h-14 rounded-xl sm:rounded-2xl bg-slate-50 border-none px-4 sm:px-6 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium disabled:opacity-70"
                  />
                  <div className="hidden sm:flex absolute right-4 top-4 items-center space-x-2 text-slate-300">
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 hover:text-primary"><Clock className="h-4 w-4" /></Button>
                  </div>
                </div>

                {/* Send Button */}
                <Button
                  type="submit"
                  className="h-11 sm:h-14 w-11 sm:w-14 rounded-xl sm:rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center p-0 transition-transform hover:scale-105 active:scale-95 shrink-0"
                  disabled={(!newMessage.trim() && !selectedFile) || isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 sm:h-5 w-4 sm:w-5 animate-spin" />
                  ) : (
                    <Send className="h-4 sm:h-5 w-4 sm:w-5" />
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/30 p-12 text-center space-y-6">
            <div className="w-24 h-24 bg-white shadow-2xl rounded-xl flex items-center justify-center text-primary rotate-3">
              <MessageSquare className="h-10 w-10 -rotate-3" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900">Your Inbox</h2>
              <p className="text-slate-500 max-w-xs mx-auto font-medium leading-relaxed">
                Connect with mentors, staff, startups, and group channels. Select a conversation to start messaging or schedule Google Meetings.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                className="rounded-xl px-6 h-11 font-bold shadow-lg shadow-primary/20"
                onClick={() => searchInputRef.current?.focus()}
              >
                Find People
              </Button>
              {isSuperAdmin && (
                <Button
                  variant="outline"
                  className="rounded-xl px-6 h-11 font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  onClick={() => setIsCreateGroupOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Create Group
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SCHEDULE GOOGLE MEET DIALOG (Any member in group) */}
      {selectedGroup && (
        <Dialog open={isScheduleMeetOpen} onOpenChange={setIsScheduleMeetOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-6 rounded-2xl">
            <DialogHeader>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black text-slate-900">Schedule Google Meet</DialogTitle>
                  <p className="text-xs text-slate-500">
                    Host a Google Meeting for all {selectedGroup.members.length} members of <span className="font-semibold text-slate-800">#{selectedGroup.name}</span>
                  </p>
                </div>
              </div>
              <DialogDescription className="sr-only">
                Schedule a Google Meeting for this group channel.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 flex-1 overflow-y-auto pr-1">
              {/* Meeting Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Meeting Title / Topic <span className="text-rose-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Weekly Cohort Sync, Pitch Rehearsal"
                  value={meetTitle}
                  onChange={(e) => setMeetTitle(e.target.value)}
                  className="h-10 rounded-xl text-sm"
                />
              </div>

              {/* Date & Time Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">Date</label>
                  <Input
                    type="date"
                    value={meetDate}
                    onChange={(e) => setMeetDate(e.target.value)}
                    className="h-10 rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">Time</label>
                  <Input
                    type="time"
                    value={meetTime}
                    onChange={(e) => setMeetTime(e.target.value)}
                    className="h-10 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Duration selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: '15 min', val: '15' },
                    { label: '30 min', val: '30' },
                    { label: '45 min', val: '45' },
                    { label: '1 hour', val: '60' },
                  ].map((dur) => (
                    <button
                      key={dur.val}
                      type="button"
                      onClick={() => setMeetDuration(dur.val)}
                      className={cn(
                        "py-2 rounded-xl text-xs font-bold transition-all border",
                        meetDuration === dur.val
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      {dur.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Google Meet Link with real generation options */}
              <div className="space-y-2.5 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Video className="h-4 w-4 text-emerald-600" />
                    <span>Google Meet Room Link</span>
                    <span className="text-rose-500">*</span>
                  </label>
                </div>

                {/* Direct Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-0.5">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateViaGoogleMeetApi}
                    disabled={isGeneratingMeet}
                    className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm shadow-emerald-600/20"
                  >
                    {isGeneratingMeet ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    <span>Auto Create</span>
                  </Button>


                </div>

                <div className="relative pt-1">
                  <Input
                    placeholder="https://meet.google.com/xxx-yyyy-zzz"
                    value={meetLink}
                    onChange={(e) => setMeetLink(e.target.value)}
                    className="h-10 rounded-xl text-xs font-mono pr-20 bg-white border-emerald-200 focus:ring-emerald-500/20"
                  />

                </div>

              </div>

              {/* Description / Agenda */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Agenda / Notes <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <Input
                  placeholder="Key topics to discuss in this session..."
                  value={meetDescription}
                  onChange={(e) => setMeetDescription(e.target.value)}
                  className="h-10 rounded-xl text-sm"
                />
              </div>
            </div>

            <DialogFooter className="mt-4 pt-3 border-t flex flex-row items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsScheduleMeetOpen(false)}
                disabled={isSubmittingMeet}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleScheduleGoogleMeet}
                disabled={!meetTitle.trim() || isSubmittingMeet}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20"
              >
                {isSubmittingMeet ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Video className="h-3.5 w-3.5 mr-1.5" />
                    Schedule & Share in #{selectedGroup.name}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* CREATE GROUP DIALOG (Super Admin only) */}
      <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] flex flex-col p-6 rounded-2xl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
              <Users className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl font-black text-slate-900">Create Message Group</DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              As a Super Admin, create a collaborative channel for cohorts, mentors, or specific startup teams.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 flex-1 overflow-y-auto pr-1">
            {/* Group Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">
                Group Name <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="e.g. Winter Cohort 2026, DeepTech Mentors"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="h-10 rounded-xl text-sm"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">
                Description <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <Input
                placeholder="Brief description of the group's purpose"
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                className="h-10 rounded-xl text-sm"
              />
            </div>

            {/* Member Selection */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  Select Members
                </label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-700 border-indigo-200 font-bold">
                    {selectedMemberUids.length + 1} total (incl. you)
                  </Badge>
                  {selectedMemberUids.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedMemberUids([])}
                      className="text-[10px] text-slate-400 hover:text-rose-600 font-medium"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Role filter pills */}
              <div className="flex gap-1.5 text-xs">
                {(['all', 'user', 'mentor', 'admin'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setMemberRoleFilter(r)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors",
                      memberRoleFilter === r
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {r === 'all' ? 'All' : r === 'user' ? 'Founders' : r === 'mentor' ? 'Mentors' : 'Admins'}
                  </button>
                ))}
              </div>

              {/* Member Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Filter users by name or email..."
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  className="pl-8 h-9 rounded-xl text-xs bg-slate-50"
                />
              </div>

              {/* Quick Select Buttons */}
              <div className="flex justify-end gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    const toAdd = filteredUsersForModal.map(u => u.uid);
                    setSelectedMemberUids(prev => Array.from(new Set([...prev, ...toAdd])));
                  }}
                  className="text-primary hover:underline font-semibold"
                >
                  Select All Filtered ({filteredUsersForModal.length})
                </button>
              </div>

              {/* Users Checkbox List */}
              <ScrollArea className="h-48 border rounded-xl p-2 bg-slate-50/50">
                <div className="space-y-1">
                  {filteredUsersForModal.map((u) => {
                    const isSelected = selectedMemberUids.includes(u.uid);
                    return (
                      <div
                        key={u.uid}
                        onClick={() => {
                          setSelectedMemberUids(prev =>
                            isSelected ? prev.filter(id => id !== u.uid) : [...prev, u.uid]
                          );
                        }}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors",
                          isSelected ? "bg-indigo-50/80 ring-1 ring-indigo-200" : "hover:bg-slate-100"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => { }}
                            className="pointer-events-none"
                          />
                          <Avatar className="h-7 w-7 ring-1 ring-slate-200">
                            <AvatarImage src={u.photoURL} />
                            <AvatarFallback className="bg-primary text-white text-[10px] font-bold">
                              {(u.displayName || u.email || 'U')[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {u.displayName || u.email}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {u.email}
                            </p>
                          </div>
                        </div>
                        {getRoleBadge(u.role)}
                      </div>
                    );
                  })}
                  {filteredUsersForModal.length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      No matching users found
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="mt-4 pt-3 border-t flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateGroupOpen(false)}
              disabled={isCreatingGroup}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim() || selectedMemberUids.length === 0 || isCreatingGroup}
              className="rounded-xl bg-primary text-white font-bold text-xs shadow-md shadow-primary/20"
            >
              {isCreatingGroup ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Creating...
                </>
              ) : (
                `Create Group (${selectedMemberUids.length + 1} members)`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GROUP DETAILS DIALOG */}
      {selectedGroup && (
        <Dialog open={isGroupDetailsOpen} onOpenChange={setIsGroupDetailsOpen}>
          <DialogContent className="sm:max-w-[480px] max-h-[85vh] flex flex-col p-6 rounded-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white ring-2 ring-indigo-100 shrink-0">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-black text-slate-900">
                    {selectedGroup.name}
                  </DialogTitle>
                  <p className="text-xs text-slate-500">
                    Created by {selectedGroup.creatorName || 'Super Admin'} • {new Date(selectedGroup.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {selectedGroup.description && (
                <DialogDescription className="text-xs text-slate-600 mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  {selectedGroup.description}
                </DialogDescription>
              )}
            </DialogHeader>

            <div className="space-y-3 py-3 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Participants ({selectedGroup.members.length})
                </h4>
              </div>

              <ScrollArea className="h-56 pr-2">
                <div className="space-y-1.5">
                  {selectedGroup.members.map((memberId) => {
                    const isCreator = memberId === selectedGroup.createdBy;
                    const memberProfile = users.find(u => u.uid === memberId) ||
                      (user?.uid === memberId ? user : null);

                    const name = memberProfile?.displayName || memberProfile?.email || (isCreator ? selectedGroup.creatorName : 'User');
                    const role = memberProfile?.role || (isCreator ? 'super_admin' : 'user');

                    return (
                      <div
                        key={memberId}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="h-8 w-8 ring-1 ring-slate-200 shrink-0">
                            <AvatarImage src={memberProfile?.photoURL} />
                            <AvatarFallback className="bg-primary text-white text-[11px] font-bold">
                              {(name || 'U')[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                              <span>{name}</span>
                              {user?.uid === memberId && (
                                <span className="text-[10px] text-slate-400 font-normal">(You)</span>
                              )}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {memberProfile?.email || 'Participant'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isCreator && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[9px] px-1.5 py-0 h-4">
                              <Crown className="h-2.5 w-2.5 mr-0.5 inline" /> Creator
                            </Badge>
                          )}
                          {getRoleBadge(role)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            <DialogFooter className="mt-2 pt-3 border-t flex flex-row items-center justify-between">
              {isSuperAdmin ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleDeleteGroup(selectedGroup.id)}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Group
                </Button>
              ) : <div />}
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsGroupDetailsOpen(false)}
                className="rounded-xl text-xs"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest">Loading Secure Messenger...</div>}>
      <MessagesContent />
    </Suspense>
  );
}
