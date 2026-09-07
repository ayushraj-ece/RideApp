import { VehicleType } from '@/types/ride';

export interface FareRates {
  baseFare: number;
  perKmRate: number;
  minFare: number;
}

export const FARE_MATRIX: Record<VehicleType, FareRates> = {
  BIKE: {
    baseFare: 20,
    perKmRate: 7,
    minFare: 25,
  },
  AUTO: {
    baseFare: 30,
    perKmRate: 10,
    minFare: 35,
  },
  CAB: {
    baseFare: 50,
    perKmRate: 15,
    minFare: 60,
  },
};

export function calculateFare(distanceKm: number, vehicleType: VehicleType): number {
  const rates = FARE_MATRIX[vehicleType];
  if (!rates) return 0;
  
  const rawFare = rates.baseFare + distanceKm * rates.perKmRate;
  const finalFare = Math.max(rates.minFare, rawFare);
  
  return Math.round(finalFare);
}

export function calculateEstimatedTimeMinutes(distanceKm: number, vehicleType: VehicleType): number {
  // Average speeds in city traffic (km/h)
  const speeds: Record<VehicleType, number> = {
    BIKE: 25,
    AUTO: 20,
    CAB: 22,
  };
  
  const speed = speeds[vehicleType] || 20;
  const hours = distanceKm / speed;
  const minutes = Math.ceil(hours * 60);
  
  return Math.max(3, minutes);
}
