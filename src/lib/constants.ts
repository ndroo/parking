export const SITE_CONFIG = {
  name: "Parking Booking",
  address: "180 Beatrice St, Toronto",
  description: "Parking Reservations"
} as const;

export const PRICING = {
  daily: { cents: 1500, label: "$15", period: "24h" },
  weekly: { cents: 5000, label: "$50", period: "week" },
  monthly: { cents: 10000, label: "$100", period: "month" }
} as const;
