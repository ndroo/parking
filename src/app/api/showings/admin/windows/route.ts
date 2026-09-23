import { NextRequest } from "next/server";
import { DateTime } from "luxon";
import { createWindow, deleteWindow, isAdmin, listShowings, listWindows } from "@/lib/showings";
import { getUnit, getUnitByCode } from "@/lib/showingUnits";
import { APP_TZ } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

const inWindow = (w: { unit: string; startIso: string; endIso: string }, b: { unit: string; startIso: string }) =>
  b.unit === w.unit && b.startIso >= w.startIso && b.startIso < w.endIso;

// Upcoming windows (today onward) with their booking counts
export async function GET(req: NextRequest) {
  if (!isAdmin(req.headers.get("x-admin-key"))) return json({ error: "Unauthorized" }, 401);
  const [windows, bookings] = await Promise.all([listWindows(), listShowings()]);
  return json({
    windows: windows.map(w => ({ ...w, unitLabel: getUnitByCode(w.unit)?.label || `Unit ${w.unit}`, booked: bookings.filter(b => inWindow(w, b)).length })),
  });
}

// POST { unit, date: "YYYY-MM-DD", start: "HH:mm", end: "HH:mm" }
export async function POST(req: NextRequest) {
  if (!isAdmin(req.headers.get("x-admin-key"))) return json({ error: "Unauthorized" }, 401);
  const { unit: slug, date, start, end } = await req.json();
  const unit = getUnit(slug);
  if (!unit) return json({ error: "Unknown unit" }, 400);
  const s = DateTime.fromISO(`${date}T${start}`, { zone: APP_TZ });
  const e = DateTime.fromISO(`${date}T${end}`, { zone: APP_TZ });
  if (!s.isValid || !e.isValid) return json({ error: "Pick a date, start and end time" }, 400);
  if (e.diff(s, "minutes").minutes < unit.slotMinutes) return json({ error: `The window needs to be at least ${unit.slotMinutes} minutes long` }, 400);
  if (e <= DateTime.now()) return json({ error: "That window is already in the past" }, 400);
  const w = await createWindow(unit, s.toISO()!, e.toISO()!);
  return json({ window: w });
}

// DELETE ?id=...&force=1 (force is required if the window has bookings)
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req.headers.get("x-admin-key"))) return json({ error: "Unauthorized" }, 401);
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return json({ error: "id required" }, 400);
  const [windows, bookings] = await Promise.all([listWindows(), listShowings()]);
  const w = windows.find(x => x.id === id);
  if (!w) return json({ error: "Window not found" }, 404);
  const booked = bookings.filter(b => inWindow(w, b)).length;
  if (booked && req.nextUrl.searchParams.get("force") !== "1") {
    return json({ error: `This window has ${booked} booking${booked === 1 ? "" : "s"}. Cancel or move them first, or remove anyway.`, booked }, 409);
  }
  await deleteWindow(id);
  return json({ ok: true });
}
