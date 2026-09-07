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

        {/* RIGHT ACTIONS (THEME TOGGLE + PROFILE TRIGGER) */}
        <div className="flex items-center gap-2">
          {isCaptain ? (
            <>
              <Link
                href="/captain/earnings"
                className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-xl hover:bg-amber-500/20 transition-colors"
              >
                <DollarSign className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Earnings</span>
              </Link>
              <Link
                href="/captain/rides"
                className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-amber-500 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              >
                <History className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Rides</span>
              </Link>
            </>
          ) : (
            <Link
              href="/customer/rides"
              className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-amber-500 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            >
              <History className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">My Rides</span>
            </Link>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
          </button>

          {/* Profile Trigger Button */}
          <button
            onClick={handleOpenProfile}
            title="Open Profile & Settings"
            className="flex items-center gap-2 rounded-xl bg-amber-400/10 border border-amber-400/20 px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 hover:bg-amber-400/20 transition-colors cursor-pointer"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-400 text-slate-950 font-black text-[11px] shadow-sm">
              {initials || <User className="h-3.5 w-3.5" />}
            </div>
            <span className="hidden md:inline font-extrabold max-w-[90px] truncate">
              {userDisplayName}
            </span>
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
