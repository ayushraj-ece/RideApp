export type UserRole = 'CUSTOMER' | 'CAPTAIN';

export type VehicleType = 'BIKE' | 'AUTO' | 'CAB';

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export type AvailabilityStatus = 'AVAILABLE' | 'BUSY';

export type RideStatus =
  | 'REQUESTED'
  | 'SEARCHING'
  | 'ACCEPTED'
  | 'CAPTAIN_ARRIVING'
  | 'CAPTAIN_ARRIVED'
  | 'OTP_VERIFIED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED_BY_CUSTOMER'
  | 'CANCELLED_BY_CAPTAIN'
  | 'NO_CAPTAIN_FOUND'
  | 'EXPIRED';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  phone?: string;
  created_at?: string;
}

export interface CaptainProfile {
  id: string;
  vehicle_type: VehicleType;
  vehicle_number: string;
  vehicle_model: string;
  license_number: string;
  verification_status: VerificationStatus;
  online_status: boolean;
  availability_status: AvailabilityStatus;
  latitude: number | null;
  longitude: number | null;
  last_location_update: string | null;
  rating_sum: number;
  rating_count: number;
  accepts_rides?: boolean;
  accepts_parcels?: boolean;
  created_at?: string;
}

export interface LocationPoint {
  address: string;
  lat: number;
  lng: number;
}

export interface Ride {
  id: string;
  customer_id: string;
  captain_id: string | null;
  vehicle_type: VehicleType;
  status: RideStatus;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  destination_address: string;
  destination_lat: number;
  destination_lng: number;
  distance_km: number;
  estimated_fare: number;
  final_fare: number | null;
  otp: string;
  drop_otp?: string;
  is_parcel?: boolean;
  cancelled_by: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields if fetched with relations
  customer?: UserProfile;
  captain?: CaptainProfile & { profile?: UserProfile };
}

export interface Message {
  id: string;
  ride_id: string;
  sender_id: string;
  sender_role: UserRole;
  message: string;
  created_at: string;
}

export interface Rating {
  id: string;
  ride_id: string;
  customer_id: string;
  captain_id: string;
  rating: number;
  feedback?: string;
  created_at?: string;
}

export interface CaptainEarnings {
  id: string;
  captain_id: string;
  ride_id: string;
  amount: number;
  created_at: string;
}
