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
      timeout: 10000,
      maximumAge: 0,
    });

    if (pos && pos.coords && pos.coords.latitude && pos.coords.longitude) {
      return [pos.coords.latitude, pos.coords.longitude];
    }
  } catch (nativeErr) {
    console.warn('Capacitor native geolocation fallback to browser geolocation:', nativeErr);
  }

  // 2. Browser standard geolocation fallback
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (pos && pos.coords && pos.coords.latitude && pos.coords.longitude) {
          resolve([pos.coords.latitude, pos.coords.longitude]);
        } else {
          resolve(null);
        }
      },
      (err) => {
        console.warn('Browser geolocation error:', err);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

