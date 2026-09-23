import { NextRequest } from "next/server";
import { DateTime } from "luxon";
import { cancelShowing, createShowing, findShowing, findSlot, ShowingBooking, SlotTakenError } from "@/lib/showings";
import { getUnit } from "@/lib/showingUnits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ unit: string }> };

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

const publicView = (b: ShowingBooking) => ({
  ref: b.ref,
  name: b.name,
  email: b.email,
  phone: b.phone,
  pet: b.pet,
  startIso: b.startIso,
  endIso: b.endIso,
});

// POST { action: "lookup" | "cancel" | "reschedule", ref, email, startIso? }
// POST keeps the email out of URLs and logs.
export async function POST(req: NextRequest, { params }: Ctx) {
  const unit = getUnit((await params).unit);
  if (!unit) return json({ error: "Unknown unit" }, 404);
  try {
    const { action, ref, email, startIso } = await req.json();
    const booking = await findShowing(unit, ref, email);
    if (!booking) return json({ error: "We couldn't find a booking with that reference and email." }, 404);

    if (action === "lookup") return json({ booking: publicView(booking) });

    if (action === "cancel") {
      await cancelShowing(booking.eventId);
      return json({ ok: true });
    }

    if (action === "reschedule") {
      const slot = findSlot(unit, startIso);
      if (!slot) return json({ error: "That isn't one of the showing times" }, 400);
      if (DateTime.fromISO(slot.startIso) <= DateTime.now()) return json({ error: "That time has passed" }, 400);
      if (DateTime.fromISO(slot.startIso).toMillis() === DateTime.fromISO(booking.startIso).toMillis()) {
        return json({ booking: publicView(booking) });
      }
      // Claim the new slot first so a failure leaves the original booking intact
      const moved = await createShowing({ unit, slot, name: booking.name, email: booking.email, phone: booking.phone, pet: booking.pet, ref: booking.ref });
      await cancelShowing(booking.eventId);
      return json({ booking: publicView(moved) });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e: any) {
    if (e instanceof SlotTakenError) return json({ error: "Someone just grabbed that time. Please pick another." }, 409);
    console.error("POST /api/showings/[unit]/manage", e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
}
