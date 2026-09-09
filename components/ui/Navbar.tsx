'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/components/theme/ThemeProvider';
import ProfileDrawer from '@/components/profile/ProfileDrawer';
import { UserRole, UserProfile } from '@/types/ride';
import { Bike, LogOut, History, DollarSign, User, Sun, Moon } from 'lucide-react';

interface NavbarProps {
  role: UserRole;
  userName?: string;
  userProfile?: UserProfile | null;
  onProfileUpdate?: (updated: UserProfile) => void;
  onOpenProfile?: () => void;
}

export default function Navbar({ role, userName, userProfile, onProfileUpdate, onOpenProfile }: NavbarProps) {
  const router = useRouter();
  const supabase = createClient();
  const { theme, toggleTheme } = useTheme();

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleOpenProfile = () => {
    if (onOpenProfile) {
      onOpenProfile();
    } else {
      setIsProfileOpen(true);
    }
  };

  const isCaptain = role === 'CAPTAIN';

  const userDisplayName = userProfile?.name || userName || (isCaptain ? 'Captain' : 'Customer');
  const initials = userDisplayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 px-4 backdrop-blur-md transition-colors duration-200">
        {/* LOGO */}
        <Link
          href={isCaptain ? '/captain' : '/customer'}
          className="flex items-center gap-2 text-amber-500 font-black text-base tracking-wide hover:opacity-90 transition-opacity"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500 text-slate-950 shadow-md">
            <Bike className="h-4 w-4" />
          </div>
          <span>
            RIDEON
            <span className="text-slate-400 text-[10px] font-semibold ml-1.5 uppercase tracking-wider">
              {role}
            </span>
          </span>
        </Link>

        {/* RIGHT ACTIONS */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-amber-500 transition-colors border border-slate-200 dark:border-slate-800"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
          </button>

          {/* User Profile Avatar Button */}
          <button
            onClick={handleOpenProfile}
            className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 transition-all active:scale-95 shadow-sm"
            title="Open Profile & Settings"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-black text-[10px]">
              {initials}
            </div>
            <span className="max-w-[100px] truncate hidden sm:inline">{userDisplayName}</span>
          </button>
        </div>
      </header>

      {/* PROFILE DRAWER */}
      <ProfileDrawer
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        role={role}
        user={userProfile || null}
        onProfileUpdate={onProfileUpdate}
      />
    </>
  );
}
