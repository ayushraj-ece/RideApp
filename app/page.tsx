'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, User, ShieldCheck } from 'lucide-react';

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
          <span className="text-4xl sm:text-5xl font-black tracking-tight text-[#111816]">
            RIDE
          </span>
          <span className="text-4xl sm:text-5xl font-black tracking-tight text-[#143d30]">
            ON
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f5] text-[#111816] flex flex-col justify-between items-center p-4 sm:p-6 font-sans selection:bg-[#8fbf7f] selection:text-[#143d30]">
      {/* Top Header Logo */}
      <header className="pt-6 pb-2 text-center">
        <div className="inline-flex items-center gap-0.5">
          <span className="text-2xl font-bold tracking-tight text-[#111816]">
            RIDE
          </span>
          <span className="text-2xl font-bold tracking-tight text-[#143d30]">
            ON
          </span>
        </div>
      </header>

      {/* Main Container Card (Borderless, Pearl White Surface) */}
      <main className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-sm my-auto text-center space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold text-[#111816] tracking-tight">
            Welcome to RIDEON!
          </h1>
          <p className="text-xs font-normal text-slate-500 max-w-xs mx-auto">
            Select your portal to log in or create an account.
          </p>
        </div>

        {/* Option Buttons */}
        <div className="space-y-3 pt-2">
          {/* Customer Portal Option */}
          <Link
            href="/customer/login"
            className="w-full py-3.5 px-5 rounded-full bg-[#143d30] hover:bg-[#194c3c] text-white font-semibold text-xs sm:text-sm tracking-wide shadow-sm hover:shadow transition-all active:scale-[0.98] flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-[#8fbf7f] text-[#143d30] flex items-center justify-center font-bold">
                <User className="h-3.5 w-3.5" />
              </div>
              <span>Login as Customer (Rider)</span>
            </div>
            <ArrowRight className="h-4 w-4 stroke-[2.5] text-[#8fbf7f] group-hover:translate-x-1 transition-transform" />
          </Link>

          {/* Captain Portal Option */}
          <Link
            href="/captain/login"
            className="w-full py-3.5 px-5 rounded-full bg-[#111816] hover:bg-[#1c2623] text-white font-semibold text-xs sm:text-sm tracking-wide shadow-sm hover:shadow transition-all active:scale-[0.98] flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-[#8fbf7f] text-[#111816] flex items-center justify-center">
                <ShieldCheck className="h-3.5 w-3.5" />
              </div>
              <span className="text-[#8fbf7f]">Login as Captain (Driver)</span>
            </div>
            <ArrowRight className="h-4 w-4 stroke-[2.5] text-[#8fbf7f] group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </main>

      {/* Clean Minimalist Footer */}
      <footer className="py-4 text-center text-xs font-normal text-slate-400">
        © 2026 RIDEON Mobility Platform
      </footer>
    </div>
  );
}





