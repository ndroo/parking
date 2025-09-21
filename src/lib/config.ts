import { Spot } from "@/lib/types";

// Calendar IDs
export const CALENDAR_ID_NORTHERN = (process.env.CALENDAR_ID_NORTHERN || "").trim();
export const CALENDAR_ID_SOUTHERN = (process.env.CALENDAR_ID_SOUTHERN || "").trim();

// ICS URLs (raw), allow leading/trailing quotes pasted by mistake
const RAW_ICS_URL_NORTHERN = process.env.ICS_URL_NORTHERN || "";
const RAW_ICS_URL_SOUTHERN = process.env.ICS_URL_SOUTHERN || "";

function sanitizeUrl(value: string): string {
  let s = (value || "").trim();
  // Allow leading @ pasted from chat
  if (s.startsWith("@")) s = s.slice(1).trim();
  // Strip surrounding quotes if present
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

export const ICS_URL_NORTHERN = sanitizeUrl(RAW_ICS_URL_NORTHERN);
export const ICS_URL_SOUTHERN = sanitizeUrl(RAW_ICS_URL_SOUTHERN);

// Google auth
export const GOOGLE_CLIENT_EMAIL = (process.env.GOOGLE_CLIENT_EMAIL || "").trim();
export const GOOGLE_PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

// App settings
export const APP_TZ = "America/Toronto";
export const BOOKING_OWNER_EMAIL = (process.env.BOOKING_OWNER_EMAIL || "andrewjohnmcgrath@gmail.com").trim();
export const MAX_ADVANCE_DAYS = 30;
export const MAX_BOOKING_DAYS = 90;

export function getCalendarId(spot: Spot): string {
  return spot === "northern" ? CALENDAR_ID_NORTHERN : CALENDAR_ID_SOUTHERN;
}

export function getIcsUrl(spot: Spot): string {
  return spot === "northern" ? ICS_URL_NORTHERN : ICS_URL_SOUTHERN;
}


