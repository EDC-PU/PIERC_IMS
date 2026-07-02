'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { LogIn, Rocket } from 'lucide-react';

export default function LoginPage() {
  const { user, loading: authLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  if (authLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Logged in successfully');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userDocRef = doc(db, 'users', user.uid);
      const snapshot = await getDoc(userDocRef);
      
      if (!snapshot.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'User',
          photoURL: user.photoURL || '',
          role: 'user',
          onboardingCompleted: false,
          createdAt: Date.now(),
        });
      }
      
      toast.success('Logged in with Google');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/50 p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-page-entry" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-rose-200/20 rounded-full blur-[150px] animate-page-entry" />
      </div>

      <Card className="w-full max-w-md shadow-2xl border-none glass-card animate-page-entry">
        <CardHeader className="space-y-4 text-center pb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
            <Rocket className="text-white h-8 w-8" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-black tracking-tight">Welcome Back</CardTitle>
            <CardDescription className="text-slate-500 font-medium">
              Login to your PIERC account
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6">
          <Button 
            variant="outline" 
            className="w-full h-12 rounded-xl font-bold border-2 flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white/50 px-2 text-slate-400 font-bold tracking-widest backdrop-blur-sm">Or continue with</span>
            </div>
          </div>

          <form onSubmit={handleEmailLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-500">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="m@example.com" 
                className="h-12 rounded-xl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-500">Password</Label>
                <Button variant="link" className="p-0 h-auto text-xs font-bold text-primary" onClick={() => router.push('/forgot-password')}>
                  Forgot password?
                </Button>
              </div>
              <Input 
                id="password" 
                type="password" 
                className="h-12 rounded-xl"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
            <Button type="submit" className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20 mt-2" disabled={loading}>
              {loading ? 'Processing...' : <><LogIn className="mr-2 h-4 w-4" /> Login</>}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <div className="text-sm font-medium text-slate-500 text-center w-full">
            Don't have an account?{' '}
            <Button variant="link" className="p-0 h-auto font-bold text-primary hover:text-primary/80" onClick={() => router.push('/register')}>
              Sign up
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
