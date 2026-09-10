'use client';

import Link from 'next/link';
import { UserRole, UserProfile } from '@/types/ride';

interface NavbarProps {
  role: UserRole;
  userName?: string;
  userProfile?: UserProfile | null;
  onProfileUpdate?: (updated: UserProfile) => void;
  onOpenProfile?: () => void;
}

export default function Navbar({ role }: NavbarProps) {
  const isCaptain = role === 'CAPTAIN';

  return (
    <header className="sticky top-0 z-40 flex h-11 w-full items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 px-3.5 sm:px-5 transition-all duration-200 shadow-xs backdrop-blur-sm shrink-0">
      {/* STYLISH BRANDING LOGO */}
      <Link
        href={isCaptain ? '/captain' : '/customer'}
        className="flex items-center gap-1.5 transition-transform active:scale-95"
      >
        <span className="text-slate-900 dark:text-white font-black text-base tracking-tighter uppercase font-sans">
          RIDE<span className="text-amber-500 font-extrabold italic pl-0.5">ON</span>
        </span>
        {isCaptain && (
          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase tracking-widest border border-amber-500/20">
            CAPTAIN
          </span>
        )}
      </Link>
    </header>
  );
}
