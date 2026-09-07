import Link from 'next/link';
import { Bike, ShieldCheck, ArrowRight, Zap, MapPin, MessageSquare, Clock } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans transition-colors duration-200">
      <header className="max-w-md mx-auto w-full flex items-center justify-between py-4">
        <div className="flex items-center gap-2 text-amber-500 font-black text-xl">
          <div className="h-9 w-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg">
            <Bike className="h-6 w-6" />
          </div>
          <span>RIDEON<span className="text-slate-400 text-xs font-semibold ml-1.5 uppercase">APP</span></span>
        </div>
      </header>

      <main className="max-w-md mx-auto w-full my-auto py-8 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold shadow-sm">
          <Zap className="h-3.5 w-3.5 fill-amber-500" />
          Realtime Ride-Hailing Platform
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Fast Bike, Auto & Cab Rides at Your Doorstep
        </h1>

        <p className="text-sm text-slate-600 dark:text-slate-400">
          Connect directly with nearby captains in real time. Zero extra commissions, instant matching, live GPS tracking.
        </p>

        {/* Feature grid */}
        <div className="grid grid-cols-3 gap-2.5 text-center text-xs py-2">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center shadow-sm">
            <Clock className="h-5 w-5 text-amber-500 mb-1" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">Instant Match</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center shadow-sm">
            <MapPin className="h-5 w-5 text-emerald-500 mb-1" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">Live GPS</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center shadow-sm">
            <MessageSquare className="h-5 w-5 text-rose-500 mb-1" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">Ride Chat</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <Link
            href="/customer"
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 py-4 text-base font-extrabold text-slate-950 hover:bg-amber-400 transition-transform active:scale-[0.99] shadow-xl"
          >
            <Bike className="h-5 w-5" />
            BOOK A RIDE (CUSTOMER)
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/captain"
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-3.5 text-sm font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <ShieldCheck className="h-5 w-5 text-amber-500" />
            CAPTAIN PORTAL (EARN WITH US)
          </Link>
        </div>
      </main>

      <footer className="max-w-md mx-auto w-full text-center py-4 border-t border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-400 dark:text-slate-500">
        © 2026 Rideon Application. OpenStreetMap + Supabase Realtime Architecture.
      </footer>
    </div>
  );
}
