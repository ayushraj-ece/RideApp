export interface MapSearchResult {
  title?: string;
  subtitle?: string;
  display_name: string;
  lat: number;
  lng: number;
  distanceKm?: number;
  source?: string;
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
 * Multi-Engine Real-Time High-Accuracy Geocoding Search
 * (ArcGIS World Geocode Engine + Komoot Photon + OpenStreetMap Nominatim + Google Places)
 * Includes GPS Proximity Biasing so nearby local places, shops, societies, metro stations, tech parks & airports rank first!
 */
export async function searchGeocode(
  query: string,
  userCoords?: [number, number] | null
): Promise<MapSearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  const cleanQuery = query.trim();
  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // 1. Google Maps Geocoding API if API key is provided
  if (googleApiKey) {
    try {
      let googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cleanQuery)}&key=${googleApiKey}`;
      if (userCoords) {
        googleUrl += `&location=${userCoords[0]},${userCoords[1]}`;
      }
      const gRes = await fetch(googleUrl);
      if (gRes.ok) {
        const gData = await gRes.json();
        if (gData.results && gData.results.length > 0) {
          return gData.results.map((item: any) => {
            const parts = item.formatted_address.split(',');
            const title = parts[0]?.trim() || item.formatted_address;
            const subtitle = parts.slice(1, 4).join(',').trim() || item.formatted_address;
            const lat = item.geometry.location.lat;
            const lng = item.geometry.location.lng;
            const distanceKm = userCoords
              ? calculateHaversineDistance(userCoords[0], userCoords[1], lat, lng)
              : undefined;
            return {
              title,
              subtitle,
              display_name: item.formatted_address,
              lat,
              lng,
              distanceKm,
              source: 'Google Maps',
            };
          });
        }
      }
    } catch (e) {
      console.warn('Google Places API search failed, falling back to multi-engine:', e);
    }
  }

  // Fallback defaults if userCoords is null (e.g. New Delhi NCR)
  const defaultLat = userCoords ? userCoords[0] : 28.6139;
  const defaultLng = userCoords ? userCoords[1] : 77.2090;

  // 2. Parallel Multi-Engine Geocoding: ArcGIS World Geocoding + Photon Komoot + OSM Nominatim
  const arcgisPromise = (async (): Promise<MapSearchResult[]> => {
    try {
      const suggestUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest?text=${encodeURIComponent(cleanQuery)}&f=json&location=${defaultLng},${defaultLat}&maxSuggestions=8`;
      const sRes = await fetch(suggestUrl);
      if (!sRes.ok) return [];
      const sData = await sRes.json();
      const suggestions = (sData.suggestions || []).slice(0, 7);

      const items = await Promise.all(
        suggestions.map(async (s: any) => {
          if (!s.isCollection && s.magicKey) {
            try {
              const resolveUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&magicKey=${encodeURIComponent(s.magicKey)}&outFields=Match_addr,Addr_type,PlaceName,City,StAddr`;
              const rRes = await fetch(resolveUrl);
              if (rRes.ok) {
                const rData = await rRes.json();
                if (rData.candidates && rData.candidates[0]) {
                  const c = rData.candidates[0];
                  const fullText = s.text;
                  const parts = fullText.split(',');
                  const title = parts[0]?.trim() || c.attributes?.PlaceName || c.address;
                  const subtitle = parts.slice(1, 4).join(',').trim() || fullText;
                  const lat = c.location.y;
                  const lng = c.location.x;
                  return {
                    title,
                    subtitle,
                    display_name: fullText,
                    lat,
                    lng,
                    source: 'ArcGIS World',
                  };
                }
              }
            } catch (e) {
              // ignore single item resolve error
            }
          }
          return null;
        })
      );
      return items.filter((item): item is MapSearchResult => item !== null);
    } catch (e) {
      console.warn('ArcGIS geocoding failed:', e);
      return [];
    }
  })();

  const photonPromise = (async (): Promise<MapSearchResult[]> => {
    try {
      let photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&limit=8&lat=${defaultLat}&lon=${defaultLng}`;
      const res = await fetch(photonUrl);
      if (!res.ok) return [];
      const data = await res.json();
      const items: MapSearchResult[] = [];
      (data.features || []).forEach((feature: any) => {
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
          items.push({ title, subtitle, display_name, lat, lng, source: 'Komoot Photon' });
        }
      });
      return items;
    } catch (e) {
      console.warn('Photon geocoding failed:', e);
      return [];
    }
  })();

  const nominatimPromise = (async (): Promise<MapSearchResult[]> => {
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&limit=6&addressdetails=1&lat=${defaultLat}&lon=${defaultLng}`;
      const res = await fetch(nominatimUrl, {
        headers: { 'User-Agent': 'RIDEON/2.0' },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data || []).map((item: any) => {
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        const parts = (item.display_name || '').split(',');
        const title = parts[0]?.trim() || item.name || 'Location';
        const subtitle = parts.slice(1, 4).join(',').trim() || item.display_name;
        return { title, subtitle, display_name: item.display_name, lat, lng, source: 'OSM Nominatim' };
      });
    } catch (e) {
      console.warn('Nominatim geocoding failed:', e);
      return [];
    }
  })();

  const [arcgisResults, photonResults, nominatimResults] = await Promise.all([
    arcgisPromise,
    photonPromise,
    nominatimPromise,
  ]);

  const rawResults = [...arcgisResults, ...photonResults, ...nominatimResults];
  const results: MapSearchResult[] = [];
  const seenKeys = new Set<string>();

  for (const item of rawResults) {
    const key = `${item.lat.toFixed(3)}_${item.lng.toFixed(3)}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      if (userCoords) {
        item.distanceKm = calculateHaversineDistance(userCoords[0], userCoords[1], item.lat, item.lng);
      }
      results.push(item);
    }
  }

  // Sort by distance if user coordinates available
  if (userCoords && results.length > 1) {
    results.sort((a, b) => {
      const distA = a.distanceKm ?? 99999;
      const distB = b.distanceKm ?? 99999;
      return distA - distB;
    });
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
      const pData = await photonRes.json();
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
      headers: { 'User-Agent': 'RIDEON/2.0' },
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
  lightTileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  darkTileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  subdomains: ['a', 'b', 'c'],
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  defaultCenter: [28.6139, 77.209] as [number, number], // New Delhi / NCR default
  defaultZoom: 15,
};

