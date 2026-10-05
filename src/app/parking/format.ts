import { DateTime } from "luxon";
import { Spot } from "@/lib/types";

export const TZ = "America/Toronto";
export const HOUR = 36e5;
export const DAY = 24 * HOUR;

export interface Window { spot: Spot; start: number; end: number; reserved?: boolean }

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const other = (s: Spot): Spot => (s === "northern" ? "southern" : "northern");

/** "Oct 6, 2:16 am" */
export function fshort(ms: number): string {
  const d = DateTime.fromMillis(ms).setZone(TZ);
  const t = d.minute ? d.toFormat("h:mm") : d.toFormat("h");
  return `${d.toFormat("LLL d")}, ${t} ${d.toFormat("a").toLowerCase()}`;
}
/** "Tue Oct 6, 2:16 am" */
export function f(ms: number): string {
  return `${DateTime.fromMillis(ms).setZone(TZ).toFormat("ccc")} ${fshort(ms)}`;
}
/** value for a datetime-local input, in Toronto time */
export function toLocalInput(ms: number): string {
  return DateTime.fromMillis(ms).setZone(TZ).toFormat("yyyy-LL-dd'T'HH:mm");
}
export function fromLocalInput(v: string): number {
  const d = DateTime.fromISO(v, { zone: TZ });
  return d.isValid ? d.toMillis() : NaN;
}
export function toIso(ms: number): string {
  return DateTime.fromMillis(ms).setZone(TZ).toISO({ suppressMilliseconds: true })!;
}
/** Add whole calendar days in Toronto time (survives the clocks changing). */
export function addDays(ms: number, days: number): number {
  return DateTime.fromMillis(ms).setZone(TZ).plus({ days }).toMillis();
}
export function conflicts(w: Window[], spot: Spot, s: number, e: number): Window[] {
  return w.filter(b => b.spot === spot && s < b.end && e > b.start).sort((a, b) => a.start - b.start);
}
export function busyNow(w: Window[], spot: Spot, now: number): Window | undefined {
  return w.find(b => b.spot === spot && now >= b.start && now < b.end);
}
