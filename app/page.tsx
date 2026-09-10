'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, User, ShieldCheck, Bike, Car, Sparkles, Navigation } from 'lucide-react';

export default function LandingPage() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-amber-400 flex flex-col items-center justify-center text-slate-950 font-sans z-50 transition-opacity duration-300">
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <div className="h-16 w-16 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center shadow-2xl">
            <Bike className="h-10 w-10 stroke-[2.5]" />
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-4xl font-black tracking-tighter text-slate-950">
              RIDE<span className="text-slate-900">ON</span>
            </span>
            <span className="text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-950 text-amber-400">
              PRO
            </span>
          </div>
          <p className="text-xs font-bold tracking-widest text-slate-900 uppercase mt-1">
            Mobility & Parcel
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Top Header Banner */}
      <div className="bg-amber-400 pt-8 pb-12 px-6 rounded-b-[2.5rem] shadow-sm relative overflow-hidden">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-black text-2xl tracking-tighter text-slate-950">
              RIDE<span className="text-slate-900">ON</span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-950 text-amber-400">
              PRO
            </span>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-950/10 text-slate-950 border border-slate-950/20">
            Welcome
          </span>
        </div>

        <div className="max-w-md mx-auto mt-8 space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight leading-tight">
            Welcome to RIDEON
          </h1>
          <p className="text-sm font-semibold text-slate-900/90 leading-relaxed max-w-xs">
            Fast, reliable rides and instant parcel deliveries at your fingertips.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-md mx-auto w-full px-6 my-auto py-8 space-y-8 flex-1 flex flex-col justify-center">
        {/* Simple Graphic / Feature Illustration */}
        <div className="flex items-center justify-center gap-4 py-4">
          <div className="h-16 w-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-sm border border-amber-200">
            <Bike className="h-8 w-8 stroke-[2]" />
          </div>
          <div className="h-16 w-16 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shadow-sm border border-slate-200">
            <Car className="h-8 w-8 stroke-[2]" />
          </div>
          <div className="h-16 w-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm border border-emerald-200">
            <Navigation className="h-8 w-8 stroke-[2]" />
          </div>
        </div>

        {/* Portal Selection Options */}
        <div className="space-y-4">
          <Link
            href="/customer/login"
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-950 text-white font-bold shadow-xl shadow-slate-950/10 hover:bg-slate-900 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center">
                <User className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div className="text-left">
                <div className="text-sm font-black">Login / Register as User</div>
                <div className="text-xs text-slate-400 font-normal">Book bike, auto & cab rides</div>
              </div>
            </div>
            <div className="h-8 w-8 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center">
              <ArrowRight className="h-4 w-4 stroke-[3]" />
            </div>
          </Link>

          <Link
            href="/captain/login"
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200 text-slate-900 font-bold shadow-sm hover:bg-slate-50 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center border border-slate-200">
                <ShieldCheck className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div className="text-left">
                <div className="text-sm font-black">Login / Register as Captain</div>
                <div className="text-xs text-slate-500 font-normal">Earn money as driver / partner</div>
              </div>
            </div>
            <div className="h-8 w-8 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center">
              <ArrowRight className="h-4 w-4 stroke-[3]" />
            </div>
          </Link>
        </div>
      </main>

      {/* Clean Footer */}
      <footer className="max-w-md mx-auto w-full text-center py-4 px-6 text-xs font-semibold text-slate-400">
        © 2026 RIDEON Mobility Architecture
      </footer>
    </div>
  );
}


