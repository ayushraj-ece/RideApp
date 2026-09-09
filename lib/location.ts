'use client';

import { Geolocation } from '@capacitor/geolocation';

export async function requestAndGetCurrentLocation(): Promise<[number, number] | null> {
  try {
    // 1. Try Capacitor Native Geolocation (Triggers Android Permission Prompt in APK)
    const permissions = await Geolocation.checkPermissions();
    if (permissions.location !== 'granted') {
      const requested = await Geolocation.requestPermissions();
      if (requested.location !== 'granted') {
        console.warn('Native location permission denied by user.');
      }
    }

    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    });

    if (pos && pos.coords && pos.coords.latitude && pos.coords.longitude) {
      return [pos.coords.latitude, pos.coords.longitude];
    }
  } catch (nativeErr) {
    console.warn('Capacitor native geolocation fallback to browser geolocation:', nativeErr);
  }

  // 2. Browser standard geolocation fallback
  if (typeof window !== 'undefined' && navigator.geolocation) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        });
      });
      if (pos && pos.coords && pos.coords.latitude && pos.coords.longitude) {
        return [pos.coords.latitude, pos.coords.longitude];
      }
    } catch (browserErr) {
      console.warn('Browser geolocation failed (e.g. non-secure HTTP origin):', browserErr);
    }
  }

  // 3. Free IP-based location fallback (for local HTTP testing on LAN)
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      if (data.latitude && data.longitude) {
        return [data.latitude, data.longitude];
      }
    }
  } catch (ipErr) {
    console.warn('IP geolocation fallback failed:', ipErr);
  }

  return [28.6139, 77.209]; // Default Delhi NCR
}

