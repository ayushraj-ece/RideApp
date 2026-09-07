'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/ui/Navbar';
import MapContainer from '@/components/map/MapContainer';
import ChatDrawer from '@/components/chat/ChatDrawer';
import { createClient } from '@/lib/supabase/client';
import { Ride, UserProfile, CaptainProfile } from '@/types/ride';
import { getDirectionsRoute, calculateHaversineDistance } from '@/lib/maps';
import { soundEffects } from '@/lib/audio/soundEffects';
import {
  Power,
  Navigation,
  MapPin,
  MessageSquare,
  CheckCircle2,
  XCircle,
  KeyRound,
  Loader2,
  DollarSign,
  Star,
  Check,
} from 'lucide-react';

export default function CaptainHomePage() {
  const router = useRouter();
  const supabase = createClient();

  // Captain Profile & Online state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [captain, setCaptain] = useState<CaptainProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // GPS position tracking
  const [gpsCoords, setGpsCoords] = useState<[number, number] | null>(null);
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

  // Drawers
  const [isChatOpen, setIsChatOpen] = useState(false);

  // 1. Initialize Captain Profile
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
          setGpsCoords([capt.latitude, capt.longitude]);
        }
      }
      setLoading(false);

      // Check if captain has an existing active ride
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

  // 2. GPS Location Tracker loop when Online
  useEffect(() => {
    if (!isOnline || !captain || typeof window === 'undefined' || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const coords: [number, number] = [lat, lng];
        setGpsCoords(coords);

        // Update database via RPC
        await supabase.rpc('update_captain_location', {
          p_captain_id: captain.id,
          p_lat: lat,
          p_lng: lng,
        });

        if (activeRide) {
          updateRouteForRide(activeRide, coords);
        }
      },
      (err) => console.warn('GPS error:', err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isOnline, captain?.id, activeRide?.id]);

  // Helper to update navigation route based on ride stage
  const updateRouteForRide = async (ride: Ride, currentPos: [number, number] | null) => {
    const origin = currentPos || [ride.pickup_lat, ride.pickup_lng];
    if (['ACCEPTED', 'CAPTAIN_ARRIVING'].includes(ride.status)) {
      // Route to pickup
      const route = await getDirectionsRoute(origin, [ride.pickup_lat, ride.pickup_lng]);
      setRouteCoords(route.coordinates);
    } else if (['CAPTAIN_ARRIVED', 'IN_PROGRESS', 'OTP_VERIFIED'].includes(ride.status)) {
      // Route to destination
      const route = await getDirectionsRoute(origin, [ride.destination_lat, ride.destination_lng]);
      setRouteCoords(route.coordinates);
    }
  };

  // 3. Online / Offline Toggle
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

  // 4. Realtime Listener for Incoming Ride Requests matching Captain's vehicle type
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

  // 5. Accept Ride (Prevents double acceptance via RPC)
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

  // 6. Captain State Transitions: Arrived -> Verify OTP -> Complete Ride
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
      alert(`Ride completed! Fare of ₹${activeRide.estimated_fare} recorded in your earnings.`);
      setActiveRide(null);
      setRouteCoords([]);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400 mb-2" />
        <p className="text-sm font-medium">Loading Captain Portal...</p>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full bg-slate-950 flex flex-col overflow-hidden text-slate-100">
      <Navbar role="CAPTAIN" userName={profile?.name} />

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

        {/* Top Controls: ONLINE/OFFLINE Banner */}
        <div className="absolute top-4 inset-x-3 sm:inset-x-4 z-20 flex justify-between items-center max-w-md mx-auto pointer-events-auto">
          <button
            onClick={toggleOnlineStatus}
            disabled={!!activeRide}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-extrabold text-sm shadow-2xl backdrop-blur-md transition-all ${
              isOnline
                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                : 'bg-slate-900/90 text-slate-400 border border-slate-700 hover:text-white'
            }`}
          >
            <Power className="h-5 w-5" />
            <span>{isOnline ? 'ONLINE (RECEIVING RIDES)' : 'GO ONLINE'}</span>
          </button>

          {captain && (
            <div className="flex items-center gap-2 rounded-2xl bg-slate-900/90 border border-slate-800 px-3.5 py-2.5 shadow-xl text-xs font-bold text-amber-400">
              <span>{captain.vehicle_type}</span>
              <span className="text-slate-400 font-normal">| {captain.vehicle_number}</span>
            </div>
          )}
        </div>

        {/* BOTTOM CARDS */}
        <div className="absolute bottom-4 inset-x-3 sm:inset-x-4 z-20 max-w-md mx-auto pointer-events-auto">
          {/* POPUP 1: REALTIME INCOMING RIDE REQUEST */}
          {incomingRequest && !activeRide && (
            <div className="rounded-3xl bg-slate-900 border-2 border-amber-400 p-5 shadow-2xl animate-bounce-short text-slate-100">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-amber-400 animate-ping" />
                  <h3 className="font-bold text-base text-amber-400">NEW RIDE REQUEST!</h3>
                </div>
                <span className="text-xs font-mono font-bold bg-amber-500/20 text-amber-400 px-2 py-1 rounded-lg">
                  {requestTimeout}s
                </span>
              </div>

              <div className="space-y-2 text-xs mb-4">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 text-[10px]">PICKUP</span>
                    <p className="font-semibold text-slate-200">{incomingRequest.pickup_address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Navigation className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 text-[10px]">DESTINATION</span>
                    <p className="font-semibold text-slate-200">{incomingRequest.destination_address}</p>
                  </div>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2 font-bold text-sm">
                  <span>Distance: <span className="text-amber-400">{incomingRequest.distance_km} km</span></span>
                  <span>Fare: <span className="text-emerald-400">₹{incomingRequest.estimated_fare}</span></span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setIncomingRequest(null)}
                  className="rounded-xl bg-slate-800 py-3 text-xs font-bold text-rose-400 border border-slate-700 hover:bg-slate-700"
                >
                  REJECT
                </button>
                <button
                  onClick={handleAcceptRide}
                  disabled={acceptingLoading}
                  className="rounded-xl bg-amber-400 py-3 text-xs font-bold text-slate-950 hover:bg-amber-300 transition-colors flex items-center justify-center gap-1 shadow-lg"
                >
                  {acceptingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ACCEPT RIDE'}
                </button>
              </div>
            </div>
          )}

          {/* ACTIVE RIDE PANEL */}
          {activeRide && (
            <div className="rounded-3xl bg-slate-900/95 border border-slate-800 p-5 shadow-2xl backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {activeRide.status.replace('_', ' ')}
                  </span>
                  <h3 className="font-bold text-slate-100 text-sm mt-1">
                    {activeRide.status === 'ACCEPTED' && 'Navigate to Pickup Point'}
                    {activeRide.status === 'CAPTAIN_ARRIVED' && 'Enter Customer Start OTP'}
                    {activeRide.status === 'IN_PROGRESS' && 'Driving to Destination'}
                  </h3>
                </div>

                <button
                  onClick={() => setIsChatOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
                >
                  <MessageSquare className="h-4 w-4" />
                  Chat
                </button>
              </div>

              {/* Ride Address Details */}
              <div className="space-y-2 text-xs bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
                <div className="flex justify-between">
                  <span className="text-slate-400">Target</span>
                  <span className="font-bold text-amber-400">
                    {['ACCEPTED', 'CAPTAIN_ARRIVING'].includes(activeRide.status) ? 'Pickup' : 'Destination'}
                  </span>
                </div>
                <p className="font-semibold text-slate-200 text-sm">
                  {['ACCEPTED', 'CAPTAIN_ARRIVING'].includes(activeRide.status)
                    ? activeRide.pickup_address
                    : activeRide.destination_address}
                </p>
                <div className="flex justify-between border-t border-slate-700/50 pt-2 font-semibold">
                  <span>Distance: {activeRide.distance_km} km</span>
                  <span className="text-emerald-400 font-bold">Collect Cash/UPI: ₹{activeRide.estimated_fare}</span>
                </div>
              </div>

              {/* STEP 1: MARK ARRIVED */}
              {activeRide.status === 'ACCEPTED' && (
                <button
                  onClick={handleMarkArrived}
                  className="w-full rounded-2xl bg-amber-400 py-3 text-sm font-bold text-slate-950 hover:bg-amber-300 transition-colors shadow-lg"
                >
                  I HAVE ARRIVED AT PICKUP
                </button>
              )}

              {/* STEP 2: VERIFY OTP FORM */}
              {activeRide.status === 'CAPTAIN_ARRIVED' && (
                <form onSubmit={handleVerifyOtp} className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300">Enter Customer 4-digit OTP</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={4}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      placeholder="e.g. 1234"
                      className="flex-1 rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-center text-lg font-mono font-bold tracking-widest text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="submit"
                      className="rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                    >
                      START RIDE
                    </button>
                  </div>
                  {otpError && <p className="text-xs text-rose-400">{otpError}</p>}
                </form>
              )}

              {/* STEP 3: COMPLETE RIDE */}
              {activeRide.status === 'IN_PROGRESS' && (
                <button
                  onClick={handleCompleteRide}
                  className="w-full rounded-2xl bg-emerald-500 py-3.5 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition-colors shadow-lg"
                >
                  COMPLETE RIDE & COLLECT FARE (₹{activeRide.estimated_fare})
                </button>
              )}
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
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </div>
  );
}
