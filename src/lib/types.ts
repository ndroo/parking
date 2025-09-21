export type Spot = "northern" | "southern";

export interface PriceBreakdown {
  months: number;
  weeks: number;
  days: number;
  totalCents: number;
}

export interface AvailabilityRequest {
  spot: Spot;
  startIso: string; // ISO string
  endIso: string;   // ISO string
}

export interface BookingRequest {
  spot: Spot;
  startIso: string;
  endIso: string;
  plate: string;
  name: string;
  phone: string;
  email: string;
}

export interface BookingResponse {
  ref: string;
  eventId: string;
  priceCents: number;
}


