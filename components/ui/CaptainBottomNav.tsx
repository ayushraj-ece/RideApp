'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Navigation, DollarSign, History, User } from 'lucide-react';

interface CaptainBottomNavProps {
  activeTab?: 'DUTY' | 'EARNINGS' | 'TRIPS' | 'PROFILE';
  onTabSelect?: (tab: 'DUTY' | 'EARNINGS' | 'TRIPS' | 'PROFILE') => void;
}

export default function CaptainBottomNav({ activeTab, onTabSelect }: CaptainBottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  let currentTab: 'DUTY' | 'EARNINGS' | 'TRIPS' | 'PROFILE' = activeTab || 'DUTY';
  if (!activeTab) {
    if (pathname.includes('/captain/earnings')) currentTab = 'EARNINGS';
    else if (pathname.includes('/captain/rides')) currentTab = 'TRIPS';
    else currentTab = 'DUTY';
  }

  const handleSelect = (tab: 'DUTY' | 'EARNINGS' | 'TRIPS' | 'PROFILE') => {
    if (tab === 'DUTY') {
      if (onTabSelect) onTabSelect('DUTY');
      router.push('/captain');
    } else if (tab === 'EARNINGS') {
      if (onTabSelect) onTabSelect('EARNINGS');
      router.push('/captain/earnings');
    } else if (tab === 'TRIPS') {
      if (onTabSelect) onTabSelect('TRIPS');
      router.push('/captain/rides');
    } else if (tab === 'PROFILE') {
      if (onTabSelect) {
        onTabSelect('PROFILE');
      } else {
        router.push('/captain?profile=true');
      }
    }
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 w-full border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-8 py-2 flex items-center justify-around text-slate-500 dark:text-slate-400 shadow-2xl">
      <button
        onClick={() => handleSelect('DUTY')}
        className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all ${
          currentTab === 'DUTY'
            ? 'text-amber-500 font-black scale-105'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <Navigation className="h-5 w-5" />
        <span>Duty</span>
      </button>

      <button
        onClick={() => handleSelect('EARNINGS')}
        className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all ${
          currentTab === 'EARNINGS'
            ? 'text-amber-500 font-black scale-105'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <DollarSign className="h-5 w-5" />
        <span>Earnings</span>
      </button>

      <button
        onClick={() => handleSelect('TRIPS')}
        className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all ${
          currentTab === 'TRIPS'
            ? 'text-amber-500 font-black scale-105'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <History className="h-5 w-5" />
        <span>Trips</span>
      </button>

      <button
        onClick={() => handleSelect('PROFILE')}
        className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all ${
          currentTab === 'PROFILE'
            ? 'text-amber-500 font-black scale-105'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <User className="h-5 w-5" />
        <span>Profile</span>
      </button>
    </div>
  );
}
