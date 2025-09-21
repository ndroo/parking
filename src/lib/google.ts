import { JWT } from "google-auth-library";
import { DateTime } from "luxon";
import { getCalendarId, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, APP_TZ, BOOKING_OWNER_EMAIL } from "@/lib/config";
import { Spot } from "@/lib/types";

const GOOGLE_SCOPES = ["https://www.googleapis.com/auth/calendar"]; 
const BASE_URL = "https://www.googleapis.com/calendar/v3";

export async function getAccessToken(): Promise<string> {
  const client = new JWT({
    email: GOOGLE_CLIENT_EMAIL,
    key: GOOGLE_PRIVATE_KEY,
    scopes: GOOGLE_SCOPES,
  });
  const tokenResp = await client.getAccessToken();
  const token = typeof tokenResp === "string" ? tokenResp : tokenResp?.token;
  if (!token) throw new Error("Failed to obtain Google access token");
  return token;
}

export async function createEvent(params: {
  spot: Spot;
  startIso: string;
  endIso: string;
  plate: string;
  ref: string;
  name: string;
  phone: string;
  email: string;
}): Promise<{ id: string }>
{
  const accessToken = await getAccessToken();
  const calendarId = getCalendarId(params.spot);
  const startRfc3339 = DateTime.fromISO(params.startIso, { zone: APP_TZ }).toISO({ suppressMilliseconds: true });
  const endRfc3339 = DateTime.fromISO(params.endIso, { zone: APP_TZ }).toISO({ suppressMilliseconds: true });
  if (!startRfc3339 || !endRfc3339) {
    throw new Error("Invalid start or end datetime");
  }
  const body = {
    summary: `[${params.spot}] ${params.plate} (ref ${params.ref})`,
    description: `Name: ${params.name}\nPhone: ${params.phone}\nEmail: ${params.email}\nPlate: ${params.plate}\nReference: ${params.ref}\nPay by e-transfer to andrewjohnmcgrath@gmail.com`,
    start: { dateTime: startRfc3339 },
    end: { dateTime: endRfc3339 },
    extendedProperties: {
      private: { ref: params.ref, plate: params.plate, spot: params.spot, name: params.name, phone: params.phone, email: params.email },
    },
    guestsCanInviteOthers: false,
  };
  const res = await fetch(`${BASE_URL}/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("Google createEvent response", { status: res.status, text, calendarId, body });
    throw new Error(`createEvent failed: ${res.status} ${text}`);
  }
  const json = await res.json();
  return { id: json.id };
}

export async function findEventByRef(spot: Spot, ref: string): Promise<{ id: string } | null> {
  const accessToken = await getAccessToken();
  const calendarId = getCalendarId(spot);
  // Search by q, limited window +/- 1 year
  const timeMin = DateTime.now().minus({ years: 1 }).toISO();
  const timeMax = DateTime.now().plus({ years: 1 }).toISO();
  const url = new URL(`${BASE_URL}/calendars/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.set("q", ref);
  url.searchParams.set("timeMin", timeMin!);
  url.searchParams.set("timeMax", timeMax!);
  url.searchParams.set("singleEvents", "true");
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`findEventByRef failed: ${res.status} ${text}`);
  }
  const json = await res.json();
  const item = (json.items || []).find((e: any) =>
    e.extendedProperties?.private?.ref === ref || e.summary?.includes(ref)
  );
  return item ? { id: item.id } : null;
}

export async function updateEventTime(params: {
  spot: Spot;
  eventId: string;
  startIso: string;
  endIso: string;
}): Promise<void> {
  const accessToken = await getAccessToken();
  const calendarId = getCalendarId(params.spot);
  const body = {
    start: { dateTime: params.startIso, timeZone: APP_TZ },
    end: { dateTime: params.endIso, timeZone: APP_TZ },
  };
  const res = await fetch(`${BASE_URL}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(params.eventId)}?sendUpdates=all`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`updateEventTime failed: ${res.status} ${text}`);
  }
}

export async function deleteEvent(spot: Spot, eventId: string): Promise<void> {
  const accessToken = await getAccessToken();
  const calendarId = getCalendarId(spot);
  const res = await fetch(`${BASE_URL}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`deleteEvent failed: ${res.status} ${text}`);
  }
}


