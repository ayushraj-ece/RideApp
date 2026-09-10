'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/components/theme/ThemeProvider';
import { UserRole, UserProfile } from '@/types/ride';
import {
  X,
  User,
  Sun,
  Moon,
  History,
  DollarSign,
  LogOut,
  ShieldCheck,
  Star,
  HelpCircle,
  ChevronRight,
  Package,
} from 'lucide-react';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  role: UserRole;
  user: UserProfile | null;
  onProfileUpdate?: (updated: UserProfile) => void;
}

export default function ProfileDrawer({
  isOpen,
  onClose,
  role,
  user,
  onProfileUpdate,
}: ProfileDrawerProps) {
  const router = useRouter();
  const supabase = createClient();
  const { theme, toggleTheme } = useTheme();

  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setNameInput(user.name || '');
      setPhoneInput(user.phone || '');
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          name: nameInput.trim(),
          phone: phoneInput.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        if (onProfileUpdate) onProfileUpdate(data as UserProfile);
        setSaveSuccess(true);
        setIsEditing(false);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update profile details');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push(`/${role.toLowerCase()}/login`);
  };

  const isCaptain = role === 'CAPTAIN';

  return (
    <div className="fixed inset-x-0 top-9 sm:top-9.5 bottom-0 z-40 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between overflow-y-auto font-sans transition-colors duration-200 p-4 sm:p-6 pb-18 sm:pb-20 animate-in slide-in-from-bottom duration-200">
      <div className="max-w-md mx-auto w-full space-y-4">
        {/* HEADER BAR */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Profile
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* TOP PROFILE CARD (MATCHING SCREENSHOT 5 RAPIDO APP) */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-full border-2 border-slate-900 dark:border-slate-100 flex items-center justify-center text-slate-900 dark:text-slate-100 font-extrabold text-base bg-slate-100 dark:bg-slate-800 shadow-inner">
                <User className="h-6 w-6 text-slate-800 dark:text-slate-200" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-slate-100">{user.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{user.phone || '9667021148'}</p>
              </div>
            </div>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Edit Profile"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* RATING BADGE ROW */}
          <button
            onClick={() => alert('Your rating is calculated from completed ride feedback.')}
            className="w-full flex items-center justify-between pt-1 text-xs font-semibold hover:opacity-80 transition-opacity"
          >
            <span className="flex items-center gap-1.5 text-amber-500 font-bold">
              <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
              <strong className="text-slate-900 dark:text-slate-100">4.84</strong> My Rating
            </span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>

          {isEditing && (
            <form onSubmit={handleSaveProfile} className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Phone</label>
                <input
                  type="tel"
                  required
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 rounded-xl bg-slate-200 dark:bg-slate-800 py-2 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-amber-400 py-2 text-xs font-extrabold text-slate-950 shadow-md"
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* MENU ITEMS LIST (MATCHING SCREENSHOT 5 RAPIDO APP) */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 shadow-sm space-y-0.5 text-xs font-extrabold divide-y divide-slate-100 dark:divide-slate-800/60">
          <button
            onClick={() => {
              onClose();
              alert('24/7 Customer Support: support@rideon.com');
            }}
            className="w-full flex items-center justify-between p-3.5 text-slate-800 dark:text-slate-200 hover:text-amber-500 transition-colors rounded-xl"
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="h-4 w-4 text-slate-400 shrink-0" />
              <span>Help</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
          </button>

          <button
            onClick={() => {
              onClose();
              router.push('/customer?parcel=true');
            }}
            className="w-full flex items-center justify-between p-3.5 text-slate-800 dark:text-slate-200 hover:text-amber-500 transition-colors rounded-xl"
          >
            <div className="flex items-center gap-3">
              <Package className="h-4 w-4 text-amber-500 shrink-0" />
              <span>Parcel - Send Items</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
          </button>

          <Link
            href={isCaptain ? '/captain/rides' : '/customer/rides'}
            onClick={onClose}
            className="w-full flex items-center justify-between p-3.5 text-slate-800 dark:text-slate-200 hover:text-amber-500 transition-colors rounded-xl"
          >
            <div className="flex items-center gap-3">
              <History className="h-4 w-4 text-slate-400 shrink-0" />
              <span>My Rides</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
          </Link>

          <div className="w-full flex items-center justify-between p-3.5 text-slate-800 dark:text-slate-200 rounded-xl">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-slate-400 shrink-0" />
              <span>Safety</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
          </div>

          <div className="w-full flex items-center justify-between p-3.5 text-slate-800 dark:text-slate-200 rounded-xl">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon className="h-4 w-4 text-amber-400 shrink-0" /> : <Sun className="h-4 w-4 text-amber-500 shrink-0" />}
              <span>Theme Mode</span>
            </div>
            <button
              onClick={toggleTheme}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-200 dark:bg-amber-500 transition-colors"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-slate-950 transition-transform shadow-md ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* SIGN OUT BUTTON */}
        <div className="pt-2 pb-6">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 py-3.5 text-xs font-black text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors uppercase tracking-wider shadow-sm"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
