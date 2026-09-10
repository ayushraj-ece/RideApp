'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Navigation, Package, User } from 'lucide-react';

interface CustomerBottomNavProps {
  activeTab?: 'RIDE' | 'PARCEL' | 'PROFILE';
  onTabSelect?: (tab: 'RIDE' | 'PARCEL' | 'PROFILE') => void;
}

export default function CustomerBottomNav({ activeTab, onTabSelect }: CustomerBottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const currentTab = activeTab || 'RIDE';

  const handleSelect = (tab: 'RIDE' | 'PARCEL' | 'PROFILE') => {
    if (onTabSelect) {
      onTabSelect(tab);
    } else {
      if (tab === 'RIDE') {
        router.push('/customer');
      } else if (tab === 'PARCEL') {
        router.push('/customer?parcel=true');
      } else if (tab === 'PROFILE') {
        router.push('/customer?profile=true');
      }
    }
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 w-full h-13 sm:h-14 border-t border-slate-100 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md px-6 py-1.5 flex items-center justify-around text-slate-500 dark:text-slate-400 shadow-xl">
      <button
        onClick={() => handleSelect('RIDE')}
        className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all ${
          currentTab === 'RIDE'
            ? 'text-amber-500 font-extrabold scale-105'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <Navigation className="h-5 w-5" />
        <span>Ride</span>
      </button>

      <button
        onClick={() => handleSelect('PARCEL')}
        className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all ${
          currentTab === 'PARCEL'
            ? 'text-amber-500 font-extrabold scale-105'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <Package className="h-5 w-5" />
        <span>Parcel</span>
      </button>

      <button
        onClick={() => handleSelect('PROFILE')}
        className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all ${
          currentTab === 'PROFILE'
            ? 'text-amber-500 font-extrabold scale-105'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <User className="h-5 w-5" />
        <span>Profile</span>
      </button>
    </div>
  );
}
