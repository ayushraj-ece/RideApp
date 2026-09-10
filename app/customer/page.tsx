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
import { requestAndGetCurrentLocation } from '@/lib/location';
import { Ride, VehicleType, UserProfile, CaptainProfile } from '@/types/ride';
import {
  getFareBreakdown,
  calculateEstimatedTimeMinutes,
  FareBreakdown,
  VEHICLE_CONFIGS,
  getPermanentUserOtp,
  generateRandomOtp,
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
  Banknote,
  Wallet,
  Plus,
  Receipt,
  XCircle,
  Train,
  Package,
  Briefcase,
  User,
  Box,
  Phone,
  ArrowUpDown,
  Pencil,
  Percent,
  ShieldAlert,
  FileText,
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
  const [isSearchingPickup, setIsSearchingPickup] = useState(false);

  // Destination state
  const [destinationQuery, setDestinationQuery] = useState('');
  const [destinationSearchResults, setDestinationSearchResults] = useState<MapSearchResult[]>([]);
  const [destinationAddress, setDestinationAddress] = useState('');
  const [destinationCoords, setDestinationCoords] = useState<[number, number] | null>(null);
  const [isSearchingDestination, setIsSearchingDestination] = useState(false);

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
  const [dismissedRatingRideId, setDismissedRatingRideId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isParcelModalOpen, setIsParcelModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isTripDetailsOpen, setIsTripDetailsOpen] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'RIDE' | 'PARCEL' | 'PROFILE'>('RIDE');
  const [parcelPayAt, setParcelPayAt] = useState<'PICKUP' | 'DROP'>('PICKUP');
  const [isProhibitedModalOpen, setIsProhibitedModalOpen] = useState(false);
  const [isCustomerSheetCollapsed, setIsCustomerSheetCollapsed] = useState(false);
  const [isBookingSheetCollapsed, setIsBookingSheetCollapsed] = useState(false);

  const handleSwitchPickupDrop = () => {
    if (!destinationAddress && !destinationCoords) return;
    const tempAddr = pickupAddress;
    const tempCoords = pickupCoords;
    const tempQuery = pickupQuery;

    setPickupAddress(destinationAddress);
    setPickupCoords(destinationCoords);
    setPickupQuery(destinationAddress);

    setDestinationAddress(tempAddr);
    setDestinationCoords(tempCoords);
    setDestinationQuery(tempAddr);
  };

  const handleTogglePayAt = async (payAt: 'PICKUP' | 'DROP') => {
    setParcelPayAt(payAt);
    if (activeRide && ['SEARCHING', 'ACCEPTED', 'CAPTAIN_ARRIVING', 'CAPTAIN_ARRIVED'].includes((activeRide as Ride).status)) {
      try {
        await supabase.from('rides').update({ pay_at: payAt }).eq('id', activeRide.id);
      } catch (err) {
        // Silently catch if column missing in database schema
      }
      setActiveRide((prev) => prev ? { ...prev, pay_at: payAt } : null);
    }
  };


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
        if (ride.captain_id) {
          fetchCaptainDetails(ride.captain_id);
        }
      }
    }

    initUser();
  }, []);

  // 2. High-Accuracy Geolocation Auto-Detection (Capacitor Native APK + Browser)
  const detectCurrentLocation = async () => {
    setIsDetectingGps(true);
    const coords = await requestAndGetCurrentLocation();
    if (coords) {
      setUserCoords(coords);
      setPickupCoords(coords);

      const addr = await reverseGeocode(coords[0], coords[1]);
      setPickupAddress(addr);
      setPickupQuery(addr);
      setIsDetectingGps(false);
    } else {
      const defaultCoords: [number, number] = [28.6139, 77.209];
      setUserCoords(defaultCoords);
      if (!pickupCoords) {
        setPickupCoords(defaultCoords);
        setPickupAddress('Connaught Place, New Delhi');
        setPickupQuery('Connaught Place, New Delhi');
      }
      setIsDetectingGps(false);
    }
  };

  useEffect(() => {
    detectCurrentLocation();

    if (typeof window === 'undefined' || !navigator.geolocation) return;

    const syncCustomerGps = (lat: number, lng: number) => {
      setUserCoords([lat, lng]);
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (pos?.coords?.latitude && pos?.coords?.longitude) {
          syncCustomerGps(pos.coords.latitude, pos.coords.longitude);
        }
      },
      (err) => console.warn('Customer GPS watch error:', err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    const intervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (pos?.coords?.latitude && pos?.coords?.longitude) {
            syncCustomerGps(pos.coords.latitude, pos.coords.longitude);
          }
        },
        null,
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    }, 3000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(intervalId);
    };
  }, []);

  // 3. Fetch nearby captains (DB snapshot initial + Realtime Broadcast & Postgres changes live updates)
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
    const interval = setInterval(loadNearbyCaptains, 5000);

    // Channel 1: Sub-second Realtime Broadcast channel for nearby captains live movement
    const nearbyBroadcastChannel = supabase
      .channel('nearby_captains_live')
      .on(
        'broadcast',
        { event: 'location_update' },
        (payload) => {
          const liveData = payload.payload;
          if (!liveData || (!liveData.captain_id && !liveData.id)) return;
          const captId = liveData.captain_id || liveData.id;
          setNearbyCaptains((prev) => {
            const index = prev.findIndex((c) => c.id === captId);
            const updatedItem = {
              id: captId,
              latitude: liveData.latitude,
              longitude: liveData.longitude,
              heading: liveData.heading,
              vehicle_type: liveData.vehicle_type,
            };
            if (index >= 0) {
              const copy = [...prev];
              copy[index] = { ...copy[index], ...updatedItem };
              return copy;
            } else {
              return [...prev, updatedItem];
            }
          });
        }
      )
      .subscribe();

    // Channel 2: Realtime Postgres Changes listener for captains table updates
    const nearbyDbChannel = supabase
      .channel('nearby_captains_db_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'captains',
        },
        (payload) => {
          const capt = payload.new;
          if (capt.online_status && capt.availability_status === 'AVAILABLE' && capt.latitude && capt.longitude) {
            setNearbyCaptains((prev) => {
              const index = prev.findIndex((c) => c.id === capt.id);
              const updatedItem = {
                id: capt.id,
                latitude: capt.latitude,
                longitude: capt.longitude,
                heading: capt.heading || null,
                vehicle_type: capt.vehicle_type,
              };
              if (index >= 0) {
                const copy = [...prev];
                copy[index] = { ...copy[index], ...updatedItem };
                return copy;
              } else {
                return [...prev, updatedItem];
              }
            });
          } else {
            setNearbyCaptains((prev) => prev.filter((c) => c.id !== capt.id));
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(nearbyBroadcastChannel);
      supabase.removeChannel(nearbyDbChannel);
    };
  }, []);



  // 4A. Pickup Autocomplete Search
  useEffect(() => {
    if (!pickupQuery || pickupQuery.trim().length < 2 || pickupQuery === pickupAddress) {
      setPickupSearchResults([]);
      setIsSearchingPickup(false);
      return;
    }

    setIsSearchingPickup(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchGeocode(pickupQuery, userCoords);
        setPickupSearchResults(results);
      } finally {
        setIsSearchingPickup(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [pickupQuery, pickupAddress, userCoords]);

  // 4B. Destination Autocomplete Search
  useEffect(() => {
    if (!destinationQuery || destinationQuery.trim().length < 2 || destinationQuery === destinationAddress) {
      setDestinationSearchResults([]);
      setIsSearchingDestination(false);
      return;
    }

    setIsSearchingDestination(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchGeocode(destinationQuery, userCoords);
        setDestinationSearchResults(results);
      } finally {
        setIsSearchingDestination(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [destinationQuery, destinationAddress, userCoords]);

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

  // Dynamic Real-Time Route Recalculation based on Active Ride Status & Captain Position
  useEffect(() => {
    let isCancelled = false;

    async function updateDynamicRoute() {
      // 1. Captain is arriving to pickup (ACCEPTED, CAPTAIN_ARRIVING, CAPTAIN_ARRIVED) -> Blue route from Captain to Pickup
      if (
        activeRide &&
        ['ACCEPTED', 'CAPTAIN_ARRIVING', 'CAPTAIN_ARRIVED'].includes(activeRide.status)
      ) {
        const captPos: [number, number] | null = captainLiveLocation ||
          (assignedCaptain?.latitude && assignedCaptain?.longitude
            ? [assignedCaptain.latitude, assignedCaptain.longitude]
            : null);
        const pickPos: [number, number] = [activeRide.pickup_lat, activeRide.pickup_lng];

        if (captPos) {
          const route = await getDirectionsRoute(captPos, pickPos);
          if (!isCancelled) {
            setRouteCoords(route.coordinates);
            setDistanceKm(route.distanceKm);
          }
        } else if (pickupCoords && destinationCoords) {
          const route = await getDirectionsRoute(pickupCoords, destinationCoords);
          if (!isCancelled) {
            setRouteCoords(route.coordinates);
            setDistanceKm(route.distanceKm);
          }
        }
      }
      // 2. Trip in progress after OTP (OTP_VERIFIED, IN_PROGRESS) -> Blue route from Captain/Pickup to Destination
      else if (
        activeRide &&
        ['OTP_VERIFIED', 'IN_PROGRESS'].includes(activeRide.status)
      ) {
        const captPos: [number, number] | null = captainLiveLocation ||
          pickupCoords ||
          [activeRide.pickup_lat, activeRide.pickup_lng];
        const dropPos: [number, number] = [activeRide.destination_lat, activeRide.destination_lng];

        if (captPos && dropPos) {
          const route = await getDirectionsRoute(captPos, dropPos);
          if (!isCancelled) {
            setRouteCoords(route.coordinates);
            setDistanceKm(route.distanceKm);
          }
        }
      }
      // 3. Pre-booking search or searching state -> Blue route from Pickup to Destination
      else if (pickupCoords && destinationCoords) {
        const route = await getDirectionsRoute(pickupCoords, destinationCoords);
        if (!isCancelled) {
          setRouteCoords(route.coordinates);
          setDistanceKm(route.distanceKm);
        }
      } else {
        if (!isCancelled) {
          setRouteCoords([]);
          setDistanceKm(0);
        }
      }
    }

    updateDynamicRoute();

    return () => {
      isCancelled = true;
    };
  }, [
    activeRide?.status,
    activeRide?.pickup_lat,
    activeRide?.pickup_lng,
    activeRide?.destination_lat,
    activeRide?.destination_lng,
    captainLiveLocation,
    assignedCaptain?.latitude,
    assignedCaptain?.longitude,
    pickupCoords,
    destinationCoords,
  ]);

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
    const isParcelOrder = activeBottomTab === 'PARCEL' || isParcelModalOpen;
    const effectiveVehicle: VehicleType = isParcelOrder ? 'BIKE' : selectedVehicle;
    const otpCode = generateRandomOtp();
    const dropOtpCode = isParcelOrder ? generateRandomOtp() : undefined;
    const fareBreakdown = getFareBreakdown(distanceKm, effectiveVehicle);

    try {
      const payload: any = {
        customer_id: user.id,
        vehicle_type: effectiveVehicle,
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
        drop_otp: dropOtpCode,
        is_parcel: isParcelOrder,
        pay_at: isParcelOrder ? parcelPayAt : undefined,
      };

      let { data: ride, error } = await supabase
        .from('rides')
        .insert(payload)
        .select()
        .single();

      if (error) {
        // Fallback gracefully if database table is missing optional parcel/pay_at columns
        if (
          error.message?.includes('pay_at') ||
          error.message?.includes('is_parcel') ||
          error.message?.includes('drop_otp') ||
          error.message?.includes('column') ||
          error.message?.includes('schema cache')
        ) {
          delete payload.pay_at;
          delete payload.is_parcel;
          delete payload.drop_otp;

          const retryRes = await supabase
            .from('rides')
            .insert(payload)
            .select()
            .single();

          if (retryRes.error) {
            // Second fallback: minimal standard payload
            const minimalPayload = {
              customer_id: user.id,
              vehicle_type: effectiveVehicle,
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
            };
            const minRes = await supabase
              .from('rides')
              .insert(minimalPayload)
              .select()
              .single();

            if (minRes.error) throw minRes.error;
            ride = minRes.data;
          } else {
            ride = retryRes.data;
          }
        } else {
          throw error;
        }
      }

      const activeRideObj: Ride = {
        ...(ride as Ride),
        is_parcel: isParcelOrder,
        pay_at: parcelPayAt,
        drop_otp: dropOtpCode,
      };

      setActiveRide(activeRideObj);
      setIsCustomerSheetCollapsed(false);
      setIsBookingSheetCollapsed(false);
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

          if (updatedRide.status === 'COMPLETED' && dismissedRatingRideId !== updatedRide.id) {
            setShowRatingModal(true);
          }
        }
      )
      .subscribe();

    const pollInterval = setInterval(async () => {
      const { data: updatedRide } = await supabase
        .from('rides')
        .select('*')
        .eq('id', activeRide.id)
        .single();

      if (updatedRide && (updatedRide.status !== activeRide.status || updatedRide.captain_id !== activeRide.captain_id)) {
        setActiveRide(updatedRide as Ride);

        if (updatedRide.captain_id && (!assignedCaptain || assignedCaptain.id !== updatedRide.captain_id)) {
          fetchCaptainDetails(updatedRide.captain_id);
          soundEffects.playAcceptedChime();
        }

        if (updatedRide.status === 'COMPLETED' && dismissedRatingRideId !== updatedRide.id) {
          setShowRatingModal(true);
        }
      }
    }, 2000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [activeRide?.id, dismissedRatingRideId]);

  useEffect(() => {
    if (!activeRide?.captain_id || !['ACCEPTED', 'CAPTAIN_ARRIVING', 'CAPTAIN_ARRIVED', 'IN_PROGRESS'].includes(activeRide.status)) {
      return;
    }

    const captChannel = supabase
      .channel(`captain_loc_${activeRide.captain_id}`)
      .on(
        'broadcast',
        { event: 'location_update' },
        (payload) => {
          const liveData = payload.payload;
          if (liveData?.latitude && liveData?.longitude) {
            setCaptainLiveLocation([liveData.latitude, liveData.longitude]);
          }
        }
      )
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


  // 3-Second High-Frequency Live Ride & Captain Location Sync Loop (Zero Page Refresh)
  useEffect(() => {
    if (!activeRide) return;

    const interval = setInterval(async () => {
      const { data: rideData } = await supabase
        .from('rides')
        .select('*')
        .eq('id', activeRide.id)
        .single();

      if (rideData) {
        const updatedRide = rideData as Ride;
        setActiveRide((prev) => (prev?.status !== updatedRide.status ? updatedRide : prev));

        if (updatedRide.captain_id) {
          if (!assignedCaptain || assignedCaptain.id !== updatedRide.captain_id) {
            fetchCaptainDetails(updatedRide.captain_id);
          }

          const { data: captData } = await supabase
            .from('captains')
            .select('latitude, longitude')
            .eq('id', updatedRide.captain_id)
            .single();

          if (captData && captData.latitude && captData.longitude) {
            setCaptainLiveLocation([captData.latitude, captData.longitude]);
          }
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeRide?.id, activeRide?.status, activeRide?.captain_id, assignedCaptain?.id]);

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

  const handleCloseRatingModal = () => {
    if (activeRide?.id) {
      setDismissedRatingRideId(activeRide.id);
    }
    setShowRatingModal(false);
    setActiveRide(null);
    setAssignedCaptain(null);
    setDestinationCoords(null);
    setDestinationAddress('');
    setDestinationQuery('');
    setRouteCoords([]);
  };

  const handleRatingSubmit = async (rating: number, feedback: string) => {
    if (!activeRide || !user || !assignedCaptain) return;

    if (activeRide.id) {
      setDismissedRatingRideId(activeRide.id);
    }

    // 1. Record rating entry
    await supabase.from('ratings').insert({
      ride_id: activeRide.id,
      customer_id: user.id,
      captain_id: assignedCaptain.id,
      rating,
      feedback,
    });

    // 2. Dynamic rating calculation: recalculate sum and count for captain
    const currentSum = Number(assignedCaptain.rating_sum) || 0;
    const currentCount = Number(assignedCaptain.rating_count) || 0;
    const newSum = currentSum + rating;
    const newCount = currentCount + 1;

    await supabase
      .from('captains')
      .update({
        rating_sum: newSum,
        rating_count: newCount,
      })
      .eq('id', assignedCaptain.id);

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
        {/* eslint-disable-next-html-element-for-img */}
        <img
          src="/rideon-logo.png"
          alt="RIDEON Logo"
          className="h-8 sm:h-10 w-auto object-contain mb-3 animate-pulse brightness-200"
        />
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

  const getCaptainEtaDetails = () => {
    if (!activeRide) return { hasLiveLocation: false, text: 'Captain Assigned', miniText: 'Assigned' };

    const captPos: [number, number] | null = captainLiveLocation ||
      (assignedCaptain?.latitude && assignedCaptain?.longitude
        ? [assignedCaptain.latitude, assignedCaptain.longitude]
        : null);

    let targetLat = activeRide.pickup_lat;
    let targetLng = activeRide.pickup_lng;

    if (['IN_PROGRESS', 'OTP_VERIFIED'].includes(activeRide.status)) {
      targetLat = activeRide.destination_lat;
      targetLng = activeRide.destination_lng;
    }

    if (activeRide.status === 'CAPTAIN_ARRIVED') {
      return {
        hasLiveLocation: true,
        text: 'Captain Arrived at Pickup',
        miniText: 'Arrived at Pickup'
      };
    }

    if (!captPos || !targetLat || !targetLng) {
      return {
        hasLiveLocation: false,
        text: activeRide.status === 'ACCEPTED' ? 'Captain Assigned' : 'Captain En Route',
        miniText: activeRide.status === 'ACCEPTED' ? 'Assigned' : 'En Route'
      };
    }

    const distKm = calculateHaversineDistance(captPos[0], captPos[1], targetLat, targetLng);
    const etaMins = Math.max(1, Math.round((distKm / 22) * 60));
    const formattedDist = distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${distKm.toFixed(1)}km`;

    if (distKm < 0.05) {
      return {
        hasLiveLocation: true,
        distKm: distKm.toFixed(1),
        formattedDist,
        etaMins: 0,
        text: 'Captain Arrived at Pickup',
        miniText: 'Arrived at Pickup'
      };
    }

    if (['IN_PROGRESS', 'OTP_VERIFIED'].includes(activeRide.status)) {
      return {
        hasLiveLocation: true,
        distKm: distKm.toFixed(1),
        formattedDist,
        etaMins,
        text: `On the way to Drop-off (${formattedDist} • ${etaMins} mins)`,
        miniText: `En Route • ${etaMins}m`
      };
    }

    return {
      hasLiveLocation: true,
      distKm: distKm.toFixed(1),
      formattedDist,
      etaMins,
      text: `Arriving in ${etaMins} mins (${formattedDist} away)`,
      miniText: `Arriving in ${etaMins}m • ${formattedDist}`
    };
  };

  const currentCaptainEta = getCaptainEtaDetails();

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
            captainVehicleType={assignedCaptain?.vehicle_type || activeRide?.vehicle_type || selectedVehicle}
            nearbyCaptains={nearbyCaptains}
            routeCoordinates={routeCoords}
            onMapClick={handleMapClick}
          />
        </div>

        {/* FLOATING TOP CURRENT LOCATION PILL ON MAP (MATCHING SCREENSHOT 2 RAPIDO APP) */}
        {!activeRide && !isSearchOverlayOpen && (
          <div className="absolute top-3 inset-x-4 z-20 max-w-sm mx-auto pointer-events-auto">
            <div className="w-full rounded-full bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 px-3.5 py-1.5 shadow-md backdrop-blur-md flex items-center justify-between gap-2 text-xs text-slate-700 dark:text-slate-300">
              <button
                onClick={() => {
                  setActiveSelectTab('PICKUP');
                  setIsSearchOverlayOpen(true);
                }}
                className="flex items-center gap-2 truncate flex-1 text-left hover:opacity-80 transition-opacity"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate text-[11px] font-medium text-slate-800 dark:text-slate-200">
                  {isDetectingGps ? 'Detecting location...' : pickupAddress}
                </span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  detectCurrentLocation();
                }}
                disabled={isDetectingGps}
                className="p-1 text-slate-400 hover:text-emerald-500 transition-colors shrink-0 flex items-center justify-center"
                title="Locate current GPS location"
              >
                {isDetectingGps ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />
                ) : (
                  <Crosshair className="h-3.5 w-3.5" />
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
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsSearchOverlayOpen(false)}
                className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-extrabold text-base"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{activeSelectTab === 'PICKUP' ? 'Set Pickup Location' : 'Set Drop Location'}</span>
              </button>

              <button
                onClick={() => setIsSearchOverlayOpen(false)}
                className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-medium">Select on map</span>
              </button>
            </div>

            {/* DUAL CONNECTED LOCATION INPUT BOX (SLIM & MINIMAL) */}
            <div className="relative rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-3 space-y-2.5 mb-3">
              <div className="absolute left-5 top-5 bottom-5 w-0.5 border-l border-dashed border-slate-300 dark:border-slate-700 z-0"></div>

              {/* PICKUP ROW */}
              <div className="relative z-10 flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <input
                  type="text"
                  value={pickupQuery}
                  onChange={(e) => {
                    setActiveSelectTab('PICKUP');
                    setPickupQuery(e.target.value);
                  }}
                  onFocus={() => setActiveSelectTab('PICKUP')}
                  placeholder="Enter pickup location..."
                  className="w-full bg-transparent text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                />
                {isSearchingPickup ? (
                  <Loader2 className="h-3.5 w-3.5 text-emerald-500 animate-spin shrink-0" />
                ) : (
                  <button
                    onClick={() => {
                      detectCurrentLocation();
                      setIsSearchOverlayOpen(false);
                    }}
                    className="p-1 text-slate-400 hover:text-emerald-500 transition-colors shrink-0"
                    title="Use current GPS location"
                  >
                    <Crosshair className="h-3.5 w-3.5 text-emerald-500" />
                  </button>
                )}
                {pickupQuery && (
                  <button onClick={() => { setPickupQuery(''); setPickupCoords(null); }}>
                    <X className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                )}
              </div>

              <div className="border-t border-slate-200/60 dark:border-slate-800/60 my-0.5"></div>

              {/* DROP ROW */}
              <div className="relative z-10 flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={destinationQuery}
                  onChange={(e) => {
                    setActiveSelectTab('DESTINATION');
                    setDestinationQuery(e.target.value);
                  }}
                  onFocus={() => setActiveSelectTab('DESTINATION')}
                  placeholder="Drop location (Search places, shops, metro...)"
                  className="w-full bg-transparent text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                />
                {isSearchingDestination && (
                  <Loader2 className="h-3.5 w-3.5 text-amber-500 animate-spin shrink-0" />
                )}
                {destinationQuery && (
                  <button onClick={() => { setDestinationQuery(''); setDestinationCoords(null); }}>
                    <X className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                )}
              </div>
            </div>

            {/* SEARCH RESULTS & RECENT HISTORY LIST */}
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {(activeSelectTab === 'DESTINATION' ? destinationSearchResults : pickupSearchResults).length > 0
                    ? 'Real-Time Map Suggestions'
                    : recentLocations.length > 0
                    ? 'Recent Locations'
                    : 'Popular Suggestions'}
                </h4>
                {(isSearchingPickup || isSearchingDestination) && (
                  <span className="text-[10px] font-semibold text-amber-500 flex items-center gap-1 animate-pulse">
                    <Loader2 className="h-3 w-3 animate-spin" /> Searching live map...
                  </span>
                )}
              </div>

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
                      className="w-full text-left py-3 flex items-center justify-between gap-3 group hover:bg-slate-50 dark:hover:bg-slate-900/60 px-2 rounded-2xl transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
                          <MapPin className="h-4 w-4 text-amber-500" />
                        </div>
                        <div className="min-w-0">
                          <h5 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 group-hover:text-amber-500 transition-colors truncate">
                            {res.title || res.display_name.split(',')[0]}
                          </h5>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {res.subtitle || res.display_name}
                          </p>
                        </div>
                      </div>
                      {res.distanceKm !== undefined && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                          {res.distanceKm} km
                        </span>
                      )}
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
                      className="w-full text-left py-3 flex items-center justify-between gap-3 group hover:bg-slate-50 dark:hover:bg-slate-900/60 px-2 rounded-2xl transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          <History className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="min-w-0">
                          <h5 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 group-hover:text-amber-500 transition-colors truncate">
                            {loc.title || loc.display_name.split(',')[0]}
                          </h5>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {loc.subtitle || loc.display_name}
                          </p>
                        </div>
                      </div>
                      {loc.distanceKm !== undefined && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                          {loc.distanceKm} km
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                /* EMPTY STATE WHEN NO RECENT HISTORY YET */
                <div className="py-10 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-500 mb-2">
                    <Search className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Search Live Map Locations</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
                    Type any shop, metro station, airport, society, or place name above to search real-time map records.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DOCKED BOTTOM BOOKING SHEET (DOCKED AT BOTTOM-0 TO PREVENT MAP GAPS) */}
        {!isSearchOverlayOpen && (
          <div className="fixed inset-x-0 bottom-0 z-30 max-w-lg mx-auto w-full pointer-events-auto">
            {/* CASE A: SEARCHING FOR CAPTAIN */}
            {activeRide?.status === 'SEARCHING' && (
              <div className="rounded-t-[32px] bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-5 pb-6 shadow-2xl text-center space-y-4 max-h-[82vh] overflow-y-auto overscroll-contain">
                {/* ANIMATED RADAR VEHICLE ICON */}
                <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400/40 opacity-75" />
                  <span className="animate-pulse absolute inline-flex h-12 w-12 rounded-full bg-amber-400/20" />
                  <div className="relative h-14 w-14 flex items-center justify-center">
                    {/* eslint-disable-next-html-element-for-img */}
                    <img
                      src={VEHICLE_CONFIGS[activeRide.vehicle_type as VehicleType]?.icon || '/icons/bike.png'}
                      alt={activeRide.vehicle_type}
                      className="h-12 w-14 object-contain animate-bounce"
                    />
                  </div>
                </div>

                {/* TITLE & LIVE RADAR STATUS */}
                <div className="space-y-1">
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                    Connecting with nearby Captains...
                  </h3>
                  <div className="flex items-center justify-center gap-2 pt-0.5">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                      {activeRide.vehicle_type}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span>{searchTimeout}s timeout</span>
                    </span>
                  </div>
                </div>

                {/* MODERN COMPLETE ROUTE & FARE CARD */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left space-y-3 shadow-sm">
                  {/* TIMELINE ROUTE (PICKUP & DESTINATION) */}
                  <div className="relative pl-5 space-y-3">
                    {/* Continuous Timeline Connector Line */}
                    <div className="absolute left-[5px] top-[10px] bottom-[10px] w-0.5 bg-slate-200 dark:bg-slate-700/80 rounded-full" />

                    {/* Pickup Point Node */}
                    <div className="relative flex items-start justify-between gap-2">
                      <span className="absolute -left-5 top-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider block">Pickup Point</span>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{activeRide.pickup_address}</p>
                      </div>
                    </div>

                    {/* Drop Location Node */}
                    <div className="relative flex items-start justify-between gap-2">
                      <span className="absolute -left-5 top-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-4 ring-rose-500/20 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider block">Destination</span>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{activeRide.destination_address}</p>
                      </div>
                    </div>
                  </div>

                  {/* FULL-WIDTH FARE ROW DIVIDER */}
                  <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Fare</span>
                    <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                      ₹{activeRide.estimated_fare}
                    </span>
                  </div>
                </div>

                {/* CANCEL SEARCH BUTTON */}
                <button
                  onClick={() => setIsCancelModalOpen(true)}
                  className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs transition-all active:scale-[0.98] shadow-sm text-center"
                >
                  Cancel Search
                </button>
              </div>
            )}            {/* CASE B: CAPTAIN ASSIGNED / IN PROGRESS */}
            {activeRide && ['ACCEPTED', 'CAPTAIN_ARRIVING', 'CAPTAIN_ARRIVED', 'OTP_VERIFIED', 'IN_PROGRESS'].includes(activeRide.status) && (
              <div className={`rounded-t-[32px] bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xl transition-all duration-300 ${
                isCustomerSheetCollapsed ? 'max-h-[85px] overflow-hidden' : 'max-h-[60vh] overflow-y-auto overscroll-contain space-y-3.5'
              }`}>
                {/* TOP COLLAPSE / EXPAND HANDLE */}
                <button
                  onClick={() => setIsCustomerSheetCollapsed(!isCustomerSheetCollapsed)}
                  className="w-full flex items-center justify-center gap-1.5 pb-2 -mt-1 text-slate-400 hover:text-amber-500 transition-colors group"
                  title={isCustomerSheetCollapsed ? "Expand ride details" : "Minimize panel for 90% map view"}
                >
                  <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full group-hover:bg-amber-400 transition-colors" />
                </button>

                {/* COLLAPSED MINI BAR MODE (Minimal height for 90% map visibility) */}
                {isCustomerSheetCollapsed ? (
                  <div className="flex items-center justify-between gap-3 cursor-pointer py-1" onClick={() => setIsCustomerSheetCollapsed(false)}>
                    {/* LEFT: REAL-TIME ETA & CAPTAIN INFO */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center gap-1.5 shrink-0 shadow-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>{currentCaptainEta.miniText}</span>
                      </span>

                      {assignedCaptain && (
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {assignedCaptain.profile?.name || 'Captain'}
                        </span>
                      )}
                    </div>

                    {/* RIGHT: INLINE PIN + FARE + EXPAND TOGGLE */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      {!['COMPLETED', 'OTP_VERIFIED', 'IN_PROGRESS'].includes(activeRide.status) && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider">PIN</span>
                          <span className="font-mono font-bold text-xs">
                            {activeRide.otp || '0000'}
                          </span>
                        </div>
                      )}

                      <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                        ₹{activeRide.estimated_fare}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsCustomerSheetCollapsed(false);
                        }}
                        className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center shrink-0"
                        title="Expand details"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* TOP STATUS HEADER WITH REALTIME DISTANCE & ETA */}
                    <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between gap-2">
                        {/* LEFT: STATUS BADGE WITH REALTIME ETA */}
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center gap-1.5 shrink-0 shadow-sm">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="truncate">{currentCaptainEta.text}</span>
                          </span>

                          {activeRide.is_parcel && (
                            <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1 shrink-0">
                              <Package className="h-3 w-3" />
                              Parcel
                            </span>
                          )}
                        </div>

                        {/* RIGHT: PIN AND MINIMIZE */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* INLINE CLEAN PIN BADGE */}
                          {!['COMPLETED', 'OTP_VERIFIED', 'IN_PROGRESS'].includes(activeRide.status) ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider">PIN</span>
                              <span className="font-mono font-bold text-xs">
                                {activeRide.otp || '0000'}
                              </span>
                            </div>
                          ) : activeRide.is_parcel && activeRide.drop_otp ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                              <span className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-wider">DROP</span>
                              <span className="font-mono font-bold text-xs">
                                {activeRide.drop_otp}
                              </span>
                            </div>
                          ) : null}

                          <button
                            onClick={() => setIsCustomerSheetCollapsed(true)}
                            className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-amber-500 transition-colors flex items-center justify-center shrink-0"
                            title="Minimize sheet for 90% map view"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* CAPTAIN PROFILE CARD WITH CALL/CHAT */}
                    {assignedCaptain && (
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 truncate">
                          <div className="h-11 w-13 flex items-center justify-center shrink-0">
                            {/* eslint-disable-next-html-element-for-img */}
                            <img
                              src={VEHICLE_CONFIGS[assignedCaptain.vehicle_type as VehicleType]?.icon || '/icons/bike.png'}
                              alt={assignedCaptain.vehicle_type}
                              className="h-9 w-12 object-contain"
                            />
                          </div>
                          <div className="truncate">
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs truncate">
                                {assignedCaptain.profile?.name || 'Captain'}
                              </h4>
                              <div className="flex items-center gap-1 text-amber-500 text-xs font-black shrink-0">
                                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                                <span>{assignedCaptain.rating_count > 0 ? (assignedCaptain.rating_sum / assignedCaptain.rating_count).toFixed(1) : '5.0'}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                                {assignedCaptain.vehicle_number}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate">{assignedCaptain.vehicle_model}</span>
                            </div>
                          </div>
                        </div>

                        {/* CALL & CHAT ACTION BUTTONS */}
                        <div className="flex items-center gap-2 shrink-0">
                          {assignedCaptain.profile?.phone && (
                            <a
                              href={`tel:${assignedCaptain.profile.phone}`}
                              className="h-9 w-9 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center hover:bg-amber-400 hover:text-slate-950 transition-colors shadow-sm"
                              title="Call Captain"
                            >
                              <Phone className="h-4 w-4" />
                            </a>
                          )}
                          <button
                            onClick={() => setIsChatOpen(true)}
                            className="h-9 w-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold hover:bg-amber-300 transition-colors shadow-sm"
                            title="Chat with Captain"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ROUTE LOCATION CARD */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 relative">
                      <div className="relative pl-5 space-y-3.5">
                        {/* Timeline vertical connector line */}
                        <div className="absolute left-[5px] top-[14px] bottom-[14px] w-0.5 bg-slate-200 dark:bg-slate-700/80 rounded-full" />

                        {/* Pickup Point Node */}
                        <div className="relative flex items-start justify-between gap-2">
                          <span className="absolute -left-5 top-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider block">Pickup Point</span>
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{activeRide.pickup_address}</p>
                          </div>
                        </div>

                        {/* Distance Badge */}
                        <div className="py-0.5">
                          <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                            <span>{activeRide.distance_km} km</span>
                            <span className="text-[9px] opacity-70">• Est. route</span>
                          </span>
                        </div>

                        {/* Drop Location Node */}
                        <div className="relative flex items-start justify-between gap-2">
                          <span className="absolute -left-5 top-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-4 ring-rose-500/20 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider block">Drop Location</span>
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{activeRide.destination_address}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* PARCEL DELIVERIES DUAL OTP DISPLAY CARD */}
                    {activeRide.is_parcel && (
                      <div className="space-y-2.5">
                        <div className="p-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/30 dark:bg-amber-400/10 flex items-center justify-around gap-2 shadow-2xs">
                          <div className="text-center flex-1">
                            <span className="text-[9.5px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                              1. Pickup OTP
                            </span>
                            <span className="font-mono font-black text-sm text-slate-900 dark:text-slate-100 tracking-wider">
                              {activeRide.otp || '----'}
                            </span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">Share with captain at pickup</span>
                          </div>
                          <div className="h-8 w-px bg-amber-400/30 shrink-0" />
                          <div className="text-center flex-1">
                            <span className="text-[9.5px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                              2. Drop-off OTP
                            </span>
                            <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400 tracking-wider">
                              {activeRide.drop_otp || (activeRide as any).dropOtp || '----'}
                            </span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">Share with recipient at drop</span>
                          </div>
                        </div>

                        {/* PAYMENT TIMING RULE BANNER */}
                        <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-3 shadow-2xs ${
                          activeRide.pay_at === 'PICKUP'
                            ? 'bg-amber-400/15 border-amber-400/40 text-amber-950 dark:text-amber-200'
                            : 'bg-blue-500/10 border-blue-500/30 text-blue-950 dark:text-blue-200'
                        }`}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Wallet className="h-4 w-4 text-amber-500 shrink-0" />
                            <div>
                              <p className="font-extrabold text-[11px] uppercase tracking-wider">
                                Payment Rule: Pay at {activeRide.pay_at || 'Pickup'}
                              </p>
                              <p className="text-[10.5px] opacity-80 font-medium mt-0.5">
                                {activeRide.pay_at === 'PICKUP'
                                  ? 'Pay ₹' + activeRide.estimated_fare + ' to Captain now at pickup before transit starts'
                                  : 'Recipient pays ₹' + activeRide.estimated_fare + ' to Captain at drop location after Drop OTP'}
                              </p>
                            </div>
                          </div>
                          <span className="font-black text-xs shrink-0">
                            ₹{activeRide.estimated_fare}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* COLLAPSIBLE FARE BREAKDOWN SECTION */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                      <button
                        onClick={() => setShowFareBreakdown(!showFareBreakdown)}
                        className="w-full flex items-center justify-between p-3 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="h-6 w-6 rounded-lg bg-amber-400/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <Receipt className="h-3.5 w-3.5" />
                          </div>
                          <span>Fare Breakdown</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-900 dark:text-slate-100 font-extrabold text-xs">₹{activeRide.estimated_fare}</span>
                          {showFareBreakdown ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                        </div>
                      </button>

                      {showFareBreakdown && (
                        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2 text-xs">
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

                    {/* CANCEL RIDE BUTTON */}
                    <div className="pt-2">
                      <button
                        onClick={() => setIsCancelModalOpen(true)}
                        className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs transition-all active:scale-[0.98] shadow-sm text-center"
                      >
                        Cancel Ride
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}


            {/* CASE C: RAPIDO HOME & BOOKING SELECTION SHEET */}
            {!activeRide && (
              <div className={`rounded-t-[32px] bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-4 sm:p-5 pb-16 sm:pb-18 shadow-2xl transition-all duration-300 flex flex-col overflow-hidden shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1)] ${
                isBookingSheetCollapsed && destinationCoords ? 'max-h-[145px]' : 'max-h-[72vh] sm:max-h-[76vh]'
              }`}>
                {/* COLLAPSE HANDLE FOR DESTINATION VIEW */}
                {destinationCoords && (
                  <button
                    onClick={() => setIsBookingSheetCollapsed(!isBookingSheetCollapsed)}
                    className="w-full flex items-center justify-center pb-2 -mt-1 text-slate-400 hover:text-amber-500 transition-colors"
                    title={isBookingSheetCollapsed ? "Expand vehicle options" : "Collapse panel for 90% map view"}
                  >
                    <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
                  </button>
                )}

                {/* SEARCH ENTRY BAR (SHOWING ONLY WHEN NO DESTINATION IS SELECTED) */}
                {!isBookingSheetCollapsed && !destinationCoords && (
                  <button
                    onClick={() => {
                      setActiveSelectTab('DESTINATION');
                      setIsSearchOverlayOpen(true);
                    }}
                    className="w-full shrink-0 mb-3 flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 font-normal hover:border-amber-400 transition-colors shadow-2xs group"
                  >
                    <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                      <Search className="h-3.5 w-3.5 text-slate-400 shrink-0 group-hover:text-amber-500 transition-colors" />
                      <span className="truncate text-slate-800 dark:text-slate-200 font-medium text-xs">
                        Where to? Search location...
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider shrink-0 px-1">
                      Search
                    </span>
                  </button>
                )}

                {/* MODE BRANCH A: PARCEL LANDING PAGE (WHEN PARCEL TAB SELECTED & NO DROP ADDRESS SET) */}
                {activeBottomTab === 'PARCEL' && !destinationCoords ? (
                  /* RAPIDO PARCEL LANDING UI (MATCHING SCREENSHOT 1) */
                  <div className="flex-1 overflow-y-auto overscroll-contain space-y-3.5 pr-0.5 pb-2">
                    {/* HERO PROMOTIONAL PARCEL BANNER */}
                    <div className="relative rounded-2xl bg-gradient-to-r from-amber-100 via-amber-200 to-amber-100 dark:from-amber-950/60 dark:to-amber-900/60 p-4 border border-amber-300/40 dark:border-amber-700/40 overflow-hidden flex items-center justify-between shadow-sm">
                      <div className="space-y-1 z-10 max-w-[220px]">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900 text-amber-300 text-[9px] font-black uppercase tracking-wider">
                          <Zap className="h-3 w-3 fill-amber-400" />
                          <span>Express Delivery</span>
                        </div>
                        <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 leading-tight">
                          First parcel order for <span className="text-amber-600 dark:text-amber-400 font-black">FREE</span>
                        </h3>
                        <div className="inline-block border border-dashed border-slate-900/40 dark:border-slate-100/40 px-2 py-0.5 rounded-md bg-white/60 dark:bg-slate-900/60 text-[10px] font-mono font-bold text-slate-900 dark:text-slate-100">
                          Code: RIDEON20
                        </div>
                        <p className="text-[9.5px] text-slate-600 dark:text-slate-400 font-semibold pt-0.5">
                          Door-to-door express pickup & drop • Max 20kg
                        </p>
                      </div>

                      <div className="h-20 w-20 flex items-center justify-center shrink-0 z-10">
                        {/* eslint-disable-next-html-element-for-img */}
                        <img
                          src="/icons/parcel.png"
                          alt="Parcel Order"
                          className="h-16 w-16 object-contain drop-shadow-lg"
                        />
                      </div>
                    </div>

                    {/* PICKUP & DROP ADDRESS SELECTION CARD (MATCHING SCREENSHOT 1) */}
                    <div className="relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
                      {/* PICKUP SECTION */}
                      <div className="flex items-start justify-between gap-3 pb-3 border-b border-dashed border-slate-200 dark:border-slate-800">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="h-3 w-3 rounded-full bg-emerald-500 mt-1 shrink-0 ring-4 ring-emerald-500/20" />
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                              Pickup from current location
                            </span>
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                              {isDetectingGps ? 'Detecting location...' : pickupAddress}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 truncate">
                              {user?.name || 'Customer'} ({user?.phone || '9667021148'})
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setActiveSelectTab('PICKUP');
                            setIsSearchOverlayOpen(true);
                          }}
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-500 transition-colors shrink-0"
                          title="Edit pickup address"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* DROP SECTION & SWITCH BUTTON */}
                      <div className="relative pt-1 space-y-2">
                        {/* SWITCH BUTTON (FLOATING AT SEAM) */}
                        {destinationAddress && (
                          <div className="absolute -top-6 right-0 z-10">
                            <button
                              onClick={handleSwitchPickupDrop}
                              className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10.5px] font-bold text-slate-700 dark:text-slate-200 shadow-sm flex items-center gap-1 hover:border-amber-400 transition-colors active:scale-95"
                            >
                              <ArrowUpDown className="h-3 w-3 text-amber-500" />
                              <span>Switch</span>
                            </button>
                          </div>
                        )}

                        <div className="flex items-center gap-3">
                          <div className="h-3 w-3 rounded-full bg-rose-500 shrink-0 ring-4 ring-rose-500/20" />
                          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            Drop to
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            setActiveSelectTab('DESTINATION');
                            setIsSearchOverlayOpen(true);
                          }}
                          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 font-medium hover:border-amber-400 transition-colors group"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <Search className="h-4 w-4 text-slate-400 group-hover:text-amber-500 transition-colors shrink-0" />
                            <span className="truncate text-slate-800 dark:text-slate-200 font-semibold text-xs">
                              {destinationAddress || 'Search drop address...'}
                            </span>
                          </div>
                          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-500 transition-colors shrink-0" />
                        </button>
                      </div>
                    </div>

                    {/* PROHIBITED ITEMS FOOTER */}
                    <div className="pt-2 text-center space-y-1">
                      <button
                        onClick={() => setIsProhibitedModalOpen(true)}
                        className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-amber-500 transition-colors inline-flex items-center gap-1"
                      >
                        <span>Read about</span>
                        <span className="text-amber-600 dark:text-amber-400 font-bold underline">prohibited items</span>
                      </button>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        By continuing, you agree to our T&Cs • Max 20kg package weight
                      </p>
                    </div>
                  </div>
                ) : !destinationCoords ? (
                  /* CASE C1: STANDARD RIDE HOME SCREEN - RECENT HISTORIES & QUICK SERVICES */
                  <div className="flex-1 overflow-y-auto overscroll-contain space-y-4 pr-0.5 pb-2">
                    {/* RECENT RIDE HISTORY */}
                    {recentLocations.length > 0 ? (
                      <div className="space-y-1">
                        <div className="divide-y divide-dashed divide-slate-200 dark:border-slate-800">
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
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <h4 className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Everything In Minutes
                      </h4>

                      <button
                        onClick={() => {
                          setActiveBottomTab('PARCEL');
                          setIsSearchOverlayOpen(false);
                        }}
                        className="w-full p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left hover:bg-amber-500/20 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 flex items-center justify-center shrink-0">
                            {/* eslint-disable-next-html-element-for-img */}
                            <img
                              src="/icons/parcel.png"
                              alt="Parcel Delivery"
                              className="h-10 w-10 object-contain drop-shadow-md"
                            />
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
                ) : isBookingSheetCollapsed ? (
                  /* COLLAPSED 10% SHEET FOR VEHICLE SELECTION (LEAVING 90% MAP VISIBLE) */
                  <div
                    className="flex items-center justify-between gap-3 pt-1 cursor-pointer"
                    onClick={() => setIsBookingSheetCollapsed(false)}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="h-10 w-12 flex items-center justify-center shrink-0">
                        {/* eslint-disable-next-html-element-for-img */}
                        <img
                          src={activeBottomTab === 'PARCEL' ? '/icons/parcel.png' : VEHICLE_CONFIGS[selectedVehicle]?.icon || '/icons/bike.png'}
                          alt={selectedVehicle}
                          className="h-9 w-12 object-contain"
                        />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                          {activeBottomTab === 'PARCEL' ? 'Parcel Bike' : selectedVehicle} • {distanceKm} km
                        </p>
                        <p className="text-[10px] text-slate-500 font-semibold truncate max-w-[200px]">{destinationAddress}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-black text-sm text-slate-900 dark:text-slate-100">
                        ₹{currentFareBreakdown ? currentFareBreakdown.totalFare : '--'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsBookingSheetCollapsed(false);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1 shadow-sm transition-transform active:scale-95"
                      >
                        <span>DETAILS</span>
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* CASE C2: EXPANDED DESTINATION SELECTED - VEHICLE SELECTION & BOOK CTA */
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 py-1 space-y-3">
                      {/* PERSISTENT & EDITABLE TRIP LOCATIONS SUMMARY CARD ON BOOKING SCREEN */}
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2.5 shadow-2xs">
                        {/* PICKUP ROW */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                                Pickup Location
                              </span>
                              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                {pickupAddress}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setActiveSelectTab('PICKUP');
                              setIsSearchOverlayOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-[10.5px] shrink-0 hover:text-amber-500 transition-colors"
                            title="Edit pickup location"
                          >
                            Edit
                          </button>
                        </div>

                        <div className="h-px bg-slate-200/60 dark:bg-slate-800/80 my-0.5" />

                        {/* DROP ROW */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 ring-4 ring-rose-500/20 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                                Drop Location
                              </span>
                              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                {destinationAddress}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => {
                                setActiveSelectTab('DESTINATION');
                                setIsSearchOverlayOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-xl bg-amber-400/20 text-amber-900 dark:text-amber-300 font-extrabold text-[10.5px] hover:bg-amber-400/30 transition-colors flex items-center gap-1"
                              title="Change drop location"
                            >
                              <Pencil className="h-3 w-3" />
                              <span>Change</span>
                            </button>
                            <button
                              onClick={handleSwitchPickupDrop}
                              className="p-1 rounded-lg text-slate-400 hover:text-amber-500 transition-colors"
                              title="Switch pickup & drop locations"
                            >
                              <ArrowUpDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {activeBottomTab === 'PARCEL' ? (
                        /* SINGLE PARCEL BIKE VEHICLE CARD (MATCHING SCREENSHOT 2 - ONLY BIKE ALLOWED) */
                        <div className="rounded-2xl border-2 border-slate-900 dark:border-slate-100 bg-amber-400/10 dark:bg-amber-400/10 p-3.5 flex items-center justify-between shadow-sm relative">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400" />
                          <div className="flex items-center gap-3.5 pl-1">
                            <div className="h-12 w-14 flex items-center justify-center shrink-0">
                              {/* eslint-disable-next-html-element-for-img */}
                              <img
                                src="/icons/parcel.png"
                                alt="Parcel Bike"
                                className="h-10 w-14 object-contain"
                              />
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                                  Parcel
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-700 dark:text-amber-300 font-extrabold text-[9px] uppercase">
                                  Fastest Bike
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                                Send upto 20 kgs • {calculateEstimatedTimeMinutes(distanceKm, 'BIKE')} mins away
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-black text-base text-slate-900 dark:text-slate-100">
                              ₹{getFareBreakdown(distanceKm, 'BIKE').totalFare}
                            </span>
                          </div>
                        </div>
                      ) : (
                        /* STANDARD RIDE VEHICLE OPTIONS LIST (BIKE, AUTO, CAB) */
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80 shadow-sm">
                          {(['BIKE', 'AUTO', 'CAB'] as VehicleType[]).map((vType) => {
                            const cfg = VEHICLE_CONFIGS[vType];
                            const breakdown = getFareBreakdown(distanceKm, vType);
                            const selected = selectedVehicle === vType;

                            return (
                              <button
                                key={vType}
                                onClick={() => setSelectedVehicle(vType)}
                                className={`w-full flex items-center justify-between p-3.5 transition-all text-left relative ${
                                  selected
                                    ? 'bg-amber-400/10 dark:bg-amber-400/10'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                }`}
                              >
                                {selected && (
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400" />
                                )}

                                <div className="flex items-center gap-3.5 pl-1">
                                  <div className="h-12 w-14 flex items-center justify-center shrink-0">
                                    {/* eslint-disable-next-html-element-for-img */}
                                    <img
                                      src={cfg.icon}
                                      alt={cfg.title}
                                      className={`h-10 w-14 object-contain transition-transform ${selected ? 'scale-110' : 'opacity-70'}`}
                                    />
                                  </div>

                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                                        {cfg.title}
                                      </span>
                                      {cfg.badge && selected && (
                                        <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-700 dark:text-amber-300 font-extrabold text-[9px] uppercase">
                                          {cfg.badge}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                                      {cfg.etaMinutes} min away • Drop {breakdown.durationMinutes}m ({distanceKm} km)
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <span className="font-black text-sm text-slate-900 dark:text-slate-100">
                                    ₹{breakdown.totalFare}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* PINNED / STICKY BOTTOM ACTION BAR: PAYMENT & PAY AT (PICKUP/DROP) TOGGLE + CTA */}
                    <div className="shrink-0 pt-2.5 mt-1 border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-950 z-10 space-y-2">
                      {/* PAY AT (PICKUP vs DROP) TOGGLE ROW (MATCHING SCREENSHOT 2 FOR PARCEL ORDERS) */}
                      {(activeBottomTab === 'PARCEL' || (activeRide as Ride | null)?.is_parcel) && (
                        <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-xs">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-slate-500" />
                            <span className="font-extrabold text-[11px] text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                              PAY AT
                            </span>
                          </div>

                          {/* TOGGLE PILLS (LOCKED ONCE PARCEL RIDE STARTS) */}
                          {activeRide && ['OTP_VERIFIED', 'IN_PROGRESS', 'COMPLETED'].includes((activeRide as Ride).status) ? (
                            <span className="px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-black text-xs border border-slate-300 dark:border-slate-700">
                              Pay at {(activeRide as Ride).pay_at || 'Pickup'}
                            </span>
                          ) : (
                            <div className="flex items-center gap-1 p-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700">
                              <button
                                onClick={() => handleTogglePayAt('PICKUP')}
                                className={`px-3.5 py-1 rounded-full text-xs font-black transition-all ${
                                  ((activeRide as Ride | null)?.pay_at || parcelPayAt) === 'PICKUP'
                                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                              >
                                Pickup
                              </button>
                              <button
                                onClick={() => handleTogglePayAt('DROP')}
                                className={`px-3.5 py-1 rounded-full text-xs font-black transition-all ${
                                  ((activeRide as Ride | null)?.pay_at || parcelPayAt) === 'DROP'
                                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                              >
                                Drop
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-1.5 px-3 py-3 rounded-xl bg-slate-100/80 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 shrink-0 cursor-pointer hover:bg-slate-200/70 transition-colors">
                          <Banknote className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span>Cash</span>
                          <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
                        </div>

                        <button
                          onClick={handleBookRide}
                          disabled={!pickupCoords || !destinationCoords || bookingLoading}
                          className="flex-1 flex items-center justify-between px-4 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm transition-all active:scale-[0.98] disabled:opacity-40 border-0 shadow-sm"
                        >
                          {bookingLoading ? (
                            <div className="w-full flex items-center justify-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Connecting ride...</span>
                            </div>
                          ) : (
                            <>
                              <span className="font-extrabold text-xs sm:text-sm">
                                {activeBottomTab === 'PARCEL' ? 'Book Parcel' : `Book ${selectedVehicle ? selectedVehicle.charAt(0) + selectedVehicle.slice(1).toLowerCase() : 'Ride'}`}
                              </span>
                              <span className="font-extrabold text-xs sm:text-sm flex items-center gap-1">
                                ₹{currentFareBreakdown ? (activeBottomTab === 'PARCEL' ? getFareBreakdown(distanceKm, 'BIKE').totalFare : currentFareBreakdown.totalFare) : '--'}
                                <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                              </span>
                            </>
                          )}
                        </button>
                      </div>
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
              : activeBottomTab
          }
          onTabSelect={(tab) => {
            setActiveBottomTab(tab);
            if (tab === 'RIDE') {
              setIsSearchOverlayOpen(false);
              setIsProfileOpen(false);
            } else if (tab === 'PARCEL') {
              setIsSearchOverlayOpen(false);
              setIsProfileOpen(false);
            } else if (tab === 'PROFILE') {
              setIsSearchOverlayOpen(false);
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

      {/* Prohibited Parcel Items Modal */}
      {isProhibitedModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-500" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Prohibited Parcel Items</h3>
              </div>
              <button
                onClick={() => setIsProhibitedModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 max-h-[50vh] overflow-y-auto pr-1">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex items-center justify-between font-bold">
                <span>Maximum Package Weight Limit</span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black">20 kg</span>
              </div>

              <p className="font-semibold text-slate-500 dark:text-slate-400 pt-1">
                The following items strictly CANNOT be transported via Rideon Parcel:
              </p>

              <ul className="space-y-2 list-disc list-inside text-[11.5px]">
                <li>Hazardous chemicals, flammable liquids, or toxic materials</li>
                <li>Explosives, fireworks, weapons, and ammunition</li>
                <li>Illegal drugs, narcotics, and controlled substances</li>
                <li>Live animals, pets, or livestock</li>
                <li>Unpackaged liquids or fragile items without protective box</li>
                <li>High-value cash currency, jewelry, or bullion exceeding legal limits</li>
              </ul>
            </div>

            <button
              onClick={() => setIsProhibitedModalOpen(false)}
              className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-sm transition-transform active:scale-[0.99]"
            >
              I Understand & Agree
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
          isParcel={activeRide.is_parcel}
          captainName={assignedCaptain?.profile?.name}
          vehicleNumber={assignedCaptain?.vehicle_number}
          vehicleModel={assignedCaptain?.vehicle_model}
          captainRating={assignedCaptain?.rating_count ? (assignedCaptain.rating_sum / assignedCaptain.rating_count) : 5.0}
          finalFare={activeRide.estimated_fare}
          onSubmit={handleRatingSubmit}
          onClose={handleCloseRatingModal}
        />
      )}

      {/* EXPANDABLE TRIP DETAILS MODAL SHEET (MATCHING SCREENSHOT 4 RAPIDO) */}
      {isTripDetailsOpen && activeRide && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[32px] sm:rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200">
            {/* TOP HEADER */}
            <div className="relative flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-12 flex items-center justify-center shrink-0">
                  {/* eslint-disable-next-html-element-for-img */}
                  <img
                    src={VEHICLE_CONFIGS[activeRide.vehicle_type as VehicleType]?.icon || '/icons/bike.png'}
                    alt={activeRide.vehicle_type}
                    className="h-8 w-11 object-contain"
                  />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                    {activeRide.is_parcel ? 'Parcel Delivery' : `${activeRide.vehicle_type} Ride`}
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">Trip ID: #{activeRide.id.slice(0, 8)}</span>
                </div>
              </div>

              <button
                onClick={() => setIsTripDetailsOpen(false)}
                className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* LOCATION DETAILS SECTION */}
            <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">Location Details</h4>

              <div className="space-y-3 relative pl-1">
                {/* PICKUP */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="h-3.5 w-3.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Pickup</span>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-snug">
                        {activeRide.pickup_address}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="ml-1.5 border-l-2 border-dashed border-slate-300 dark:border-slate-700 h-4"></div>

                {/* DROP */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="h-3.5 w-3.5 rounded-full bg-rose-500 ring-4 ring-rose-500/20 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Drop Location</span>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-snug">
                        {activeRide.destination_address}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* TOTAL FARE & PAYMENT METHOD */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Total Fare</span>
                <span className="font-black text-lg text-slate-900 dark:text-slate-100">₹{activeRide.estimated_fare}</span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  <span>Paying via cash</span>
                </div>
                <span className="text-amber-500 font-extrabold text-xs">Cash</span>
              </div>
            </div>

            {/* CANCEL RIDE CTA BUTTON */}
            <button
              onClick={() => {
                setIsTripDetailsOpen(false);
                setIsCancelModalOpen(true);
              }}
              className="w-full rounded-2xl border-2 border-rose-600 text-rose-600 hover:bg-rose-600 hover:text-white font-extrabold py-3.5 text-xs transition-colors shadow-sm"
            >
              Cancel Ride
            </button>
          </div>
        </div>
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
