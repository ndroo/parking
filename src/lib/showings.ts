import { DateTime } from "luxon";
import { customAlphabet } from "nanoid";
import { getAccessToken } from "@/lib/google";
import { APP_TZ } from "@/lib/config";
import { ShowingUnit, SHOWING_UNITS } from "@/lib/showingUnits";

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

export function getSlots(unit: ShowingUnit): ShowingSlot[] {
  const slots: ShowingSlot[] = [];
  for (const w of unit.windows) {
    let t = DateTime.fromISO(`${w.date}T${w.start}`, { zone: APP_TZ });
    const end = DateTime.fromISO(`${w.date}T${w.end}`, { zone: APP_TZ });
    while (t < end) {
      const next = t.plus({ minutes: unit.slotMinutes });
      slots.push({ startIso: t.toISO({ suppressMilliseconds: true })!, endIso: next.toISO({ suppressMilliseconds: true })! });
      t = next;
    }
  }
  return slots;
}

export function findSlot(unit: ShowingUnit, startIso: string): ShowingSlot | undefined {
  const target = DateTime.fromISO(startIso).toMillis();
  return getSlots(unit).find(s => DateTime.fromISO(s.startIso).toMillis() === target);
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
  const tz = (iso: string) => DateTime.fromISO(iso).setZone(APP_TZ).toISO({ suppressMilliseconds: true })!;
  return {
    eventId: e.id,
    unit: p.unit || "",
    startIso: tz(e.start?.dateTime),
    endIso: tz(e.end?.dateTime),
    ref: p.ref || "",
    name: p.name || e.summary || "",
    email: p.email || "",
    phone: p.phone || "",
    pet: p.pet || "",
    createdAt: e.created || "",
  };
}

// Bookings for one unit, or every configured unit when omitted
export async function listShowings(unit?: ShowingUnit): Promise<ShowingBooking[]> {
  const units = unit ? [unit] : SHOWING_UNITS;
  const starts = units.flatMap(u => getSlots(u).map(s => s.startIso)).sort();
  if (starts.length === 0) return [];
  const token = await getAccessToken();
  const url = new URL(`${BASE_URL}/calendars/${encodeURIComponent(CALENDAR_ID_SHOWINGS)}/events`);
  url.searchParams.set("timeMin", DateTime.fromISO(starts[0]).minus({ days: 1 }).toISO()!);
  url.searchParams.set("timeMax", DateTime.fromISO(starts[starts.length - 1]).plus({ days: 1 }).toISO()!);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("maxResults", "250");
  if (unit) url.searchParams.set("privateExtendedProperty", `unit=${unit.code}`);
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`listShowings failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return (json.items || [])
    .filter((e: any) => e.status !== "cancelled" && e.start?.dateTime)
    .map(toBooking)
    .sort((a: ShowingBooking, b: ShowingBooking) => a.startIso.localeCompare(b.startIso));
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
