import { NextRequest } from "next/server";
import { DateTime } from "luxon";
import { createShowing, findSlot, firstName, getSlots, listShowings, SlotTakenError } from "@/lib/showings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

// Public view: every slot, with only the first name of whoever holds it
export async function GET() {
  try {
    const bookings = await listShowings();
    const byStart = new Map(bookings.map(b => [DateTime.fromISO(b.startIso).toMillis(), b]));
    const now = DateTime.now();
    const slots = getSlots().map(s => {
      const b = byStart.get(DateTime.fromISO(s.startIso).toMillis());
      return {
        ...s,
        taken: !!b,
        firstName: b ? firstName(b.name) : null,
        past: DateTime.fromISO(s.startIso) <= now,
      };
    });
    return json({ slots });
  } catch (e: any) {
    console.error("GET /api/showings", e);
    return json({ error: "Could not load showing times" }, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { startIso, name, email, phone, pet } = await req.json();
    const cleanName = String(name || "").trim().slice(0, 100);
    const cleanEmail = String(email || "").trim().toLowerCase().slice(0, 200);
    const cleanPhone = String(phone || "").trim().slice(0, 40);
    const cleanPet = String(pet || "").trim().slice(0, 200);
    if (!startIso || !cleanName || !cleanEmail || !cleanPhone) {
      return json({ error: "Name, email, phone and a time are required" }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return json({ error: "Please enter a valid email" }, 400);

    const slot = findSlot(startIso);
    if (!slot) return json({ error: "That isn't one of the showing times" }, 400);
    if (DateTime.fromISO(slot.startIso) <= DateTime.now()) return json({ error: "That time has passed" }, 400);

    // One slot per person; they can email to move it
    const existing = await listShowings();
    const mine = existing.find(b => b.email.toLowerCase() === cleanEmail);
    if (mine) {
      const when = DateTime.fromISO(mine.startIso).setZone("America/Toronto").toFormat("ccc LLL d 'at' h:mm a");
      return json({ error: `You're already booked for ${when}. Email andrewjohnmcgrath@gmail.com to change it.` }, 409);
    }

    const booking = await createShowing({ slot, name: cleanName, email: cleanEmail, phone: cleanPhone, pet: cleanPet });
    return json({ ref: booking.ref, startIso: slot.startIso, endIso: slot.endIso });
  } catch (e: any) {
    if (e instanceof SlotTakenError) return json({ error: "Someone just grabbed that time. Please pick another." }, 409);
    console.error("POST /api/showings", e);
    return json({ error: "Could not book that time" }, 500);
  }
}
