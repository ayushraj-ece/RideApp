'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/ui/Navbar';
import { createClient } from '@/lib/supabase/client';
import { Ride, UserProfile } from '@/types/ride';
import { History, Calendar, MapPin, Navigation, Bike, Car, Package, Loader2, ArrowLeft, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import CustomerBottomNav from '@/components/ui/CustomerBottomNav';

export default function CustomerRidesPage() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [expandedRideId, setExpandedRideId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadRides() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profile) setUser(profile as UserProfile);

      // Fetch all rides for this customer cleanly
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('customer_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load customer rides:', error);
      } else if (data) {
        setRides(data as Ride[]);
      }
      setLoading(false);
    }

    loadRides();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedRideId((prev) => (prev === id ? null : id));
  };

  const getVehicleIcon = (type: string, isParcel?: boolean) => {
    if (isParcel) return <Package className="h-4 w-4 text-sky-500" />;
    if (type === 'AUTO') return <Car className="h-4 w-4 text-amber-500" />;
    if (type === 'CAB') return <Car className="h-4 w-4 text-emerald-500" />;
    return <Bike className="h-4 w-4 text-amber-500" />;
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200 font-sans pb-20">
      <Navbar
        role="CUSTOMER"
        userName={user?.name}
        userProfile={user}
        onProfileUpdate={(updated) => setUser(updated)}
      />

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6">
        {/* CLEAN HEADER */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/customer"
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-sm transition-transform active:scale-95 shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <History className="h-5 w-5 text-amber-500 shrink-0" />
              Ride History
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">All your completed and previous trips</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : rides.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500 dark:text-slate-400 shadow-sm">
            <Bike className="h-12 w-12 mx-auto mb-3 text-slate-400 dark:text-slate-600" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No rides found</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Book your first ride now!</p>
            <Link
              href="/customer"
              className="mt-4 inline-block rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-black text-slate-950 hover:bg-amber-400 shadow-md transition-transform active:scale-95"
            >
              Book a Ride
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {rides.map((ride) => {
              const isExpanded = expandedRideId === ride.id;
              const formattedDate = new Date(ride.created_at).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
              });
              const formattedTime = new Date(ride.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={ride.id}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 shadow-sm transition-all overflow-hidden"
                >
                  {/* COMPACT SINGLE-LINE ALWAYS VISIBLE ROW */}
                  <div
                    onClick={() => toggleExpand(ride.id)}
                    className="flex items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    {/* Left: Icon & Date */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                        {getVehicleIcon(ride.vehicle_type, ride.is_parcel)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                            {formattedDate}, {formattedTime}
                          </span>
                        </div>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[140px] sm:max-w-[240px]">
                          {ride.destination_address}
                        </p>
                      </div>
                    </div>

                    {/* Right: Fare, Status & Chevron */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-black text-slate-900 dark:text-white block">
                          ₹{ride.final_fare || ride.estimated_fare}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            ride.status === 'COMPLETED'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {ride.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(ride.id);
                        }}
                        className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-amber-500 transition-colors"
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180 text-amber-500' : ''
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* EXPANDABLE RIDE DETAILS SECTION */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-in fade-in duration-150">
                      {/* Timeline Locations */}
                      <div className="space-y-2 text-xs">
                        <div className="flex items-start gap-2.5">
                          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Pickup</span>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                              {ride.pickup_address}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <div className="h-2.5 w-2.5 rounded-full bg-rose-500 mt-1 shrink-0" />
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Drop Destination</span>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                              {ride.destination_address}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Ride Summary Meta Footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400">
                          Type: <strong className="text-amber-600 dark:text-amber-400 font-extrabold">{ride.vehicle_type} {ride.is_parcel ? '(Parcel)' : ''}</strong>
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          Distance: <strong className="text-slate-800 dark:text-slate-200">{ride.distance_km} km</strong>
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          PIN: <strong className="text-slate-800 dark:text-slate-200 tracking-wider">{ride.otp}</strong>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <CustomerBottomNav activeTab="PROFILE" />
    </div>
  );
}
