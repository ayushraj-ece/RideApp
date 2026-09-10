'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/ui/Navbar';
import MapContainer from '@/components/map/MapContainer';
import ChatDrawer from '@/components/chat/ChatDrawer';
import CancelRideModal from '@/components/ride/CancelRideModal';
import CaptainProfileDrawer from '@/components/profile/CaptainProfileDrawer';
import CaptainBottomNav from '@/components/ui/CaptainBottomNav';
import { createClient } from '@/lib/supabase/client';
import { requestAndGetCurrentLocation } from '@/lib/location';
import { Ride, UserProfile, CaptainProfile } from '@/types/ride';
import { getDirectionsRoute, reverseGeocode } from '@/lib/maps';
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
  Package,
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

  // Live GPS position & Address tracking (matching user app location engine)
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
  const [dropOtpInput, setDropOtpInput] = useState('');
  const [dropOtpError, setDropOtpError] = useState('');

  // Drawers & Modals
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showFareBreakdown, setShowFareBreakdown] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCaptainProfileOpen, setIsCaptainProfileOpen] = useState(false);
  const [isCardCollapsed, setIsCardCollapsed] = useState(false);
  const [isLocationExpanded, setIsLocationExpanded] = useState(false);

  const lastDbUpdateRef = useRef<number>(0);
  const nearbyChannelRef = useRef<any>(null);
  const assignedChannelRef = useRef<any>(null);

  // 1. High-Accuracy GPS Auto-Detection (matching customer app logic)
  const detectCaptainLocation = async () => {
    setIsDetectingGps(true);
    const coords = await requestAndGetCurrentLocation();
    let finalCoords: [number, number];

    if (coords) {
      finalCoords = coords;
    } else if (captain?.latitude && captain?.longitude) {
      finalCoords = [captain.latitude, captain.longitude];
    } else {
      finalCoords = [28.6139, 77.209]; // Default New Delhi fallback
    }

    setGpsCoords(finalCoords);

    const addr = await reverseGeocode(finalCoords[0], finalCoords[1]);
    setCaptainAddress(addr);
    setIsDetectingGps(false);

    if (captain) {
      await supabase.rpc('update_captain_location', {
        p_captain_id: captain.id,
        p_lat: finalCoords[0],
        p_lng: finalCoords[1],
      });
    }
  };

  // 2. Initialize Captain Profile & Daily Earnings Stats
  useEffect(() => {
    async function initCaptain() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
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
          const initialCoords: [number, number] = [capt.latitude, capt.longitude];
          setGpsCoords(initialCoords);
          reverseGeocode(capt.latitude, capt.longitude).then((addr) =>
            setCaptainAddress(addr)
          );
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

      // Check for active existing ride
      const { data: activeRides } = await supabase
        .from('rides')
        .select('*, customer:profiles!rides_customer_id_fkey(*)')
        .eq('captain_id', session.user.id)
        .in('status', [
          'ACCEPTED',
          'CAPTAIN_ARRIVING',
          'CAPTAIN_ARRIVED',
          'OTP_VERIFIED',
          'IN_PROGRESS',
        ])
        .order('updated_at', { ascending: false })
        .limit(1);

      if (activeRides && activeRides.length > 0) {
        const ride = activeRides[0] as any;
        setActiveRide(ride);
      }
    }

    initCaptain();
  }, []);

  // Run location detection on mount
  useEffect(() => {
    detectCaptainLocation();
  }, [captain?.id]);

  // 3. Continuous Geolocation Watching & Broadcast Loop (matching customer app logic)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncLocation = (lat: number, lng: number, heading?: number | null) => {
      const coords: [number, number] = [lat, lng];
      setGpsCoords(coords);

      if (captain?.id && (isOnline || activeRide)) {
        const payload = {
          captain_id: captain.id,
          latitude: lat,
          longitude: lng,
          heading: heading || null,
          vehicle_type: captain.vehicle_type,
          timestamp: Date.now(),
        };

        if (assignedChannelRef.current) {
          assignedChannelRef.current.send({
            type: 'broadcast',
            event: 'location_update',
            payload,
          });
        }

        if (nearbyChannelRef.current) {
          nearbyChannelRef.current.send({
            type: 'broadcast',
            event: 'location_update',
            payload,
          });
        }

        const now = Date.now();
        if (now - lastDbUpdateRef.current > 2000) {
          lastDbUpdateRef.current = now;
          supabase.rpc('update_captain_location', {
            p_captain_id: captain.id,
            p_lat: lat,
            p_lng: lng,
          });
        }
      }
    };

    let watchId: number | null = null;
    if (navigator.geolocation) {
      try {
        watchId = navigator.geolocation.watchPosition(
          (pos) =>
            syncLocation(
              pos.coords.latitude,
              pos.coords.longitude,
              pos.coords.heading
            ),
          (err) => console.warn('Captain GPS watch error:', err),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
      } catch (e) {
        console.warn('watchPosition error:', e);
      }
    }

    // 3-Second Fallback Polling Interval
    const intervalId = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (pos?.coords?.latitude && pos?.coords?.longitude) {
              syncLocation(
                pos.coords.latitude,
                pos.coords.longitude,
                pos.coords.heading
              );
            }
          },
          null,
          { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
        );
      }
    }, 3000);

    return () => {
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
      clearInterval(intervalId);
    };
  }, [isOnline, captain?.id, activeRide?.id]);

  // 4. Realtime Channels for Incoming Ride Requests
  useEffect(() => {
    if (!captain?.id || !isOnline) {
      nearbyChannelRef.current = null;
      assignedChannelRef.current = null;
      return;
    }

    const globalChan = supabase.channel('nearby_captains_live');
    globalChan.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        nearbyChannelRef.current = globalChan;
      }
    });

    const captChan = supabase.channel(`captain_loc_${captain.id}`);
    captChan.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        assignedChannelRef.current = captChan;
      }
    });

    return () => {
      supabase.removeChannel(globalChan);
      supabase.removeChannel(captChan);
    };
  }, [captain?.id, isOnline]);

  // Listen for SEARCHING ride requests in Supabase Realtime when online & available
  useEffect(() => {
    if (!captain || !isOnline || activeRide) return;

    const rideChannel = supabase
      .channel('searching_rides_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rides',
          filter: `status=eq.SEARCHING`,
        },
        async (payload) => {
          const newRide = payload.new as Ride;
          if (newRide.vehicle_type === captain.vehicle_type) {
            const { data: customerProf } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', newRide.customer_id)
              .single();

            const rideWithCustomer = {
              ...newRide,
              customer: customerProf as UserProfile,
            };

            setIncomingRequest(rideWithCustomer);
            setRequestTimeout(30);
            soundEffects.playRideRequestSound();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rideChannel);
    };
  }, [captain, isOnline, activeRide]);

  // Incoming Request Countdown Timer
  useEffect(() => {
    if (!incomingRequest) return;
    const timer = setInterval(() => {
      setRequestTimeout((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIncomingRequest(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [incomingRequest]);

  // 5. Dynamic Route Calculation (Blue Polyline Path)
  useEffect(() => {
    async function updateRoute() {
      const currentPos = gpsCoords ||
        (captain?.latitude && captain?.longitude
          ? [captain.latitude, captain.longitude]
          : null);

      if (activeRide) {
        const startPoint: [number, number] = currentPos || [
          activeRide.pickup_lat,
          activeRide.pickup_lng,
        ];

        if (['ACCEPTED', 'CAPTAIN_ARRIVING'].includes(activeRide.status)) {
          const route = await getDirectionsRoute(startPoint, [
            activeRide.pickup_lat,
            activeRide.pickup_lng,
          ]);
          setRouteCoords(route.coordinates);
        } else if (
          ['CAPTAIN_ARRIVED', 'OTP_VERIFIED', 'IN_PROGRESS'].includes(
            activeRide.status
          )
        ) {
          const route = await getDirectionsRoute(startPoint, [
            activeRide.destination_lat,
            activeRide.destination_lng,
          ]);
          setRouteCoords(route.coordinates);
        }
      } else if (incomingRequest) {
        const route = await getDirectionsRoute(
          [incomingRequest.pickup_lat, incomingRequest.pickup_lng],
          [incomingRequest.destination_lat, incomingRequest.destination_lng]
        );
        setRouteCoords(route.coordinates);
      } else {
        setRouteCoords([]);
      }
    }

    updateRoute();
  }, [
    activeRide?.status,
    activeRide?.id,
    incomingRequest?.id,
    gpsCoords?.[0],
    gpsCoords?.[1],
  ]);

  // Ride Status Realtime Subscription for Active Ride Updates
  useEffect(() => {
    if (!activeRide?.id) return;

    const channel = supabase
      .channel(`ride_captain_${activeRide.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rides',
          filter: `id=eq.${activeRide.id}`,
        },
        (payload) => {
          const updatedRide = payload.new as Ride;
          if (
            updatedRide.status === 'CANCELLED_BY_CUSTOMER' ||
            updatedRide.status === 'CANCELLED_BY_CAPTAIN'
          ) {
            setActiveRide(null);
            setRouteCoords([]);
            soundEffects.playErrorBeep();
            alert('Ride has been cancelled.');
          } else {
            setActiveRide((prev) => (prev ? { ...prev, ...updatedRide } : null));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRide?.id]);

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
      setCaptain({ ...captain, online_status: newOnlineStatus });
      soundEffects.playStatusChangeSound();
    } else {
      alert('Could not update online status.');
    }
  };

  // Accept Ride Request
  const handleAcceptRide = async () => {
    if (!incomingRequest || !captain) return;
    setAcceptingLoading(true);

    try {
      const res = await supabase.rpc('accept_ride', {
        p_ride_id: incomingRequest.id,
        p_captain_id: captain.id,
      });

      if (res.data && res.data.success) {
        soundEffects.playSuccessSound();
        setActiveRide(res.data.ride);
        setIncomingRequest(null);
      } else {
        soundEffects.playErrorBeep();
        alert(res.data?.message || 'Failed to accept ride request.');
        setIncomingRequest(null);
      }
    } catch (err) {
      alert('Error accepting ride.');
    } finally {
      setAcceptingLoading(false);
    }
  };

  // Reject / Ignore Ride Request
  const handleRejectRide = () => {
    setIncomingRequest(null);
  };

  // Mark Captain Arrived at Pickup
  const handleCaptainArrived = async () => {
    if (!activeRide) return;
    const { error } = await supabase
      .from('rides')
      .update({ status: 'CAPTAIN_ARRIVED', updated_at: new Date().toISOString() })
      .eq('id', activeRide.id);

    if (!error) {
      setActiveRide({ ...activeRide, status: 'CAPTAIN_ARRIVED' });
      soundEffects.playStatusChangeSound();
    }
  };

  // Verify Pickup OTP to Start Ride
  const handleVerifyOtp = async () => {
    if (!activeRide || !captain || !otpInput) return;
    setOtpError('');

    const res = await supabase.rpc('verify_otp', {
      p_ride_id: activeRide.id,
      p_captain_id: captain.id,
      p_otp: otpInput.trim(),
    });

    if (res.data && res.data.success) {
      soundEffects.playSuccessSound();
      setActiveRide(res.data.ride);
      setOtpInput('');
    } else {
      soundEffects.playErrorBeep();
      setOtpError(res.data?.message || 'Invalid OTP code.');
    }
  };

  // Complete Ride & Record Earnings
  const handleCompleteRide = async () => {
    if (!activeRide || !captain) return;

    if (activeRide.is_parcel) {
      const expectedDropOtp = activeRide.drop_otp?.trim() || (activeRide as any).dropOtp?.trim();
      if (!dropOtpInput || dropOtpInput.trim().length === 0) {
        setDropOtpError('Drop-off OTP is required to complete parcel drop.');
        soundEffects.playErrorBeep();
        return;
      }
      if (expectedDropOtp && dropOtpInput.trim() !== expectedDropOtp) {
        setDropOtpError('Invalid Drop-off OTP code.');
        soundEffects.playErrorBeep();
        return;
      }
    }

    const res = await supabase.rpc('complete_ride', {
      p_ride_id: activeRide.id,
      p_captain_id: captain.id,
    });

    if (res.data && res.data.success) {
      soundEffects.playSuccessSound();
      const fare = Number(activeRide.estimated_fare);
      setTodayEarnings((prev) => prev + fare);
      setCompletedTripsCount((prev) => prev + 1);
      setActiveRide(null);
      setRouteCoords([]);
      setDropOtpInput('');
      setDropOtpError('');
    } else {
      soundEffects.playErrorBeep();
      alert(res.data?.message || 'Could not complete ride.');
    }
  };

  // Directly launch external Google Maps with precise origin and destination GPS coordinates
  const handleOpenNavigation = () => {
    if (!activeRide) return;

    const isHeadingToPickup = ['ACCEPTED', 'CAPTAIN_ARRIVING', 'CAPTAIN_ARRIVED'].includes(activeRide.status);

    const targetLat = isHeadingToPickup
      ? (activeRide.pickup_lat ?? (activeRide as any).pickup_latitude)
      : (activeRide.destination_lat ?? (activeRide as any).destination_latitude);
    const targetLng = isHeadingToPickup
      ? (activeRide.pickup_lng ?? (activeRide as any).pickup_longitude)
      : (activeRide.destination_lng ?? (activeRide as any).destination_longitude);
    const targetAddress = isHeadingToPickup
      ? activeRide.pickup_address
      : activeRide.destination_address;

    const originPos = gpsCoords || (captain?.latitude && captain?.longitude ? [captain.latitude, captain.longitude] : null);

    let destinationParam = '';
    if (targetLat != null && targetLng != null && !isNaN(Number(targetLat)) && !isNaN(Number(targetLng)) && Number(targetLat) !== 0) {
      destinationParam = `${Number(targetLat)},${Number(targetLng)}`;
    } else if (targetAddress) {
      destinationParam = encodeURIComponent(targetAddress);
    }

    if (!destinationParam) return;

    let url = `https://www.google.com/maps/dir/?api=1&destination=${destinationParam}&travelmode=driving`;

    if (originPos && originPos[0] && originPos[1]) {
      url += `&origin=${Number(originPos[0])},${Number(originPos[1])}`;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200">
        <Loader2 className="h-10 w-10 text-amber-500 animate-spin mb-4" />
        <span className="font-semibold text-sm">Loading Captain Portal...</span>
      </div>
    );
  }

  // Calculate Map Markers
  const activePickupLocation: [number, number] | null = activeRide
    ? [activeRide.pickup_lat, activeRide.pickup_lng]
    : incomingRequest
    ? [incomingRequest.pickup_lat, incomingRequest.pickup_lng]
    : null;

  const activeDestinationLocation: [number, number] | null =
    activeRide &&
    ['CAPTAIN_ARRIVED', 'OTP_VERIFIED', 'IN_PROGRESS'].includes(activeRide.status)
      ? [activeRide.destination_lat, activeRide.destination_lng]
      : incomingRequest
      ? [incomingRequest.destination_lat, incomingRequest.destination_lng]
      : null;

  const effectiveCaptainPos: [number, number] = gpsCoords ||
    (captain?.latitude && captain?.longitude
      ? [captain.latitude, captain.longitude]
      : [28.6139, 77.209]);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* Top Navigation Bar */}
      <Navbar
        role="CAPTAIN"
        userName={profile?.name}
        userProfile={profile}
        onProfileUpdate={(updated) => setProfile(updated)}
        onOpenProfile={() => setIsCaptainProfileOpen(true)}
      />

      {/* Main Fullscreen Interactive Map View */}
      <div className="relative flex-1 w-full overflow-hidden">
        <div className="absolute inset-0 z-0">
          <MapContainer
            center={effectiveCaptainPos}
            zoom={15}
            customerLocation={gpsCoords} // Blue GPS location dot marker
            captainLocation={effectiveCaptainPos} // Top-down Vehicle icon marker
            captainVehicleType={captain?.vehicle_type || 'BIKE'}
            pickupLocation={activePickupLocation} // Green PICKUP badge marker
            destinationLocation={activeDestinationLocation} // Red DROP badge marker
            routeCoordinates={routeCoords} // Blue navigation polyline route
          />
        </div>

        {/* UNIFIED MINIMAL FLOATING HEADER CARD */}
        <div className="absolute top-3.5 inset-x-3.5 z-10 max-w-md mx-auto pointer-events-auto">
          <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-xl backdrop-blur-sm transition-all space-y-2">
            {/* MAIN ALWAYS-VISIBLE SINGLE ROW: EARNINGS & TRIPS + ONLINE STATUS + TINY LOCATION DROPDOWN */}
            <div className="flex items-center justify-between gap-3">
              {/* Left: Earnings & Trips */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white font-sans tracking-tight">
                  ₹{todayEarnings.toFixed(0)}
                </span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 shrink-0">
                  {completedTripsCount} {completedTripsCount === 1 ? 'Trip' : 'Trips'}
                </span>
              </div>

              {/* Right: Online Toggle Button + Tiny Location Dropdown */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={toggleOnlineStatus}
                  className={`px-3 py-1.5 rounded-full font-black text-[11px] tracking-wider uppercase shadow-sm flex items-center gap-1.5 transition-all active:scale-95 border ${
                    isOnline
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-400 shadow-emerald-500/20'
                      : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  {isOnline ? (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-950" />
                    </span>
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                  )}
                  <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                </button>

                {/* Tiny Location Dropdown Button */}
                <button
                  onClick={() => setIsLocationExpanded(!isLocationExpanded)}
                  className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors border border-slate-200/60 dark:border-slate-700/60"
                  title={isLocationExpanded ? "Hide location details" : "Show location details"}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isLocationExpanded ? 'rotate-180 text-amber-500' : ''}`} />
                </button>
              </div>
            </div>

            {/* EXPANDABLE LOCATION DROPDOWN ROW */}
            {isLocationExpanded && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 animate-in fade-in duration-150">
                <button
                  onClick={detectCaptainLocation}
                  className="flex items-center gap-2 min-w-0 text-left hover:opacity-80 transition-opacity group flex-1"
                  title="Click to refresh GPS location"
                >
                  <div className="h-5 w-5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                    <Crosshair
                      className={`h-3 w-3 ${isDetectingGps ? 'animate-spin text-amber-500' : ''}`}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate group-hover:text-amber-500 transition-colors">
                    {captainAddress}
                  </span>
                </button>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-500/20 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> GPS
                </span>
              </div>
            )}
          </div>
        </div>

        {/* INCOMING RIDE REQUEST MODAL OVERLAY */}
        {incomingRequest && (
          <div className="absolute inset-x-4 bottom-16 sm:bottom-20 z-30 max-w-md mx-auto pointer-events-auto bg-slate-900 border-2 border-amber-500 rounded-3xl p-5 shadow-2xl text-slate-100 animate-in slide-in-from-bottom-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                </span>
                <span className="font-black text-amber-400 text-xs uppercase tracking-wider">
                  NEW RIDE REQUEST ({requestTimeout}s)
                </span>
              </div>
              <span className="text-xl font-black text-emerald-400">
                ₹{incomingRequest.estimated_fare}
              </span>
            </div>

            {/* Ride Details */}
            <div className="space-y-3 bg-slate-800 rounded-2xl p-3.5 border border-slate-700 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">PICKUP</p>
                  <p className="font-semibold text-slate-200">
                    {incomingRequest.pickup_address}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="h-2 w-2 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">DROP-OFF</p>
                  <p className="font-semibold text-slate-200">
                    {incomingRequest.destination_address}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1 text-slate-300 font-medium">
                <span>Distance: {incomingRequest.distance_km} km</span>
                <span className="uppercase px-2 py-0.5 rounded bg-slate-700 font-bold text-amber-400">
                  {incomingRequest.vehicle_type}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-4">
              <button
                onClick={handleRejectRide}
                className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-extrabold text-xs text-slate-300 transition-colors"
              >
                PASS / DECLINE
              </button>

              <button
                onClick={handleAcceptRide}
                disabled={acceptingLoading}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 font-extrabold text-xs text-slate-950 transition-transform active:scale-95 shadow-lg flex items-center justify-center gap-2"
              >
                {acceptingLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>ACCEPT RIDE</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ACTIVE RIDE CARD OVERLAY (MINIMAL 10% SHEET DEFAULT FOR 90% MAP VIEW) */}
        {activeRide && !incomingRequest && (
          <div className="absolute inset-x-4 bottom-16 sm:bottom-20 z-20 max-w-md mx-auto pointer-events-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl transition-all">
            {/* Header Status */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 truncate">
                <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-black text-[10px] uppercase tracking-wider">
                  {activeRide.status.replace(/_/g, ' ')}
                </span>
                {activeRide.is_parcel && (
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 font-extrabold text-[10px] flex items-center gap-1">
                    <Package className="h-3 w-3" /> PARCEL
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenNavigation}
                  className="px-3 py-1.5 rounded-xl bg-sky-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md hover:bg-sky-400 transition-transform active:scale-95"
                >
                  <Navigation className="h-3.5 w-3.5 fill-current" />
                  NAVIGATE
                </button>
                <button
                  onClick={() => setIsCardCollapsed(!isCardCollapsed)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 hover:text-amber-500 transition-colors"
                  title={isCardCollapsed ? "Expand details" : "Collapse panel for full map"}
                >
                  <span className="hidden sm:inline">{isCardCollapsed ? 'Details' : 'Minimize'}</span>
                  {isCardCollapsed ? (
                    <ChevronUp className="h-4 w-4 text-amber-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {!isCardCollapsed && (
              <div className="space-y-4 pt-4">
                {/* Customer Details */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-black text-amber-500 text-base">
                      {activeRide.customer?.name?.[0] || 'C'}
                    </div>
                    <div>
                      <p className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                        {activeRide.customer?.name || 'Customer'}
                      </p>
                      <p className="text-xs text-slate-500 font-medium">
                        Fare: ₹{activeRide.estimated_fare}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeRide.customer?.phone && (
                      <a
                        href={`tel:${activeRide.customer.phone}`}
                        className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-amber-500 transition-colors"
                        title="Call Customer/Sender"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    )}
                    {/* CHAT ONLY AVAILABLE BEFORE OTP VERIFIED AT PICKUP */}
                    {!['OTP_VERIFIED', 'IN_PROGRESS', 'COMPLETED'].includes(activeRide.status) && (
                      <button
                        onClick={() => setIsChatOpen(true)}
                        className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-amber-500 transition-colors"
                        title="Chat with Customer before pickup"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* PARCEL RECEIVER CONTACT CARD FOR CAPTAIN */}
                {activeRide.is_parcel && (
                  <div className="p-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9.5 w-9.5 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 font-bold">
                        <User className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9.5px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                          Drop Receiver Contact
                        </span>
                        <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                          {(activeRide as any).receiver_name || (activeRide as any).receiverName || 'Recipient at Drop'}
                        </p>
                        <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 font-bold">
                          {(activeRide as any).receiver_phone || (activeRide as any).receiverPhone || 'Phone at drop'}
                        </p>
                      </div>
                    </div>

                    {((activeRide as any).receiver_phone || (activeRide as any).receiverPhone) && (
                      <a
                        href={`tel:${(activeRide as any).receiver_phone || (activeRide as any).receiverPhone}`}
                        className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 shrink-0"
                        title="Call Parcel Receiver"
                      >
                        <Phone className="h-3.5 w-3.5 fill-slate-950" />
                        <span>Call Receiver</span>
                      </a>
                    )}
                  </div>
                )}

                {/* Pickup & Destination Address */}
                <div className="space-y-2.5 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800/80 text-xs">
                  <div className="flex items-start gap-2.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        PICKUP ADDRESS
                      </p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {activeRide.pickup_address}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-rose-500 mt-1 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        DROP-OFF ADDRESS
                      </p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {activeRide.destination_address}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons based on Status */}
                {['ACCEPTED', 'CAPTAIN_ARRIVING'].includes(activeRide.status) && (
                  <button
                    onClick={handleCaptainArrived}
                    className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-transform active:scale-95 shadow-xl"
                  >
                    I HAVE ARRIVED AT PICKUP
                  </button>
                )}

                {activeRide.status === 'CAPTAIN_ARRIVED' && (
                  <div className="pt-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="Enter Pickup PIN"
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-semibold placeholder:text-slate-400 placeholder:font-normal outline-none focus:border-amber-500 transition-all text-slate-900 dark:text-slate-100"
                      />
                      <button
                        onClick={handleVerifyOtp}
                        className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 transition-transform active:scale-95 shadow-sm"
                      >
                        Verify PIN
                      </button>
                    </div>
                    {otpError && (
                      <p className="text-xs font-bold text-rose-500 pl-1">{otpError}</p>
                    )}
                  </div>
                )}

                {['OTP_VERIFIED', 'IN_PROGRESS'].includes(activeRide.status) && (
                  <div className="space-y-3 pt-1">
                    {activeRide.is_parcel && (
                      <div className="space-y-2.5">
                        {/* PAY AT PICKUP vs DROP NOTICE BADGE */}
                        {activeRide.pay_at === 'PICKUP' ? (
                          <div className="p-3 rounded-2xl bg-amber-400/15 border border-amber-400/40 text-slate-900 dark:text-slate-100 flex items-center justify-between gap-3 shadow-2xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-8 w-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 font-bold text-sm">
                                ₹
                              </div>
                              <div>
                                <p className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                                  Collect ₹{activeRide.estimated_fare} at Pickup
                                </p>
                                <p className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold">
                                  Sender must pay before parcel transit starts
                                </p>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider shrink-0">
                              Pay at Pickup
                            </span>
                          </div>
                        ) : (
                          <div className="p-3 rounded-2xl bg-blue-50 dark:bg-slate-900 border border-blue-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 flex items-center justify-between gap-3 shadow-2xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-8 w-8 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 font-bold text-sm">
                                ₹
                              </div>
                              <div>
                                <p className="text-xs font-black text-blue-800 dark:text-blue-300 uppercase tracking-wider">
                                  Collect ₹{activeRide.estimated_fare} at Drop
                                </p>
                                <p className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold">
                                  Payment to be collected after Drop OTP verification
                                </p>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white font-black text-[9px] uppercase tracking-wider shrink-0">
                              Pay at Drop
                            </span>
                          </div>
                        )}

                        {/* DROP OTP VERIFICATION INPUT */}
                        <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              <Package className="h-4 w-4 text-amber-500" />
                              <span>Parcel Drop Verification</span>
                            </span>
                            <span className="text-[9.5px] font-black text-rose-500 uppercase tracking-wider bg-rose-500/10 px-2 py-0.5 rounded-md">
                              Drop OTP Required
                            </span>
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="text"
                              maxLength={4}
                              placeholder="Enter 4-digit Drop OTP"
                              value={dropOtpInput}
                              onChange={(e) => {
                                setDropOtpInput(e.target.value);
                                setDropOtpError('');
                              }}
                              className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono font-black placeholder:font-sans placeholder:font-normal placeholder:text-xs placeholder:text-slate-400 outline-none focus:border-amber-400 transition-all text-center tracking-widest text-slate-900 dark:text-slate-100 shadow-2xs"
                            />
                          </div>
                          {dropOtpError && (
                            <p className="text-xs font-bold text-rose-500 pl-1">
                              {dropOtpError}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleCompleteRide}
                      className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-transform active:scale-95 shadow-lg flex items-center justify-center gap-2"
                    >
                      <span>
                        {activeRide.is_parcel
                          ? activeRide.pay_at === 'PICKUP'
                            ? 'COMPLETE PARCEL DROP (Paid at Pickup)'
                            : `COMPLETE PARCEL DROP & COLLECT ₹${activeRide.estimated_fare}`
                          : `COMPLETE RIDE & COLLECT ₹${activeRide.estimated_fare}`}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drawers & Modals */}
      {activeRide && (
        <>
          <ChatDrawer
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            rideId={activeRide.id}
            currentUserId={profile?.id || ''}
            currentUserRole="CAPTAIN"
            recipientName={activeRide.customer?.name || 'Customer'}
            recipientPhone={activeRide.customer?.phone}
          />
        </>
      )}

      {isCaptainProfileOpen && (
        <CaptainProfileDrawer
          isOpen={isCaptainProfileOpen}
          onClose={() => setIsCaptainProfileOpen(false)}
          profile={profile}
          captain={captain}
          onUpdate={(updatedProf: UserProfile, updatedCapt: CaptainProfile) => {
            setProfile(updatedProf);
            setCaptain(updatedCapt);
          }}
        />
      )}

      {/* CAPTAIN BOTTOM NAVIGATION BAR */}
      <CaptainBottomNav
        activeTab={isCaptainProfileOpen ? 'PROFILE' : 'DUTY'}
        onTabSelect={(tab) => {
          if (tab === 'PROFILE') {
            setIsCaptainProfileOpen((prev) => !prev);
          } else {
            setIsCaptainProfileOpen(false);
          }
        }}
      />
    </div>
  );
}
