'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Activity, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loadingAction, setLoadingAction] = useState<'signin' | 'signup' | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction('signin');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
      setLoadingAction(null);
      return;
    }

    router.push('/dashboard/overview');
    router.refresh();
  };

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      toast({
        title: 'Sign up failed',
        description: 'Password and confirmation password do not match.',
        variant: 'destructive',
      });
      return;
    }

    setLoadingAction('signup');

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard/overview`,
      },
    });

    if (error) {
      toast({ title: 'Sign up failed', description: error.message, variant: 'destructive' });
      setLoadingAction(null);
      return;
    }

    if (data.session) {
      toast({ title: 'Account created', description: 'Welcome to the dashboard.' });
      router.push('/dashboard/overview');
      router.refresh();
      return;
    }

    toast({
      title: 'Account created',
      description: 'Check your email to confirm your account, then sign in.',
    });
    setLoadingAction(null);
  };

  const isLoading = loadingAction !== null;
  const isSignIn = mode === 'signin';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#00016B] via-[#102384] to-[#12306E] p-4 sm:p-6">
      <Card className="w-full max-w-md border-white/20 bg-white/95 shadow-2xl backdrop-blur-sm">
        <CardHeader className="space-y-4 pb-2 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#26A69A] shadow-lg shadow-[#26A69A]/30">
            <Activity className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-2xl tracking-tight">{isSignIn ? 'Welcome Back' : 'Create Your Account'}</CardTitle>
          <CardDescription className="text-sm text-slate-600">
            {isSignIn
              ? 'Sign in to access the malaria surveillance dashboard'
              : 'Create a new account to access the malaria surveillance dashboard'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          <form
            onSubmit={
              isSignIn
                ? handleSignIn
                : (e) => {
                    e.preventDefault();
                    handleSignUp();
                  }
            }
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-slate-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 border-slate-200 focus-visible:ring-[#26A69A]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-slate-700">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 border-slate-200 focus-visible:ring-[#26A69A]"
              />
            </div>

            {!isSignIn ? (
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm text-slate-700">
                  Confirm Password
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required={!isSignIn}
                  className="h-11 border-slate-200 focus-visible:ring-[#26A69A]"
                />
              </div>
            ) : null}

            <Button type="submit" className="h-11 w-full bg-[#26A69A] text-white hover:bg-[#1f8f84]" disabled={isLoading}>
              {loadingAction === mode ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSignIn ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-600">
            {isSignIn ? "Don't have an account?" : 'Already have an account?'}{' '}
            <Button
              type="button"
              variant="link"
              className="h-auto px-0 text-[#0b7d73]"
              onClick={() => setMode(isSignIn ? 'signup' : 'signin')}
              disabled={isLoading}
            >
              {isSignIn ? 'Sign up' : 'Sign in'}
            </Button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
