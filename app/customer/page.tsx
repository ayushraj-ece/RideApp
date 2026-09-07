'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/ui/Navbar';
import MapContainer from '@/components/map/MapContainer';
import ChatDrawer from '@/components/chat/ChatDrawer';
import RatingModal from '@/components/ride/RatingModal';
import SafetySheet from '@/components/ride/SafetySheet';
import ProfileDrawer from '@/components/profile/ProfileDrawer';
import CustomerBottomNav from '@/components/ui/CustomerBottomNav';
import CancelRideModal from '@/components/ride/CancelRideModal';
import { createClient } from '@/lib/supabase/client';
import { Ride, VehicleType, UserProfile, CaptainProfile } from '@/types/ride';
import {
  getFareBreakdown,
  calculateEstimatedTimeMinutes,
  FareBreakdown,
  VEHICLE_CONFIGS,
  getPermanentUserOtp,
} from '@/lib/pricing/fareEngine';
import {
  searchGeocode,
  reverseGeocode,
  getDirectionsRoute,
  calculateHaversineDistance,
  MapSearchResult,
  POPULAR_LOCATIONS,
} from '@/lib/maps';
import { soundEffects } from '@/lib/audio/soundEffects';
import {
  MapPin,
  Navigation,
  Bike,
  Car,
  MessageSquare,
  Shield,
  X,
  Loader2,
  Star,
  Crosshair,
  ArrowRight,
  Info,
  ChevronDown,
  ChevronUp,
  Users,
  Clock,
  Zap,
  Search,
  History,
  Heart,
  ArrowLeft,
  DollarSign,
  Plus,
  Receipt,
  XCircle,
  Train,
  Package,
  Briefcase,
  User,
  Box,
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
  const [activeSelectTab, setActiveSelectTabState] = useState<'PICKUP' | 'DESTINATION'>('DESTINATION');
  const activeSelectTabRef = useRef<'PICKUP' | 'DESTINATION'>('DESTINATION');

  const setActiveSelectTab = (tab: 'PICKUP' | 'DESTINATION') => {
    activeSelectTabRef.current = tab;
    setActiveSelectTabState(tab);
  };

  // Search Overlay view state
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);

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

  // Recent History state (dynamically populated from real searches and completed rides)
  const [recentLocations, setRecentLocations] = useState<MapSearchResult[]>([]);

  const saveToRecentLocations = (res: MapSearchResult) => {
    if (!res || (!res.display_name && !res.title)) return;
    try {
      const existingStr = localStorage.getItem('rideon_recent_locations');
      let existing: MapSearchResult[] = existingStr ? JSON.parse(existingStr) : [];

      const resTitle = res.title || res.display_name?.split(',')[0] || 'Location';
      const resSubtitle =
        res.subtitle || res.display_name?.split(',').slice(1, 4).join(',').trim() || res.display_name || '';

      existing = existing.filter(
        (item) => item.display_name !== res.display_name && item.title !== resTitle
      );

      const newItem: MapSearchResult = {
        title: resTitle,
        subtitle: resSubtitle,
        display_name: res.display_name || `${resTitle}, ${resSubtitle}`,
        lat: res.lat,
        lng: res.lng,
      };

      const updated = [newItem, ...existing].slice(0, 15);
      localStorage.setItem('rideon_recent_locations', JSON.stringify(updated));
      setRecentLocations(updated);
    } catch (err) {
      console.error('Failed to save recent location:', err);
    }
  };

  // Booking options
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('BIKE');
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [nearbyCaptains, setNearbyCaptains] = useState<any[]>([]);
  const [showFareBreakdown, setShowFareBreakdown] = useState(false);

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
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isParcelModalOpen, setIsParcelModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'RIDE' | 'PARCEL' | 'PROFILE'>('RIDE');

  // 1. Authenticate user & check active ride
  useEffect(() => {
    try {
      const stored = localStorage.getItem('rideon_recent_locations');
      if (stored) {
        setRecentLocations(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Error loading recent locations:', err);
    }

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

      // Fetch completed rides for real history
      const { data: pastRides } = await supabase
        .from('rides')
        .select('destination_address, destination_lat, destination_lng, pickup_address, pickup_lat, pickup_lng')
        .eq('customer_id', session.user.id)
        .eq('status', 'COMPLETED')
        .order('created_at', { ascending: false })
        .limit(10);

      if (pastRides && pastRides.length > 0) {
        const dbItems: MapSearchResult[] = [];
        pastRides.forEach((r) => {
          if (r.destination_address) {
            const parts = r.destination_address.split(',');
            dbItems.push({
              title: parts[0]?.trim() || 'Destination',
              subtitle: parts.slice(1, 4).join(',').trim() || r.destination_address,
              display_name: r.destination_address,
              lat: r.destination_lat,
              lng: r.destination_lng,
            });
          }
        });

        try {
          const storedStr = localStorage.getItem('rideon_recent_locations');
          const storedItems: MapSearchResult[] = storedStr ? JSON.parse(storedStr) : [];
          const map = new Map<string, MapSearchResult>();
          [...storedItems, ...dbItems].forEach((item) => {
            if (item.display_name && !map.has(item.display_name)) {
              map.set(item.display_name, item);
            }
          });
          const merged = Array.from(map.values()).slice(0, 15);
          localStorage.setItem('rideon_recent_locations', JSON.stringify(merged));
          setRecentLocations(merged);
        } catch (e) {
          console.error('Failed merging past rides into recent locations:', e);
        }
      }

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
          setPickupAddress('1/18, Block A, Shalimar Garden, Sahibabad, Ghaziabad');
          setPickupQuery('1/18, Block A, Shalimar Garden, Sahibabad, Ghaziabad');
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
    if (!pickupQuery || pickupQuery.trim().length < 2 || pickupQuery === pickupAddress) {
      setPickupSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const results = await searchGeocode(pickupQuery);
      setPickupSearchResults(results);
    }, 300);

    return () => clearTimeout(timer);
  }, [pickupQuery, pickupAddress]);

  // 4B. Destination Autocomplete Search
  useEffect(() => {
    if (!destinationQuery || destinationQuery.trim().length < 2 || destinationQuery === destinationAddress) {
      setDestinationSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const results = await searchGeocode(destinationQuery);
      setDestinationSearchResults(results);
    }, 300);

    return () => clearTimeout(timer);
  }, [destinationQuery, destinationAddress]);

  const handleSelectPickup = (res: MapSearchResult) => {
    const coords: [number, number] = [res.lat, res.lng];
    setPickupCoords(coords);
    setPickupAddress(res.display_name);
    setPickupQuery(res.display_name);
    setPickupSearchResults([]);
    setIsSearchOverlayOpen(false);
    saveToRecentLocations(res);
  };

  const handleSelectDestination = (res: MapSearchResult) => {
    const coords: [number, number] = [res.lat, res.lng];
    setDestinationCoords(coords);
    setDestinationAddress(res.display_name);
    setDestinationQuery(res.display_name);
    setDestinationSearchResults([]);
    setIsSearchOverlayOpen(false);
    saveToRecentLocations(res);
  };

  // Explicit Map Click Behavior
  const handleMapClick = async (lat: number, lng: number) => {
    if (activeRide) return;

    const coords: [number, number] = [lat, lng];
    const addr = await reverseGeocode(lat, lng);

    if (activeSelectTabRef.current === 'PICKUP') {
      setPickupCoords(coords);
      setPickupAddress(addr);
      setPickupQuery(addr);
    } else {
      setDestinationCoords(coords);
      setDestinationAddress(addr);
      setDestinationQuery(addr);
    }
  };

  // Auto recalculate route whenever pickupCoords or destinationCoords update
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

  // Book Ride with Itemized Fare Engine
  const handleBookRide = async () => {
    if (!user || !pickupCoords || !destinationCoords) return;

    setBookingLoading(true);
    const otpCode = getPermanentUserOtp(user.id);
    const fareBreakdown = getFareBreakdown(distanceKm, selectedVehicle);

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
          estimated_fare: fareBreakdown.totalFare,
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
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-sans">
        <div className="h-16 w-16 rounded-3xl bg-amber-500 flex items-center justify-center text-slate-950 font-black mb-4 shadow-2xl animate-bounce">
          <Bike className="h-10 w-10" />
        </div>
        <h1 className="text-3xl font-black tracking-wider text-amber-400 mb-1">RIDEON</h1>
        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">
          <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
          <span>Connecting your ride...</span>
        </div>
      </div>
    );
  }

  const currentFareBreakdown: FareBreakdown | null = (pickupCoords && destinationCoords)
    ? getFareBreakdown(distanceKm, selectedVehicle)
    : null;

  return (
    <div className="relative h-screen w-full bg-slate-100 dark:bg-slate-950 flex flex-col overflow-hidden text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      <Navbar
        role="CUSTOMER"
        userName={user?.name}
        userProfile={user}
        onProfileUpdate={(updated) => setUser(updated)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

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

        {/* FLOATING TOP CURRENT LOCATION PILL ON MAP (MATCHING SCREENSHOT 2 RAPIDO APP) */}
        {!activeRide && !isSearchOverlayOpen && (
          <div className="absolute top-4 inset-x-4 z-20 max-w-sm mx-auto pointer-events-auto">
            <div className="w-full rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 shadow-lg backdrop-blur-md flex items-center justify-between gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <button
                onClick={() => {
                  setActiveSelectTab('PICKUP');
                  setIsSearchOverlayOpen(true);
                }}
                className="flex items-center gap-2 truncate flex-1 text-left hover:opacity-80 transition-opacity"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">{isDetectingGps ? 'Detecting current GPS location...' : pickupAddress}</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  detectCurrentLocation();
                }}
                disabled={isDetectingGps}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300 hover:text-amber-500 transition-colors shrink-0 flex items-center justify-center active:scale-95"
                title="Locate & set my current GPS location as Pickup"
              >
                {isDetectingGps ? (
                  <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                ) : (
                  <Crosshair className="h-4 w-4 text-slate-600 dark:text-slate-300 hover:text-amber-500 transition-colors" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Floating Action Buttons during Active Ride (ONLY WHEN CAPTAIN IS ASSIGNED) */}
        {activeRide && activeRide.captain_id && ['ACCEPTED', 'CAPTAIN_ARRIVING', 'CAPTAIN_ARRIVED', 'OTP_VERIFIED', 'IN_PROGRESS'].includes(activeRide.status) && (
          <div className="absolute top-4 right-4 z-20 flex flex-col gap-2.5 pointer-events-auto">
            <button
              onClick={() => setIsSafetyOpen(true)}
              className="flex items-center justify-center h-11 w-11 rounded-2xl bg-rose-600 text-white shadow-xl border border-white/20 hover:scale-105 transition-transform"
              title="Safety & SOS"
            >
              <Shield className="h-5 w-5" />
            </button>
            <button
              onClick={() => setIsChatOpen(true)}
              className="flex items-center justify-center h-11 w-11 rounded-2xl bg-amber-400 text-slate-950 shadow-xl border border-white/20 hover:scale-105 transition-transform"
              title="Chat with Captain"
            >
              <MessageSquare className="h-5 w-5" />
            </button>
            <button
              onClick={() => {
                if (captainLiveLocation) {
                  setUserCoords(captainLiveLocation);
                } else if (pickupCoords) {
                  setUserCoords(pickupCoords);
                }
              }}
              className="flex items-center justify-center h-11 w-11 rounded-2xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-xl border border-slate-200 dark:border-slate-800 hover:scale-105 transition-transform"
              title="Recenter & Pan Map to Live Location"
            >
              <Crosshair className="h-5 w-5 text-amber-500" />
            </button>
          </div>
        )}

        {/* FULL-SCREEN / DOCKED SEARCH OVERLAY (MATCHING SCREENSHOT 2 & 3 RAPIDO APP) */}
        {isSearchOverlayOpen && !activeRide && (
          <div className="absolute inset-0 z-40 bg-white dark:bg-slate-950 p-4 sm:p-6 pb-24 flex flex-col animate-in fade-in duration-200 overflow-y-auto">
            {/* SEARCH HEADER */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsSearchOverlayOpen(false)}
                className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-extrabold text-lg"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>{activeSelectTab === 'PICKUP' ? 'Set Pickup Location' : 'Set Drop Location'}</span>
              </button>

              <button
                onClick={() => {
                  setIsSearchOverlayOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                <MapPin className="h-3.5 w-3.5 text-amber-500" />
                <span>Select on map</span>
              </button>
            </div>

            {/* DUAL CONNECTED LOCATION INPUT BOX (MATCHING SCREENSHOT 3 RAPIDO) */}
            <div className="relative rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 space-y-3 mb-5">
              <div className="absolute left-7 top-7 bottom-7 w-0.5 border-l-2 border-dashed border-slate-300 dark:border-slate-700 z-0"></div>

              {/* PICKUP ROW */}
              <div className="relative z-10 flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-emerald-500 shrink-0 shadow-sm" />
                <input
                  type="text"
                  value={pickupQuery}
                  onChange={(e) => {
                    setActiveSelectTab('PICKUP');
                    setPickupQuery(e.target.value);
                  }}
                  onFocus={() => setActiveSelectTab('PICKUP')}
                  placeholder="Enter pickup location..."
                  className="w-full bg-transparent text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                />
                <button
                  onClick={() => {
                    detectCurrentLocation();
                    setIsSearchOverlayOpen(false);
                  }}
                  className="p-1 rounded-full text-slate-400 hover:text-emerald-500 transition-colors shrink-0"
                  title="Use current GPS location"
                >
                  <Crosshair className="h-4 w-4 text-emerald-500" />
                </button>
                {pickupQuery && (
                  <button onClick={() => { setPickupQuery(''); setPickupCoords(null); }}>
                    <X className="h-4 w-4 text-slate-400" />
                  </button>
                )}
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800/80 my-1"></div>

              {/* DROP ROW */}
              <div className="relative z-10 flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-rose-500 shrink-0 shadow-sm" />
                <input
                  type="text"
                  autoFocus
                  value={destinationQuery}
                  onChange={(e) => {
                    setActiveSelectTab('DESTINATION');
                    setDestinationQuery(e.target.value);
                  }}
                  onFocus={() => setActiveSelectTab('DESTINATION')}
                  placeholder="Drop location (Search places...)"
                  className="w-full bg-transparent text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                />
                {destinationQuery && (
                  <button onClick={() => { setDestinationQuery(''); setDestinationCoords(null); }}>
                    <X className="h-4 w-4 text-slate-400" />
                  </button>
                )}
              </div>
            </div>

            {/* SEARCH RESULTS & RECENT HISTORY LIST */}
            <div className="flex-1 space-y-1">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                {destinationSearchResults.length > 0 || pickupSearchResults.length > 0
                  ? 'Search Results'
                  : 'Recent Locations'}
              </h4>

              {/* LIVE AUTOCOMPLETE SEARCH RESULTS */}
              {(activeSelectTab === 'DESTINATION' ? destinationSearchResults : pickupSearchResults).length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {(activeSelectTab === 'DESTINATION' ? destinationSearchResults : pickupSearchResults).map((res, i) => (
                    <button
                      key={i}
                      onClick={() =>
                        activeSelectTab === 'DESTINATION'
                          ? handleSelectDestination(res)
                          : handleSelectPickup(res)
                      }
                      className="w-full text-left py-3.5 flex items-start justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-3">
                        <History className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <h5 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 group-hover:text-amber-500 transition-colors">
                            {res.title || res.display_name.split(',')[0]}
                          </h5>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {res.subtitle || res.display_name}
                          </p>
                        </div>
                      </div>
                      <Heart className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0" />
                    </button>
                  ))}
                </div>
              ) : recentLocations.length > 0 ? (
                /* REAL RECENT LOCATIONS LIST */
                <div className="divide-y divide-dashed divide-slate-200 dark:divide-slate-800">
                  {recentLocations.map((loc, i) => (
                    <button
                      key={i}
                      onClick={() =>
                        activeSelectTab === 'DESTINATION'
                          ? handleSelectDestination(loc)
                          : handleSelectPickup(loc)
                      }
                      className="w-full text-left py-3.5 flex items-start justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-3">
                        <History className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <h5 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 group-hover:text-amber-500 transition-colors">
                            {loc.title || loc.display_name.split(',')[0]}
                          </h5>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {loc.subtitle || loc.display_name}
                          </p>
                        </div>
                      </div>
                      <Heart className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                /* EMPTY STATE WHEN NO RECENT HISTORY YET */
                <div className="py-12 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-2">
                    <History className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No recent locations yet</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Search for a location above or select on map</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DOCKED BOTTOM BOOKING SHEET (POSITIONED ABOVE BOTTOM NAV WHEN !activeRide) */}
        {!isSearchOverlayOpen && (
          <div className={`fixed inset-x-0 z-30 max-w-lg mx-auto w-full pointer-events-auto ${activeRide ? 'bottom-0' : 'bottom-[56px] sm:bottom-16'}`}>
            {/* CASE A: SEARCHING FOR CAPTAIN */}
            {activeRide?.status === 'SEARCHING' && (
              <div className="rounded-t-[32px] bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-5 pb-6 shadow-2xl backdrop-blur-2xl text-center space-y-4 max-h-[82vh] overflow-y-auto overscroll-contain">
                <div className="relative mx-auto flex h-14 w-14 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-70"></span>
                  <div className="relative h-11 w-11 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 font-bold shadow-lg">
                    <Bike className="h-6 w-6" />
                  </div>
                </div>

                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">Finding nearby captain...</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Requesting nearest {activeRide.vehicle_type} ({searchTimeout}s timeout)
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 p-3.5 text-xs text-left border border-slate-200 dark:border-slate-800/60 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Vehicle Option</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 text-[11px]">
                      {activeRide.vehicle_type}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Estimated Fare</span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">₹{activeRide.estimated_fare}</span>
                  </div>
                  <div className="truncate text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800/60 flex items-center gap-1.5 text-[11px]">
                    <Navigation className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                    <span className="truncate">{activeRide.destination_address}</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsCancelModalOpen(true)}
                  className="w-full rounded-2xl bg-slate-100 dark:bg-slate-900 py-3.5 text-xs font-bold text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel Search
                </button>
              </div>
            )}

            {/* CASE B: CAPTAIN ASSIGNED / IN PROGRESS */}
            {activeRide && ['ACCEPTED', 'CAPTAIN_ARRIVING', 'CAPTAIN_ARRIVED', 'OTP_VERIFIED', 'IN_PROGRESS'].includes(activeRide.status) && (
              <div className="rounded-t-[32px] bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-5 pb-6 shadow-2xl backdrop-blur-2xl space-y-3.5 max-h-[82vh] overflow-y-auto overscroll-contain">
                {/* SIMPLE STATUS & OTP HEADER (NO CLUTTER / NO HEAVY BORDERS) */}
                <div className="space-y-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      {activeRide.status.replace('_', ' ')}
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                      ₹{activeRide.estimated_fare}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                      {activeRide.status === 'ACCEPTED' && 'Captain accepted your ride'}
                      {activeRide.status === 'CAPTAIN_ARRIVING' && 'Captain is on the way'}
                      {activeRide.status === 'CAPTAIN_ARRIVED' && 'Captain has arrived at pickup'}
                      {['OTP_VERIFIED', 'IN_PROGRESS'].includes(activeRide.status) && 'Trip in progress'}
                    </h3>

                    {/* CLEAN MINIMAL PIN DISPLAY (ONLY BEFORE TRIP STARTS) */}
                    {!['OTP_VERIFIED', 'IN_PROGRESS'].includes(activeRide.status) && (
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[11px] font-bold text-slate-400 mr-0.5">PIN</span>
                        {(activeRide.otp || '0000').split('').map((digit, idx) => (
                          <span
                            key={idx}
                            className="w-7 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-xs text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
                          >
                            {digit}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* LIVE CAPTAIN DISTANCE FROM PICKUP & ETA BADGE */}
                  {(() => {
                    if (!['ACCEPTED', 'CAPTAIN_ARRIVING', 'CAPTAIN_ARRIVED'].includes(activeRide.status) || !pickupCoords) {
                      return null;
                    }
                    const captLat = captainLiveLocation ? captainLiveLocation[0] : (assignedCaptain?.latitude || pickupCoords[0] + 0.012);
                    const captLng = captainLiveLocation ? captainLiveLocation[1] : (assignedCaptain?.longitude || pickupCoords[1] + 0.008);
                    const distKm = calculateHaversineDistance(captLat, captLng, pickupCoords[0], pickupCoords[1]);
                    const etaMins = Math.max(1, Math.ceil((distKm / 25) * 60));

                    return (
                      <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400 mt-2">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4 animate-spin text-amber-500" />
                          <span>
                            {distKm < 0.1 ? 'Captain has arrived at pickup point' : `Arriving at pickup in ~${etaMins} mins`}
                          </span>
                        </div>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-amber-500/20">
                          {distKm < 0.1 ? 'ARRIVED' : `${distKm} km away`}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* CAPTAIN & VEHICLE CARD */}
                {assignedCaptain && (
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold shadow-inner shrink-0">
                        {assignedCaptain.vehicle_type === 'BIKE' ? <Bike className="h-6 w-6" /> : <Car className="h-6 w-6" />}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">{assignedCaptain.profile?.name || 'Captain'}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-black px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                            {assignedCaptain.vehicle_number}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">{assignedCaptain.vehicle_model}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 text-amber-500 text-xs font-black justify-end">
                        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                        <span>{assignedCaptain.rating_count > 0 ? (assignedCaptain.rating_sum / assignedCaptain.rating_count).toFixed(1) : '5.0'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* CONNECTED ROUTE SUMMARY CARD (PICKUP -> DESTINATION) */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Pickup</span>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{activeRide.pickup_address}</p>
                    </div>
                  </div>
                  
                  <div className="ml-1 pl-4 border-l-2 border-dashed border-slate-300 dark:border-slate-700 py-0.5">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">{activeRide.distance_km} km distance</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Destination</span>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{activeRide.destination_address}</p>
                    </div>
                  </div>
                </div>

                {/* COLLAPSIBLE / DETAILED FARE BREAKDOWN SECTION */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900/40">
                  <button
                    onClick={() => setShowFareBreakdown(!showFareBreakdown)}
                    className="w-full flex items-center justify-between p-3 text-xs font-extrabold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-amber-500" />
                      <span>Fare Breakdown</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-900 dark:text-slate-100 font-black">₹{activeRide.estimated_fare}</span>
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
                              <span>Base Ride Fare</span>
                              <span>₹{breakdown.baseFare}</span>
                            </div>
                            <div className="flex justify-between text-slate-500 dark:text-slate-400">
                              <span>Distance Charge ({activeRide.distance_km} km)</span>
                              <span>₹{breakdown.distanceCharge}</span>
                            </div>
                            <div className="flex justify-between text-slate-500 dark:text-slate-400">
                              <span>Booking & Safety Fee</span>
                              <span>₹{breakdown.bookingFee}</span>
                            </div>
                            {breakdown.surgeCharge > 0 && (
                              <div className="flex justify-between text-amber-600 dark:text-amber-400 font-bold">
                                <span>Peak Surge Charge ({breakdown.surgeMultiplier}x)</span>
                                <span>+₹{breakdown.surgeCharge}</span>
                              </div>
                            )}
                            <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-800 font-black text-slate-900 dark:text-slate-100">
                              <span>Total Amount Payable</span>
                              <span className="text-amber-500 text-sm">₹{activeRide.estimated_fare}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* CLEAN RED CANCEL BUTTON (NO ICONS, NO BIG CHAT BUTTON) */}
                <div className="pt-1">
                  <button
                    onClick={() => setIsCancelModalOpen(true)}
                    className="w-full rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-3.5 text-xs transition-colors shadow-sm"
                  >
                    Cancel Ride
                  </button>
                </div>
              </div>
            )}

            {/* CASE C: RAPIDO SCREENSHOT 2 (HOME) & SCREENSHOT 4 (BOOKING) */}
            {!activeRide && (
              <div className="rounded-t-[32px] bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xl backdrop-blur-2xl max-h-[68vh] sm:max-h-[72vh] flex flex-col overflow-hidden shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1)]">
                {/* SEARCH ENTRY BAR (PINNED AT TOP) */}
                <button
                  onClick={() => {
                    setActiveSelectTab('DESTINATION');
                    setIsSearchOverlayOpen(true);
                  }}
                  className="w-full shrink-0 mb-3 flex items-center justify-between p-3.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 font-semibold shadow-sm hover:border-amber-500 transition-colors"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Search className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="truncate text-slate-900 dark:text-slate-100 font-bold text-xs">
                      {destinationAddress || 'Where do you want to go?'}
                    </span>
                  </div>
                  {destinationAddress ? (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setDestinationAddress('');
                        setDestinationQuery('');
                        setDestinationCoords(null);
                      }}
                      className="text-xs text-rose-500 font-bold hover:underline shrink-0 px-2"
                    >
                      Clear
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-500 font-bold uppercase shrink-0 px-2">Search</span>
                  )}
                </button>

                {!destinationCoords ? (
                  /* CASE C1: HOME SCREEN - RECENT HISTORIES & QUICK SERVICES */
                  <div className="flex-1 overflow-y-auto overscroll-contain space-y-4 pr-0.5 pb-2">
                    {/* RECENT RIDE HISTORY */}
                    {recentLocations.length > 0 ? (
                      <div className="space-y-1">
                        <div className="divide-y divide-dashed divide-slate-200 dark:divide-slate-800">
                          {recentLocations.slice(0, 4).map((loc, i) => (
                            <button
                              key={i}
                              onClick={() => handleSelectDestination(loc)}
                              className="w-full text-left py-2.5 flex items-start justify-between gap-3 group"
                            >
                              <div className="flex items-start gap-3 truncate">
                                <History className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                                <div className="truncate">
                                  <h5 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 group-hover:text-amber-500 transition-colors">
                                    {loc.title || loc.display_name.split(',')[0]}
                                  </h5>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                    {loc.subtitle || loc.display_name}
                                  </p>
                                </div>
                              </div>
                              <Heart className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 text-center text-slate-400 text-xs">
                        <p className="font-medium">No recent ride history</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Search for a destination above to request a ride</p>
                      </div>
                    )}

                    {/* QUICK SERVICES ROW ("Everything In Minutes") */}
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <h4 className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Everything In Minutes
                      </h4>

                      <button
                        onClick={() => setIsParcelModalOpen(true)}
                        className="w-full p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left hover:bg-amber-500/20 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-sm shrink-0">
                            <Package className="h-5 w-5" />
                          </div>
                          <div>
                            <h5 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 group-hover:text-amber-500 transition-colors">
                              Send anything • Parcel Delivery
                            </h5>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Fast door-to-door package & document pickup
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-amber-500 shrink-0" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* CASE C2: DESTINATION SELECTED - STICKY BOOK NOW BUTTON & SCROLLABLE VEHICLE LIST */
                  <div className="flex-1 flex flex-col min-h-0">
                    {/* SCROLLABLE VEHICLE OPTIONS LIST */}
                    <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 space-y-2 pr-0.5 py-1">
                      {(['BIKE', 'AUTO', 'CAB'] as VehicleType[]).map((vType) => {
                        const cfg = VEHICLE_CONFIGS[vType];
                        const breakdown = getFareBreakdown(distanceKm, vType);
                        const selected = selectedVehicle === vType;

                        return (
                          <button
                            key={vType}
                            onClick={() => setSelectedVehicle(vType)}
                            className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all ${
                              selected
                                ? 'border-2 border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-900/80 shadow-sm'
                                : 'border border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-900 dark:text-slate-100 font-bold shrink-0">
                                {vType === 'BIKE' ? <Bike className="h-5 w-5 text-slate-800 dark:text-slate-200" /> : <Car className="h-5 w-5 text-slate-800 dark:text-slate-200" />}
                              </div>

                              <div className="text-left">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                                    {cfg.title}
                                  </span>
                                  {cfg.badge && selected && (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-extrabold text-[9px] uppercase">
                                      {cfg.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  {cfg.etaMinutes} min away • Drop {breakdown.durationMinutes}m ({distanceKm} km)
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="font-black text-base text-slate-900 dark:text-slate-100">
                                ₹{breakdown.totalFare}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* PINNED / STICKY BOTTOM ACTION BAR: Cash Selector + BOOK NOW CTA */}
                    <div className="shrink-0 pt-2.5 mt-1 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 z-10 flex items-center gap-3">
                      <div className="flex items-center gap-1.5 px-3.5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 shrink-0">
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                        <span>Cash</span>
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                      </div>

                      <button
                        onClick={handleBookRide}
                        disabled={!pickupCoords || !destinationCoords || bookingLoading}
                        className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-amber-400 hover:bg-amber-300 py-3.5 text-sm font-extrabold text-slate-950 transition-transform active:scale-[0.99] disabled:opacity-40 shadow-md"
                      >
                        {bookingLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <span>Book {selectedVehicle} • ₹{currentFareBreakdown ? currentFareBreakdown.totalFare : '--'}</span>
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR (HIDDEN DURING ACTIVE RIDES LIKE RAPIDO) */}
      {!activeRide && (
        <CustomerBottomNav
          activeTab={
            isProfileOpen
              ? 'PROFILE'
              : isParcelModalOpen
              ? 'PARCEL'
              : activeBottomTab
          }
          onTabSelect={(tab) => {
            setActiveBottomTab(tab);
            if (tab === 'RIDE') {
              setIsSearchOverlayOpen(false);
              setIsParcelModalOpen(false);
              setIsProfileOpen(false);
            } else if (tab === 'PARCEL') {
              setIsSearchOverlayOpen(false);
              setIsProfileOpen(false);
              setIsParcelModalOpen(true);
            } else if (tab === 'PROFILE') {
              setIsSearchOverlayOpen(false);
              setIsParcelModalOpen(false);
              setIsProfileOpen(true);
            }
          }}
        />
      )}

      {/* Profile Drawer */}
      <ProfileDrawer
        isOpen={isProfileOpen}
        onClose={() => {
          setIsProfileOpen(false);
          setActiveBottomTab('RIDE');
        }}
        role="CUSTOMER"
        user={user}
        onProfileUpdate={(updated) => setUser(updated)}
      />

      {/* Parcel Modal */}
      {isParcelModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[32px] sm:rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-md">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Send Anything • Parcel</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Fast door-to-door delivery by Rideon Captains</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsParcelModalOpen(false);
                  setActiveBottomTab('RIDE');
                }}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">Small Packages (Under 5kg)</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Documents, keys, food boxes, gifts</p>
                </div>
                <span className="font-black text-amber-500 text-sm">From ₹40</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">Medium Parcel (5-15kg)</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Cartons, electronics, clothing bags</p>
                </div>
                <span className="font-black text-amber-500 text-sm">From ₹75</span>
              </div>
            </div>

            <button
              onClick={() => {
                setIsParcelModalOpen(false);
                setIsSearchOverlayOpen(true);
              }}
              className="w-full rounded-2xl bg-amber-400 hover:bg-amber-300 py-3.5 text-xs font-extrabold text-slate-950 shadow-md transition-transform active:scale-[0.99]"
            >
              Set Parcel Pickup & Drop
            </button>
          </div>
        </div>
      )}

      {/* Realtime Chat Drawer */}
      {activeRide && user && (
        <ChatDrawer
          rideId={activeRide.id}
          currentUserId={user.id}
          currentUserRole="CUSTOMER"
          recipientName={assignedCaptain?.profile?.name || 'Captain'}
          recipientPhone={assignedCaptain?.profile?.phone || '+91 98765 43210'}
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

      {/* Cancel Ride Modal with Reasons & Green/Red Confirmation */}
      <CancelRideModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirmCancel={(reason) => {
          setIsCancelModalOpen(false);
          handleCancelRide(reason);
        }}
        role="CUSTOMER"
      />
    </div>
  );
}
