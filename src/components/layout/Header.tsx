'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { toast } from 'sonner';
import { 
  Bell, 
  Search, 
  ChevronDown,
  User as UserIcon,
  Settings,
  HelpCircle,
  LogOut
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import NotificationCenter from './NotificationCenter';
import { UserProfile } from '@/types';

interface HeaderProps {
  user: UserProfile;
}

export default function Header({ user }: HeaderProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success('Signed out successfully');
      router.push('/login');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            type="search"
            placeholder="Search applications, mentors..."
            className="pl-9 bg-slate-50 border-none ring-offset-0 focus-visible:ring-1 focus-visible:ring-primary w-full h-10 rounded-xl"
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <NotificationCenter />

        <DropdownMenu>
          <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost" }), "flex items-center space-x-2 px-2 hover:bg-slate-100 h-12 py-1.5 outline-none cursor-pointer rounded-xl transition-all")}>
            <Avatar className="h-8 w-8 ring-2 ring-slate-100">
              <AvatarImage src={user.photoURL} alt={user.displayName} />
              <AvatarFallback className="bg-primary text-white font-bold">{user.displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-bold leading-none text-slate-900">{user.displayName}</p>
              <p className="text-[10px] text-slate-500 mt-1 capitalize font-black tracking-widest uppercase">{user.role.replace('_', ' ')}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400 ml-1" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-2xl border-none ring-1 ring-slate-100 p-2">
            <DropdownMenuLabel className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1" />
            <Link href="/dashboard/settings">
              <DropdownMenuItem className="rounded-xl p-3 cursor-pointer group">
                <UserIcon className="mr-3 h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                <span className="font-bold text-sm">Profile</span>
              </DropdownMenuItem>
            </Link>
            <Link href="/dashboard/settings">
              <DropdownMenuItem className="rounded-xl p-3 cursor-pointer group">
                <Settings className="mr-3 h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                <span className="font-bold text-sm">Settings</span>
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem className="rounded-xl p-3 cursor-pointer group">
              <HelpCircle className="mr-3 h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
              <span className="font-bold text-sm">Support</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem 
              onClick={handleSignOut}
              className="rounded-xl p-3 cursor-pointer group text-rose-600 focus:text-rose-600 focus:bg-rose-50"
            >
              <LogOut className="mr-3 h-4 w-4 transition-transform group-hover:translate-x-1" />
              <span className="font-bold text-sm">Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
