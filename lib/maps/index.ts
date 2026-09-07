export interface MapSearchResult {
  display_name: string;
  lat: number;
  lng: number;
}

export interface RouteData {
  coordinates: [number, number][]; // [lat, lng] array for polyline
  distanceKm: number;
  durationMinutes: number;
}

/**
 * Haversine formula to compute great-circle distance between two points on Earth in km.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 100) / 100;
}

/**
 * Free geocoding search using OpenStreetMap / Nominatim API
 */
export async function searchGeocode(query: string): Promise<MapSearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&limit=5&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'RapidoRideApp/1.0',
      },
    });

    if (!res.ok) throw new Error('Geocoding API error');
    const data = await res.json();

    return data.map((item: any) => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));
  } catch (error) {
    console.warn('Geocoding search error, returning empty fallback array:', error);
    return [];
  }
}

/**
 * Reverse geocoding lat/lng to display address using Nominatim
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'RapidoRideApp/1.0',
      },
    });

    if (!res.ok) throw new Error('Reverse geocoding error');
    const data = await res.json();
    return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (error) {
    return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  }
}

/**
 * Fetch routing directions between start and end coordinates using OSRM Public API
 */
export async function getDirectionsRoute(
  start: [number, number], // [lat, lng]
  end: [number, number] // [lat, lng]
): Promise<RouteData> {
  const directDistance = calculateHaversineDistance(
    start[0],
    start[1],
    end[0],
    end[1]
  );

  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
    const res = await fetch(osrmUrl);

    if (!res.ok) throw new Error('OSRM Routing request failed');
    const data = await res.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const coords: [number, number][] = route.geometry.coordinates.map(
        (c: [number, number]) => [c[1], c[0]] // Swap to [lat, lng]
      );

      return {
        coordinates: coords,
        distanceKm: Math.round((route.distance / 1000) * 100) / 100,
        durationMinutes: Math.ceil(route.duration / 60),
      };
    }
  } catch (err) {
    console.warn('OSRM routing failed, falling back to direct calculation:', err);
  }

  // Fallback straight-line polyline with intermediate point for map display
  const midLat = (start[0] + end[0]) / 2;
  const midLng = (start[1] + end[1]) / 2;
  const fallbackCoords: [number, number][] = [start, [midLat, midLng], end];

  return {
    coordinates: fallbackCoords,
    distanceKm: directDistance,
    durationMinutes: Math.ceil((directDistance / 25) * 60),
  };
}

export const MAP_CONFIG = {
  tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  defaultCenter: [28.6139, 77.209] as [number, number], // New Delhi / NCR default
  defaultZoom: 14,
};
