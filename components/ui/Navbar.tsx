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
    <header className="sticky top-0 z-40 flex h-9 sm:h-9.5 w-full items-center justify-between border-b border-slate-100 dark:border-slate-800/60 bg-white/95 dark:bg-slate-950/95 px-3.5 sm:px-4 transition-all duration-200 shadow-2xs backdrop-blur-md shrink-0">
      {/* STYLISH BRANDING LOGO */}
      <Link
        href={isCaptain ? '/captain' : '/customer'}
        className="flex items-center gap-1.5 transition-transform active:scale-95 py-1"
      >
        {/* eslint-disable-next-html-element-for-img */}
        <img
          src="/rideon-logo.png"
          alt="RIDEON Logo"
          className="h-4 sm:h-4.5 w-auto object-contain my-auto"
        />
        {isCaptain && (
          <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[8px] font-black uppercase tracking-widest border border-amber-500/20">
            CAPTAIN
          </span>
        )}
      </Link>
    </header>
  );
}
