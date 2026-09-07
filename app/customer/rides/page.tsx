'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/ui/Navbar';
import { createClient } from '@/lib/supabase/client';
import { Ride, UserProfile } from '@/types/ride';
import { History, Calendar, MapPin, Navigation, Bike, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CustomerRidesPage() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadRides() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profile) setUser(profile as UserProfile);

      const { data } = await supabase
        .from('rides')
        .select('*, captain:captains(*, profile:profiles(*))')
        .eq('customer_id', session.user.id)
        .order('created_at', { ascending: false });

      if (data) setRides(data as any);
      setLoading(false);
    }

    loadRides();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <Navbar role="CUSTOMER" userName={user?.name} />

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/customer"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <History className="h-5 w-5 text-amber-400" />
              Ride History
            </h1>
            <p className="text-xs text-slate-400">All your completed and previous trips</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
          </div>
        ) : rides.length === 0 ? (
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 text-center text-slate-400">
            <Bike className="h-12 w-12 mx-auto mb-3 text-slate-600" />
            <p className="text-sm font-semibold">No rides found</p>
            <p className="text-xs text-slate-500 mt-1">Book your first ride now!</p>
            <Link
              href="/customer"
              className="mt-4 inline-block rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300"
            >
              Book a Ride
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {rides.map((ride) => (
              <div
                key={ride.id}
                className="rounded-2xl bg-slate-900 border border-slate-800 p-4 shadow-lg space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{new Date(ride.created_at).toLocaleDateString()} at {new Date(ride.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      ride.status === 'COMPLETED'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {ride.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-slate-300 line-clamp-1">{ride.pickup_address}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Navigation className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    <span className="text-slate-300 line-clamp-1">{ride.destination_address}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                  <span className="text-slate-400">
                    Vehicle: <strong className="text-amber-400">{ride.vehicle_type}</strong>
                  </span>
                  <span className="text-slate-400">
                    Distance: <strong className="text-slate-200">{ride.distance_km} km</strong>
                  </span>
                  <span className="font-extrabold text-amber-400 text-sm">
                    ₹{ride.final_fare || ride.estimated_fare}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
