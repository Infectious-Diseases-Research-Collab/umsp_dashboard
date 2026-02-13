'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Activity, Loader2, ShieldCheck, BarChart3, Map } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_22px_60px_rgba(30,41,59,0.18)] lg:grid-cols-2">
        <section className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-sky-700 via-cyan-700 to-teal-700 p-10 text-white">
          <div>
            <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <Activity className="h-7 w-7" />
            </div>
            <h1 className="text-4xl font-semibold leading-tight">UMSP Surveillance Dashboard</h1>
            <p className="mt-4 max-w-md text-white/85">
              Explore trends, geospatial patterns, and surveillance quality metrics from one operational workspace.
            </p>
          </div>

          <div className="space-y-3 text-sm text-white/90">
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Secure authenticated access</div>
            <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Temporal and indicator analytics</div>
            <div className="flex items-center gap-2"><Map className="h-4 w-4" /> Interactive site-level mapping</div>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10">
          <Card className="w-full max-w-md border-0 bg-transparent shadow-none">
            <CardHeader className="px-0 text-left">
              <CardTitle className="text-3xl text-slate-900">{isSignIn ? 'Sign in' : 'Create account'}</CardTitle>
              <CardDescription className="text-slate-600">
                {isSignIn
                  ? 'Use your credentials to access the dashboard.'
                  : 'Create your credentials to access the dashboard.'}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 px-0">
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
                  <Label htmlFor="email" className="text-slate-700">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 bg-white" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700">Password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11 bg-white" />
                </div>

                {!isSignIn ? (
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-slate-700">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="h-11 bg-white"
                    />
                  </div>
                ) : null}

                <Button type="submit" className="h-11 w-full" disabled={isLoading}>
                  {loadingAction === mode ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isSignIn ? 'Sign In' : 'Create Account'}
                </Button>
              </form>

              <p className="text-center text-sm text-slate-600">
                {isSignIn ? "Don't have an account?" : 'Already have an account?'}{' '}
                <Button
                  type="button"
                  variant="link"
                  className="h-auto px-0"
                  onClick={() => setMode(isSignIn ? 'signup' : 'signin')}
                  disabled={isLoading}
                >
                  {isSignIn ? 'Sign up' : 'Sign in'}
                </Button>
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
