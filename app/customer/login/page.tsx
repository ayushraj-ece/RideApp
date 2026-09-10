'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, ArrowRight, UserPlus, LogIn } from 'lucide-react';

export default function CustomerLoginPage() {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'LOGIN') {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;

        // Verify role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profile && profile.role !== 'CUSTOMER') {
          await supabase.auth.signOut();
          setError('This account is registered as a Captain. Please use Captain Login.');
          setLoading(false);
          return;
        }

        router.push('/customer');
      } else {
        // Register Mode
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
            name: name.trim() || email.split('@')[0],
          });

          if (profileError) console.error('Error creating profile:', profileError);
          router.push('/customer');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Top Header Banner (Minimalist) */}
      <div className="bg-amber-400 px-5 pt-6 pb-8 text-slate-950">
        <button
          onClick={() => router.push('/')}
          className="h-10 w-10 rounded-full bg-slate-950/10 hover:bg-slate-950/20 flex items-center justify-center transition-colors mb-6"
        >
          <ArrowLeft className="h-5 w-5 stroke-[2.5]" />
        </button>

        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {mode === 'LOGIN' ? 'Customer Log In' : 'Create Customer Account'}
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-900/90">
            {mode === 'LOGIN'
              ? 'Enter your credentials to access your rider portal.'
              : 'Sign up with your email to start booking rides instantly.'}
          </p>
        </div>
      </div>

      {/* Main Content Body */}
      <main className="flex-1 bg-white -mt-3 rounded-t-3xl p-6 sm:p-8 flex flex-col justify-between max-w-md mx-auto w-full shadow-lg">
        <div className="space-y-6">
          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => { setMode('LOGIN'); setError(''); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                mode === 'LOGIN'
                  ? 'bg-slate-950 text-amber-400 shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Log In</span>
            </button>
            <button
              type="button"
              onClick={() => { setMode('REGISTER'); setError(''); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                mode === 'REGISTER'
                  ? 'bg-slate-950 text-amber-400 shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Create Account</span>
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'REGISTER' && (
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Full Name</label>
                <div className="border-b-2 border-slate-200 focus-within:border-amber-500 py-1.5 flex items-center">
                  <input
                    type="text"
                    required={mode === 'REGISTER'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-transparent text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Email Address</label>
              <div className="border-b-2 border-slate-200 focus-within:border-amber-500 py-1.5 flex items-center">
                <Mail className="h-5 w-5 text-slate-400 mr-3 shrink-0" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rider@example.com"
                  className="w-full bg-transparent text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Password</label>
              <div className="border-b-2 border-slate-200 focus-within:border-amber-500 py-1.5 flex items-center">
                <Lock className="h-5 w-5 text-slate-400 mr-3 shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none"
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

            {/* Prominent Full-Width Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 rounded-2xl bg-slate-950 text-amber-400 font-black text-sm tracking-wide shadow-xl hover:bg-slate-900 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <span>{mode === 'LOGIN' ? 'LOG IN TO RIDER PORTAL' : 'CREATE ACCOUNT'}</span>
                    <ArrowRight className="h-4 w-4 stroke-[3]" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer Link */}
        <div className="mt-8 pt-4 border-t border-slate-100 text-center">
          <Link href="/captain/login" className="text-xs font-bold text-slate-500 hover:text-slate-900">
            Are you a Captain? Switch to Captain Login →
          </Link>
        </div>
      </main>
    </div>
  );
}


