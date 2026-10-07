'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useAuthStore } from '@/store/authStore';
import { db, storage } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, limit, addDoc, where, getDocs, doc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { triggerEmailNotification } from '@/lib/email-client';
import { getEmailHtmlTemplate } from '@/lib/email-templates';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
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
  Loader2
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

interface Message {
  id: string;
  senderId: string;
  text?: string;
  timestamp: number;
  attachment?: MessageAttachment;
}

interface ChatPreview {
  id: string;
  otherUser: UserProfile;
  lastMessage: string;
  timestamp: number;
  unread: boolean;
}

function MessagesContent() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get('userId');

  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [selectedChat, setSelectedChat] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);

  // File attachment state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-select chat if targetUserId is provided
  useEffect(() => {
    if (targetUserId && users.length > 0) {
      const targetUser = users.find(u => u.uid === targetUserId);
      if (targetUser) {
        setSelectedChat(targetUser);
      }
    }
  }, [targetUserId, users]);

  // Clean up attachment when chat selection changes
  useEffect(() => {
    handleRemoveSelectedFile();
  }, [selectedChat]);

  // Load all users
  useEffect(() => {
    if (!user) return;

    let usersQuery;
    if (user.role === 'admin' || user.role === 'super_admin' || user.role === 'mentor') {
      // Admins and mentors can load all users
      usersQuery = collection(db, 'users');
    } else {
      // Standard users can only load admins, super_admins, and mentors (to respect firestore read rules)
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

  // Load chat previews with real-time last messages
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
          if (msg.text) {
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

  // Load messages for selected chat
  useEffect(() => {
    if (!user || !selectedChat) return;
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
    });
  }, [selectedChat, user]);

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedChat || isUploading) return;
    if (!newMessage.trim() && !selectedFile) return;

    const messageText = newMessage.trim();
    const fileToUpload = selectedFile;

    setIsUploading(true);
    setNewMessage('');
    handleRemoveSelectedFile();

    const chatId = [user.uid, selectedChat.uid].sort().join('_');
    const messagesCol = collection(db, 'messages', chatId, 'messages');

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

      // 1. Check if we should notify by email (not a live, continuous chat)
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

      // 2. Add message to Firestore
      const messageDocData: any = {
        senderId: user.uid,
        timestamp: Date.now(),
      };
      if (messageText) {
        messageDocData.text = messageText;
      }
      if (attachmentData) {
        messageDocData.attachment = attachmentData;
      }

      await addDoc(messagesCol, messageDocData);

      // 3. Dispatch email if not a continuous chat
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
                You have received a new message from <strong>${senderName}</strong> on the PIERC Portal:
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
    } catch (error: any) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message', {
        description: error?.message || 'Please check your connection and try again.'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getDocIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) return FileSpreadsheet;
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) return FileArchive;
    return FileText;
  };

  const filteredChats = chats.filter(c =>
    (c.otherUser.displayName || c.otherUser.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-8.5rem)] sm:h-[calc(100vh-10rem)] md:h-[calc(100vh-12rem)] overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 animate-in fade-in zoom-in-95 duration-500">
      {/* Sidebar */}
      <div className={cn(
        "w-full md:w-80 flex-col border-r bg-slate-50/50 backdrop-blur-xl shrink-0",
        selectedChat ? "hidden md:flex" : "flex"
      )}>
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Messages</h1>
            <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm ring-1 ring-slate-100">
              <MessageSquare className="h-4 w-4 text-primary" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              ref={searchInputRef}
              placeholder="Search chats..."
              className="pl-10 h-11 rounded-2xl bg-white border-none shadow-sm ring-1 ring-slate-100 focus:ring-2 focus:ring-primary/20 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-3 pb-6 space-y-1">
            {filteredChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChat(chat.otherUser)}
                className={`w-full flex items-center p-4 rounded-2xl transition-all duration-300 group ${selectedChat?.uid === chat.otherUser.uid
                    ? 'bg-white shadow-md ring-1 ring-slate-100'
                    : 'hover:bg-white/60'
                  }`}
              >
                <div className="relative">
                  <Avatar className="h-12 w-12 ring-2 ring-white">
                    <AvatarImage src={chat.otherUser.photoURL} />
                    <AvatarFallback className="bg-primary text-white font-bold">{(chat.otherUser.displayName || chat.otherUser.email || 'U')[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                </div>
                <div className="ml-4 flex-1 text-left min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className="font-bold text-slate-900 truncate text-sm">{chat.otherUser.displayName || chat.otherUser.email || 'User'}</h3>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate font-medium">
                    {chat.lastMessage}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className={cn(
        "flex-1 flex-col bg-white min-w-0",
        selectedChat ? "flex" : "hidden md:flex"
      )}>
        {selectedChat ? (
          <>
            {/* Header */}
            <div className="p-3 sm:p-4 border-b flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedChat(null)}
                  className="md:hidden mr-2 -ml-1 rounded-xl text-slate-500 hover:bg-slate-100 shrink-0"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-9 sm:h-10 w-9 sm:w-10 ring-2 ring-primary/10 shrink-0">
                  <AvatarImage src={selectedChat.photoURL} />
                  <AvatarFallback className="bg-primary text-white font-bold">{(selectedChat.displayName || selectedChat.email || 'U')[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="ml-3 sm:ml-4 min-w-0">
                  <h2 className="font-black text-slate-900 text-sm truncate">{selectedChat.displayName || selectedChat.email || 'User'}</h2>
                  <div className="flex items-center text-[10px] text-emerald-500 font-black uppercase tracking-widest">
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1 shrink-0">
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-primary rounded-xl"><Phone className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-primary rounded-xl"><Video className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-primary rounded-xl"><Info className="h-4 w-4" /></Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 sm:p-6 bg-slate-50/30">
              <div className="space-y-6">
                <div className="flex justify-center">
                  <Badge variant="secondary" className="bg-white/80 backdrop-blur-sm text-slate-400 text-[10px] px-4 py-1 border-none shadow-sm font-bold uppercase tracking-widest">
                    Today
                  </Badge>
                </div>
                {messages.length === 0 && (
                  <div className="text-center py-20 space-y-4">
                    <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto">
                      <Hash className="h-8 w-8 text-primary/30" />
                    </div>
                    <p className="text-slate-400 text-sm font-medium">Start your conversation with {selectedChat.displayName || selectedChat.email || 'User'}</p>
                  </div>
                )}
                {messages.map((msg, idx) => {
                  const isMe = msg.senderId === user?.uid;
                  const DocIcon = msg.attachment?.name ? getDocIcon(msg.attachment.name) : FileText;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="max-w-[85%] sm:max-w-[70%] space-y-1">
                        <div className={cn(
                          "p-3.5 sm:p-4 rounded-2xl shadow-sm space-y-2",
                          isMe
                            ? "bg-primary text-white rounded-tr-none"
                            : "bg-white text-slate-800 rounded-tl-none ring-1 ring-slate-100"
                        )}>
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

                          {/* Message Text */}
                          {msg.text && (
                            <p className="text-sm font-medium leading-relaxed break-words">{msg.text}</p>
                          )}
                        </div>

                        <div className={`flex items-center space-x-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
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

                <div className="flex-1 relative min-w-0">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={
                      selectedFile
                        ? 'Add a caption (optional)...'
                        : `Write to ${selectedChat.displayName || selectedChat.email || 'User'}...`
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
                Connect with mentors, staff, and other startups. Select a conversation to start messaging.
              </p>
            </div>
            <Button
              className="rounded-xl px-8 h-12 font-bold shadow-lg shadow-primary/20"
              onClick={() => searchInputRef.current?.focus()}
            >
              Find People
            </Button>
          </div>
        )}
      </div>
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

