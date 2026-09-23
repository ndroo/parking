import { DateTime } from "luxon";
import { customAlphabet } from "nanoid";
import { getAccessToken } from "@/lib/google";
import { APP_TZ } from "@/lib/config";
import { ShowingUnit } from "@/lib/showingUnits";

// All units share one calendar; each event is tagged with its unit code.
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
  unit: string;
  startIso: string;
  endIso: string;
  ref: string;
  name: string;
  email: string;
  phone: string;
  pet: string;
  createdAt: string;
}

// A showing window is a calendar event on the showings calendar. Windows
// created from the admin page are tagged kind=window; ones added by hand in
// Google Calendar are recognised by a title like "Showing window: Unit 3".
export interface ShowingWindow {
  id: string;
  unit: string; // unit code
  startIso: string;
  endIso: string;
  fromAdmin: boolean;
}

const startOfToday = () => DateTime.now().setZone(APP_TZ).startOf("day");
const iso = (d: string) => DateTime.fromISO(d).setZone(APP_TZ).toISO({ suppressMilliseconds: true })!;

function windowUnitCode(e: any): string | null {
  const p = e.extendedProperties?.private || {};
  if (p.kind === "window") return p.unit || null;
  const title = e.summary || "";
  if (!/showing window/i.test(title)) return null;
  return /unit\s*([0-9]+)/i.exec(title)?.[1] || null;
}

async function listEvents(timeMin: DateTime, timeMax: DateTime): Promise<any[]> {
  const token = await getAccessToken();
  const items: any[] = [];
  let pageToken = "";
  do {
    const url = new URL(`${BASE_URL}/calendars/${encodeURIComponent(CALENDAR_ID_SHOWINGS)}/events`);
    url.searchParams.set("timeMin", timeMin.toISO()!);
    url.searchParams.set("timeMax", timeMax.toISO()!);
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("maxResults", "250");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!res.ok) throw new Error(`listEvents failed: ${res.status} ${await res.text()}`);
    const json = await res.json();
    items.push(...(json.items || []));
    pageToken = json.nextPageToken || "";
  } while (pageToken);
  return items.filter(e => e.status !== "cancelled" && e.start?.dateTime);
}

// Windows from today onward (past windows are never offered)
export async function listWindows(unit?: ShowingUnit, opts: { includePast?: boolean } = {}): Promise<ShowingWindow[]> {
  const from = opts.includePast ? startOfToday().minus({ days: 90 }) : startOfToday();
  const events = await listEvents(from, startOfToday().plus({ days: 365 }));
  return events
    .map(e => ({ e, code: windowUnitCode(e) }))
    .filter(({ code }) => code && (!unit || code === unit.code))
    .map(({ e, code }) => ({ id: e.id, unit: code!, startIso: iso(e.start.dateTime), endIso: iso(e.end.dateTime), fromAdmin: e.extendedProperties?.private?.kind === "window" }))
    .sort((a, b) => a.startIso.localeCompare(b.startIso));
}

export function slotsFromWindows(unit: ShowingUnit, windows: ShowingWindow[]): ShowingSlot[] {
  const seen = new Set<number>();
  const slots: ShowingSlot[] = [];
  for (const w of windows.filter(w => w.unit === unit.code)) {
    let t = DateTime.fromISO(w.startIso, { zone: APP_TZ });
    const end = DateTime.fromISO(w.endIso, { zone: APP_TZ });
    while (t.plus({ minutes: unit.slotMinutes }) <= end) {
      const next = t.plus({ minutes: unit.slotMinutes });
      if (!seen.has(t.toMillis())) {
        seen.add(t.toMillis());
        slots.push({ startIso: t.toISO({ suppressMilliseconds: true })!, endIso: next.toISO({ suppressMilliseconds: true })! });
      }
      t = next;
    }
  }
  return slots.sort((a, b) => a.startIso.localeCompare(b.startIso));
}

export async function getSlots(unit: ShowingUnit): Promise<ShowingSlot[]> {
  return slotsFromWindows(unit, await listWindows(unit));
}

export async function findSlot(unit: ShowingUnit, startIso: string): Promise<ShowingSlot | undefined> {
  const target = DateTime.fromISO(startIso).toMillis();
  return (await getSlots(unit)).find(s => DateTime.fromISO(s.startIso).toMillis() === target);
}

