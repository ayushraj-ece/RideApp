export interface MapSearchResult {
  title?: string;
  subtitle?: string;
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
 * Popular & recent search suggestions array (dynamically populated from real user history)
 */
export const POPULAR_LOCATIONS: MapSearchResult[] = [];

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
 * Multi-Engine High-Accuracy Geocoding Search (Photon + Nominatim + Google Places)
 * Returns up-to-date local places, shops, apartments, metro stations, airports, tech parks & landmarks
 */
export async function searchGeocode(query: string): Promise<MapSearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  const cleanQuery = query.trim();
  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // 1. Google Maps Geocoding API if API key is provided
  if (googleApiKey) {
    try {
      const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        cleanQuery
      )}&key=${googleApiKey}`;
      const gRes = await fetch(googleUrl);
      if (gRes.ok) {
        const gData = await gRes.json();
        if (gData.results && gData.results.length > 0) {
          return gData.results.map((item: any) => {
            const parts = item.formatted_address.split(',');
            const title = parts[0]?.trim() || item.formatted_address;
            const subtitle = parts.slice(1, 4).join(',').trim() || item.formatted_address;
            return {
              title,
              subtitle,
              display_name: item.formatted_address,
              lat: item.geometry.location.lat,
              lng: item.geometry.location.lng,
            };
          });
        }
      }
    } catch (e) {
      console.warn('Google Places API search failed, falling back to multi-engine:', e);
    }
  }

  // 2. Parallel Multi-Engine Search (Photon + Nominatim) for instant, up-to-date place search
  const results: MapSearchResult[] = [];
  const seenKeys = new Set<string>();

  const [photonRes, nominatimRes] = await Promise.allSettled([
    fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&limit=12`),
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&limit=10&addressdetails=1`, {
      headers: { 'User-Agent': 'Rideon/1.0' },
    }),
  ]);

  // Parse Photon (Komoot ElasticSearch Engine - highly updated POIs, landmarks, malls, metro stations)
  if (photonRes.status === 'fulfilled' && photonRes.value.ok) {
    try {
      const data = await photonRes.value.json();
      if (data.features) {
        data.features.forEach((feature: any) => {
          const props = feature.properties || {};
          const coords = feature.geometry?.coordinates; // [lng, lat]
          if (coords && coords.length >= 2) {
            const lng = coords[0];
            const lat = coords[1];

            const title = props.name || props.street || props.housenumber || props.district || 'Location';
            const subtitleParts = [
              props.street && props.name !== props.street ? props.street : null,
              props.district || props.suburb || props.neighbourhood,
              props.city || props.town || props.county,
              props.state,
            ].filter(Boolean);

            const subtitle = subtitleParts.join(', ') || props.country || 'Location';
            const display_name = [title, subtitle].filter(Boolean).join(', ');

            const key = `${lat.toFixed(3)}_${lng.toFixed(3)}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              results.push({ title, subtitle, display_name, lat, lng });
            }
          }
        });
      }
    } catch (e) {
      console.warn('Photon parse error:', e);
    }
  }

  // Parse Nominatim (OSM Street Engine)
  if (nominatimRes.status === 'fulfilled' && nominatimRes.value.ok) {
    try {
      const data = await nominatimRes.value.json();
      data.forEach((item: any) => {
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        const key = `${lat.toFixed(3)}_${lng.toFixed(3)}`;

        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          const parts = (item.display_name || '').split(',');
          const title = parts[0]?.trim() || item.name || 'Location';
          const subtitle = parts.slice(1, 4).join(',').trim() || item.display_name;
          results.push({ title, subtitle, display_name: item.display_name, lat, lng });
        }
      });
    } catch (e) {
      console.warn('Nominatim parse error:', e);
    }
  }

  return results;
}

/**
 * High-accuracy reverse geocoding lat/lng to display address using Photon + Nominatim
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const photonRes = await fetch(
      `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`
    );
    if (photonRes.ok) {
      const pData = await photonRes.ok ? await photonRes.json() : null;
      if (pData?.features && pData.features.length > 0) {
        const props = pData.features[0].properties || {};
        const name = props.name || props.street || '';
        const area = props.district || props.suburb || props.neighbourhood || '';
        const city = props.city || props.town || props.state || '';
        const parts = [name, area, city].filter(Boolean);
        if (parts.length >= 2) {
          return parts.join(', ');
        }
      }
    }
  } catch (e) {
    // Fall back to Nominatim
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Rideon/1.0' },
    });

    if (!res.ok) throw new Error('Reverse geocoding error');
    const data = await res.json();

    if (data && data.address) {
      const a = data.address;
      const point = a.building || a.amenity || a.shop || a.road || a.pedestrian || a.suburb || '';
      const area = a.suburb || a.neighbourhood || a.residential || a.city_district || '';
      const city = a.city || a.town || a.county || a.state || '';

      const parts = [point, area, city].filter(Boolean);
      if (parts.length >= 2) {
        return parts.join(', ');
      }
    }

    return data.display_name || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
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
  lightTileUrl: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
  darkTileUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  tileUrl: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
  subdomains: ['a', 'b', 'c'],
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/">HOT</a>',
  defaultCenter: [28.6139, 77.209] as [number, number], // New Delhi / NCR default
  defaultZoom: 15,
};
