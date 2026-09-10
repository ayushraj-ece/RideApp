'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, User, ArrowRight, LogIn, UserPlus, CheckSquare, Square, ShieldCheck } from 'lucide-react';

export default function CaptainLoginPage() {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
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

        // Check role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profile && profile.role !== 'CAPTAIN') {
          await supabase.auth.signOut();
          setError('This account is registered as a Customer. Please use Customer Login.');
          setLoading(false);
          return;
        }

        router.push('/captain');
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
            role: 'CAPTAIN',
            name: name.trim() || email.split('@')[0],
          });

          if (profileError) console.error('Error creating profile:', profileError);

          // Insert captain row
          await supabase.from('captains').upsert({
            id: signUpData.user.id,
            vehicle_type: 'BIKE',
            is_online: false,
          });

          router.push('/captain');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your details.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between items-center p-4 sm:p-6 font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Header Bar */}
      <header className="w-full max-w-md pt-4 pb-2 flex items-center justify-between relative">
        <button
          onClick={() => router.push('/')}
          className="h-10 w-10 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:bg-slate-50 flex items-center justify-center text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 stroke-[2.5]" />
        </button>

        <div className="inline-flex items-center gap-0.5 mx-auto -ml-10">
          <span className="text-2xl font-black tracking-tighter text-slate-900">
            RIDE
          </span>
          <span className="text-2xl font-black tracking-tighter text-amber-500">
            ON
          </span>
        </div>
      </header>

      {/* Main Rido Card Container */}
      <main className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 my-auto space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-6 w-6 text-amber-500" />
            {mode === 'LOGIN' ? 'Captain Partner 👋' : 'Drive With RIDEON 🚀'}
          </h1>
          <p className="text-xs font-semibold text-slate-500">
            {mode === 'LOGIN'
              ? 'Enter your credentials to access your driver partner portal.'
              : 'Sign up to start driving & earning on your schedule.'}
          </p>
        </div>

        {/* Auth Mode Switcher Segmented Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => { setMode('LOGIN'); setError(''); }}
            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
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
            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
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
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">Captain Full Name</label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required={mode === 'REGISTER'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Captain Name"
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-400/20 transition-all outline-none"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">Captain Email</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="captain@example.com"
                className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-400/20 transition-all outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">Password</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-10 pr-10 py-3 text-xs font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-400/20 transition-all outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Checkbox & Forgot Password Row */}
          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              onClick={() => setRememberMe(!rememberMe)}
              className="flex items-center gap-1.5 text-slate-600 font-semibold select-none"
            >
              {rememberMe ? (
                <CheckSquare className="h-4 w-4 text-amber-500" />
              ) : (
                <Square className="h-4 w-4 text-slate-300" />
              )}
              <span>Remember me</span>
            </button>

            {mode === 'LOGIN' && (
              <button
                type="button"
                onClick={() => setError('Password reset instructions sent to your email.')}
                className="font-bold text-slate-700 hover:text-slate-900"
              >
                Forgot Password?
              </button>
            )}
          </div>

          {/* Prominent Solid Dark Slate Submit Button for Captain */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm tracking-wide shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Processing...</span>
              ) : (
                <>
                  <span className="text-amber-400">{mode === 'LOGIN' ? 'LOG IN AS CAPTAIN' : 'CREATE CAPTAIN ACCOUNT'}</span>
                  <ArrowRight className="h-4 w-4 stroke-[3] text-amber-400" />
                </>
              )}
            </button>
          </div>
        </form>
      </main>

      {/* Switch Portal Footer */}
      <footer className="py-3 text-center text-xs font-bold text-slate-400">
        <Link href="/customer/login" className="hover:text-slate-700">
          Customer? Switch to Rider Login →
        </Link>
      </footer>
    </div>
  );
}





