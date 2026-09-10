'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, ChevronRight, HelpCircle, MessageSquare } from 'lucide-react';

export default function CustomerLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Try Signing In
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!signInError && signInData.user) {
        // Verify role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', signInData.user.id)
          .single();

        if (profile && profile.role !== 'CUSTOMER') {
          await supabase.auth.signOut();
          setError('This account is registered as a Captain. Please use Captain Login.');
          setLoading(false);
          return;
        }

        router.push('/customer');
        return;
      }

      // 2. If Sign In failed because user account does not exist, attempt automatic Registration
      if (signInError && (signInError.message.includes('Invalid login credentials') || signInError.message.includes('User not found'))) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        if (signUpData.user) {
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: signUpData.user.id,
            email,
            role: 'CUSTOMER',
            name: email.split('@')[0],
          });

          if (profileError) console.error('Error creating profile:', profileError);
          router.push('/customer');
          return;
        }
      }

      if (signInError) throw signInError;
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Check your details.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Top Header Banner (Image 2 Style) */}
      <div className="bg-amber-400 px-5 pt-6 pb-10 text-slate-950 relative">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push('/')}
            className="h-10 w-10 rounded-full bg-slate-950/10 hover:bg-slate-950/20 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="h-5 w-5 stroke-[2.5]" />
          </button>
          <span className="text-sm font-bold tracking-tight">Rider Auth</span>
          <div className="bg-slate-950 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
            <MessageSquare className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span>Chat with Us</span>
          </div>
        </div>

        {/* Section Heading */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Login / Register</h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-900/90 max-w-xs">
            Enter email and password, we shall create an account if needed.
          </p>
        </div>
      </div>

      {/* Main Content Body (White Sheet resting cleanly below header) */}
      <main className="flex-1 bg-white -mt-4 rounded-t-3xl p-6 sm:p-8 flex flex-col justify-between max-w-md mx-auto w-full shadow-lg relative">
        <form onSubmit={handleAuthSubmit} className="space-y-6 pt-2">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600 text-center">
              {error}
            </div>
          )}

          {/* Email Address Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
            <div className="relative border-b-2 border-slate-200 focus-within:border-amber-500 transition-colors py-1 flex items-center">
              <Mail className="h-5 w-5 text-slate-400 mr-3 shrink-0" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rider@example.com"
                className="w-full bg-transparent text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none py-1"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
            <div className="relative border-b-2 border-amber-500 py-1 flex items-center">
              <Lock className="h-5 w-5 text-slate-400 mr-3 shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none py-1"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Disclaimer Text */}
          <p className="text-[11px] font-medium text-slate-400 text-center leading-relaxed px-2">
            By accepting to create account, you Accept <span className="underline font-semibold">Terms and conditions</span> and <span className="underline font-semibold">Privacy policy</span> of Rideon.
          </p>

          {/* Action Links & Submit Button (Image 2 style floating circle arrow) */}
          <div className="pt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setError('Password reset instructions sent to your email if registered.')}
              className="text-xs font-black tracking-wider text-slate-900 hover:underline uppercase"
            >
              Forgot your password?
            </button>

            {/* Circular Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="h-14 w-14 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center shadow-xl hover:bg-slate-900 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <ChevronRight className="h-6 w-6 stroke-[3]" />
              )}
            </button>
          </div>
        </form>

        {/* Footer Link */}
        <div className="mt-8 pt-4 border-t border-slate-100 text-center">
          <Link href="/captain/login" className="text-xs font-bold text-slate-500 hover:text-slate-900">
            Are you a Captain? Login to Captain Portal →
          </Link>
        </div>
      </main>
    </div>
  );
}

