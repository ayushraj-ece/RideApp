'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UserRole } from '@/types/ride';
import { Bike, Shield, LogOut, History, DollarSign } from 'lucide-react';

interface NavbarProps {
  role: UserRole;
  userName?: string;
}

export default function Navbar({ role, userName }: NavbarProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push(`/${role.toLowerCase()}/login`);
  };

  const isCaptain = role === 'CAPTAIN';

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 backdrop-blur-md">
      <Link
        href={isCaptain ? '/captain' : '/customer'}
        className="flex items-center gap-2 text-amber-400 font-extrabold text-lg tracking-wide hover:opacity-90"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400 text-slate-950 shadow-md">
          <Bike className="h-5 w-5" />
        </div>
        <span>RAPIDO<span className="text-slate-400 text-xs font-normal ml-1">MVP</span></span>
      </Link>

      <div className="flex items-center gap-3">
        {isCaptain ? (
          <>
            <Link
              href="/captain/earnings"
              className="flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg hover:bg-amber-500/20 transition-colors"
            >
              <DollarSign className="h-3.5 w-3.5" />
              <span>Earnings</span>
            </Link>
            <Link
              href="/captain/rides"
              className="flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-white px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <History className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Rides</span>
            </Link>
          </>
        ) : (
          <Link
            href="/customer/rides"
            className="flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <History className="h-3.5 w-3.5" />
            <span>My Rides</span>
          </Link>
        )}

        {userName && (
          <span className="hidden md:inline text-xs font-medium text-slate-400 border-l border-slate-800 pl-3">
            {userName}
          </span>
        )}

        <button
          onClick={handleLogout}
          title="Log Out"
          className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
