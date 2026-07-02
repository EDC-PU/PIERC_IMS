'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useAuthStore } from '@/store/authStore';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, limit, addDoc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
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
  CheckCircle2
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { UserProfile } from '@/types';

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-select chat if targetUserId is provided
  useEffect(() => {
    if (targetUserId && users.length > 0) {
      const targetUser = users.find(u => u.uid === targetUserId);
      if (targetUser) {
        setSelectedChat(targetUser);
      }
    }
  }, [targetUserId, users]);

  // Load all users
  useEffect(() => {
    const usersCol = collection(db, 'users');
    return onSnapshot(usersCol, (snapshot) => {
      const userList = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as UserProfile[];
      setUsers(userList.filter(u => u.uid !== user?.uid));
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
          lastMsg = msg.text;
          ts = msg.timestamp;
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedChat || !newMessage.trim()) return;

    const chatId = [user.uid, selectedChat.uid].sort().join('_');
    const messagesCol = collection(db, 'messages', chatId, 'messages');

    await addDoc(messagesCol, {
      senderId: user.uid,
      text: newMessage,
      timestamp: Date.now(),
    });

    setNewMessage('');
  };

  const filteredChats = chats.filter(c => 
    (c.otherUser.displayName || c.otherUser.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-12rem)] overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 animate-in fade-in zoom-in-95 duration-500">
      {/* Sidebar */}
      <div className="w-full md:w-80 flex flex-col border-r bg-slate-50/50 backdrop-blur-xl">
        <div className="p-6 space-y-4">
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
                className={`w-full flex items-center p-4 rounded-2xl transition-all duration-300 group ${
                  selectedChat?.uid === chat.otherUser.uid 
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
      <div className="hidden md:flex flex-1 flex-col bg-white">
        {selectedChat ? (
          <>
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center">
                <Avatar className="h-10 w-10 ring-2 ring-primary/10">
                  <AvatarImage src={selectedChat.photoURL} />
                  <AvatarFallback className="bg-primary text-white font-bold">{(selectedChat.displayName || selectedChat.email || 'U')[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="ml-4">
                  <h2 className="font-black text-slate-900 text-sm">{selectedChat.displayName || selectedChat.email || 'User'}</h2>
                  <div className="flex items-center text-[10px] text-emerald-500 font-black uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></div>
                    Online Now
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-primary rounded-xl"><Phone className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-primary rounded-xl"><Video className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-primary rounded-xl"><Info className="h-4 w-4" /></Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-6 bg-slate-50/30">
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
                {messages.map((msg, idx) => (
                  <div 
                    key={msg.id} 
                    className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className={`max-w-[70%] space-y-1`}>
                      <div className={`p-4 rounded-2xl shadow-sm ${
                        msg.senderId === user?.uid 
                        ? 'bg-primary text-white rounded-tr-none' 
                        : 'bg-white text-slate-800 rounded-tl-none ring-1 ring-slate-100'
                      }`}>
                        <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                      </div>
                      <div className={`flex items-center space-x-2 ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {msg.senderId === user?.uid && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-6 bg-white border-t">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                <div className="flex-1 relative">
                  <Input 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Write to ${selectedChat.displayName || selectedChat.email || 'User'}...`} 
                    className="h-14 rounded-2xl bg-slate-50 border-none px-6 focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                  />
                  <div className="absolute right-4 top-4 flex items-center space-x-2 text-slate-300">
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 hover:text-primary"><Clock className="h-4 w-4" /></Button>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="h-14 w-14 rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center p-0 transition-transform hover:scale-105 active:scale-95"
                  disabled={!newMessage.trim()}
                >
                  <Send className="h-5 w-5" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/30 p-12 text-center space-y-6">
            <div className="w-24 h-24 bg-white shadow-2xl rounded-[2.5rem] flex items-center justify-center text-primary rotate-3">
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
