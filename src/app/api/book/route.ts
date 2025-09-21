import { NextRequest } from "next/server";
import { isAvailable } from "@/lib/ics";
import { createEvent } from "@/lib/google";
import { calculateBestPrice } from "@/lib/pricing";
import { Spot } from "@/lib/types";
import { customAlphabet } from "nanoid";
import { DateTime } from "luxon";
import { APP_TZ, MAX_ADVANCE_DAYS, MAX_BOOKING_DAYS } from "@/lib/config";

export const runtime = "nodejs";

const nano = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

export async function POST(req: NextRequest) {
  try {
    const { spot, startIso, endIso, plate, name, phone, email } = await req.json() as { spot: Spot; startIso: string; endIso: string; plate: string; name: string; phone: string; email: string };
    if (!spot || !startIso || !endIso || !plate || !name || !phone || !email) {
      return new Response(JSON.stringify({ error: "spot, startIso, endIso, plate, name, phone, email required" }), { status: 400 });
    }

    // Date constraints with smart "now" handling
    const now = DateTime.now().setZone(APP_TZ);
    let start = DateTime.fromISO(startIso, { zone: APP_TZ });
    const end = DateTime.fromISO(endIso, { zone: APP_TZ });
    
    // Smart bump: if start is in the past or very recent (within 5 minutes), bump to now
    if (start <= now.plus({ minutes: 5 })) {
      start = now.plus({ minutes: 1 }); // Bump to 1 minute from now
    }
    if (start.diff(now, 'days').days > MAX_ADVANCE_DAYS) {
      return new Response(JSON.stringify({ error: `Start must be within ${MAX_ADVANCE_DAYS} days` }), { status: 400 });
    }
    if (end <= start) {
      return new Response(JSON.stringify({ error: "End must be after start" }), { status: 400 });
    }

    // Check maximum booking duration (90 days)
    const durationDays = end.diff(start, 'days').days;
    if (durationDays > MAX_BOOKING_DAYS) {
      return new Response(JSON.stringify({ error: `Booking duration cannot exceed ${MAX_BOOKING_DAYS} days` }), { status: 400 });
    }

    // Use the potentially adjusted start time
    const finalStartIso = start.toISO({ suppressMilliseconds: true })!;
    const finalEndIso = end.toISO({ suppressMilliseconds: true })!;
    
    const availability = await isAvailable(spot, finalStartIso, finalEndIso);
    if (!availability.available) {
      return new Response(JSON.stringify({ error: "Time not available", conflicts: availability.conflicts }), { status: 409 });
    }

    const ref = nano();
    let id: string;
    try {
      const result = await createEvent({ spot, startIso: finalStartIso, endIso: finalEndIso, plate, ref, name, phone, email });
      id = result.id;
    } catch (err: any) {
      console.error("createEvent error", {
        spot,
        startIso,
        endIso,
        hasPlate: !!plate,
        hasEmail: !!email,
        hasName: !!name,
        owner: process.env.BOOKING_OWNER_EMAIL,
        calendarId: spot,
        message: err?.message,
      });
      return new Response(JSON.stringify({ error: err?.message || "Failed to create event" }), { status: 502 });
    }
    const price = calculateBestPrice(finalStartIso, finalEndIso);
    return new Response(JSON.stringify({ ref, eventId: id, priceCents: price.totalCents }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "unexpected" }), { status: 500 });
  }
}


