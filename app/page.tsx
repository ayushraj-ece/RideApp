import Link from 'next/link';
import { ShieldCheck, ArrowRight, Zap, MapPin, Package, Clock, Navigation, Compass, Sparkles, User, Car } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans relative overflow-hidden selection:bg-amber-500 selection:text-slate-950">
      {/* Dynamic Background Glow Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-96 bg-amber-500/10 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-amber-600/5 blur-[100px] pointer-events-none rounded-full" />

      {/* Header */}
      <header className="max-w-md mx-auto w-full flex items-center justify-between py-3 z-10">
        <div className="flex items-center gap-2">
          <span className="font-black text-2xl tracking-tighter text-slate-100">
            RIDE<span className="text-amber-500">ON</span>
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 ml-1">
            PRO
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-medium text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Realtime Live</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto w-full my-auto py-6 space-y-6 z-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-amber-500/30 text-amber-400 text-xs font-semibold shadow-sm">
            <Zap className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
            <span>NEXT-GEN MOBILITY PLATFORM</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
            Urban Rides & Swift Parcel Express
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
            Zero commission surge, instant captain dispatch, and precise live GPS navigation.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center shadow-md hover:border-amber-500/30 transition-all">
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-1.5">
              <Clock className="h-4 w-4 stroke-[2.5]" />
            </div>
            <span className="font-bold text-slate-200 text-[11px]">Instant Match</span>
            <span className="text-[10px] text-slate-500 mt-0.5">&lt; 30s Dispatch</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center shadow-md hover:border-emerald-500/30 transition-all">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-1.5">
              <Navigation className="h-4 w-4 stroke-[2.5]" />
            </div>
            <span className="font-bold text-slate-200 text-[11px]">Live GPS</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Vector Maps</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center shadow-md hover:border-sky-500/30 transition-all">
            <div className="h-8 w-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-1.5">
              <Package className="h-4 w-4 stroke-[2.5]" />
            </div>
            <span className="font-bold text-slate-200 text-[11px]">Parcel Express</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Fast Delivery</span>
          </div>
        </div>

        {/* Portal Selection Cards */}
        <div className="space-y-3 pt-1">
          {/* Customer Portal Card */}
          <Link
            href="/customer"
            className="group relative block p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/90 border border-amber-500/40 hover:border-amber-400 transition-all shadow-xl shadow-amber-500/5 active:scale-[0.99]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
                  <User className="h-5 w-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                    Customer Portal
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Rider
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Book bike, auto & cab rides instantly</p>
                </div>
              </div>
              <div className="h-8 w-8 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-slate-950 transition-all">
                <ArrowRight className="h-4 w-4 stroke-[2.5]" />
              </div>
            </div>
          </Link>

          {/* Captain Portal Card */}
          <Link
            href="/captain"
            className="group relative block p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all shadow-md active:scale-[0.99]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-slate-800 text-emerald-400 border border-slate-700 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
                  <ShieldCheck className="h-5 w-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                    Captain Portal
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Driver
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Accept rides, track trips & earnings</p>
                </div>
              </div>
              <div className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center group-hover:bg-slate-700 group-hover:text-white transition-all">
                <ArrowRight className="h-4 w-4 stroke-[2.5]" />
              </div>
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-md mx-auto w-full text-center py-3 border-t border-slate-900 text-[11px] text-slate-500 z-10">
        © 2026 RIDEON Mobility Platform. Supabase Realtime & Vector Engine.
      </footer>
    </div>
  );
}

