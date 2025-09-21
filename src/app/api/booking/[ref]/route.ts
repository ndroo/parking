import { NextRequest } from "next/server";
import { Spot } from "@/lib/types";
import { findEventByRef, updateEventTime, deleteEvent } from "@/lib/google";
import { isAvailable } from "@/lib/ics";
import { DateTime } from "luxon";
import { APP_TZ, MAX_ADVANCE_DAYS, MAX_BOOKING_DAYS } from "@/lib/config";

export const runtime = "nodejs";

function parseSpot(headerOrQuery: string | null): Spot | null {
  if (headerOrQuery === "northern" || headerOrQuery === "southern") return headerOrQuery;
  return null;
}

export async function PATCH(req: NextRequest, { params }: { params: { ref: string } }) {
  try {
    const ref = params.ref;
    const { startIso, endIso, spot } = await req.json() as { startIso: string; endIso: string; spot: Spot };
    if (!ref || !startIso || !endIso || !spot) {
      return new Response(JSON.stringify({ error: "ref, spot, startIso, endIso required" }), { status: 400 });
    }
    const now = DateTime.now().setZone(APP_TZ);
    const start = DateTime.fromISO(startIso, { zone: APP_TZ });
    const end = DateTime.fromISO(endIso, { zone: APP_TZ });
    if (start <= now) {
      return new Response(JSON.stringify({ error: "Start must be in the future" }), { status: 400 });
    }
    if (start.diff(now, 'days').days > MAX_ADVANCE_DAYS) {
      return new Response(JSON.stringify({ error: `Start must be within ${MAX_ADVANCE_DAYS} days"` }), { status: 400 });
    }
    if (end <= start) {
      return new Response(JSON.stringify({ error: "End must be after start" }), { status: 400 });
    }

    // Check maximum booking duration (90 days)
    const durationDays = end.diff(start, 'days').days;
    if (durationDays > MAX_BOOKING_DAYS) {
      return new Response(JSON.stringify({ error: `Booking duration cannot exceed ${MAX_BOOKING_DAYS} days` }), { status: 400 });
    }
    const available = await isAvailable(spot, startIso, endIso);
    if (!available.available) {
      return new Response(JSON.stringify({ error: "Time not available" }), { status: 409 });
    }
    const found = await findEventByRef(spot, ref);
    if (!found) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    await updateEventTime({ spot, eventId: found.id, startIso, endIso });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "unexpected" }), { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { ref: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const spot = parseSpot(searchParams.get("spot"));
    const ref = params.ref;
    if (!spot) return new Response(JSON.stringify({ error: "spot required" }), { status: 400 });
    const found = await findEventByRef(spot, ref);
    if (!found) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    return new Response(JSON.stringify({ exists: true, ref }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "unexpected" }), { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { ref: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const spot = parseSpot(searchParams.get("spot"));
    const ref = params.ref;
    if (!spot) return new Response(JSON.stringify({ error: "spot required" }), { status: 400 });
    const found = await findEventByRef(spot, ref);
    if (!found) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    await deleteEvent(spot, found.id);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "unexpected" }), { status: 500 });
  }
}


