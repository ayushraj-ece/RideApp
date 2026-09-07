import { VehicleType } from '@/types/ride';

export interface FareRates {
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
  bookingFee: number;
  minFare: number;
}

export interface VehicleConfig {
  type: VehicleType;
  title: string;
  subtitle: string;
  capacity: number;
  badge?: string;
  speedKmH: number; // Avg city speed
  etaMinutes: number; // Base ETA for pickup arrival
}

export interface FareBreakdown {
  vehicleType: VehicleType;
  baseFare: number;
  distanceKm: number;
  distanceCharge: number;
  durationMinutes: number;
  timeCharge: number;
  bookingFee: number;
  surgeMultiplier: number;
  surgeCharge: number;
  isPeakHour: boolean;
  totalFare: number;
}

/**
 * Vehicle metadata configurations for UI rendering and ETA calculations.
 */
export const VEHICLE_CONFIGS: Record<VehicleType, VehicleConfig> = {
  BIKE: {
    type: 'BIKE',
    title: 'Moto Bike',
    subtitle: 'Fastest through traffic for single rider',
    capacity: 1,
    badge: 'Fastest',
    speedKmH: 26,
    etaMinutes: 2,
  },
  AUTO: {
    type: 'AUTO',
    title: 'Auto Rickshaw',
    subtitle: 'Affordable, doorstep 3-wheeler ride',
    capacity: 3,
    badge: 'Popular',
    speedKmH: 21,
    etaMinutes: 4,
  },
  CAB: {
    type: 'CAB',
    title: 'Comfort Cab',
    subtitle: 'Air-conditioned hatchback / sedan',
    capacity: 4,
    badge: 'Comfort',
    speedKmH: 23,
    etaMinutes: 5,
  },
};

/**
 * Industry-standard commercial ride-hailing pricing rate matrix.
 * Base Fare + (Distance * Rate/KM) + (Duration * Rate/Min) + Booking Fee
 */
export const FARE_MATRIX: Record<VehicleType, FareRates> = {
  BIKE: {
    baseFare: 15,
    perKmRate: 7,
    perMinuteRate: 1.0,
    bookingFee: 5,
    minFare: 25,
  },
  AUTO: {
    baseFare: 25,
    perKmRate: 10,
    perMinuteRate: 1.5,
    bookingFee: 7,
    minFare: 35,
  },
  CAB: {
    baseFare: 45,
    perKmRate: 15,
    perMinuteRate: 2.0,
    bookingFee: 12,
    minFare: 65,
  },
};

/**
 * Determines current surge / peak hour multiplier based on time of day.
 * - Peak Morning (8:00 AM - 10:30 AM): 1.15x
 * - Peak Evening (5:00 PM - 8:30 PM): 1.20x
 * - Late Night (11:00 PM - 5:00 AM): 1.25x
 * - Off-peak: 1.0x
 */
export function getSurgeMultiplier(date: Date = new Date()): { multiplier: number; isPeak: boolean } {
  const hour = date.getHours();
  const minute = date.getMinutes();
  const timeInDecimal = hour + minute / 60;

  // Late Night: 11 PM to 5 AM
  if (timeInDecimal >= 23 || timeInDecimal < 5) {
    return { multiplier: 1.25, isPeak: true };
  }
  // Morning Rush: 8:00 AM to 10:30 AM
  if (timeInDecimal >= 8 && timeInDecimal <= 10.5) {
    return { multiplier: 1.15, isPeak: true };
  }
  // Evening Rush: 5:00 PM to 8:30 PM
  if (timeInDecimal >= 17 && timeInDecimal <= 20.5) {
    return { multiplier: 1.20, isPeak: true };
  }

  return { multiplier: 1.0, isPeak: false };
}

/**
 * Calculates estimated travel duration in minutes based on traffic speed profiles.
 */
export function calculateEstimatedTimeMinutes(distanceKm: number, vehicleType: VehicleType): number {
  const config = VEHICLE_CONFIGS[vehicleType] || VEHICLE_CONFIGS.BIKE;
  const hours = distanceKm / config.speedKmH;
  const minutes = Math.ceil(hours * 60);

  return Math.max(3, minutes);
}

/**
 * Computes full itemized fare breakdown using commercial pricing algorithm.
 */
export function getFareBreakdown(
  distanceKm: number,
  vehicleType: VehicleType,
  overrideSurge?: number
): FareBreakdown {
  const rates = FARE_MATRIX[vehicleType] || FARE_MATRIX.BIKE;
  const durationMinutes = calculateEstimatedTimeMinutes(distanceKm, vehicleType);

  const distanceCharge = Math.round(distanceKm * rates.perKmRate);
  const timeCharge = Math.round(durationMinutes * rates.perMinuteRate);

  const subtotalBeforeSurge = rates.baseFare + distanceCharge + timeCharge + rates.bookingFee;

  // Determine surge
  const { multiplier: autoMultiplier, isPeak } = getSurgeMultiplier();
  const surgeMultiplier = overrideSurge !== undefined ? overrideSurge : autoMultiplier;
  
  const surgeCharge = Math.round(subtotalBeforeSurge * (surgeMultiplier - 1.0));
  const rawFare = subtotalBeforeSurge + surgeCharge;

  // Apply Minimum Fare Cap
  const totalFare = Math.max(rates.minFare, Math.round(rawFare));

  return {
    vehicleType,
    baseFare: rates.baseFare,
    distanceKm: Math.round(distanceKm * 10) / 10,
    distanceCharge,
    durationMinutes,
    timeCharge,
    bookingFee: rates.bookingFee,
    surgeMultiplier,
    surgeCharge,
    isPeakHour: isPeak || surgeMultiplier > 1.0,
    totalFare,
  };
}

/**
 * Returns final total calculated fare integer.
 */
export function calculateFare(
  distanceKm: number,
  vehicleType: VehicleType,
  overrideSurge?: number
): number {
  return getFareBreakdown(distanceKm, vehicleType, overrideSurge).totalFare;
}
