'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MAP_CONFIG } from '@/lib/maps';
import { VehicleType } from '@/types/ride';

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  customerLocation?: [number, number] | null;
  pickupLocation?: [number, number] | null;
  destinationLocation?: [number, number] | null;
  captainLocation?: [number, number] | null;
  nearbyCaptains?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    vehicle_type: VehicleType;
  }>;
  routeCoordinates?: [number, number][];
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
}

export default function MapView({
  center = MAP_CONFIG.defaultCenter,
  zoom = MAP_CONFIG.defaultZoom,
  customerLocation,
  pickupLocation,
  destinationLocation,
  captainLocation,
  nearbyCaptains = [],
  routeCoordinates = [],
  onMapClick,
  className = 'h-full w-full',
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const polylineBgRef = useRef<L.Polyline | null>(null);
  const polylineFgRef = useRef<L.Polyline | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: false,
    });

    L.tileLayer(MAP_CONFIG.tileUrl, {
      attribution: MAP_CONFIG.attribution,
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Center & Fit Bounds smoothly
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (routeCoordinates && routeCoordinates.length > 0) {
      const bounds = L.latLngBounds(routeCoordinates.map((c) => L.latLng(c[0], c[1])));
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16, animate: true });
    } else if (pickupLocation && destinationLocation) {
      const bounds = L.latLngBounds([
        L.latLng(pickupLocation[0], pickupLocation[1]),
        L.latLng(destinationLocation[0], destinationLocation[1]),
      ]);
      map.fitBounds(bounds, { padding: [70, 70], maxZoom: 16, animate: true });
    } else if (pickupLocation) {
      map.setView(pickupLocation, 15, { animate: true });
    } else if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, pickupLocation, destinationLocation, routeCoordinates]);

  // Render Markers & Polylines
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // 1. Customer Location Marker (Pulsing Dot)
    if (customerLocation) {
      const icon = L.divIcon({
        html: `<div class="relative flex items-center justify-center w-8 h-8">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-5 w-5 bg-sky-500 border-2 border-white shadow-lg"></span>
          </div>`,
        className: 'custom-map-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      if (!markersRef.current['customer']) {
        markersRef.current['customer'] = L.marker(customerLocation, { icon }).addTo(map);
      } else {
        markersRef.current['customer'].setLatLng(customerLocation);
      }
    } else if (markersRef.current['customer']) {
      map.removeLayer(markersRef.current['customer']);
      delete markersRef.current['customer'];
    }

    // 2. Pickup Location Marker (Rapido Green Teardrop Pin)
    if (pickupLocation) {
      const icon = L.divIcon({
        html: `<div class="flex flex-col items-center group">
            <div class="bg-gradient-to-tr from-emerald-600 to-teal-400 text-white font-extrabold text-xs px-2.5 py-1 rounded-full shadow-2xl border-2 border-white flex items-center gap-1">
              <span>PICKUP</span>
            </div>
            <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-emerald-600 drop-shadow-md"></div>
          </div>`,
        className: 'custom-map-icon',
        iconSize: [80, 42],
        iconAnchor: [40, 42],
      });

      if (!markersRef.current['pickup']) {
        markersRef.current['pickup'] = L.marker(pickupLocation, { icon }).addTo(map);
      } else {
        markersRef.current['pickup'].setIcon(icon);
        markersRef.current['pickup'].setLatLng(pickupLocation);
      }
    } else if (markersRef.current['pickup']) {
      map.removeLayer(markersRef.current['pickup']);
      delete markersRef.current['pickup'];
    }

    // 3. Destination Location Marker (Rapido Red Teardrop Pin)
    if (destinationLocation) {
      const icon = L.divIcon({
        html: `<div class="flex flex-col items-center group">
            <div class="bg-gradient-to-tr from-rose-600 to-pink-500 text-white font-extrabold text-xs px-2.5 py-1 rounded-full shadow-2xl border-2 border-white flex items-center gap-1">
              <span>DROP</span>
            </div>
            <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-rose-600 drop-shadow-md"></div>
          </div>`,
        className: 'custom-map-icon',
        iconSize: [80, 42],
        iconAnchor: [40, 42],
      });

      if (!markersRef.current['destination']) {
        markersRef.current['destination'] = L.marker(destinationLocation, { icon }).addTo(map);
      } else {
        markersRef.current['destination'].setIcon(icon);
        markersRef.current['destination'].setLatLng(destinationLocation);
      }
    } else if (markersRef.current['destination']) {
      map.removeLayer(markersRef.current['destination']);
      delete markersRef.current['destination'];
    }

    // 4. Assigned Captain Live Marker (Gold Badge)
    if (captainLocation) {
      const icon = L.divIcon({
        html: `<div class="bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black rounded-full p-2.5 shadow-2xl border-2 border-white flex items-center justify-center text-sm transform hover:scale-110 transition-transform">
            ⚡ CAPTAIN
          </div>`,
        className: 'custom-map-icon',
        iconSize: [90, 36],
        iconAnchor: [45, 18],
      });

      if (!markersRef.current['captain_assigned']) {
        markersRef.current['captain_assigned'] = L.marker(captainLocation, { icon }).addTo(map);
      } else {
        markersRef.current['captain_assigned'].setLatLng(captainLocation);
      }
    } else if (markersRef.current['captain_assigned']) {
      map.removeLayer(markersRef.current['captain_assigned']);
      delete markersRef.current['captain_assigned'];
    }

    // 5. Nearby Available Captains
    Object.keys(markersRef.current).forEach((key) => {
      if (key.startsWith('nearby_') && !nearbyCaptains.some((c) => `nearby_${c.id}` === key)) {
        map.removeLayer(markersRef.current[key]);
        delete markersRef.current[key];
      }
    });

    nearbyCaptains.forEach((c) => {
      const key = `nearby_${c.id}`;
      const symbol = c.vehicle_type === 'BIKE' ? '🏍️' : c.vehicle_type === 'AUTO' ? '🛺' : '🚗';
      const icon = L.divIcon({
        html: `<div class="bg-slate-900 text-amber-400 rounded-full p-1.5 shadow-md border border-amber-400/60 flex items-center justify-center text-sm">
            ${symbol}
          </div>`,
        className: 'custom-map-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      if (!markersRef.current[key]) {
        markersRef.current[key] = L.marker([c.latitude, c.longitude], { icon }).addTo(map);
      } else {
        markersRef.current[key].setLatLng([c.latitude, c.longitude]);
      }
    });

    // 6. Polyline Route Drawing (Dual layer glow path)
    if (polylineBgRef.current) {
      map.removeLayer(polylineBgRef.current);
      polylineBgRef.current = null;
    }
    if (polylineFgRef.current) {
      map.removeLayer(polylineFgRef.current);
      polylineFgRef.current = null;
    }

    if (routeCoordinates && routeCoordinates.length > 0) {
      // Outer Casing line
      polylineBgRef.current = L.polyline(routeCoordinates, {
        color: '#0f172a',
        weight: 9,
        opacity: 0.7,
        lineCap: 'round',
      }).addTo(map);

      // Inner Vibrant Route line
      polylineFgRef.current = L.polyline(routeCoordinates, {
        color: '#38bdf8',
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
      }).addTo(map);
    }
  }, [customerLocation, pickupLocation, destinationLocation, captainLocation, nearbyCaptains, routeCoordinates]);

  return <div ref={mapContainerRef} className={className} />;
}
