import Link from 'next/link';
import { Bike, ShieldCheck, ArrowRight, Zap, MapPin, MessageSquare, Clock, Package, Sparkles, Navigation } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans transition-colors duration-200">
      {/* Header */}
      <header className="max-w-md mx-auto w-full flex items-center justify-between py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/25">
            <Bike className="h-5 w-5 stroke-[2.5]" />
          </div>
          <span className="font-black text-xl tracking-tight">
            RIDEON<span className="text-amber-500 text-xs font-black ml-1.5 uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">PRO</span>
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto w-full my-auto py-6 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-black tracking-wide shadow-sm">
          <Zap className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
          <span>REALTIME RIDE-HAILING & PARCEL PLATFORM</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
          Next-Gen Mobility & Delivery at Your Fingertips
        </h1>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
          Instant bike, auto & cab rides with zero extra commission, live GPS tracking, and real-time captain matching.
        </p>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-3 gap-3 text-center text-xs py-2">
          <div className="p-3.5 rounded-2xl solid-card flex flex-col items-center shadow-sm hover:scale-105 transition-transform">
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-1.5">
              <Clock className="h-4 w-4 stroke-[2.5]" />
            </div>
            <span className="font-extrabold text-slate-900 dark:text-slate-100 text-[11px]">Instant Match</span>
          </div>

          <div className="p-3.5 rounded-2xl solid-card flex flex-col items-center shadow-sm hover:scale-105 transition-transform">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-1.5">
              <Navigation className="h-4 w-4 stroke-[2.5]" />
            </div>
            <span className="font-extrabold text-slate-900 dark:text-slate-100 text-[11px]">Live GPS</span>
          </div>

          <div className="p-3.5 rounded-2xl solid-card flex flex-col items-center shadow-sm hover:scale-105 transition-transform">
            <div className="h-8 w-8 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center mb-1.5">
              <Package className="h-4 w-4 stroke-[2.5]" />
            </div>
            <span className="font-extrabold text-slate-900 dark:text-slate-100 text-[11px]">Parcel Express</span>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="space-y-3.5 pt-2">
          <Link
            href="/customer"
            className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 py-4 text-sm font-black text-slate-950 hover:from-amber-400 hover:to-amber-300 transition-all active:scale-[0.98] shadow-xl shadow-amber-500/25 tracking-wide"
          >
            <Bike className="h-5 w-5 stroke-[2.5]" />
            <span>BOOK A RIDE (CUSTOMER PORTAL)</span>
            <ArrowRight className="h-4 w-4 stroke-[3]" />
          </Link>

          <Link
            href="/captain"
            className="w-full flex items-center justify-center gap-2.5 rounded-2xl solid-card py-3.5 text-xs font-extrabold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all active:scale-[0.98] shadow-sm tracking-wide"
          >
            <ShieldCheck className="h-4 w-4 text-amber-500 stroke-[2.5]" />
            <span>CAPTAIN PORTAL (DRIVER / PARTNER)</span>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-md mx-auto w-full text-center py-4 border-t border-slate-200/80 dark:border-slate-800/80 text-[11px] text-slate-400 dark:text-slate-500">
        © 2026 Rideon Mobility Architecture. Supabase Realtime & Leaflet Vector Engine.
      </footer>
    </div>
  );
}
