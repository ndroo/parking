import { NextRequest } from "next/server";
import { Spot } from "@/lib/types";
import { findBookingByRef, updateEventTime, deleteEvent } from "@/lib/google";
import { isAvailable } from "@/lib/ics";
import { calculateBestPrice } from "@/lib/pricing";
import { DateTime } from "luxon";
import { APP_TZ, MAX_ADVANCE_DAYS, MAX_BOOKING_DAYS } from "@/lib/config";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ ref: string }> };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// GET /api/booking/CODE -> the booking's spot, times and plate (no spot needed)
export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { ref } = await params;
    const found = await findBookingByRef(ref.toUpperCase());
    if (!found) return json({ error: "Not found" }, 404);
    const priceCents = calculateBestPrice(found.start, found.end).totalCents;
    return json({ ref: ref.toUpperCase(), spot: found.spot, start: found.start, end: found.end, plate: found.plate, priceCents });
  } catch (e: any) {
    return json({ error: e.message || "unexpected" }, 500);
  }
}

// PATCH /api/booking/CODE { startIso, endIso, spot? } -> move or extend
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { ref } = await params;
    const { startIso, endIso } = await req.json() as { startIso: string; endIso: string; spot?: Spot };
    if (!ref || !startIso || !endIso) return json({ error: "ref, startIso, endIso required" }, 400);
    const found = await findBookingByRef(ref.toUpperCase());
    if (!found) return json({ error: "Not found" }, 404);
    const now = DateTime.now().setZone(APP_TZ);
    const start = DateTime.fromISO(startIso, { zone: APP_TZ });
    const end = DateTime.fromISO(endIso, { zone: APP_TZ });
    if (end <= start) return json({ error: "End must be after start" }, 400);
    if (end <= now) return json({ error: "End must be in the future" }, 400);
    if (start.diff(now, "days").days > MAX_ADVANCE_DAYS) return json({ error: `Start must be within ${MAX_ADVANCE_DAYS} days` }, 400);
    if (end.diff(start, "days").days > MAX_BOOKING_DAYS) return json({ error: `Booking duration cannot exceed ${MAX_BOOKING_DAYS} days` }, 400);
    // exclude this booking's own event, otherwise extending always "conflicts" with itself
    const available = await isAvailable(found.spot, startIso, endIso, ref.toUpperCase());
    if (!available.available) return json({ error: "Time not available" }, 409);
    await updateEventTime({ spot: found.spot, eventId: found.id, startIso, endIso });
    return json({ ok: true, spot: found.spot });
  } catch (e: any) {
    return json({ error: e.message || "unexpected" }, 500);
  }
}

// DELETE /api/booking/CODE -> cancel
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { ref } = await params;
    const found = await findBookingByRef(ref.toUpperCase());
    if (!found) return json({ error: "Not found" }, 404);
    await deleteEvent(found.spot, found.id);
    return json({ ok: true });
  } catch (e: any) {
    return json({ error: e.message || "unexpected" }, 500);
  }
}
