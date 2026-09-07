'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/ui/Navbar';
import MapContainer from '@/components/map/MapContainer';
import ChatDrawer from '@/components/chat/ChatDrawer';
import CancelRideModal from '@/components/ride/CancelRideModal';
import CaptainProfileDrawer from '@/components/profile/CaptainProfileDrawer';
import CaptainNavigationOverlay from '@/components/navigation/CaptainNavigationOverlay';
import { createClient } from '@/lib/supabase/client';
import { Ride, UserProfile, CaptainProfile } from '@/types/ride';
import { getDirectionsRoute, reverseGeocode } from '@/lib/maps';
import { getFareBreakdown } from '@/lib/pricing/fareEngine';
import { soundEffects } from '@/lib/audio/soundEffects';
import {
  Power,
  Navigation,
  MapPin,
  MessageSquare,
  Loader2,
  Bike,
  Car,
  CheckCircle,
  ArrowRight,
  ShieldAlert,
  Clock,
  ChevronRight,
  Sparkles,
  TrendingUp,
  DollarSign,
  Radio,
  Star,
  Activity,
  Crosshair,
  Receipt,
  ChevronDown,
  ChevronUp,
  XCircle,
  Phone,
  User,
} from 'lucide-react';

export default function CaptainHomePage() {
  const router = useRouter();
  const supabase = createClient();

  // Captain Profile & Online state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [captain, setCaptain] = useState<CaptainProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Earnings & Stats
  const [todayEarnings, setTodayEarnings] = useState<number>(0);
  const [completedTripsCount, setCompletedTripsCount] = useState<number>(0);

  // GPS position & address tracking
  const [gpsCoords, setGpsCoords] = useState<[number, number] | null>(null);
  const [captainAddress, setCaptainAddress] = useState<string>('Detecting current GPS location...');
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  // Incoming Realtime Request State
  const [incomingRequest, setIncomingRequest] = useState<Ride | null>(null);
  const [requestTimeout, setRequestTimeout] = useState<number>(30);
  const [acceptingLoading, setAcceptingLoading] = useState(false);

  // Active Ride state
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');

  // Drawers & Modals
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showFareBreakdown, setShowFareBreakdown] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCaptainProfileOpen, setIsCaptainProfileOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // High-Accuracy GPS Auto-Detection & Reverse Geocoding
  const detectCaptainLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;

    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const coords: [number, number] = [lat, lng];
        setGpsCoords(coords);

        const addr = await reverseGeocode(lat, lng);
        setCaptainAddress(addr);
        setIsDetectingGps(false);

        if (captain) {
          await supabase.rpc('update_captain_location', {
            p_captain_id: captain.id,
            p_lat: lat,
            p_lng: lng,
          });
        }
      },
      (err) => {
        console.warn('Captain GPS permission or fetch error:', err);
        const defaultCoords: [number, number] = [28.6139, 77.209];
        setGpsCoords((prev) => prev || defaultCoords);
        setCaptainAddress('Connaught Place, New Delhi');
        setIsDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    detectCaptainLocation();
  }, [captain?.id]);

  // 1. Initialize Captain Profile & Daily Stats
  useEffect(() => {
    async function initCaptain() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/captain/login');
        return;
      }

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!prof || prof.role !== 'CAPTAIN') {
        await supabase.auth.signOut();
        router.push('/captain/login');
        return;
      }

      const { data: capt } = await supabase
        .from('captains')
        .select('*')
        .eq('id', session.user.id)
        .single();

      setProfile(prof as UserProfile);
      if (capt) {
        setCaptain(capt as CaptainProfile);
        setIsOnline(capt.online_status);
        if (capt.latitude && capt.longitude) {
          const coords: [number, number] = [capt.latitude, capt.longitude];
          setGpsCoords(coords);
          reverseGeocode(capt.latitude, capt.longitude).then((addr) => setCaptainAddress(addr));
        }
      }

      // Fetch Today's Earnings & Trips Stats
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: earningsData } = await supabase
        .from('captain_earnings')
        .select('amount')
        .eq('captain_id', session.user.id)
        .gte('created_at', todayStart.toISOString());

      if (earningsData) {
        const sum = earningsData.reduce((acc, curr) => acc + Number(curr.amount), 0);
        setTodayEarnings(sum);
        setCompletedTripsCount(earningsData.length);
      }

      setLoading(false);

      // Check active ride
      const { data: activeRides } = await supabase
        .from('rides')
        .select('*, customer:profiles!rides_customer_id_fkey(*)')
        .eq('captain_id', session.user.id)
        .in('status', ['ACCEPTED', 'CAPTAIN_ARRIVING', 'CAPTAIN_ARRIVED', 'OTP_VERIFIED', 'IN_PROGRESS'])
        .order('updated_at', { ascending: false })
        .limit(1);

      if (activeRides && activeRides.length > 0) {
        const ride = activeRides[0] as any;
        setActiveRide(ride);
        updateRouteForRide(ride, capt?.latitude && capt?.longitude ? [capt.latitude, capt.longitude] : null);
      }
    }

    initCaptain();
  }, []);

  // 2. High-Accuracy GPS Location Tracker & Real-Time Sync Loop
  useEffect(() => {
    if ((!isOnline && !activeRide) || !captain || typeof window === 'undefined' || !navigator.geolocation) return;

    const syncLocation = (lat: number, lng: number) => {
      const coords: [number, number] = [lat, lng];
      setGpsCoords(coords);

      supabase.rpc('update_captain_location', {
        p_captain_id: captain.id,
        p_lat: lat,
        p_lng: lng,
      });

      if (activeRide) {
        updateRouteForRide(activeRide, coords);
      }
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => syncLocation(pos.coords.latitude, pos.coords.longitude),
      (err) => console.warn('GPS watch error:', err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    // 3-Second High-Frequency Interval Fallback for Continuous Realtime Broadcasting
    const syncInterval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => syncLocation(pos.coords.latitude, pos.coords.longitude),
        null,
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    }, 3000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(syncInterval);
    };
  }, [isOnline, captain?.id, activeRide?.id]);

  const updateRouteForRide = async (ride: Ride, currentPos: [number, number] | null) => {
    const origin = currentPos || [ride.pickup_lat, ride.pickup_lng];
    if (['ACCEPTED', 'CAPTAIN_ARRIVING'].includes(ride.status)) {
      const route = await getDirectionsRoute(origin, [ride.pickup_lat, ride.pickup_lng]);
      setRouteCoords(route.coordinates);
    } else if (['CAPTAIN_ARRIVED', 'IN_PROGRESS', 'OTP_VERIFIED'].includes(ride.status)) {
      const route = await getDirectionsRoute(origin, [ride.destination_lat, ride.destination_lng]);
      setRouteCoords(route.coordinates);
    }
  };

  // Online / Offline Toggle
  const toggleOnlineStatus = async () => {
    if (!captain) return;
    const newOnlineStatus = !isOnline;

    const { error } = await supabase
      .from('captains')
      .update({ online_status: newOnlineStatus })
      .eq('id', captain.id);

    if (!error) {
      setIsOnline(newOnlineStatus);
      if (!newOnlineStatus) {
        setIncomingRequest(null);
      }
    }
  };

  // Realtime Listener for Incoming Ride Requests
  useEffect(() => {
    if (!isOnline || !captain || activeRide) return;

    const channel = supabase
      .channel(`captain_requests_${captain.vehicle_type}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rides',
          filter: `status=eq.SEARCHING`,
        },
        async (payload) => {
          const ride = payload.new as Ride;
          if (ride.vehicle_type === captain.vehicle_type) {
            setIncomingRequest(ride);
            setRequestTimeout(30);
            soundEffects.playRideRequestChime();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOnline, captain?.vehicle_type, activeRide]);

  // Request countdown timer
  useEffect(() => {
    if (incomingRequest) {
      if (requestTimeout <= 0) {
        setIncomingRequest(null);
        return;
      }

      const timer = setTimeout(() => {
        setRequestTimeout((prev) => prev - 1);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [incomingRequest, requestTimeout]);

  // Accept Ride (Prevents double acceptance via RPC)
  const handleAcceptRide = async () => {
    if (!incomingRequest || !captain) return;

    setAcceptingLoading(true);
    try {
      const { data, error } = await supabase.rpc('accept_ride', {
        p_ride_id: incomingRequest.id,
        p_captain_id: captain.id,
      });

      if (error) throw error;

      const res = data as any;
      if (res.success) {
        setActiveRide(res.ride);
        setIncomingRequest(null);
        updateRouteForRide(res.ride, gpsCoords);
      } else {
        alert(res.message || 'Ride request was accepted by another captain.');
        setIncomingRequest(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to accept ride');
    } finally {
      setAcceptingLoading(false);
    }
  };

  // State Transitions
  const handleMarkArrived = async () => {
    if (!activeRide) return;
    const { data, error } = await supabase
      .from('rides')
      .update({ status: 'CAPTAIN_ARRIVED', updated_at: new Date().toISOString() })
      .eq('id', activeRide.id)
      .select()
      .single();

    if (!error && data) {
      setActiveRide(data as Ride);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRide || !captain || !otpInput.trim()) return;

    setOtpError('');
    const { data, error } = await supabase.rpc('verify_otp', {
      p_ride_id: activeRide.id,
      p_captain_id: captain.id,
      p_otp: otpInput.trim(),
    });

    if (error) {
      setOtpError(error.message);
      return;
    }

    const res = data as any;
    if (res.success) {
      setActiveRide(res.ride);
      setOtpInput('');
      updateRouteForRide(res.ride, gpsCoords);
    } else {
      setOtpError(res.message || 'Invalid OTP code');
    }
  };

  const handleCompleteRide = async () => {
    if (!activeRide || !captain) return;

    const { data, error } = await supabase.rpc('complete_ride', {
      p_ride_id: activeRide.id,
      p_captain_id: captain.id,
    });

    if (!error) {
      setTodayEarnings((prev) => prev + (activeRide.estimated_fare || 0));
      setCompletedTripsCount((prev) => prev + 1);
      alert(`Ride completed! Fare of ₹${activeRide.estimated_fare} recorded in your earnings.`);
      setActiveRide(null);
      setRouteCoords([]);
    }
  };

  const handleCancelRide = async (reason = 'Cancelled by captain') => {
    if (!activeRide || !profile) return;

    try {
      const { error } = await supabase.rpc('cancel_ride', {
        p_ride_id: activeRide.id,
        p_user_id: profile.id,
        p_reason: reason,
      });

      if (!error) {
        setActiveRide(null);
        setRouteCoords([]);
      } else {
        alert(error.message || 'Failed to cancel ride');
      }
    } catch (err: any) {
      alert(err.message || 'Error cancelling ride');
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-sans">
        <div className="h-16 w-16 rounded-3xl bg-amber-500 flex items-center justify-center text-slate-950 font-black mb-4 shadow-2xl animate-pulse">
          <Bike className="h-10 w-10" />
        </div>
        <h1 className="text-3xl font-black tracking-wider text-amber-400 mb-1">RIDEON CAPTAIN</h1>
        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">
          <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
          <span>Starting Captain Dashboard...</span>
        </div>
      </div>
    );
  }

  const ratingAvg = captain && captain.rating_count > 0
    ? (captain.rating_sum / captain.rating_count).toFixed(1)
    : '5.0';

  return (
    <div className="relative h-screen w-full bg-slate-100 dark:bg-slate-950 flex flex-col overflow-hidden text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      <Navbar
        role="CAPTAIN"
        userName={profile?.name}
        userProfile={profile}
        onProfileUpdate={(updated) => setProfile(updated)}
        onOpenProfile={() => setIsCaptainProfileOpen(true)}
      />

      {/* Main Map View */}
      <div className="relative flex-1 w-full overflow-hidden">
        <div className="absolute inset-0 z-0">
          <MapContainer
            center={gpsCoords || [28.6139, 77.209]}
            zoom={15}
            captainLocation={gpsCoords}
            pickupLocation={activeRide ? [activeRide.pickup_lat, activeRide.pickup_lng] : null}
            destinationLocation={activeRide ? [activeRide.destination_lat, activeRide.destination_lng] : null}
            routeCoordinates={routeCoords}
          />
        </div>

        {/* UNIFIED RAPIDO TOP CAPTAIN DASHBOARD BAR */}
        <div className="absolute top-3 inset-x-3 sm:inset-x-4 z-20 max-w-lg mx-auto pointer-events-auto space-y-2">
          <div className="rounded-3xl bg-white/95 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 p-2.5 px-4 shadow-xl backdrop-blur-2xl flex items-center justify-between gap-2">
            {/* Left: Today Earnings & Trips */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                  <DollarSign className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-extrabold text-slate-400 block tracking-wider">Earned</span>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">₹{todayEarnings}</span>
                </div>
              </div>

              <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />

              <div>
                <span className="text-[9px] uppercase font-extrabold text-slate-400 block tracking-wider">Trips</span>
                <span className="text-xs font-black text-slate-900 dark:text-slate-100">{completedTripsCount}</span>
              </div>
            </div>

            {/* Right: GPS Location Pill & Refresh */}
            <div className="flex items-center gap-1.5 max-w-[50%] min-w-0 pl-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-bold truncate">
                <MapPin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span className="truncate text-[11px] font-semibold">{captainAddress}</span>
              </div>

              <button
                onClick={detectCaptainLocation}
                disabled={isDetectingGps}
                title="Refresh GPS location"
                className="p-1 rounded-full text-slate-400 hover:text-amber-500 shrink-0 transition-colors"
              >
                {isDetectingGps ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                ) : (
                  <Crosshair className="h-3.5 w-3.5 text-slate-400 hover:text-amber-500" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* DOCKED FULL-WIDTH CAPTAIN BOTTOM DASHBOARD SHEET */}
        <div className="absolute inset-x-0 bottom-0 z-20 max-w-lg mx-auto w-full pointer-events-auto">
          {/* CASE A: OFFLINE STATE */}
          {!isOnline && !activeRide && (
            <div className="rounded-t-[32px] bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-4 sm:p-5 pb-6 shadow-2xl backdrop-blur-2xl space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-3 w-3 rounded-full bg-slate-400" />
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">You Are Currently Offline</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Go online to start receiving ride requests</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-xl">
                  <Star className="h-3.5 w-3.5 fill-amber-500" />
                  <span>{ratingAvg}</span>
                </div>
              </div>

              {/* PRIMARY CTA: GO ONLINE */}
              <button
                onClick={toggleOnlineStatus}
                className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-emerald-500 py-3.5 text-sm font-extrabold tracking-wider uppercase text-slate-950 hover:bg-emerald-400 transition-colors shadow-md active:scale-[0.99]"
              >
                <Power className="h-5 w-5" />
                <span>GO ONLINE TO START EARNING</span>
              </button>
            </div>
          )}

          {/* CASE B: ONLINE STATE */}
          {isOnline && !incomingRequest && !activeRide && (
            <div className="rounded-t-[32px] bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-4 sm:p-5 pb-6 shadow-2xl backdrop-blur-2xl space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <div>
                    <h3 className="font-black text-sm text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Radio className="h-4 w-4 animate-pulse text-emerald-500" />
                      YOU ARE ONLINE
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Searching nearby ride requests...</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Today</span>
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100">₹{todayEarnings}</span>
                </div>
              </div>

              {/* GO OFFLINE BUTTON */}
              <button
                onClick={toggleOnlineStatus}
                className="w-full rounded-2xl bg-slate-100 dark:bg-slate-900 py-3 text-xs font-bold text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors uppercase tracking-wider"
              >
                GO OFFLINE
              </button>
            </div>
          )}

          {/* CASE C: INCOMING RIDE REQUEST POPUP SHEET */}
          {incomingRequest && !activeRide && (
            <div className="rounded-t-[32px] bg-white dark:bg-slate-950 border-t-4 border-amber-500 p-5 pb-6 shadow-2xl backdrop-blur-2xl text-slate-900 dark:text-slate-100 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping" />
                  <h3 className="font-black text-xs tracking-wider uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" />
                    NEW RIDE REQUEST
                  </h3>
                </div>
                <div className="flex items-center gap-1 text-xs font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-xl border border-amber-500/20">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{requestTimeout}s</span>
                </div>
              </div>

              <div className="space-y-2 text-xs bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800/80">
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Pickup</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{incomingRequest.pickup_address}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800/60">
                  <Navigation className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Destination</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{incomingRequest.destination_address}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-800/80 pt-2.5 font-bold text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Distance: <strong className="text-slate-900 dark:text-slate-200 font-black">{incomingRequest.distance_km} km</strong></span>
                  <span className="text-slate-500 dark:text-slate-400">Payout: <strong className="text-emerald-500 text-base font-black">₹{incomingRequest.estimated_fare}</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => setIncomingRequest(null)}
                  className="rounded-2xl bg-slate-100 dark:bg-slate-900 py-3.5 text-xs font-bold text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  REJECT
                </button>
                <button
                  onClick={handleAcceptRide}
                  disabled={acceptingLoading}
                  className="rounded-2xl bg-amber-400 py-3.5 text-xs font-extrabold uppercase text-slate-950 hover:bg-amber-300 transition-colors flex items-center justify-center gap-1.5 shadow-md active:scale-[0.99]"
                >
                  {acceptingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ACCEPT RIDE'}
                </button>
              </div>
            </div>
          )}

          {/* CASE D: ACTIVE RIDE NAVIGATION DASHBOARD SHEET */}
          {activeRide && (
            <div className="rounded-t-[32px] bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-4 sm:p-5 pb-6 shadow-2xl backdrop-blur-2xl space-y-3.5 max-h-[82vh] overflow-y-auto overscroll-contain">
              {/* HEADER STATUS BADGE & TITLE */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <div>
                  <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {activeRide.status.replace('_', ' ')}
                  </span>
                  <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm mt-1.5">
                    {activeRide.status === 'ACCEPTED' && 'Navigate to Pickup Location'}
                    {activeRide.status === 'CAPTAIN_ARRIVED' && 'Verify 4-Digit OTP from Customer'}
                    {['OTP_VERIFIED', 'IN_PROGRESS'].includes(activeRide.status) && 'Driving to Destination'}
                  </h3>
                </div>

                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-2xl">
                  ₹{activeRide.estimated_fare}
                </span>
              </div>

              {/* CUSTOMER PROFILE & DIRECT COMMUNICATION CARD */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-500 font-bold shrink-0 shadow-inner">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Rider</span>
                    <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs truncate">
                      {activeRide.customer?.name || 'Customer'}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                      {activeRide.customer?.phone || '+91 98765 43210'}
                    </p>
                  </div>
                </div>

                {/* 3 EQUALLY SPACED ACTION BUTTONS (CALL, CHAT, NAVIGATE) */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                  <button
                    onClick={() => {
                      const num = (activeRide.customer?.phone || '+919876543210').replace(/[^0-9+]/g, '');
                      window.location.href = `tel:${num}`;
                    }}
                    title="Call Customer"
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-2 text-xs font-black shadow-sm transition-transform active:scale-95"
                  >
                    <Phone className="h-3.5 w-3.5 fill-slate-950" />
                    <span>Call</span>
                  </button>

                  <button
                    onClick={() => setIsChatOpen(true)}
                    title="Chat with Customer"
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 py-2 text-xs font-extrabold shadow-sm transition-transform active:scale-95"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Chat</span>
                  </button>

                  <button
                    onClick={() => setIsNavigating(true)}
                    title="Start Live GPS Navigation"
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white py-2 text-xs font-extrabold shadow-sm transition-transform active:scale-95"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    <span>Navigate</span>
                  </button>
                </div>
              </div>

              {/* CONNECTED ROUTE SUMMARY CARD (PICKUP -> DESTINATION) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Pickup</span>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{activeRide.pickup_address}</p>
                  </div>
                </div>

                <div className="ml-1 pl-4 border-l-2 border-dashed border-slate-300 dark:border-slate-700 py-0.5">
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">{activeRide.distance_km} km total trip</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Destination</span>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{activeRide.destination_address}</p>
                  </div>
                </div>
              </div>

              {/* COLLAPSIBLE FARE BREAKDOWN FOR CAPTAIN */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900/40">
                <button
                  onClick={() => setShowFareBreakdown(!showFareBreakdown)}
                  className="w-full flex items-center justify-between p-3 text-xs font-extrabold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-emerald-500" />
                    <span>Fare & Payout Breakdown</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-emerald-600 dark:text-emerald-400 font-black">₹{activeRide.estimated_fare}</span>
                    {showFareBreakdown ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </div>
                </button>

                {showFareBreakdown && (
                  <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 space-y-2 text-xs">
                    {(() => {
                      const breakdown = getFareBreakdown(activeRide.distance_km || 1, activeRide.vehicle_type || 'BIKE');
                      return (
                        <>
                          <div className="flex justify-between text-slate-500 dark:text-slate-400">
                            <span>Base Trip Rate</span>
                            <span>₹{breakdown.baseFare}</span>
                          </div>
                          <div className="flex justify-between text-slate-500 dark:text-slate-400">
                            <span>Distance Payout ({activeRide.distance_km} km)</span>
                            <span>₹{breakdown.distanceCharge}</span>
                          </div>
                          <div className="flex justify-between text-slate-500 dark:text-slate-400">
                            <span>Platform Fee</span>
                            <span>₹{breakdown.bookingFee}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-800 font-black text-slate-900 dark:text-slate-100">
                            <span>Total Cash Collection</span>
                            <span className="text-emerald-500 text-sm">₹{activeRide.estimated_fare}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* PRIMARY RIDE STATE ACTIONS */}
              {activeRide.status === 'ACCEPTED' && (
                <button
                  onClick={handleMarkArrived}
                  className="w-full rounded-2xl bg-amber-400 py-3.5 text-xs font-extrabold uppercase tracking-wider text-slate-950 hover:bg-amber-300 transition-transform active:scale-[0.99] shadow-md"
                >
                  ARRIVED AT PICKUP
                </button>
              )}

              {activeRide.status === 'CAPTAIN_ARRIVED' && (
                <form onSubmit={handleVerifyOtp} className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Enter Customer 4-digit OTP</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={4}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      placeholder="e.g. 1234"
                      className="flex-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-center text-base font-mono font-bold tracking-widest text-amber-600 dark:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="submit"
                      className="rounded-2xl bg-emerald-500 px-5 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-emerald-400 shadow-md"
                    >
                      START
                    </button>
                  </div>
                  {otpError && <p className="text-xs text-rose-500 font-medium">{otpError}</p>}
                </form>
              )}

              {activeRide.status === 'IN_PROGRESS' && (
                <button
                  onClick={handleCompleteRide}
                  className="w-full rounded-2xl bg-emerald-500 py-3.5 text-xs font-extrabold uppercase tracking-wider text-slate-950 hover:bg-emerald-400 transition-transform active:scale-[0.99] shadow-md"
                >
                  COMPLETE RIDE & COLLECT ₹{activeRide.estimated_fare}
                </button>
              )}

              {/* RED CANCEL RIDE BUTTON IN CAPTAIN DASHBOARD */}
              <button
                onClick={() => setIsCancelModalOpen(true)}
                className="w-full rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-3.5 text-xs transition-colors shadow-sm"
              >
                Cancel Ride
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Realtime Chat Drawer */}
      {activeRide && profile && (
        <ChatDrawer
          rideId={activeRide.id}
          currentUserId={profile.id}
          currentUserRole="CAPTAIN"
          recipientName={activeRide.customer?.name || 'Customer'}
          recipientPhone={activeRide.customer?.phone || '+91 98765 43210'}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}

      {/* Cancel Ride Modal with Reasons & Green/Red Confirmation */}
      <CancelRideModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirmCancel={(reason) => {
          setIsCancelModalOpen(false);
          handleCancelRide(reason);
        }}
        role="CAPTAIN"
      />

      {/* Captain Profile & Vehicle Drawer */}
      <CaptainProfileDrawer
        isOpen={isCaptainProfileOpen}
        onClose={() => setIsCaptainProfileOpen(false)}
        profile={profile}
        captain={captain}
        onUpdate={(updatedProf, updatedCapt) => {
          setProfile(updatedProf);
          setCaptain(updatedCapt);
        }}
      />

      {/* Turn-by-Turn Navigation Overlay */}
      {activeRide && (
        <CaptainNavigationOverlay
          isOpen={isNavigating}
          onClose={() => setIsNavigating(false)}
          ride={activeRide}
        />
      )}
    </div>
  );
}
