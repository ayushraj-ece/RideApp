'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, User, CheckSquare, Square } from 'lucide-react';

export default function CustomerLoginPage() {
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
      setError(err.message || 'Authentication failed. Please check your details.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col justify-between items-center p-4 sm:p-6 font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Top Header Logo & Back Arrow (GoCab Template) */}
      <header className="w-full max-w-md pt-4 pb-2 flex items-center justify-between relative">
        <button
          onClick={() => router.push('/')}
          className="h-10 w-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-800 hover:bg-slate-50 transition-colors"
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

      {/* Main GoCab Card Template Container */}
      <main className="max-w-md w-full bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200/80 my-auto space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {mode === 'LOGIN' ? 'Welcome to RIDEON login now!' : 'Create an Account?'}
          </h1>
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">
            Customer / Rider Portal
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'REGISTER' && (
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500">Full Name</label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required={mode === 'REGISTER'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Michael Brooks"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-500">Email</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mica.brooks@gmail.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-500">Password</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password#$"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-10 py-3 text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
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

          {/* Checkbox and Forgot Password Row */}
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
                onClick={() => setError('Password reset link sent if account exists.')}
                className="font-bold text-slate-700 hover:text-slate-900"
              >
                Forget Password?
              </button>
            )}
          </div>

          {/* Full-Width Bright Yellow Pill Button (GoCab Style) */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm tracking-wide shadow-sm hover:shadow transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? 'Processing...' : mode === 'LOGIN' ? 'Login' : 'Sign Up'}
            </button>
          </div>
        </form>

        {/* Toggle Login / Register Option (GoCab Style) */}
        <div className="text-center text-xs font-semibold text-slate-500 pt-2">
          {mode === 'LOGIN' ? (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('REGISTER'); setError(''); }}
                className="font-bold text-slate-900 hover:underline"
              >
                Create an account
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('LOGIN'); setError(''); }}
                className="font-bold text-slate-900 hover:underline"
              >
                Login
              </button>
            </span>
          )}
        </div>
      </main>

      {/* Switch Portal Footer */}
      <footer className="py-3 text-center text-xs font-bold text-slate-400">
        <Link href="/captain/login" className="hover:text-slate-700">
          Are you a Captain? Switch to Captain Login →
        </Link>
      </footer>
    </div>
  );
}



