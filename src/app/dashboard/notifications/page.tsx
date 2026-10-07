'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, writeBatch, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Notification } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Info, 
  Clock, 
  Trash2,
  Check
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { RichEmptyState } from '@/components/ui/empty-state';

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const notifCol = collection(db, 'notifications', user.uid, 'items');
    const notifQuery = query(notifCol, orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(notifQuery, (snapshot) => {
      setNotifications(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Notification[]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (id: string) => {
    if (!user) return;
    await updateDoc(doc(db, 'notifications', user.uid, 'items', id), { read: true });
  };

  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;
    const batch = writeBatch(db);
    notifications.filter(n => !n.read).forEach(n => {
      batch.update(doc(db, 'notifications', user.uid, 'items', n.id), { read: true });
    });
    await batch.commit();
  };

  const deleteNotification = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'notifications', user.uid, 'items', id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'warning': return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case 'error': return <XCircle className="h-5 w-5 text-rose-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  if (loading) return (
    <div className="max-w-[1000px] mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div className="space-y-2">
          <Skeleton className="h-4 w-36 rounded-md" />
          <Skeleton className="h-9 w-60 rounded-xl" />
          <Skeleton className="h-4 w-80 rounded-md" />
        </div>
        <Skeleton className="h-11 w-32 rounded-xl" />
      </div>

      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-6 rounded-2xl bg-white border border-slate-100 shadow-xs flex gap-4">
            <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-48 rounded-md" />
                <Skeleton className="h-3 w-20 rounded-md" />
              </div>
              <Skeleton className="h-3.5 w-full rounded-md" />
              <Skeleton className="h-3.5 w-2/3 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-[1000px] mx-auto animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6 mb-8 sm:mb-10">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-primary mb-2">
            <Bell className="h-4 w-4" />
            <span>Communication Center</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-slate-900">Your Notifications</h1>
          <p className="text-slate-500 font-medium mt-1">Stay updated with your innovation pipeline and programme milestones.</p>
        </div>
        
        {notifications.some(n => !n.read) && (
          <Button 
            onClick={markAllAsRead}
            variant="outline"
            className="w-full sm:w-auto rounded-xl font-bold border-primary/10 text-primary hover:bg-primary hover:text-white transition-all text-xs sm:text-sm"
          >
            <Check className="mr-2 h-4 w-4" /> Mark all as read
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <RichEmptyState
            icon={<Bell className="h-8 w-8 text-primary" />}
            badge="All Caught Up"
            title="No unread notifications"
            description="You are completely up to date. Application status alerts, meeting invites, and evaluation requests will appear here in real-time."
            className="my-6"
          />
        ) : (
          notifications.map((n) => (
            <Card 
              key={n.id} 
              className={cn(
                "group border-none shadow-sm ring-1 transition-all duration-300 rounded-2xl overflow-hidden cursor-pointer",
                !n.read ? "ring-primary/20 bg-primary/[0.02]" : "ring-slate-100 hover:ring-slate-200"
              )}
              onClick={() => !n.read && markAsRead(n.id)}
            >
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <div className="mt-1">{getIcon(n.type)}</div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start">
                      <h4 className={cn(
                        "text-base leading-tight",
                        !n.read ? "font-black text-slate-900" : "font-bold text-slate-600"
                      )}>
                        {n.title}
                      </h4>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                        {formatDistanceToNow(n.timestamp)} ago
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">{n.message}</p>
                    
                    {n.link && (
                      <div className="pt-3">
                        <Link 
                          href={n.link}
                          className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                        >
                          View Details &rarr;
                        </Link>
                      </div>
                    )}
                  </div>
                  {!n.read && (
                    <div className="h-2 w-2 bg-primary rounded-full self-center"></div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
