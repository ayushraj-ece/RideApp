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
    <header className="sticky top-0 z-40 flex h-11 w-full items-center justify-between border-b border-slate-200/80 dark:border-[#233430] bg-white/95 dark:bg-[#111816]/95 px-3.5 sm:px-5 transition-all duration-200 shadow-xs backdrop-blur-sm shrink-0">
      {/* STYLISH BRANDING LOGO */}
      <Link
        href={isCaptain ? '/captain' : '/customer'}
        className="flex items-center gap-1.5 transition-transform active:scale-95"
      >
        <span className="text-[#111816] dark:text-white font-black text-base tracking-tighter uppercase font-sans">
          RIDE<span className="text-[#143d30] dark:text-[#8fbf7f] font-extrabold italic pl-0.5">ON</span>
        </span>
        {isCaptain && (
          <span className="px-2 py-0.5 rounded-full bg-[#143d30]/10 text-[#143d30] dark:text-[#8fbf7f] text-[9px] font-black uppercase tracking-widest border border-[#143d30]/20">
            CAPTAIN
          </span>
        )}
      </Link>
    </header>
  );
}

