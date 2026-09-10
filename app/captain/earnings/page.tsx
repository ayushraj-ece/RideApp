'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/ui/Navbar';
import { createClient } from '@/lib/supabase/client';
import { UserProfile, CaptainEarnings } from '@/types/ride';
import { DollarSign, TrendingUp, Calendar, ArrowLeft, Loader2, Award } from 'lucide-react';
import Link from 'next/link';

import CaptainBottomNav from '@/components/ui/CaptainBottomNav';

export default function CaptainEarningsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [earnings, setEarnings] = useState<CaptainEarnings[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadEarnings() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (prof) setProfile(prof as UserProfile);

      const { data } = await supabase
        .from('captain_earnings')
        .select('*')
        .eq('captain_id', session.user.id)
        .order('created_at', { ascending: false });

      if (data) setEarnings(data as CaptainEarnings[]);
      setLoading(false);
    }

    loadEarnings();
  }, []);

  const totalAmount = earnings.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const todayAmount = earnings
    .filter((e) => new Date(e.created_at).toDateString() === new Date().toDateString())
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200 font-sans pb-16">
      <Navbar
        role="CAPTAIN"
        userName={profile?.name}
        userProfile={profile}
        onProfileUpdate={(updated) => setProfile(updated)}
      />

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/captain"
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-amber-500" />
              Captain Earnings
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Track your daily and total payout balance</p>
          </div>
        </div>

        {/* Earnings Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1 font-semibold">
              <Calendar className="h-3.5 w-3.5 text-amber-500" /> Today's Earnings
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">₹{todayAmount}</div>
          </div>

          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1 font-semibold">
              <TrendingUp className="h-3.5 w-3.5 text-amber-500" /> Total Earnings
            </span>
            <div className="text-2xl font-black text-amber-500">₹{totalAmount}</div>
          </div>
        </div>

        {/* Breakdown List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">Earnings Breakdown</h3>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : earnings.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-400 dark:text-slate-500 text-xs shadow-sm">
              No earnings logged yet. Go online and complete rides!
            </div>
          ) : (
            earnings.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-200">Ride #{e.ride_id.slice(0, 8)}</div>
                  <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                    {new Date(e.created_at).toLocaleDateString()} at {new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="font-extrabold text-emerald-600 dark:text-emerald-400 text-base">+₹{e.amount}</div>
              </div>
            ))
          )}
        </div>
      </main>
      <CaptainBottomNav activeTab="EARNINGS" />
    </div>
  );
}