export async function createWindow(unit: ShowingUnit, startIso: string, endIso: string): Promise<ShowingWindow> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}/calendars/${encodeURIComponent(CALENDAR_ID_SHOWINGS)}/events`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: `Showing window: ${unit.label}`,
      description: `Approved applicants can book ${unit.slotMinutes}-minute showings for ${unit.label} during this window.`,
      start: { dateTime: startIso, timeZone: APP_TZ },
      end: { dateTime: endIso, timeZone: APP_TZ },
      transparency: "transparent",
      extendedProperties: { private: { kind: "window", unit: unit.code } },
    }),
  });
  if (!res.ok) throw new Error(`createWindow failed: ${res.status} ${await res.text()}`);
  const e = await res.json();
  return { id: e.id, unit: unit.code, startIso: iso(e.start.dateTime), endIso: iso(e.end.dateTime), fromAdmin: true };
}

export async function deleteWindow(id: string): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}/calendars/${encodeURIComponent(CALENDAR_ID_SHOWINGS)}/events/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 410) throw new Error(`deleteWindow failed: ${res.status} ${await res.text()}`);
}

// Deterministic event id per unit + slot (Google ids allow a-v and 0-9 only).
// Inserting a second event with the same id fails with 409, which is what
// prevents double-booking without a database.
export function slotEventId(unit: ShowingUnit, startIso: string): string {
  const t = DateTime.fromISO(startIso).setZone(APP_TZ);
  return `u${unit.code}d${t.toFormat("yyyyMMdd")}t${t.toFormat("HHmm")}`;
}

function toBooking(e: any): ShowingBooking {
  const p = e.extendedProperties?.private || {};
  return {
    eventId: e.id,
    unit: p.unit || "",
    startIso: iso(e.start?.dateTime),
    endIso: iso(e.end?.dateTime),
    ref: p.ref || "",
    name: p.name || e.summary || "",
    email: p.email || "",
    phone: p.phone || "",
    pet: p.pet || "",
    createdAt: e.created || "",
  };
}

// Bookings (events with a booking reference) for one unit, or all units
export async function listShowings(unit?: ShowingUnit, opts: { includePast?: boolean } = {}): Promise<ShowingBooking[]> {
  const from = opts.includePast ? startOfToday().minus({ days: 90 }) : startOfToday();
  const events = await listEvents(from, startOfToday().plus({ days: 365 }));
  return events
    .filter(e => e.extendedProperties?.private?.ref && windowUnitCode(e) === null)
    .map(toBooking)
    .filter(b => !unit || b.unit === unit.code)
    .sort((a, b) => a.startIso.localeCompare(b.startIso));
}

export class SlotTakenError extends Error {}

export async function createShowing(params: { unit: ShowingUnit; slot: ShowingSlot; name: string; email: string; phone: string; pet: string; ref?: string }): Promise<ShowingBooking> {
  const token = await getAccessToken();
  const ref = params.ref || nano();
  const id = slotEventId(params.unit, params.slot.startIso);
  const body = {
    id,
    summary: `${params.unit.label} showing: ${params.name}`,
    description: `Unit: ${params.unit.label}\nName: ${params.name}\nEmail: ${params.email}\nPhone: ${params.phone}\nPet: ${params.pet || "None"}\nReference: ${ref}`,
    start: { dateTime: params.slot.startIso, timeZone: APP_TZ },
    end: { dateTime: params.slot.endIso, timeZone: APP_TZ },
    status: "confirmed",
    extendedProperties: { private: { unit: params.unit.code, ref, name: params.name, email: params.email, phone: params.phone, pet: params.pet } },
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

// Visitors manage their own booking with reference + email (both must match)
export async function findShowing(unit: ShowingUnit, ref: string, email: string): Promise<ShowingBooking | undefined> {
  const r = (ref || "").trim().toUpperCase();
  const e = (email || "").trim().toLowerCase();
  if (!r || !e) return undefined;
  return (await listShowings(unit)).find(b => b.ref === r && b.email.toLowerCase() === e);
}

export function isAdmin(key: string | null): boolean {
  return !!SHOWINGS_ADMIN_KEY && key === SHOWINGS_ADMIN_KEY;
}
