'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, User, ShieldCheck, Bike, Car, Navigation, Zap, Package, Sparkles } from 'lucide-react';

export default function LandingPage() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center text-slate-900 font-sans z-50 transition-opacity duration-300">
        <div className="flex items-center gap-0.5 animate-pulse">
          <span className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900">
            RIDE
          </span>
          <span className="text-4xl sm:text-5xl font-black tracking-tight text-amber-500">
            ON
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between items-center p-4 sm:p-6 font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Top Header Logo & Live Badge */}
      <header className="w-full max-w-md pt-4 pb-2 flex items-center justify-between">
        <div className="inline-flex items-center gap-0.5">
          <span className="text-2xl font-black tracking-tighter text-slate-900">
            RIDE
          </span>
          <span className="text-2xl font-black tracking-tighter text-amber-500">
            ON
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold border border-emerald-500/20">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Realtime Live</span>
        </div>
      </header>

      {/* Rido Behance Style Onboarding Card Container */}
      <main className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 my-auto space-y-6">
        {/* Visual Hero Banner */}
        <div className="relative rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 p-6 text-slate-950 overflow-hidden shadow-lg shadow-amber-500/20">
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-950 text-amber-400 text-[10px] font-black uppercase tracking-widest">
              <Zap className="h-3 w-3 fill-amber-400" />
              <span>Zero Surge Fees</span>
            </div>
            <h2 className="text-xl font-black text-slate-950 tracking-tight leading-tight">
              Everyday Rideshare & Parcel Express
            </h2>
            <p className="text-xs font-medium text-slate-900/90 leading-relaxed">
              Instant driver matching, live GPS tracking, and seamless city rides.
            </p>
          </div>

          {/* Floating Vehicle Icons Decorative Graphics */}
          <div className="mt-4 flex items-center gap-2 pt-2 border-t border-slate-950/10 z-10 relative">
            <div className="h-8 w-8 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center shadow-md">
              <Bike className="h-4 w-4" />
            </div>
            <div className="h-8 w-8 rounded-xl bg-slate-950/80 text-white flex items-center justify-center shadow-md">
              <Car className="h-4 w-4" />
            </div>
            <div className="h-8 w-8 rounded-xl bg-slate-950/80 text-emerald-400 flex items-center justify-center shadow-md">
              <Navigation className="h-4 w-4" />
            </div>
            <div className="h-8 w-8 rounded-xl bg-slate-950/80 text-sky-400 flex items-center justify-center shadow-md">
              <Package className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Feature Pills Grid */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-2xl bg-slate-50 text-slate-800 font-semibold">
            <span className="block text-amber-500 font-bold text-xs">&lt; 30s</span>
            <span className="text-[10px] text-slate-500">Dispatch</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-50 text-slate-800 font-semibold">
            <span className="block text-emerald-600 font-bold text-xs">Live GPS</span>
            <span className="text-[10px] text-slate-500">Tracking</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-50 text-slate-800 font-semibold">
            <span className="block text-sky-600 font-bold text-xs">Parcel</span>
            <span className="text-[10px] text-slate-500">Delivery</span>
          </div>
        </div>

        {/* Primary Action Buttons (Rido UI Style) */}
        <div className="space-y-3 pt-1">
          <Link
            href="/customer/login"
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-amber-500/25 transition-all active:scale-[0.98] flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center">
                <User className="h-4 w-4 stroke-[2.5]" />
              </div>
              <div className="text-left">
                <div className="text-sm font-black">Book a Ride (Rider Portal)</div>
                <div className="text-[11px] font-medium text-slate-900/80">Log in or create account</div>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 stroke-[3] group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/captain/login"
            className="w-full py-3.5 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm tracking-wide shadow-md transition-all active:scale-[0.98] flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center border border-slate-700">
                <ShieldCheck className="h-4 w-4 stroke-[2.5]" />
              </div>
              <div className="text-left">
                <div className="text-sm font-black text-white">Captain Partner (Driver)</div>
                <div className="text-[11px] font-normal text-slate-400">Drive & earn on your schedule</div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 stroke-[2.5] text-amber-400 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </main>

      {/* Clean Footer */}
      <footer className="py-4 text-center text-xs font-medium text-slate-400">
        © 2026 RIDEON Mobility Platform
      </footer>
    </div>
  );
}





