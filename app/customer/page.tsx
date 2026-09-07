'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/ui/Navbar';
import MapContainer from '@/components/map/MapContainer';
import ChatDrawer from '@/components/chat/ChatDrawer';
import RatingModal from '@/components/ride/RatingModal';
import SafetySheet from '@/components/ride/SafetySheet';
import { createClient } from '@/lib/supabase/client';
import { Ride, VehicleType, UserProfile, CaptainProfile } from '@/types/ride';
import { calculateFare, calculateEstimatedTimeMinutes } from '@/lib/pricing/fareEngine';
import {
  searchGeocode,
  reverseGeocode,
  getDirectionsRoute,
  MapSearchResult,
} from '@/lib/maps';
import { soundEffects } from '@/lib/audio/soundEffects';
import {
  MapPin,
  Navigation,
  Bike,
  MessageSquare,
  Shield,
  X,
  Loader2,
  Star,
  Crosshair,
  Map,
  Check,
} from 'lucide-react';

export default function CustomerHomePage() {
  const router = useRouter();
  const supabase = createClient();

  // User state
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Map / Location State
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  
  // Selection Focus Mode: 'PICKUP' | 'DESTINATION'
  const [activeSelectTab, setActiveSelectTab] = useState<'PICKUP' | 'DESTINATION'>('DESTINATION');

  // Pickup state
  const [pickupQuery, setPickupQuery] = useState('');
  const [pickupSearchResults, setPickupSearchResults] = useState<MapSearchResult[]>([]);
  const [pickupAddress, setPickupAddress] = useState('Detecting location...');
  const [pickupCoords, setPickupCoords] = useState<[number, number] | null>(null);
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  // Destination state
  const [destinationQuery, setDestinationQuery] = useState('');
  const [destinationSearchResults, setDestinationSearchResults] = useState<MapSearchResult[]>([]);
  const [destinationAddress, setDestinationAddress] = useState('');
  const [destinationCoords, setDestinationCoords] = useState<[number, number] | null>(null);

  // Booking options
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('BIKE');
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [nearbyCaptains, setNearbyCaptains] = useState<any[]>([]);

  // Active Ride State
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [assignedCaptain, setAssignedCaptain] = useState<CaptainProfile & { profile?: UserProfile } | null>(null);
  const [captainLiveLocation, setCaptainLiveLocation] = useState<[number, number] | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<number>(45);

  // Drawers / Modals
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSafetyOpen, setIsSafetyOpen] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);

  // 1. Authenticate user & check active ride
  useEffect(() => {
    async function initUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/customer/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!profile || profile.role !== 'CUSTOMER') {
        await supabase.auth.signOut();
        router.push('/customer/login');
        return;
      }

      setUser(profile as UserProfile);
      setLoadingUser(false);

      // Check active ride
      const { data: rides } = await supabase
        .from('rides')
        .select('*')
        .eq('customer_id', session.user.id)
        .in('status', ['SEARCHING', 'ACCEPTED', 'CAPTAIN_ARRIVING', 'CAPTAIN_ARRIVED', 'OTP_VERIFIED', 'IN_PROGRESS'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (rides && rides.length > 0) {
        const ride = rides[0] as Ride;
        setActiveRide(ride);
        setPickupCoords([ride.pickup_lat, ride.pickup_lng]);
        setDestinationCoords([ride.destination_lat, ride.destination_lng]);
        setPickupAddress(ride.pickup_address);
        setPickupQuery(ride.pickup_address);
        setDestinationAddress(ride.destination_address);
        setDestinationQuery(ride.destination_address);
        fetchRoute([ride.pickup_lat, ride.pickup_lng], [ride.destination_lat, ride.destination_lng]);

        if (ride.captain_id) {
          fetchCaptainDetails(ride.captain_id);
        }
      }
    }

    initUser();
  }, []);

  // 2. High-Accuracy Geolocation Auto-Detection
  const detectCurrentLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;

    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const coords: [number, number] = [lat, lng];
        setUserCoords(coords);
        setPickupCoords(coords);

        const addr = await reverseGeocode(lat, lng);
        setPickupAddress(addr);
        setPickupQuery(addr);
        setIsDetectingGps(false);
      },
      (err) => {
        console.warn('Geolocation permission denied or unavailable:', err);
        const defaultCoords: [number, number] = [28.6139, 77.209];
        setUserCoords(defaultCoords);
        if (!pickupCoords) {
          setPickupCoords(defaultCoords);
          setPickupAddress('Connaught Place, New Delhi');
          setPickupQuery('Connaught Place, New Delhi');
        }
        setIsDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    detectCurrentLocation();
  }, []);

  // 3. Fetch nearby captains
  useEffect(() => {
    async function loadNearbyCaptains() {
      const { data } = await supabase
        .from('captains')
        .select('id, latitude, longitude, vehicle_type')
        .eq('online_status', true)
        .eq('availability_status', 'AVAILABLE')
        .eq('verification_status', 'APPROVED')
        .not('latitude', 'is', null);

      if (data) setNearbyCaptains(data);
    }

    loadNearbyCaptains();
    const interval = setInterval(loadNearbyCaptains, 10000);
    return () => clearInterval(interval);
  }, []);

  // 4A. Pickup Autocomplete Search
  useEffect(() => {
    if (!pickupQuery || pickupQuery.trim().length < 3 || pickupQuery === pickupAddress) {
      setPickupSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const results = await searchGeocode(pickupQuery);
      setPickupSearchResults(results);
    }, 400);

    return () => clearTimeout(timer);
  }, [pickupQuery, pickupAddress]);

  // 4B. Destination Autocomplete Search
  useEffect(() => {
    if (!destinationQuery || destinationQuery.trim().length < 3 || destinationQuery === destinationAddress) {
      setDestinationSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const results = await searchGeocode(destinationQuery);
      setDestinationSearchResults(results);
    }, 400);

    return () => clearTimeout(timer);
  }, [destinationQuery, destinationAddress]);

  // Select pickup from autocomplete
  const handleSelectPickup = (res: MapSearchResult) => {
    const coords: [number, number] = [res.lat, res.lng];
    setPickupCoords(coords);
    setPickupAddress(res.display_name);
    setPickupQuery(res.display_name);
    setPickupSearchResults([]);
  };

  // Select destination from autocomplete
  const handleSelectDestination = (res: MapSearchResult) => {
    const coords: [number, number] = [res.lat, res.lng];
    setDestinationCoords(coords);
    setDestinationAddress(res.display_name);
    setDestinationQuery(res.display_name);
    setDestinationSearchResults([]);
  };

  // 5. Explicit Map Click Behavior (Drops Green Pin or Red Pin based on active tab)
  const handleMapClick = async (lat: number, lng: number) => {
    if (activeRide) return;

    const coords: [number, number] = [lat, lng];
    const addr = await reverseGeocode(lat, lng);

    if (activeSelectTab === 'PICKUP') {
      setPickupCoords(coords);
      setPickupAddress(addr);
      setPickupQuery(addr);
    } else {
      setDestinationCoords(coords);
      setDestinationAddress(addr);
      setDestinationQuery(addr);
    }
  };

  // 6. Auto recalculate route whenever pickupCoords or destinationCoords update
  useEffect(() => {
    if (pickupCoords && destinationCoords) {
      fetchRoute(pickupCoords, destinationCoords);
    } else {
      setRouteCoords([]);
      setDistanceKm(0);
    }
  }, [pickupCoords, destinationCoords]);

  const fetchRoute = async (start: [number, number], end: [number, number]) => {
    const route = await getDirectionsRoute(start, end);
    setRouteCoords(route.coordinates);
    setDistanceKm(route.distanceKm);
  };

  const fetchCaptainDetails = async (captainId: string) => {
    const { data: capt } = await supabase
      .from('captains')
      .select('*, profile:profiles(*)')
      .eq('id', captainId)
      .single();

    if (capt) {
      setAssignedCaptain(capt as any);
      if (capt.latitude && capt.longitude) {
        setCaptainLiveLocation([capt.latitude, capt.longitude]);
      }
    }
  };

  // Book Ride
  const handleBookRide = async () => {
    if (!user || !pickupCoords || !destinationCoords) return;

    setBookingLoading(true);
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    const fare = calculateFare(distanceKm, selectedVehicle);

    try {
      const { data: ride, error } = await supabase
        .from('rides')
        .insert({
          customer_id: user.id,
          vehicle_type: selectedVehicle,
          status: 'SEARCHING',
          pickup_address: pickupAddress,
          pickup_lat: pickupCoords[0],
          pickup_lng: pickupCoords[1],
          destination_address: destinationAddress,
          destination_lat: destinationCoords[0],
          destination_lng: destinationCoords[1],
          distance_km: distanceKm,
          estimated_fare: fare,
          otp: otpCode,
        })
        .select()
        .single();

      if (error) throw error;

      setActiveRide(ride as Ride);
      setSearchTimeout(45);
    } catch (err: any) {
      alert(err.message || 'Failed to create ride request');
    } finally {
      setBookingLoading(false);
    }
  };

  // Timeout loop
  useEffect(() => {
    if (activeRide?.status === 'SEARCHING') {
      if (searchTimeout <= 0) {
        handleCancelRide('No captain accepted in time');
        return;
      }

      const timer = setTimeout(() => {
        setSearchTimeout((prev) => prev - 1);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [activeRide?.status, searchTimeout]);

  // Realtime Ride Updates
  useEffect(() => {
    if (!activeRide) return;

    const channel = supabase
      .channel(`customer_ride_${activeRide.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rides',
          filter: `id=eq.${activeRide.id}`,
        },
        async (payload) => {
          const updatedRide = payload.new as Ride;
          setActiveRide(updatedRide);

          if (updatedRide.captain_id && (!assignedCaptain || assignedCaptain.id !== updatedRide.captain_id)) {
            fetchCaptainDetails(updatedRide.captain_id);
            soundEffects.playAcceptedChime();
          }

          if (updatedRide.status === 'COMPLETED') {
            setShowRatingModal(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRide?.id, assignedCaptain?.id]);

  // Realtime Captain Location
  useEffect(() => {
    if (!activeRide?.captain_id || !['ACCEPTED', 'CAPTAIN_ARRIVING', 'CAPTAIN_ARRIVED', 'IN_PROGRESS'].includes(activeRide.status)) {
      return;
    }

    const captChannel = supabase
      .channel(`captain_loc_${activeRide.captain_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'captains',
          filter: `id=eq.${activeRide.captain_id}`,
        },
        (payload) => {
          const capt = payload.new;
          if (capt.latitude && capt.longitude) {
            setCaptainLiveLocation([capt.latitude, capt.longitude]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(captChannel);
    };
  }, [activeRide?.captain_id, activeRide?.status]);

  const handleCancelRide = async (reason = 'Cancelled by customer') => {
    if (!activeRide || !user) return;

    const { error } = await supabase.rpc('cancel_ride', {
      p_ride_id: activeRide.id,
      p_user_id: user.id,
      p_reason: reason,
    });

    if (!error) {
      setActiveRide(null);
      setAssignedCaptain(null);
      setCaptainLiveLocation(null);
    }
  };

  const handleRatingSubmit = async (rating: number, feedback: string) => {
    if (!activeRide || !user || !assignedCaptain) return;

    await supabase.from('ratings').insert({
      ride_id: activeRide.id,
      customer_id: user.id,
      captain_id: assignedCaptain.id,
      rating,
      feedback,
    });

    setShowRatingModal(false);
    setActiveRide(null);
    setAssignedCaptain(null);
    setDestinationCoords(null);
    setDestinationAddress('');
    setDestinationQuery('');
    setRouteCoords([]);
  };

  if (loadingUser) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400 mb-2" />
        <p className="text-sm font-medium">Initializing Customer App...</p>
      </div>
    );
  }

  const estFare = (pickupCoords && destinationCoords) ? calculateFare(distanceKm, selectedVehicle) : 0;
  const estTime = (pickupCoords && destinationCoords) ? calculateEstimatedTimeMinutes(distanceKm, selectedVehicle) : 0;

  return (
    <div className="relative h-screen w-full bg-slate-950 flex flex-col overflow-hidden text-slate-100 font-sans">
      <Navbar role="CUSTOMER" userName={user?.name} />

      <div className="relative flex-1 w-full overflow-hidden">
        {/* Fullscreen Interactive Leaflet Map */}
        <div className="absolute inset-0 z-0">
          <MapContainer
            center={userCoords || [28.6139, 77.209]}
            zoom={14}
            customerLocation={userCoords}
            pickupLocation={pickupCoords}
            destinationLocation={destinationCoords}
            captainLocation={captainLiveLocation}
            nearbyCaptains={nearbyCaptains}
            routeCoordinates={routeCoords}
            onMapClick={handleMapClick}
          />
        </div>

        {/* Map Click Mode Prompt */}
        {!activeRide && (
          <div className="absolute top-4 inset-x-4 z-20 max-w-xs mx-auto pointer-events-auto">
            <div className="rounded-2xl bg-slate-900/90 border border-slate-700/80 p-2 shadow-2xl backdrop-blur-md flex items-center justify-center text-[11px] font-semibold text-slate-200">
              📍 Tap map to set {activeSelectTab === 'PICKUP' ? '🟢 PICKUP PIN' : '🔴 DROP PIN'}
            </div>
          </div>
        )}

        {/* Floating Action Buttons */}
        {activeRide && (
          <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 pointer-events-auto">
            <button
              onClick={() => setIsChatOpen(true)}
              className="relative flex items-center justify-center h-12 w-12 rounded-2xl bg-amber-500 text-slate-950 shadow-xl border border-white/20 hover:scale-105 transition-transform"
            >
              <MessageSquare className="h-6 w-6" />
            </button>

            <button
              onClick={() => setIsSafetyOpen(true)}
              className="flex items-center justify-center h-12 w-12 rounded-2xl bg-rose-600 text-white shadow-xl border border-white/20 hover:scale-105 transition-transform"
            >
              <Shield className="h-6 w-6" />
            </button>
          </div>
        )}

        {/* BOTTOM BOOKING PANEL */}
        <div className="absolute bottom-4 inset-x-3 sm:inset-x-4 z-20 max-w-md mx-auto pointer-events-auto">
          {/* CASE A: SEARCHING FOR CAPTAIN */}
          {activeRide?.status === 'SEARCHING' && (
            <div className="rounded-3xl bg-slate-900/95 border border-slate-800 p-5 shadow-2xl backdrop-blur-md text-center">
              <div className="relative mx-auto mb-3 flex h-16 w-16 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <div className="relative h-12 w-12 rounded-full bg-amber-500 flex items-center justify-center text-slate-950 font-bold">
                  <Bike className="h-6 w-6" />
                </div>
              </div>

              <h3 className="font-bold text-lg text-slate-100">Contacting Nearby Captains...</h3>
              <p className="text-xs text-slate-400 mt-1">
                Searching within 4.5 km radius ({searchTimeout}s remaining)
              </p>

              <div className="my-4 rounded-2xl bg-slate-800/60 p-3 text-xs text-left border border-slate-700/50 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Vehicle</span>
                  <span className="font-semibold text-amber-400">{activeRide.vehicle_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Est. Fare</span>
                  <span className="font-bold text-slate-100">₹{activeRide.estimated_fare}</span>
                </div>
                <div className="truncate text-slate-400 pt-1 border-t border-slate-700/50">
                  📍 {activeRide.destination_address}
                </div>
              </div>

              <button
                onClick={() => handleCancelRide('Customer cancelled search')}
                className="w-full rounded-xl bg-slate-800 py-2.5 text-xs font-semibold text-rose-400 border border-slate-700 hover:bg-slate-700 transition-colors"
              >
                Cancel Search
              </button>
            </div>
          )}

          {/* CASE B: CAPTAIN ASSIGNED / IN PROGRESS */}
          {activeRide && ['ACCEPTED', 'CAPTAIN_ARRIVING', 'CAPTAIN_ARRIVED', 'OTP_VERIFIED', 'IN_PROGRESS'].includes(activeRide.status) && (
            <div className="rounded-3xl bg-slate-900/95 border border-slate-800 p-5 shadow-2xl backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {activeRide.status.replace('_', ' ')}
                  </span>
                  <h3 className="font-bold text-slate-100 text-sm mt-1">
                    {activeRide.status === 'ACCEPTED' && 'Captain is on the way!'}
                    {activeRide.status === 'CAPTAIN_ARRIVED' && 'Captain has arrived at pickup!'}
                    {activeRide.status === 'IN_PROGRESS' && 'Ride in progress...'}
                  </h3>
                </div>

                <div className="rounded-2xl bg-amber-500 text-slate-950 p-2.5 text-center shadow-lg">
                  <div className="text-[9px] font-bold uppercase tracking-widest opacity-80">Start OTP</div>
                  <div className="text-lg font-black tracking-widest font-mono">{activeRide.otp}</div>
                </div>
              </div>

              {assignedCaptain && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 font-bold text-lg">
                      {assignedCaptain.vehicle_type === 'BIKE' ? '🏍️' : assignedCaptain.vehicle_type === 'AUTO' ? '🛺' : '🚗'}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-100 text-sm">{assignedCaptain.profile?.name || 'Captain'}</h4>
                      <p className="text-xs text-amber-400 font-bold">{assignedCaptain.vehicle_number}</p>
                      <p className="text-[11px] text-slate-400">{assignedCaptain.vehicle_model}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1 text-amber-400 text-xs font-bold justify-end">
                      <Star className="h-3.5 w-3.5 fill-amber-400" />
                      <span>{assignedCaptain.rating_count > 0 ? (assignedCaptain.rating_sum / assignedCaptain.rating_count).toFixed(1) : '5.0'}</span>
                    </div>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">₹{activeRide.estimated_fare}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setIsChatOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors"
                >
                  <MessageSquare className="h-4 w-4" />
                  Chat with Captain
                </button>

                {activeRide.status !== 'IN_PROGRESS' && (
                  <button
                    onClick={() => handleCancelRide()}
                    className="px-4 rounded-xl bg-slate-800 text-xs font-medium text-rose-400 border border-slate-700 hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}

          {/* CASE C: BOOKING FORM CARD */}
          {!activeRide && (
            <div className="rounded-3xl bg-slate-900/95 border border-slate-800 p-4 sm:p-5 shadow-2xl backdrop-blur-md space-y-3">
              {/* TAB SELECTOR: PICKUP vs DESTINATION */}
              <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
                <button
                  onClick={() => setActiveSelectTab('PICKUP')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all ${
                    activeSelectTab === 'PICKUP'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  <span>🟢 Set Pickup</span>
                </button>

                <button
                  onClick={() => setActiveSelectTab('DESTINATION')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all ${
                    activeSelectTab === 'DESTINATION'
                      ? 'bg-rose-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Navigation className="h-3.5 w-3.5" />
                  <span>🔴 Set Drop</span>
                </button>
              </div>

              {/* EDITABLE PICKUP INPUT */}
              <div className="relative">
                <div className="flex items-center gap-1.5">
                  <div
                    onClick={() => setActiveSelectTab('PICKUP')}
                    className={`relative flex-1 flex items-center rounded-xl border transition-colors ${
                      activeSelectTab === 'PICKUP' ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-slate-700/80 bg-slate-800'
                    }`}
                  >
                    <MapPin className="absolute left-3 h-4 w-4 text-emerald-400" />
                    <input
                      type="text"
                      value={pickupQuery}
                      onChange={(e) => {
                        setActiveSelectTab('PICKUP');
                        setPickupQuery(e.target.value);
                      }}
                      onFocus={() => setActiveSelectTab('PICKUP')}
                      placeholder="Search pickup location..."
                      className="w-full rounded-xl bg-slate-800 pl-9 pr-8 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none"
                    />
                    {pickupQuery && (
                      <button
                        onClick={() => {
                          setPickupQuery('');
                          setPickupCoords(null);
                        }}
                        className="absolute right-2 text-slate-400 hover:text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={detectCurrentLocation}
                    title="Auto-detect current GPS"
                    disabled={isDetectingGps}
                    className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/30 transition-colors"
                  >
                    {isDetectingGps ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Crosshair className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">GPS</span>
                  </button>
                </div>

                {/* Pickup Search Autocomplete Results */}
                {pickupSearchResults.length > 0 && (
                  <div className="absolute top-full mt-1.5 inset-x-0 z-50 max-h-48 overflow-y-auto rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2 space-y-1">
                    {pickupSearchResults.map((res, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectPickup(res)}
                        className="w-full text-left p-2 rounded-xl text-xs hover:bg-slate-800 transition-colors flex items-start gap-2"
                      >
                        <MapPin className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="text-slate-200 line-clamp-2">{res.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* EDITABLE DESTINATION INPUT */}
              <div className="relative">
                <div className="flex items-center gap-1.5">
                  <div
                    onClick={() => setActiveSelectTab('DESTINATION')}
                    className={`relative flex-1 flex items-center rounded-xl border transition-colors ${
                      activeSelectTab === 'DESTINATION' ? 'ring-2 ring-rose-500 border-rose-500' : 'border-slate-700/80 bg-slate-800'
                    }`}
                  >
                    <Navigation className="absolute left-3 h-4 w-4 text-rose-400" />
                    <input
                      type="text"
                      value={destinationQuery}
                      onChange={(e) => {
                        setActiveSelectTab('DESTINATION');
                        setDestinationQuery(e.target.value);
                      }}
                      onFocus={() => setActiveSelectTab('DESTINATION')}
                      placeholder="Where to? (e.g. Rajendra Nagar)"
                      className="w-full rounded-xl bg-slate-800 pl-9 pr-8 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none"
                    />
                    {destinationQuery && (
                      <button
                        onClick={() => {
                          setDestinationQuery('');
                          setDestinationCoords(null);
                        }}
                        className="absolute right-2 text-slate-400 hover:text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Destination Autocomplete Results Dropdown */}
                {destinationSearchResults.length > 0 && (
                  <div className="absolute top-full mt-1.5 inset-x-0 z-50 max-h-48 overflow-y-auto rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2 space-y-1">
                    {destinationSearchResults.map((res, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectDestination(res)}
                        className="w-full text-left p-2 rounded-xl text-xs hover:bg-slate-800 transition-colors flex items-start gap-2"
                      >
                        <MapPin className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                        <span className="text-slate-200 line-clamp-2">{res.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Vehicle Type Selector */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {(['BIKE', 'AUTO', 'CAB'] as VehicleType[]).map((vType) => {
                  const fare = (pickupCoords && destinationCoords) ? calculateFare(distanceKm, vType) : 0;
                  const selected = selectedVehicle === vType;
                  return (
                    <button
                      key={vType}
                      onClick={() => setSelectedVehicle(vType)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all ${
                        selected
                          ? 'border-amber-400 bg-amber-500/10 text-amber-400 font-bold shadow-md'
                          : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-lg mb-0.5">
                        {vType === 'BIKE' ? '🏍️' : vType === 'AUTO' ? '🛺' : '🚗'}
                      </span>
                      <span className="text-xs">{vType}</span>
                      {destinationCoords && pickupCoords && (
                        <span className="text-[11px] font-bold text-slate-100 mt-0.5">₹{fare}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Fare & ETA summary */}
              {destinationCoords && pickupCoords && (
                <div className="flex items-center justify-between px-2 py-1 text-xs text-slate-300 border-t border-slate-800 pt-2">
                  <span>Est. Distance: <strong className="text-amber-400">{distanceKm} km</strong></span>
                  <span>Est. Time: <strong className="text-amber-400">{estTime} min</strong></span>
                  <span>Fare: <strong className="text-amber-400 text-sm">₹{estFare}</strong></span>
                </div>
              )}

              {/* Book Button */}
              <button
                onClick={handleBookRide}
                disabled={!pickupCoords || !destinationCoords || bookingLoading}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {bookingLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Bike className="h-5 w-5" />
                    <span>BOOK {selectedVehicle}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Realtime Chat Drawer */}
      {activeRide && user && (
        <ChatDrawer
          rideId={activeRide.id}
          currentUserId={user.id}
          currentUserRole="CUSTOMER"
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}

      {/* Safety Sheet */}
      {activeRide && (
        <SafetySheet
          isOpen={isSafetyOpen}
          onClose={() => setIsSafetyOpen(false)}
          rideId={activeRide.id}
          captainName={assignedCaptain?.profile?.name}
          vehicleNumber={assignedCaptain?.vehicle_number}
          vehicleModel={assignedCaptain?.vehicle_model}
          pickupAddress={activeRide.pickup_address}
          destinationAddress={activeRide.destination_address}
        />
      )}

      {/* Rating Modal */}
      {activeRide && (
        <RatingModal
          isOpen={showRatingModal}
          rideId={activeRide.id}
          captainName={assignedCaptain?.profile?.name}
          vehicleNumber={assignedCaptain?.vehicle_number}
          finalFare={activeRide.estimated_fare}
          onSubmit={handleRatingSubmit}
          onClose={() => setShowRatingModal(false)}
        />
      )}
    </div>
  );
}
