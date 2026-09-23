import { DateTime } from "luxon";
import { customAlphabet } from "nanoid";
import { getAccessToken } from "@/lib/google";
import { APP_TZ } from "@/lib/config";

// Showings for Unit 3 (basement). One visitor per 15-minute slot.
export const SHOWING_CONFIG = {
  unit: "Unit 3 (basement), 180 Beatrice St",
  listingUrl: "https://little-italy-rentals.mylistingai.co/listing/180-beatrice-st-toronto-on-m6g-3g1-canada-167074",
  slotMinutes: 15,
  // Local (America/Toronto) windows; end is exclusive
  windows: [
    { date: "2026-10-02", start: "18:00", end: "20:00" },
    { date: "2026-10-03", start: "11:00", end: "13:00" },
  ],
} as const;

export const CALENDAR_ID_SHOWINGS = (process.env.CALENDAR_ID_SHOWINGS || "").trim();
export const SHOWINGS_ADMIN_KEY = (process.env.SHOWINGS_ADMIN_KEY || "").trim();

const BASE_URL = "https://www.googleapis.com/calendar/v3";
const nano = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

export interface ShowingSlot {
  startIso: string;
  endIso: string;
}

export interface ShowingBooking {
  eventId: string;
  startIso: string;
  ref: string;
  name: string;
  email: string;
  phone: string;
  pet: string;
  createdAt: string;
}

export function getSlots(): ShowingSlot[] {
  const slots: ShowingSlot[] = [];
  for (const w of SHOWING_CONFIG.windows) {
    let t = DateTime.fromISO(`${w.date}T${w.start}`, { zone: APP_TZ });
    const end = DateTime.fromISO(`${w.date}T${w.end}`, { zone: APP_TZ });
    while (t < end) {
      const next = t.plus({ minutes: SHOWING_CONFIG.slotMinutes });
      slots.push({ startIso: t.toISO({ suppressMilliseconds: true })!, endIso: next.toISO({ suppressMilliseconds: true })! });
      t = next;
    }
  }
  return slots;
}

export function findSlot(startIso: string): ShowingSlot | undefined {
  const target = DateTime.fromISO(startIso).toMillis();
  return getSlots().find(s => DateTime.fromISO(s.startIso).toMillis() === target);
}

// Deterministic event id per slot (Google ids allow a-v and 0-9 only).
// Inserting a second event with the same id fails with 409, which is what
// prevents double-booking without a database.
export function slotEventId(startIso: string): string {
  const t = DateTime.fromISO(startIso).setZone(APP_TZ);
  return `slot${t.toFormat("yyyyMMdd")}t${t.toFormat("HHmm")}`;
}

export function firstName(name: string): string {
  return (name || "").trim().split(/\s+/)[0] || "Booked";
}

function toBooking(e: any): ShowingBooking {
  const p = e.extendedProperties?.private || {};
  return {
    eventId: e.id,
    startIso: DateTime.fromISO(e.start?.dateTime).setZone(APP_TZ).toISO({ suppressMilliseconds: true })!,
    ref: p.ref || "",
    name: p.name || e.summary || "",
    email: p.email || "",
    phone: p.phone || "",
    pet: p.pet || "",
    createdAt: e.created || "",
  };
}

export async function listShowings(): Promise<ShowingBooking[]> {
  const token = await getAccessToken();
  const slots = getSlots();
  const url = new URL(`${BASE_URL}/calendars/${encodeURIComponent(CALENDAR_ID_SHOWINGS)}/events`);
  url.searchParams.set("timeMin", DateTime.fromISO(slots[0].startIso).minus({ days: 1 }).toISO()!);
  url.searchParams.set("timeMax", DateTime.fromISO(slots[slots.length - 1].endIso).plus({ days: 1 }).toISO()!);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("maxResults", "250");
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`listShowings failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return (json.items || [])
    .filter((e: any) => e.status !== "cancelled" && e.start?.dateTime)
    .map(toBooking)
    .sort((a: ShowingBooking, b: ShowingBooking) => a.startIso.localeCompare(b.startIso));
}

export class SlotTakenError extends Error {}

export async function createShowing(params: { slot: ShowingSlot; name: string; email: string; phone: string; pet: string }): Promise<ShowingBooking> {
  const token = await getAccessToken();
  const ref = nano();
  const id = slotEventId(params.slot.startIso);
  const body = {
    id,
    summary: `Showing: ${params.name}`,
    description: `Name: ${params.name}\nEmail: ${params.email}\nPhone: ${params.phone}\nPet: ${params.pet || "None"}\nReference: ${ref}`,
    start: { dateTime: params.slot.startIso, timeZone: APP_TZ },
    end: { dateTime: params.slot.endIso, timeZone: APP_TZ },
    status: "confirmed",
    extendedProperties: { private: { ref, name: params.name, email: params.email, phone: params.phone, pet: params.pet } },
  };
  const calUrl = `${BASE_URL}/calendars/${encodeURIComponent(CALENDAR_ID_SHOWINGS)}/events`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  let res = await fetch(calUrl, { method: "POST", headers, body: JSON.stringify(body) });
  if (res.status === 409) {
    // The id exists. If that slot was booked then cancelled, the event lingers
    // with status "cancelled" and can be revived; otherwise the slot is taken.
    const existing = await fetch(`${calUrl}/${id}`, { headers });
    const ev = existing.ok ? await existing.json() : null;
    if (!ev || ev.status !== "cancelled") throw new SlotTakenError("That time was just taken");
    res = await fetch(`${calUrl}/${id}`, {
      method: "PUT",
      headers: { ...headers, "If-Match": ev.etag },
      body: JSON.stringify(body),
    });
    if (res.status === 412) throw new SlotTakenError("That time was just taken");
  }
  if (!res.ok) throw new Error(`createShowing failed: ${res.status} ${await res.text()}`);
  return toBooking(await res.json());
}

export async function cancelShowing(eventId: string): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}/calendars/${encodeURIComponent(CALENDAR_ID_SHOWINGS)}/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 410) throw new Error(`cancelShowing failed: ${res.status} ${await res.text()}`);
}

export function isAdmin(key: string | null): boolean {
  return !!SHOWINGS_ADMIN_KEY && key === SHOWINGS_ADMIN_KEY;
}
