'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Notification } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { 
  Bell, 
  Info, 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  Clock
} from 'lucide-react';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

import Link from 'next/link';

export default function NotificationCenter() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const notifRef = ref(db, `notifications/${user.uid}`);
    const unsubscribe = onValue(notifRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.values(data) as Notification[];
        const sorted = list.sort((a, b) => b.timestamp - a.timestamp);
        setNotifications(sorted);
        setUnreadCount(sorted.filter(n => !n.read).length);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const markAllAsRead = async () => {
    if (!user) return;
    const updates: any = {};
    notifications.forEach(n => {
      if (!n.read) {
        updates[`notifications/${user.uid}/${n.id}/read`] = true;
      }
    });
    await update(ref(db), updates);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-rose-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <Popover onOpenChange={(open) => open && unreadCount > 0 && markAllAsRead()}>
      <PopoverTrigger className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors outline-none cursor-pointer">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-bold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
              {unreadCount} NEW
            </span>
          )}
        </div>
        <ScrollArea className="h-[350px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`p-4 hover:bg-slate-50 transition-colors ${!n.read ? 'bg-primary/5' : ''}`}
                >
                  <div className="flex gap-3">
                    <div className="mt-0.5">{getIcon(n.type)}</div>
                    <div className="flex-1 space-y-1">
                      <p className={`text-sm leading-tight ${!n.read ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-500 line-clamp-2">{n.message}</p>
                      <div className="flex items-center text-[10px] text-slate-400 pt-1">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDistanceToNow(n.timestamp)} ago
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="p-2 border-t text-center">
          <Link href="/dashboard/notifications" className="block">
            <Button variant="ghost" size="sm" className="w-full text-xs text-slate-500">
              View All Notifications
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
